import type { GameState } from "../game/GameState";
import type { LevelManager } from "../game/LevelManager";
import type { ProgressData } from "../game/ProgressStorage";
import type { Difficulty, Direction, GameMode } from "../maze/MazeCell";
import { CompletionDialog } from "./CompletionDialog";
import { DirectionPad } from "./DirectionPad";
import { FeedbackPanel, type FeedbackTone } from "./FeedbackPanel";
import { LevelMenu } from "./LevelMenu";
import { MissionPanel } from "./MissionPanel";

export type GameUICallbacks = {
  onDirection: (direction: Direction) => void;
  onUndo: () => void;
  onRestart: () => void;
  onHint: () => void;
  onReplayVoice: () => void;
  onToggleVoice: () => void;
  onMode: (mode: GameMode) => void;
  onRunCommands: () => void;
  onRemoveCommand: () => void;
  onClearCommands: () => void;
  onSelectCommand: (index: number) => void;
  onSelectLevel: (levelId: string) => void;
  onRandomLevel: (difficulty: Difficulty) => void;
  onNextLevel: () => void;
};

const DIRECTION_ICONS: Record<Direction, string> = {
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
};

export class GameUI {
  readonly stage: HTMLElement;
  readonly feedback: FeedbackPanel;
  readonly levelMenu: LevelMenu;
  readonly completion: CompletionDialog;
  private readonly mission: MissionPanel;
  private readonly dpad: DirectionPad;
  private readonly commandQueue: HTMLElement;
  private readonly commandPanel: HTMLElement;
  private readonly voiceButton: HTMLButtonElement;
  private readonly currentLevelLabel: HTMLElement;
  private readonly controlTitle: HTMLElement;
  private readonly controlHint: HTMLElement;
  private progress: ProgressData;

  constructor(
    private readonly root: HTMLElement,
    private readonly levelManager: LevelManager,
    private readonly callbacks: GameUICallbacks,
    progress: ProgressData,
  ) {
    this.progress = progress;
    root.innerHTML = `
      <div class="app-shell">
        <header class="topbar">
          <div class="brand"><span class="brand-mark" aria-hidden="true">🐰</span><div><span class="eyebrow">Khu vườn phương hướng</span><h1>Thỏ Con Thoát Mê Cung</h1></div></div>
          <div class="topbar-actions">
            <button class="level-menu-button" type="button" data-level-menu aria-label="Mở bản đồ chọn màn"><span aria-hidden="true">🗺️</span><span><small>Bản đồ</small><strong data-current-level>Màn 1</strong></span></button>
            <button class="icon-button" type="button" data-voice aria-label="Tắt giọng đọc">🔊</button>
          </div>
        </header>
        <main class="game-layout">
          <section class="play-column" aria-label="Bàn chơi">
            <div class="mission-panel" data-mission></div>
            <div class="stage-frame">
              <span class="map-axis map-axis-up" aria-hidden="true">↑ Trên</span>
              <span class="map-axis map-axis-left" aria-hidden="true">← Trái</span>
              <span class="map-axis map-axis-right" aria-hidden="true">Phải →</span>
              <span class="map-axis map-axis-down" aria-hidden="true">↓ Dưới</span>
              <div class="game-stage" data-stage></div>
            </div>
          </section>
          <aside class="control-column" aria-label="Bảng điều khiển">
            <div class="mode-switch" role="tablist" aria-label="Chế độ chơi">
              <button type="button" role="tab" data-mode="step" aria-selected="true"><span aria-hidden="true">👆</span> Từng bước</button>
              <button type="button" role="tab" data-mode="commands" aria-selected="false"><span aria-hidden="true">🧩</span> Xếp lệnh</button>
            </div>
            <div class="control-prompt"><div><span class="eyebrow">Điều khiển Thỏ</span><strong data-control-title>Con muốn đi hướng nào?</strong></div><small data-control-hint>Mỗi lần bấm, Thỏ đi 1 ô</small></div>
            <div class="dpad" data-dpad aria-label="Bốn nút điều khiển hướng"></div>
            <section class="command-panel" data-command-panel hidden aria-label="Chuỗi lệnh">
              <div class="command-heading"><strong>Chuỗi lệnh</strong><small>Chạm một lệnh để sửa</small></div>
              <div class="command-queue" data-command-queue aria-live="polite"></div>
              <div class="command-actions">
                <button class="primary-button" type="button" data-run>▶ Chạy</button>
                <button class="small-button" type="button" data-remove-command aria-label="Xóa lệnh cuối">⌫ Xóa cuối</button>
                <button class="small-button" type="button" data-clear-commands>⌧ Xóa hết</button>
              </div>
            </section>
            <div class="feedback-panel" data-feedback role="status" aria-live="polite" aria-atomic="true"></div>
            <div class="tool-grid">
              <button class="tool-button hint-button" type="button" data-hint><span aria-hidden="true">💡</span> Gợi ý</button>
              <button class="tool-button" type="button" data-undo><span aria-hidden="true">↶</span> Quay lại</button>
              <button class="tool-button" type="button" data-restart><span aria-hidden="true">↻</span> Làm lại</button>
              <button class="tool-button" type="button" data-replay-voice><span aria-hidden="true">🔈</span> Nghe lại</button>
            </div>
          </aside>
        </main>
      </div>
      <div class="modal-layer" data-level-layer hidden></div>
      <div class="modal-layer" data-completion-layer hidden></div>`;

    this.stage = this.required("[data-stage]");
    this.mission = new MissionPanel(this.required("[data-mission]"));
    this.dpad = new DirectionPad(this.required("[data-dpad]"));
    this.feedback = new FeedbackPanel(this.required("[data-feedback]"));
    this.commandQueue = this.required("[data-command-queue]");
    this.commandPanel = this.required("[data-command-panel]");
    this.voiceButton = this.required<HTMLButtonElement>("[data-voice]");
    this.currentLevelLabel = this.required("[data-current-level]");
    this.controlTitle = this.required("[data-control-title]");
    this.controlHint = this.required("[data-control-hint]");
    this.levelMenu = new LevelMenu(
      this.required("[data-level-layer]"),
      levelManager,
      callbacks.onSelectLevel,
      callbacks.onRandomLevel,
    );
    this.completion = new CompletionDialog(
      this.required("[data-completion-layer]"),
      callbacks.onNextLevel,
      callbacks.onRestart,
      () => {
        this.completion.hide();
        this.levelMenu.open(this.progress);
      },
    );
    root.addEventListener("click", this.onClick);
  }

  update(state: GameState, progress: ProgressData): void {
    this.progress = progress;
    this.mission.update(state);
    this.levelMenu.update(progress);
    this.dpad.setDisabled(state.interactionLocked || state.completed);
    this.commandPanel.hidden = state.mode !== "commands";
    this.root.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((button) => {
      const selected = button.dataset.mode === state.mode;
      button.setAttribute("aria-selected", String(selected));
      button.classList.toggle("is-selected", selected);
      if (button.dataset.mode === "commands") {
        button.disabled = !progress.commandModeUnlocked && state.currentLevel?.recommendedMode !== "commands";
      }
    });
    this.root.querySelectorAll<HTMLButtonElement>("[data-hint], [data-undo], [data-restart], [data-replay-voice], [data-run], [data-remove-command], [data-clear-commands]").forEach((button) => {
      button.disabled = state.interactionLocked;
    });
    const undoButton = this.root.querySelector<HTMLButtonElement>("[data-undo]");
    if (undoButton) undoButton.disabled = state.interactionLocked || state.history.length === 0;
    const runButton = this.root.querySelector<HTMLButtonElement>("[data-run]");
    if (runButton) runButton.disabled = state.interactionLocked || state.commandQueue.length === 0;
    this.voiceButton.textContent = state.voiceEnabled ? "🔊" : "🔇";
    this.voiceButton.setAttribute("aria-label", state.voiceEnabled ? "Tắt giọng đọc" : "Bật giọng đọc");
    const level = state.currentLevel;
    if (level) {
      const levelIndex = this.levelManager.levels.findIndex((candidate) => candidate.id === level.id);
      this.currentLevelLabel.textContent = levelIndex >= 0 ? `Màn ${levelIndex + 1}` : "Mê cung mới";
    }
    this.controlTitle.textContent = state.mode === "commands" ? "Xếp đường đi cho Thỏ" : "Con muốn đi hướng nào?";
    this.controlHint.textContent = state.mode === "commands" ? "Bấm mũi tên để thêm lệnh" : "Mỗi lần bấm, Thỏ đi 1 ô";
    this.renderCommands(state);
  }

  setFeedback(message: string, tone: FeedbackTone = "neutral"): void {
    this.feedback.show(message, tone);
  }

  showCompletion(stars: number, state: GameState): void {
    const level = state.currentLevel;
    if (!level) return;
    this.completion.show(
      stars,
      state.stepCount,
      level.optimalPathLength,
      this.levelManager.getNext(level.id) !== null,
    );
  }

  dispose(): void {
    this.root.removeEventListener("click", this.onClick);
    this.levelMenu.dispose();
    this.completion.dispose();
  }

  private readonly onClick = (event: MouseEvent): void => {
    const target = event.target as Element | null;
    if (target?.closest("[data-level-menu]")) this.levelMenu.open(this.progress);
    else if (target?.closest("[data-voice]")) this.callbacks.onToggleVoice();
    else if (target?.closest("[data-hint]")) this.callbacks.onHint();
    else if (target?.closest("[data-undo]")) this.callbacks.onUndo();
    else if (target?.closest("[data-restart]")) this.callbacks.onRestart();
    else if (target?.closest("[data-replay-voice]")) this.callbacks.onReplayVoice();
    else if (target?.closest("[data-run]")) this.callbacks.onRunCommands();
    else if (target?.closest("[data-remove-command]")) this.callbacks.onRemoveCommand();
    else if (target?.closest("[data-clear-commands]")) this.callbacks.onClearCommands();
    const modeButton = target?.closest<HTMLButtonElement>("[data-mode]");
    if (modeButton && !modeButton.disabled) this.callbacks.onMode(modeButton.dataset.mode as GameMode);
    const commandButton = target?.closest<HTMLButtonElement>("[data-command-index]");
    if (commandButton) this.callbacks.onSelectCommand(Number(commandButton.dataset.commandIndex));
  };

  private renderCommands(state: GameState): void {
    if (state.commandQueue.length === 0) {
      this.commandQueue.innerHTML = '<span class="empty-queue">Chọn các mũi tên để xếp lệnh…</span>';
      return;
    }
    this.commandQueue.innerHTML = state.commandQueue
      .map((direction, index) => {
        const classes = ["command-chip"];
        if (state.interactionLocked && index === state.currentCommandIndex) classes.push("is-running");
        if (state.commandErrorIndex === index) classes.push("is-error");
        if (state.selectedCommandIndex === index) classes.push("is-selected");
        if (state.commandErrorIndex !== null && index < state.commandErrorIndex) classes.push("is-done");
        return `<button class="${classes.join(" ")}" type="button" data-command-index="${index}" aria-label="Lệnh ${index + 1}: ${direction}"><small>${index + 1}</small>${DIRECTION_ICONS[direction]}</button>`;
      })
      .join("");
  }

  private required<T extends HTMLElement = HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing game UI element: ${selector}`);
    return element;
  }
}
