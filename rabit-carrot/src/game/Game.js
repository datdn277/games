import { AudioController } from "./AudioController.js";
import { DIRECTIONS, directionBetween } from "./directions.js";
import { GameState } from "./GameState.js";
import { GameUI } from "./GameUI.js";
import { GardenScene } from "./GardenScene.js";
import { InputController } from "./InputController.js";
import { LevelGenerator } from "./LevelGenerator.js";
import { findNearestPath, findPath } from "./PathFinder.js";

const HINT_LOCATION = {
  up: "phía trên",
  down: "phía dưới",
  left: "bên trái",
  right: "bên phải"
};

export class Game {
  constructor(root) {
    this.root = root;
    this.generator = new LevelGenerator();
    this.audio = new AudioController();
    this.ui = new GameUI(root);
    this.scene = new GardenScene(this.ui.elements.canvasHost);
    this.levelNumber = 1;
    this.gridSize = null;
    this.soundEnabled = true;
    this.completionTimer = null;
  }

  init() {
    this.ui.bindActions({
      onReplay: () => this.audio.replay(),
      onHint: () => this.showHint({ speak: true }),
      onReset: () => this.resetLevel(),
      onNext: () => this.nextLevel(),
      onLevelChange: (level) => this.startLevel(level),
      onGridSizeChange: (size) => this.setGridSize(size),
      onGuideChange: (enabled) => this.setGuide(enabled),
      onSoundChange: (enabled) => this.setSound(enabled)
    });
    this.input = new InputController({ root: this.root, onDirection: (direction) => this.move(direction) });
    this.input.bind();
    this.startLevel(1);
  }

  startLevel(levelNumber, { reuse = false } = {}) {
    clearTimeout(this.completionTimer);
    this.levelNumber = Math.min(4, Math.max(1, levelNumber));
    if (!reuse || !this.currentLevelData) this.currentLevelData = this.generator.generate(this.levelNumber, { gridSize: this.gridSize });
    this.state = new GameState(structuredClone(this.currentLevelData));
    this.state.soundEnabled = this.soundEnabled;
    this.audio.setEnabled(this.soundEnabled);
    this.scene.build(this.state);
    this.ui.renderRound(this.state, { gridSizeOverride: this.gridSize });
    this.ui.setControlsEnabled(true);
    this.input.setEnabled(true);
    const prompt = "Hãy giúp Thỏ nhặt cà rốt.";
    this.audio.speak(prompt);
    if (this.state.guideEnabled) window.setTimeout(() => this.showHint({ speak: false }), 180);
  }

  resetLevel() {
    this.startLevel(this.levelNumber, { reuse: true });
  }

  setGridSize(size) {
    this.gridSize = size;
    this.startLevel(this.levelNumber);
  }

  nextLevel() {
    const next = this.ui.autoLevelEnabled ? Math.min(4, this.levelNumber + 1) : this.levelNumber;
    this.startLevel(next);
  }

  async move(directionName) {
    if (!this.state || this.state.player.moving || this.state.completed) return;
    this.ui.clearHint();
    this.scene.clearHint();
    const result = this.state.attemptMove(directionName);
    if (["ignored", "busy"].includes(result.status)) return;

    this.state.player.moving = true;
    this.input.setEnabled(false);
    this.ui.setControlsEnabled(false);
    this.audio.speak(`${DIRECTIONS[directionName].speech}.`);

    if (result.status === "outside") {
      await this.scene.animateBlocked(directionName);
      this.ui.setStatus("Không thể đi ra ngoài khu vườn. Con thử hướng khác nhé!", "warning");
      this.audio.speak("Con không thể đi ra ngoài khu vườn.");
      return this.#finishStep();
    }

    if (result.status === "blocked") {
      await this.scene.animateBlocked(directionName, result.obstacle);
      this.ui.setStatus("Phía này bị chặn. Con thử hướng khác nhé!", "warning");
      this.audio.speak("Phía này bị chặn. Con thử hướng khác nhé.");
      return this.#finishStep();
    }

    await this.scene.animateMove(result.from, result.to, directionName);
    if (result.carrot) {
      await this.scene.collectCarrot(result.carrot);
      this.ui.updateCounter(this.state.collectedCount, this.state.totalCarrots);
      this.ui.setStatus("Tuyệt lắm! Thỏ đã nhặt được một củ cà rốt.", "success");
      this.audio.speak("Con đã nhặt được một củ cà rốt.");
    } else {
      this.ui.setStatus(`${DIRECTIONS[directionName].speech}. Thỏ đã sang ô mới.`, "neutral");
    }

    if (result.justUnlocked) {
      this.scene.unlockHome();
      this.ui.setStatus("Đã nhặt đủ cà rốt! Hãy đưa Thỏ về hang.", "success");
      this.audio.speak("Con đã nhặt đủ cà rốt. Hãy đưa Thỏ về hang.");
    }

    if (result.completed) {
      this.state.player.moving = false;
      this.scene.celebrate();
      this.ui.updateCounter(this.state.collectedCount, this.state.totalCarrots);
      this.ui.showComplete(this.state.level, this.state.moves);
      this.audio.speak("Con đã hoàn thành rồi. Giỏi lắm!");
      this.input.setEnabled(false);
      if (this.ui.autoLevelEnabled) this.completionTimer = window.setTimeout(() => this.nextLevel(), 3200);
      return;
    }

    this.#finishStep();
  }

  #finishStep() {
    this.state.player.moving = false;
    this.input.setEnabled(true);
    this.ui.setControlsEnabled(true);
    if (this.state.guideEnabled) this.showHint({ speak: false });
  }

  showHint({ speak = true } = {}) {
    if (!this.state || this.state.completed || this.state.player.moving) return;
    const start = { row: this.state.player.row, column: this.state.player.column };
    let target;
    let path;
    let subject;

    if (this.state.remainingCarrots.length) {
      const nearest = findNearestPath({
        rows: this.state.rows,
        columns: this.state.columns,
        obstacles: this.state.obstacles,
        start,
        targets: this.state.remainingCarrots
      });
      target = nearest?.target;
      path = nearest?.path;
      subject = "Cà rốt";
    } else {
      target = this.state.home;
      path = findPath({
        rows: this.state.rows,
        columns: this.state.columns,
        obstacles: this.state.obstacles,
        start,
        target
      });
      subject = "Hang thỏ";
    }
    if (!path || path.length < 2) return;

    const nextCell = path[1];
    const direction = directionBetween(start, nextCell);
    const isAdjacent = path.length === 2;
    const message = isAdjacent
      ? `${subject} ở ${HINT_LOCATION[direction]}. Hãy bấm nút ${DIRECTIONS[direction].speech.toLowerCase()}.`
      : `Để tới ${subject.toLowerCase()}, bước tiếp theo hãy bấm nút ${DIRECTIONS[direction].speech.toLowerCase()}.`;
    this.ui.showHint(direction, message);
    this.scene.showHint(start, nextCell, target);
    if (speak) this.audio.speak(message);
  }

  setGuide(enabled) {
    this.state.guideEnabled = enabled;
    if (enabled) this.showHint({ speak: true });
    else {
      this.ui.clearHint();
      this.scene.clearHint();
      this.ui.setStatus(this.state.remainingCarrots.length ? "Hãy quan sát và chọn hướng đi nhé!" : "Hãy đưa Thỏ về hang!", "neutral");
    }
  }

  setSound(enabled) {
    this.soundEnabled = enabled;
    this.state.soundEnabled = enabled;
    this.audio.setEnabled(enabled);
    if (enabled) this.audio.speak("Giọng đọc đã bật.");
  }
}
