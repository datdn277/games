import { LEVELS } from './Questions.js';

const storageKey = 'animal-line-adventure-progress-v1';

export function browserStorage() {
  try {
    return globalThis.window?.localStorage;
  } catch {
    return undefined;
  }
}

function validCount(value, max = Number.MAX_SAFE_INTEGER) {
  return Number.isSafeInteger(value) && value >= 0 ? Math.min(value, max) : 0;
}

export function readProgress(storage) {
  let saved;
  try {
    saved = JSON.parse(storage?.getItem(storageKey) ?? 'null');
  } catch {
    // Progress remains available in memory if storage is disabled.
  }

  const levelStars = Object.fromEntries(LEVELS.map(({ id, questionCount }) => [
    id, validCount(saved?.levelStars?.[id], questionCount),
  ]));
  const completedLevels = LEVELS
    .filter(({ id, questionCount }) => levelStars[id] === questionCount)
    .map(({ id }) => id);

  return {
    stars: Object.values(levelStars).reduce((total, stars) => total + stars, 0),
    levelStars,
    completedLevels,
    lastLevel: LEVELS.some(({ id }) => id === saved?.lastLevel) ? saved.lastLevel : 1,
    stats: {
      firstTry: validCount(saved?.stats?.firstTry),
      wrongDirection: validCount(saved?.stats?.wrongDirection),
      wrongCount: validCount(saved?.stats?.wrongCount),
      wrongAnswer: validCount(saved?.stats?.wrongAnswer),
      hints: validCount(saved?.stats?.hints),
      completedQuestions: validCount(saved?.stats?.completedQuestions),
    },
    sound: saved?.sound !== false,
  };
}

export function saveProgress(storage, progress) {
  try {
    storage?.setItem(storageKey, JSON.stringify(progress));
  } catch {
    // Progress remains available until the page closes.
  }
}

export function awardStar(progress, level, sessionStars, attempt) {
  const record = progress.levelStars[level];
  if (sessionStars > record) {
    progress.levelStars[level] = sessionStars;
    progress.stars += sessionStars - record;
  }
  if (sessionStars === LEVELS[level - 1].questionCount && !progress.completedLevels.includes(level)) {
    progress.completedLevels.push(level);
    progress.completedLevels.sort((first, second) => first - second);
  }
  if (attempt.wrongDirection + attempt.wrongCount + attempt.wrongAnswer === 0) {
    progress.stats.firstTry += 1;
  }
  progress.stats.completedQuestions += 1;
}
