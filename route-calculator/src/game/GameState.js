export const DEFAULT_GAME_STATE = Object.freeze({
  difficulty: "easy",
  level: null,
  currentStepIndex: 0,
  currentValue: 0,
  selectedAnswer: null,
  completed: false,
  mistakes: 0,
  hintsUsed: 0,
  hintStep: 0,
  interactionLocked: false,
  voiceEnabled: true,
  animationSpeed: 1,
});

export class GameState {
  constructor(initial = {}) {
    Object.assign(this, DEFAULT_GAME_STATE, initial);
  }

  startLevel(level) {
    this.level = level;
    this.currentStepIndex = 0;
    this.currentValue = level.startValue;
    this.selectedAnswer = null;
    this.completed = false;
    this.mistakes = 0;
    this.hintsUsed = 0;
    this.hintStep = 0;
    this.interactionLocked = true;
  }

  get currentStep() {
    return this.level?.steps[this.currentStepIndex] ?? null;
  }

  completeCurrentStep() {
    const step = this.currentStep;
    if (!step) return;
    this.currentValue = step.result;
    this.currentStepIndex += 1;
    this.selectedAnswer = null;
    this.hintStep = 0;
    this.completed = this.currentStepIndex >= this.level.steps.length;
  }
}

export function calculateStars({ mistakes, hintsUsed }) {
  if (mistakes === 0 && hintsUsed === 0) return 3;
  if (mistakes <= 2 && hintsUsed <= 1) return 2;
  return 1;
}
