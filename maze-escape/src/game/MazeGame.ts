import { RabbitAnimator } from "../animation/RabbitAnimator";
import { ItemAnimator } from "../animation/ItemAnimator";
import { AudioController } from "../audio/AudioController";
import { HintController, directionBetween } from "../hint/HintController";
import { CommandQueueController } from "../input/CommandQueueController";
import { CommandRunner } from "../input/CommandRunner";
import { InputController } from "../input/InputController";
import { difficultyConfigs } from "../maze/difficultyConfigs";
import { canMove, getAvailableDirections, getNextPosition, isInsideMaze } from "../maze/MazeGrid";
import {
  DIRECTION_DELTAS,
  type Direction,
  type GameMode,
  type MazeLevel,
  type Position,
} from "../maze/MazeCell";
import { GameUI } from "../ui/GameUI";
import { createGameState, resetStateForLevel, type GameState } from "./GameState";
import { GardenScene } from "./GardenScene";
import { LevelManager } from "./LevelManager";
import { calculateStars, moveRabbit, undoMove, type MoveResult } from "./MovementEngine";
import { ProgressStorage, type ProgressData } from "./ProgressStorage";

const DIRECTION_TEXT: Record<Direction, string> = {
  up: "lên",
  down: "xuống",
  left: "sang trái",
  right: "sang phải",
};

function ordinalVietnamese(index: number): string {
  const names = ["thứ nhất", "thứ hai", "thứ ba", "thứ tư", "thứ năm", "thứ sáu"];
  return names[index] ?? `số ${index + 1}`;
}

function emptyMove(position: Position): MoveResult {
  return {
    success: false,
    from: { ...position },
    to: { ...position },
    collectedItemIds: [],
    reachedExit: false,
    completedLevel: false,
  };
}

export class MazeGame {
  readonly state: GameState;
  private readonly storage = new ProgressStorage();
  private progress: ProgressData;
  private readonly levelManager = new LevelManager();
  private readonly ui: GameUI;
  private readonly garden: GardenScene;
  private readonly input: InputController;
  private readonly audio: AudioController;
  private readonly hints = new HintController();
  private readonly rabbitAnimator = new RabbitAnimator();
  private readonly itemAnimator = new ItemAnimator();
  private readonly commands: CommandQueueController;
  private readonly commandRunner: CommandRunner;
  private queueRunning = false;

  constructor(private readonly root: HTMLElement) {
    this.progress = this.storage.load();
    this.state = createGameState(this.progress.voiceEnabled);
    this.commands = new CommandQueueController(this.state, difficultyConfigs.easy.commandLimit);
    this.commandRunner = new CommandRunner(this.state, this.commands);
    this.audio = new AudioController(this.progress.voiceEnabled);
    this.ui = new GameUI(
      root,
      this.levelManager,
      {
        onDirection: (direction) => this.onDirection(direction),
        onUndo: () => this.runAsync(() => this.undo()),
        onRestart: () => this.restart(),
        onHint: () => this.runAsync(() => this.showHint()),
        onReplayVoice: () => this.audio.replay(),
        onToggleVoice: () => this.toggleVoice(),
        onMode: (mode) => this.setMode(mode),
        onRunCommands: () => this.runAsync(() => this.runCommands()),
        onRemoveCommand: () => this.removeCommand(),
        onClearCommands: () => this.clearCommands(),
        onSelectCommand: (index) => this.selectCommand(index),
        onSelectLevel: (levelId) => this.selectLevel(levelId),
        onRandomLevel: (difficulty) => this.loadLevel(this.levelManager.generate(difficulty)),
        onNextLevel: () => this.nextLevel(),
      },
      this.progress,
    );
    this.garden = new GardenScene(this.ui.stage);
    this.input = new InputController(root, (direction) => this.onDirection(direction));
    const firstLevel = this.levelManager.levels[0];
    if (!firstLevel) throw new Error("Không tìm thấy level mở đầu.");
    this.loadLevel(firstLevel, true);
  }

  dispose(): void {
    this.input.dispose();
    this.audio.dispose();
    this.garden.dispose();
    this.ui.dispose();
    this.root.replaceChildren();
  }

  private loadLevel(level: MazeLevel, welcome = false): void {
    const canUseCommands = this.progress.commandModeUnlocked || level.recommendedMode !== "commands";
    const mode: GameMode = level.recommendedMode === "commands" && canUseCommands ? "commands" : "step";
    resetStateForLevel(this.state, level, mode);
    this.commands.setLimit(difficultyConfigs[level.difficulty].commandLimit);
    if (level.id === "level-12" && mode === "commands") {
      this.state.commandQueue = ["right", "down", "right", "down"];
    }
    this.ui.completion.hide();
    this.garden.load(level);
    this.garden.mazeView.syncCollectibles([]);
    this.showEasyAvailableMoves();
    const message = welcome
      ? "Chào mừng đến với Thỏ Con Thoát Mê Cung. Hãy giúp Thỏ nhặt cà rốt rồi trở về hang."
      : level.instruction;
    this.ui.setFeedback(level.instruction, "neutral");
    this.ui.update(this.state, this.progress);
    this.audio.speak(message);
  }

  private onDirection(direction: Direction): void {
    if (this.state.interactionLocked || this.state.completed) return;
    if (this.state.mode === "commands") {
      const changed = this.commands.add(direction);
      this.ui.setFeedback(
        changed
          ? `Đã thêm lệnh đi ${DIRECTION_TEXT[direction]}.`
          : "Chuỗi lệnh đã đầy. Con hãy chạy hoặc xóa bớt lệnh.",
        changed ? "neutral" : "blocked",
      );
      this.ui.update(this.state, this.progress);
      return;
    }
    this.runAsync(() => this.performMove(direction));
  }

  private async performMove(direction: Direction, fromQueue = false): Promise<MoveResult> {
    const level = this.state.currentLevel;
    if (!level || this.state.completed || (this.state.interactionLocked && !fromQueue)) {
      return emptyMove(this.state.rabbitPosition);
    }
    const target = getNextPosition(this.state.rabbitPosition, direction);
    this.garden.mazeView.clearHints();
    this.state.interactionLocked = true;
    this.ui.update(this.state, this.progress);

    if (!canMove(this.state.rabbitPosition, direction, level)) {
      this.state.mistakes += 1;
      const wall = isInsideMaze(target, level) ? this.garden.mazeView.getWall(target) : null;
      await this.rabbitAnimator.blocked(this.garden.mazeView.rabbit, direction, wall);
      const reason = isInsideMaze(target, level) ? "Phía này bị hàng rào chặn." : "Phía này ra ngoài khu vườn.";
      const message = `${reason} Con hãy nhìn xem còn hướng nào khác.`;
      this.ui.setFeedback(message, "blocked");
      this.audio.speak(`${reason} Con thử một hướng khác nhé.`);
      this.state.interactionLocked = this.queueRunning;
      this.ui.update(this.state, this.progress);
      return {
        ...emptyMove(this.state.rabbitPosition),
        blockedReason: isInsideMaze(target, level) ? "wall" : "outside",
      };
    }

    await this.rabbitAnimator.move(
      this.garden.mazeView.rabbit,
      this.garden.mazeView.getWorldPosition(target),
      direction,
    );
    this.state.interactionLocked = false;
    const result = moveRabbit(this.state, direction);
    this.state.interactionLocked = true;

    for (const itemId of result.collectedItemIds) {
      const carrot = this.garden.mazeView.getCarrot(itemId);
      if (carrot) await this.itemAnimator.collect(carrot);
    }
    this.garden.mazeView.syncCollectibles(this.state.collectedItemIds);

    if (result.collectedItemIds.length > 0) {
      const message = "Thỏ đã nhặt được một củ cà rốt.";
      this.ui.setFeedback(message, "success");
      this.audio.speak(message);
    } else if (result.reachedExit && !result.completedLevel) {
      const missing = level.collectibles.length - this.state.collectedItemIds.length;
      const message = `Thỏ còn thiếu ${missing} củ cà rốt. Hãy quay lại tìm nhé.`;
      this.ui.setFeedback(message, "blocked");
      this.audio.speak(message);
    } else {
      this.ui.setFeedback(`Thỏ đi ${DIRECTION_TEXT[direction]}. Hãy quan sát vị trí mới.`, "neutral");
      if (level.difficulty === "easy") this.audio.speak(`Đi ${DIRECTION_TEXT[direction]}.`);
    }

    if (result.completedLevel) {
      await this.completeLevel();
    } else {
      this.state.interactionLocked = this.queueRunning;
      this.showEasyAvailableMoves();
      this.ui.update(this.state, this.progress);
    }
    return result;
  }

  private async undo(): Promise<void> {
    const previous = this.state.history.at(-1);
    if (!previous || this.state.interactionLocked) return;
    const direction = directionBetween(this.state.rabbitPosition, previous.rabbitPosition) ?? "down";
    this.state.interactionLocked = true;
    this.ui.update(this.state, this.progress);
    await this.rabbitAnimator.move(
      this.garden.mazeView.rabbit,
      this.garden.mazeView.getWorldPosition(previous.rabbitPosition),
      direction,
    );
    this.state.interactionLocked = false;
    const result = undoMove(this.state);
    this.garden.mazeView.syncCollectibles(this.state.collectedItemIds);
    this.showEasyAvailableMoves();
    this.ui.setFeedback(
      result.restoredItemIds.length > 0
        ? "Đã quay lại. Cà rốt cũng trở về chỗ cũ."
        : "Đã quay lại một bước.",
      "neutral",
    );
    this.audio.speak("Thỏ đã quay lại một bước.");
    this.ui.update(this.state, this.progress);
  }

  private async showHint(): Promise<void> {
    const level = this.state.currentLevel;
    if (!level || this.state.interactionLocked || this.state.completed) return;
    const hint = this.hints.getHint(this.state, level);
    this.garden.mazeView.showHints(hint.highlightedPositions, hint.recommendedDirection);
    this.ui.setFeedback(hint.message, "hint");
    this.audio.speak(hint.message);
    this.ui.update(this.state, this.progress);
    if (hint.level === 4 && hint.recommendedDirection) {
      this.state.interactionLocked = true;
      this.ui.update(this.state, this.progress);
      await new Promise<void>((resolve) => window.setTimeout(resolve, 420));
      this.state.interactionLocked = false;
      await this.performMove(hint.recommendedDirection);
    }
  }

  private async runCommands(): Promise<void> {
    if (this.state.interactionLocked || this.state.commandQueue.length === 0 || this.state.completed) return;
    this.queueRunning = true;
    const outcome = await this.commandRunner.run(
      async (direction) => (await this.performMove(direction, true)).success,
      () => this.ui.update(this.state, this.progress),
    );
    this.queueRunning = false;
    this.state.interactionLocked = this.state.completed;
    if (outcome.errorIndex !== null) {
      const message = `Lệnh ${ordinalVietnamese(outcome.errorIndex)} bị chặn bởi tường. Con hãy chạm lệnh này rồi chọn hướng khác.`;
      this.ui.setFeedback(message, "blocked");
      this.audio.speak(message);
    }
    this.ui.update(this.state, this.progress);
  }

  private async completeLevel(): Promise<void> {
    const level = this.state.currentLevel;
    if (!level) return;
    const stars = calculateStars({
      stepCount: this.state.stepCount,
      optimalPathLength: level.optimalPathLength,
      mistakes: this.state.mistakes,
      hintsUsed: this.state.hintsUsed,
    });
    this.progress = this.storage.recordCompletion(
      this.progress,
      level.id,
      stars,
      level.collectibles.length,
    );
    this.state.interactionLocked = true;
    this.ui.setFeedback("Tuyệt lắm! Thỏ đã về đến hang.", "success");
    this.ui.update(this.state, this.progress);
    this.audio.speak("Tuyệt lắm! Thỏ đã về đến hang. Con đã hoàn thành mê cung.");
    await this.rabbitAnimator.celebrate(this.garden.mazeView.rabbit);
    this.ui.showCompletion(stars, this.state);
  }

  private showEasyAvailableMoves(): void {
    const level = this.state.currentLevel;
    if (!level || !difficultyConfigs[level.difficulty].showAvailableMoves || this.state.completed) return;
    const positions = getAvailableDirections(this.state.rabbitPosition, level).map((direction) => {
      const delta = DIRECTION_DELTAS[direction];
      return {
        row: this.state.rabbitPosition.row + delta.row,
        col: this.state.rabbitPosition.col + delta.col,
      };
    });
    this.garden.mazeView.showHints(positions, null);
  }

  private setMode(mode: GameMode): void {
    if (this.state.interactionLocked || this.state.mode === mode) return;
    if (mode === "commands" && !this.progress.commandModeUnlocked && this.state.currentLevel?.recommendedMode !== "commands") {
      this.ui.setFeedback("Chế độ xếp lệnh sẽ mở sau khi con hoàn thành thêm các màn từng bước.", "hint");
      return;
    }
    this.state.mode = mode;
    this.ui.setFeedback(
      mode === "commands"
        ? "Hãy xếp các mũi tên rồi nhấn Chạy."
        : "Mỗi lần bấm, Thỏ sẽ đi đúng một ô.",
      "neutral",
    );
    this.ui.update(this.state, this.progress);
  }

  private removeCommand(): void {
    const removed = this.commands.removeLast();
    this.ui.setFeedback(removed ? "Đã xóa lệnh cuối." : "Chưa có lệnh nào để xóa.", "neutral");
    this.ui.update(this.state, this.progress);
  }

  private clearCommands(): void {
    this.commands.clear();
    this.ui.setFeedback("Đã xóa chuỗi lệnh. Con có thể xếp lại từ vị trí hiện tại.", "neutral");
    this.ui.update(this.state, this.progress);
  }

  private selectCommand(index: number): void {
    if (this.commands.select(index)) {
      this.ui.setFeedback(`Đang sửa lệnh số ${index + 1}. Hãy chọn một mũi tên mới.`, "hint");
      this.ui.update(this.state, this.progress);
    }
  }

  private restart(): void {
    const level = this.state.currentLevel;
    if (level) this.loadLevel(level);
  }

  private selectLevel(levelId: string): void {
    const level = this.levelManager.getById(levelId);
    if (level && this.levelManager.isUnlocked(level, this.progress)) this.loadLevel(level);
  }

  private nextLevel(): void {
    const level = this.state.currentLevel;
    const next = level ? this.levelManager.getNext(level.id) : null;
    if (next) this.loadLevel(next);
    else this.ui.levelMenu.open(this.progress);
  }

  private toggleVoice(): void {
    this.state.voiceEnabled = !this.state.voiceEnabled;
    this.progress = { ...this.progress, voiceEnabled: this.state.voiceEnabled };
    this.storage.save(this.progress);
    this.audio.setEnabled(this.state.voiceEnabled);
    this.ui.update(this.state, this.progress);
    if (this.state.voiceEnabled) this.audio.speak("Giọng đọc đã bật.");
    else this.ui.setFeedback("Giọng đọc đã tắt. Trạng thái vẫn luôn hiển thị bằng hình và chữ.", "neutral");
  }

  private runAsync(task: () => Promise<unknown>): void {
    void task().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Đã có lỗi không mong muốn.";
      this.state.interactionLocked = false;
      this.queueRunning = false;
      this.ui.setFeedback(`Khu vườn cần nghỉ một chút: ${message}`, "blocked");
      this.ui.update(this.state, this.progress);
    });
  }
}
