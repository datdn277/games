import type { GameState } from "../game/GameState";
import { difficultyConfigs } from "../maze/difficultyConfigs";

export class MissionPanel {
  private readonly level: HTMLElement;
  private readonly title: HTMLElement;
  private readonly instruction: HTMLElement;
  private readonly carrots: HTMLElement;
  private readonly steps: HTMLElement;
  private readonly progressFill: HTMLElement;

  constructor(private readonly root: HTMLElement) {
    root.innerHTML = `
      <div class="mission-copy">
        <span class="mission-level" data-mission-level>Màn chơi</span>
        <strong data-mission-title>Đang chuẩn bị khu vườn…</strong>
        <span data-mission-instruction></span>
      </div>
      <div class="mission-progress" aria-label="Tiến độ màn chơi">
        <div class="carrot-progress">
          <span><b aria-hidden="true">🥕</b> Cà rốt <strong data-carrots>0/0</strong></span>
          <div class="progress-track" aria-hidden="true"><i data-progress-fill></i></div>
        </div>
        <span class="step-counter" data-steps><b aria-hidden="true">🐾</b> 0 bước</span>
      </div>`;
    this.level = this.required("[data-mission-level]");
    this.title = this.required("[data-mission-title]");
    this.instruction = this.required("[data-mission-instruction]");
    this.carrots = this.required("[data-carrots]");
    this.steps = this.required("[data-steps]");
    this.progressFill = this.required("[data-progress-fill]");
  }

  update(state: GameState): void {
    const level = state.currentLevel;
    if (!level) return;
    const numericId = Number.parseInt(level.id.replace(/\D/g, ""), 10);
    const levelLabel = Number.isFinite(numericId) && level.id.startsWith("level-")
      ? `Màn ${numericId} · ${difficultyConfigs[level.difficulty].label}`
      : `Mê cung mới · ${difficultyConfigs[level.difficulty].label}`;
    const total = level.collectibles.length;
    const collected = state.collectedItemIds.length;
    this.level.textContent = levelLabel;
    this.title.textContent = level.name;
    this.instruction.textContent = level.instruction;
    this.carrots.textContent = `${collected}/${total}`;
    this.steps.innerHTML = `<b aria-hidden="true">🐾</b> ${state.stepCount} bước`;
    this.progressFill.style.width = `${total > 0 ? (collected / total) * 100 : 100}%`;
    this.carrots.closest(".carrot-progress")?.classList.toggle(
      "needs-attention",
      state.rabbitPosition.row === level.exit.row &&
        state.rabbitPosition.col === level.exit.col &&
        collected < total,
    );
  }

  private required(selector: string): HTMLElement {
    const element = this.root.querySelector<HTMLElement>(selector);
    if (!element) throw new Error(`Missing mission element: ${selector}`);
    return element;
  }
}
