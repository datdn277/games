export const defaultState = {
  difficulty: "easy",
  currentLevel: null,
  selectedOption: null,
  completed: false,
  mistakes: 0,
  hintsUsed: 0,
  hintStep: 0,
  soundEnabled: true,
  interactionLocked: false,
  completedLevels: 0,
  stars: 0,
};

export function calculateStars({ mistakes, hintsUsed }) {
  if (mistakes === 0 && hintsUsed === 0) return 3;
  if (mistakes <= 2 && hintsUsed <= 1) return 2;
  return 1;
}

export class GameState {
  constructor(initial = {}) {
    this.data = { ...defaultState, ...initial };
    this.listeners = new Set();
  }

  get snapshot() {
    return { ...this.data };
  }

  set(patch) {
    this.data = { ...this.data, ...patch };
    this.listeners.forEach((listener) => listener(this.snapshot));
  }

  startLevel(level) {
    this.set({ currentLevel: level, selectedOption: null, completed: false, mistakes: 0, hintsUsed: 0, hintStep: 0, interactionLocked: false });
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
