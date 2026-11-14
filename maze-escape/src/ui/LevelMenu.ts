import type { LevelManager } from "../game/LevelManager";
import type { ProgressData } from "../game/ProgressStorage";
import { difficultyConfigs } from "../maze/difficultyConfigs";
import type { Difficulty, MazeLevel } from "../maze/MazeCell";

const DIFFICULTY_META: Record<Difficulty, { icon: string; range: string; description: string }> = {
  easy: { icon: "🌱", range: "Màn 1–4", description: "Làm quen bốn hướng" },
  medium: { icon: "🌿", range: "Màn 5–8", description: "Quan sát tường và ngõ cụt" },
  hard: { icon: "🏆", range: "Màn 9–12", description: "Lên kế hoạch nhiều bước" },
};

const LEVEL_ICONS = ["⬆️", "➡️", "🐾", "↪️", "🪵", "↩️", "🥕", "🛤️", "🥕", "🧠", "🧩", "🔧"];

export class LevelMenu {
  private progress: ProgressData | null = null;
  private activeDifficulty: Difficulty = "easy";

  constructor(
    private readonly root: HTMLElement,
    private readonly levelManager: LevelManager,
    private readonly onSelect: (levelId: string) => void,
    private readonly onRandom: (difficulty: Difficulty) => void,
  ) {
    root.addEventListener("click", this.onClick);
  }

  open(progress: ProgressData): void {
    this.progress = progress;
    const recommended = this.getRecommendedLevel();
    if (recommended) this.activeDifficulty = recommended.difficulty;
    this.render();
    this.root.hidden = false;
    this.root.querySelector<HTMLButtonElement>("[data-close-levels]")?.focus();
  }

  close(): void {
    this.root.hidden = true;
  }

  update(progress: ProgressData): void {
    this.progress = progress;
    if (!this.root.hidden) this.render();
  }

  dispose(): void {
    this.root.removeEventListener("click", this.onClick);
  }

  private readonly onClick = (event: MouseEvent): void => {
    const target = event.target as Element | null;
    if (target?.closest("[data-close-levels]") || target === this.root) {
      this.close();
      return;
    }

    const difficultyButton = target?.closest<HTMLButtonElement>("[data-level-difficulty]");
    const difficulty = difficultyButton?.dataset.levelDifficulty as Difficulty | undefined;
    if (difficultyButton && difficulty && !difficultyButton.disabled) {
      this.activeDifficulty = difficulty;
      this.render();
      this.root.querySelector<HTMLButtonElement>(`[data-level-difficulty="${difficulty}"]`)?.focus();
      return;
    }

    const levelButton = target?.closest<HTMLButtonElement>("[data-level-id]");
    if (levelButton && !levelButton.disabled) {
      this.onSelect(levelButton.dataset.levelId ?? "");
      this.close();
      return;
    }

    const randomButton = target?.closest<HTMLButtonElement>("[data-random-difficulty]");
    const randomDifficulty = randomButton?.dataset.randomDifficulty as Difficulty | undefined;
    if (randomButton && randomDifficulty && !randomButton.disabled) {
      this.onRandom(randomDifficulty);
      this.close();
    }
  };

  private getRecommendedLevel(): MazeLevel | null {
    if (!this.progress) return null;
    return (
      this.levelManager.levels.find(
        (level) =>
          this.levelManager.isUnlocked(level, this.progress!) &&
          !this.progress!.completedLevelIds.includes(level.id),
      ) ?? this.levelManager.levels.at(-1) ?? null
    );
  }

  private render(): void {
    if (!this.progress) return;
    const recommended = this.getRecommendedLevel();
    const completedCount = this.progress.completedLevelIds.filter((id) => id.startsWith("level-")).length;
    const recommendedIndex = recommended ? this.levelManager.levels.indexOf(recommended) : 0;

    const difficultyTabs = (Object.keys(difficultyConfigs) as Difficulty[])
      .map((difficulty) => {
        const unlocked = this.progress!.unlockedDifficulties.includes(difficulty);
        const selected = difficulty === this.activeDifficulty;
        const meta = DIFFICULTY_META[difficulty];
        return `<button class="journey-tab ${selected ? "is-selected" : ""}" type="button" data-level-difficulty="${difficulty}" aria-selected="${selected}" ${unlocked ? "" : "disabled"}>
          <span aria-hidden="true">${unlocked ? meta.icon : "🔒"}</span>
          <span><strong>${difficultyConfigs[difficulty].label}</strong><small>${meta.range}</small></span>
        </button>`;
      })
      .join("");

    const activeLevels = this.levelManager.levels.filter(
      (level) => level.difficulty === this.activeDifficulty,
    );
    const journeyStops = activeLevels
      .map((level) => {
        const index = this.levelManager.levels.indexOf(level);
        const unlocked = this.levelManager.isUnlocked(level, this.progress!);
        const completed = this.progress!.completedLevelIds.includes(level.id);
        const stars = this.progress!.starsByLevel[level.id] ?? 0;
        const isRecommended = level.id === recommended?.id;
        const stateClass = completed ? "is-complete" : unlocked ? "is-unlocked" : "is-locked";
        return `<div class="journey-stop ${stateClass} ${isRecommended ? "is-next" : ""}">
          <button class="level-stop-button" type="button" data-level-id="${level.id}" ${unlocked ? "" : "disabled"} aria-label="Màn ${index + 1}: ${level.name}${unlocked ? "" : ", chưa mở"}">
            <span class="level-stop-node" aria-hidden="true"><span>${unlocked ? LEVEL_ICONS[index] : "🔒"}</span><b>${index + 1}</b></span>
            <span class="level-stop-copy"><small>${isRecommended ? "Chơi tiếp" : completed ? "Đã hoàn thành" : `Màn ${index + 1}`}</small><strong>${level.name}</strong><span class="level-stars" aria-label="${stars} sao">${stars > 0 ? "★".repeat(stars) + "☆".repeat(3 - stars) : "☆☆☆"}</span></span>
          </button>
        </div>`;
      })
      .join("");

    const randomButtons = (Object.keys(difficultyConfigs) as Difficulty[])
      .map((difficulty) => {
        const unlocked = this.progress!.unlockedDifficulties.includes(difficulty);
        return `<button class="random-maze-button" type="button" data-random-difficulty="${difficulty}" ${unlocked ? "" : "disabled"}>🎲 ${difficultyConfigs[difficulty].label}</button>`;
      })
      .join("");

    const activeMeta = DIFFICULTY_META[this.activeDifficulty];
    this.root.innerHTML = `<div class="modal-card level-dialog" role="dialog" aria-modal="true" aria-labelledby="level-menu-title">
      <div class="level-menu-heading">
        <div class="level-menu-title"><span class="map-pin" aria-hidden="true">🗺️</span><div><span class="eyebrow">Bản đồ hành trình</span><h2 id="level-menu-title">Chọn khu vườn</h2></div></div>
        <div class="level-menu-progress" aria-label="Đã hoàn thành ${completedCount} trên 12 màn"><strong>${completedCount}/12</strong><span>màn đã xong</span></div>
        <button class="icon-button" type="button" data-close-levels aria-label="Đóng chọn màn">✕</button>
      </div>
      ${recommended ? `<button class="continue-journey" type="button" data-level-id="${recommended.id}"><span class="continue-icon" aria-hidden="true">🐰</span><span><small>Tiếp tục hành trình</small><strong>Màn ${recommendedIndex + 1} · ${recommended.name}</strong></span><b>Chơi ngay →</b></button>` : ""}
      <div class="journey-tabs" role="tablist" aria-label="Chọn độ khó">${difficultyTabs}</div>
      <section class="journey-panel" aria-label="${difficultyConfigs[this.activeDifficulty].label}">
        <div class="journey-panel-heading"><div><strong>${activeMeta.icon} Khu ${difficultyConfigs[this.activeDifficulty].label}</strong><span>${activeMeta.description}</span></div><small>${activeMeta.range}</small></div>
        <div class="journey-map">${journeyStops}</div>
      </section>
      <div class="maze-lab"><div><strong>Muốn chơi một mê cung mới?</strong><span>Game sẽ tạo và kiểm tra đường đi trước khi mở.</span></div><div class="random-row">${randomButtons}</div></div>
    </div>`;
  }
}
