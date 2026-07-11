const KEY = "train-pattern-progress-v1";
const defaults = {
  unlockedDifficulties: ["easy", "medium", "hard"],
  completedLevels: 0,
  stars: 0,
  learnedPatterns: [],
  soundEnabled: true,
};

export class ProgressStorage {
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { ...defaults };
      const parsed = JSON.parse(raw);
      return {
        ...defaults,
        ...parsed,
        unlockedDifficulties: Array.isArray(parsed.unlockedDifficulties) ? parsed.unlockedDifficulties : defaults.unlockedDifficulties,
        learnedPatterns: Array.isArray(parsed.learnedPatterns) ? parsed.learnedPatterns : [],
      };
    } catch {
      return { ...defaults };
    }
  }

  save(progress) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...defaults, ...progress }));
    } catch {
      // localStorage có thể bị chặn; game vẫn tiếp tục trong phiên hiện tại.
    }
  }
}
