const STORAGE_KEY = "fruit-route-progress-v1";

export const DEFAULT_PROGRESS = Object.freeze({
  difficulty: "easy",
  completedLevels: { easy: 0, medium: 0, hard: 0 },
  stars: { easy: 0, medium: 0, hard: 0 },
  totalStars: 0,
  voiceEnabled: true,
  animationSpeed: 1,
});

export class ProgressStorage {
  load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!parsed || typeof parsed !== "object") return structuredClone(DEFAULT_PROGRESS);
      return {
        ...structuredClone(DEFAULT_PROGRESS),
        ...parsed,
        completedLevels: { ...DEFAULT_PROGRESS.completedLevels, ...parsed.completedLevels },
        stars: { ...DEFAULT_PROGRESS.stars, ...parsed.stars },
      };
    } catch {
      return structuredClone(DEFAULT_PROGRESS);
    }
  }

  save(progress) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
      return true;
    } catch {
      return false;
    }
  }

  recordCompletion(progress, difficulty, stars) {
    progress.completedLevels[difficulty] = (progress.completedLevels[difficulty] ?? 0) + 1;
    progress.stars[difficulty] = (progress.stars[difficulty] ?? 0) + stars;
    progress.totalStars = Object.values(progress.stars).reduce((sum, value) => sum + value, 0);
    this.save(progress);
  }
}
