import { levels } from './questions.js';

export const progressKey = 'little-explorer-3d:progress:v1';

function browserStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

function load(storage) {
  try {
    return JSON.parse(storage?.getItem(progressKey)) ?? {};
  } catch {
    return {};
  }
}

function clampStars(value, missionCount) {
  return Number.isInteger(value) ? Math.max(0, Math.min(value, missionCount)) : 0;
}

export class Progress {
  constructor(storage = browserStorage()) {
    this.storage = storage;
    const saved = load(storage);
    this.data = {
      bestByLevel: Object.fromEntries(levels.map(({ id, missionCount }) => [
        id,
        clampStars(saved.bestByLevel?.[id], missionCount),
      ])),
      completed: levels
        .filter(({ id, missionCount }) => thisLevelCompleted(saved, id, missionCount))
        .map(({ id }) => id),
      tutorial: saved.tutorial === true,
      sound: saved.sound !== false,
    };
  }

  get stars() {
    return levels.reduce((total, { id }) => total + this.best(id), 0);
  }

  get unlockedLevel() {
    return levels.find(({ id }) => !this.data.completed.includes(id))?.id ?? levels.at(-1).id;
  }

  get completedTutorial() {
    return this.data.tutorial;
  }

  get soundEnabled() {
    return this.data.sound;
  }

  get stickers() {
    return levels.filter(({ id }) => this.data.completed.includes(id));
  }

  isUnlocked(level) {
    return levels.some(({ id }) => id === level) && level <= this.unlockedLevel;
  }

  best(level) {
    return this.data.bestByLevel[level] ?? 0;
  }

  recordAnswer(level, roundStars) {
    const config = levels.find(({ id }) => id === level);
    if (!config || !this.isUnlocked(level)) return this.stars;
    const current = clampStars(roundStars, config.missionCount);
    if (current > this.best(level)) {
      this.data.bestByLevel[level] = current;
      this.save();
    }
    return this.stars;
  }

  completeLevel(level) {
    const config = levels.find(({ id }) => id === level);
    if (!config || !this.isUnlocked(level) || this.best(level) < config.missionCount) return false;
    if (this.data.completed.includes(level)) return false;
    this.data.completed.push(level);
    this.save();
    return true;
  }

  completeTutorial() {
    this.data.tutorial = true;
    this.save();
  }

  setSoundEnabled(enabled) {
    this.data.sound = Boolean(enabled);
    this.save();
  }

  save() {
    try {
      this.storage?.setItem(progressKey, JSON.stringify(this.data));
    } catch {
      // The current session still works when browser storage is unavailable.
    }
  }
}

function thisLevelCompleted(saved, id, missionCount) {
  return (Array.isArray(saved.completed) && saved.completed.includes(id))
    || clampStars(saved.bestByLevel?.[id], missionCount) === missionCount;
}
