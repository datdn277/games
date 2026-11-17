export const STATE = Object.freeze({
  BOOT: 'BOOT',
  MAIN_MENU: 'MAIN_MENU',
  LEVEL_SELECT: 'LEVEL_SELECT',
  TUTORIAL: 'TUTORIAL',
  QUESTION_PRESENTED: 'QUESTION_PRESENTED',
  CHOOSE_DIRECTION: 'CHOOSE_DIRECTION',
  CHOOSE_START: 'CHOOSE_START',
  COUNTING: 'COUNTING',
  SELECT_ANSWER: 'SELECT_ANSWER',
  CORRECT_FEEDBACK: 'CORRECT_FEEDBACK',
  INCORRECT_FEEDBACK: 'INCORRECT_FEEDBACK',
  QUESTION_COMPLETE: 'QUESTION_COMPLETE',
  LEVEL_COMPLETE: 'LEVEL_COMPLETE',
  PAUSED: 'PAUSED',
});

const {
  BOOT, MAIN_MENU, LEVEL_SELECT, TUTORIAL, QUESTION_PRESENTED, CHOOSE_DIRECTION,
  CHOOSE_START, COUNTING, SELECT_ANSWER, CORRECT_FEEDBACK, INCORRECT_FEEDBACK,
  QUESTION_COMPLETE, LEVEL_COMPLETE, PAUSED,
} = STATE;

const transitions = {
  [BOOT]: [MAIN_MENU],
  [MAIN_MENU]: [LEVEL_SELECT, QUESTION_PRESENTED],
  [LEVEL_SELECT]: [QUESTION_PRESENTED],
  [QUESTION_PRESENTED]: [TUTORIAL, CHOOSE_DIRECTION, CHOOSE_START],
  [TUTORIAL]: [CHOOSE_DIRECTION, CHOOSE_START],
  [CHOOSE_DIRECTION]: [CORRECT_FEEDBACK, INCORRECT_FEEDBACK],
  [CHOOSE_START]: [CORRECT_FEEDBACK, INCORRECT_FEEDBACK],
  [COUNTING]: [CORRECT_FEEDBACK, INCORRECT_FEEDBACK],
  [SELECT_ANSWER]: [CORRECT_FEEDBACK, INCORRECT_FEEDBACK],
  [CORRECT_FEEDBACK]: [CHOOSE_START, COUNTING, SELECT_ANSWER, QUESTION_COMPLETE],
  [INCORRECT_FEEDBACK]: [CHOOSE_DIRECTION, CHOOSE_START, COUNTING, SELECT_ANSWER],
  [QUESTION_COMPLETE]: [QUESTION_PRESENTED, LEVEL_COMPLETE],
  [LEVEL_COMPLETE]: [LEVEL_SELECT, QUESTION_PRESENTED],
};

const pausable = new Set([
  TUTORIAL, QUESTION_PRESENTED, CHOOSE_DIRECTION, CHOOSE_START, COUNTING,
  SELECT_ANSWER, CORRECT_FEEDBACK, INCORRECT_FEEDBACK, QUESTION_COMPLETE,
]);

export class GameStateMachine {
  #state = BOOT;
  #beforePause = null;

  get state() { return this.#state; }
  get activeState() { return this.#beforePause ?? this.#state; }

  transition(next) {
    if (!transitions[this.#state]?.includes(next)) return false;
    this.#state = next;
    return true;
  }

  navigate(next) {
    // Explicit navigation cancels the current mission and any pending feedback.
    if (![MAIN_MENU, QUESTION_PRESENTED].includes(next)) return false;
    if (this.#state === BOOT && next !== MAIN_MENU) return false;
    this.#beforePause = null;
    this.#state = next;
    return true;
  }

  pause() {
    if (!pausable.has(this.#state)) return false;
    this.#beforePause = this.#state;
    this.#state = PAUSED;
    return true;
  }

  resume() {
    if (this.#state !== PAUSED) return false;
    this.#state = this.#beforePause;
    this.#beforePause = null;
    return true;
  }
}
