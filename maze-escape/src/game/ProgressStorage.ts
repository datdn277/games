import type { Difficulty } from "../maze/MazeCell";

export type ProgressData = {
  completedLevelIds: string[];
  starsByLevel: Record<string, number>;
  unlockedDifficulties: Difficulty[];
  commandModeUnlocked: boolean;
  voiceEnabled: boolean;
  totalCarrots: number;
};

const STORAGE_KEY = "rabbit-maze-progress-v1";

export function createDefaultProgress(): ProgressData {
  return {
    completedLevelIds: [],
    starsByLevel: {},
    unlockedDifficulties: ["easy"],
    commandModeUnlocked: false,
    voiceEnabled: true,
    totalCarrots: 0,
  };
}

function isDifficulty(value: unknown): value is Difficulty {
  return value === "easy" || value === "medium" || value === "hard";
}

function sanitizeProgress(value: unknown): ProgressData {
  if (!value || typeof value !== "object") return createDefaultProgress();
  const data = value as Partial<ProgressData>;
  const completedLevelIds = Array.isArray(data.completedLevelIds)
    ? data.completedLevelIds.filter((id): id is string => typeof id === "string")
    : [];
  const rawStars = data.starsByLevel && typeof data.starsByLevel === "object" ? data.starsByLevel : {};
  const starsByLevel = Object.fromEntries(
    Object.entries(rawStars).filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === "number" && Number.isInteger(entry[1]) && entry[1] >= 1 && entry[1] <= 3,
    ),
  );
  const unlockedDifficulties = Array.isArray(data.unlockedDifficulties)
    ? data.unlockedDifficulties.filter(isDifficulty)
    : [];
  if (!unlockedDifficulties.includes("easy")) unlockedDifficulties.unshift("easy");
  return {
    completedLevelIds: [...new Set(completedLevelIds)],
    starsByLevel,
    unlockedDifficulties: [...new Set(unlockedDifficulties)],
    commandModeUnlocked: data.commandModeUnlocked === true,
    voiceEnabled: data.voiceEnabled !== false,
    totalCarrots:
      typeof data.totalCarrots === "number" && Number.isFinite(data.totalCarrots)
        ? Math.max(0, Math.floor(data.totalCarrots))
        : 0,
  };
}

export class ProgressStorage {
  constructor(private readonly storage: Storage | null = typeof localStorage === "undefined" ? null : localStorage) {}

  load(): ProgressData {
    if (!this.storage) return createDefaultProgress();
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      return raw ? sanitizeProgress(JSON.parse(raw) as unknown) : createDefaultProgress();
    } catch {
      return createDefaultProgress();
    }
  }

  save(progress: ProgressData): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(sanitizeProgress(progress)));
    } catch {
      // Storage may be blocked or full; gameplay must remain available.
    }
  }

  recordCompletion(
    progress: ProgressData,
    levelId: string,
    stars: number,
    carrotCount: number,
  ): ProgressData {
    const alreadyCompleted = progress.completedLevelIds.includes(levelId);
    const completedLevelIds = alreadyCompleted
      ? [...progress.completedLevelIds]
      : [...progress.completedLevelIds, levelId];
    const predefinedMatch = /^level-(\d+)$/.exec(levelId);
    const completedNumber = predefinedMatch?.[1] ? Number.parseInt(predefinedMatch[1], 10) : 0;
    const unlockedDifficulties = new Set(progress.unlockedDifficulties);
    if (completedNumber >= 4) unlockedDifficulties.add("medium");
    if (completedNumber >= 8) unlockedDifficulties.add("hard");
    const next = {
      ...progress,
      completedLevelIds,
      starsByLevel: {
        ...progress.starsByLevel,
        [levelId]: Math.max(progress.starsByLevel[levelId] ?? 0, Math.max(1, Math.min(3, stars))),
      },
      unlockedDifficulties: [...unlockedDifficulties],
      commandModeUnlocked: progress.commandModeUnlocked || completedNumber >= 10,
      totalCarrots: progress.totalCarrots + (alreadyCompleted ? 0 : carrotCount),
    };
    this.save(next);
    return next;
  }
}
