export type ProgressData = {
  completedLessons: string[];
  badges: string[];
  starsByLesson: Record<string, number>;
  voiceEnabled: boolean;
  preferredHintLevel: number;
};

const STORAGE_KEY = "chess-academy-progress-v1";

const defaults = (): ProgressData => ({
  completedLessons: [],
  badges: [],
  starsByLesson: {},
  voiceEnabled: true,
  preferredHintLevel: 0,
});

export class ProgressStorage {
  load(): ProgressData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaults();
      const parsed = JSON.parse(raw) as Partial<ProgressData>;
      if (!Array.isArray(parsed.completedLessons) || !Array.isArray(parsed.badges)) return defaults();
      return {
        completedLessons: parsed.completedLessons.filter((id): id is string => typeof id === "string"),
        badges: parsed.badges.filter((id): id is string => typeof id === "string"),
        starsByLesson: parsed.starsByLesson && typeof parsed.starsByLesson === "object" ? parsed.starsByLesson : {},
        voiceEnabled: typeof parsed.voiceEnabled === "boolean" ? parsed.voiceEnabled : true,
        preferredHintLevel: typeof parsed.preferredHintLevel === "number" ? parsed.preferredHintLevel : 0,
      };
    } catch {
      return defaults();
    }
  }

  save(data: ProgressData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // The game remains playable when storage is unavailable.
    }
  }

  completeLesson(data: ProgressData, lessonId: string, stars: number): ProgressData {
    const completedLessons = data.completedLessons.includes(lessonId)
      ? data.completedLessons
      : [...data.completedLessons, lessonId];
    return {
      ...data,
      completedLessons,
      starsByLesson: {
        ...data.starsByLesson,
        [lessonId]: Math.max(data.starsByLesson[lessonId] ?? 0, stars),
      },
      preferredHintLevel: completedLessons.length >= 6 ? 0 : data.preferredHintLevel,
    };
  }
}

export function calculateStars(mistakes: number, hintsUsed: number): number {
  if (mistakes === 0 && hintsUsed === 0) return 3;
  if (mistakes <= 2 && hintsUsed <= 1) return 2;
  return 1;
}
