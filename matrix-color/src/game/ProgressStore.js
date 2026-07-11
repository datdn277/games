import { DIFFICULTY_ORDER } from "../data/levels.js";

const STORAGE_KEY = "matrix-color-progress-v1";
const DEFAULT_PROGRESS = Object.freeze({
  version: 1,
  currentDifficulty: "easy",
  unlockedDifficulty: "easy",
  completedLevels: 0,
  totalStars: 0,
  bestStars: { easy: 0, medium: 0, hard: 0 }
});

function cloneDefault() {
  return { ...DEFAULT_PROGRESS, bestStars: { ...DEFAULT_PROGRESS.bestStars } };
}

export class ProgressStore {
  constructor(storage) {
    if (arguments.length) {
      this.storage = storage;
      return;
    }
    try {
      this.storage = globalThis.localStorage ?? null;
    } catch {
      this.storage = null;
    }
  }

  load() {
    if (!this.storage) return cloneDefault();
    try {
      const parsed = JSON.parse(this.storage.getItem(STORAGE_KEY));
      if (!parsed || parsed.version !== 1 || !DIFFICULTY_ORDER.includes(parsed.currentDifficulty)) return cloneDefault();
      return {
        ...cloneDefault(),
        ...parsed,
        bestStars: { ...DEFAULT_PROGRESS.bestStars, ...(parsed.bestStars ?? {}) }
      };
    } catch {
      return cloneDefault();
    }
  }

  save(progress) {
    const safe = {
      ...cloneDefault(),
      ...progress,
      version: 1,
      bestStars: { ...DEFAULT_PROGRESS.bestStars, ...(progress.bestStars ?? {}) }
    };
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(safe));
    } catch {
      // Storage can be blocked; gameplay remains available in memory.
    }
    return safe;
  }

  recordCompletion(progress, difficulty, stars) {
    const index = DIFFICULTY_ORDER.indexOf(difficulty);
    const unlocked = DIFFICULTY_ORDER[Math.min(DIFFICULTY_ORDER.length - 1, index + 1)];
    const currentUnlockedIndex = DIFFICULTY_ORDER.indexOf(progress.unlockedDifficulty);
    const nextUnlockedIndex = Math.max(currentUnlockedIndex, DIFFICULTY_ORDER.indexOf(unlocked));
    return this.save({
      ...progress,
      currentDifficulty: difficulty,
      unlockedDifficulty: DIFFICULTY_ORDER[nextUnlockedIndex],
      completedLevels: progress.completedLevels + 1,
      totalStars: progress.totalStars + stars,
      bestStars: {
        ...progress.bestStars,
        [difficulty]: Math.max(progress.bestStars[difficulty] ?? 0, stars)
      }
    });
  }
}

export { STORAGE_KEY };
