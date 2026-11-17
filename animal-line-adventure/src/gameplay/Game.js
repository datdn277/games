import { AdaptiveLearning } from './AdaptiveLearning.js';
import { countAnimal, nextCountIndex } from './CountingEngine.js';
import { GameStateMachine, STATE } from './GameStateMachine.js';
import { indexForOrdinal, isDirection } from './Ordinal.js';
import { awardStar, browserStorage, readProgress, saveProgress } from './Progress.js';
import { comparisonResult, generateQuestions, LEVELS, QuestionType, simplifyQuestion } from './Questions.js';

export { STATE };

const {
  BOOT, MAIN_MENU, LEVEL_SELECT, TUTORIAL, QUESTION_PRESENTED, CHOOSE_DIRECTION,
  CHOOSE_START, COUNTING, SELECT_ANSWER, CORRECT_FEEDBACK, INCORRECT_FEEDBACK,
  QUESTION_COMPLETE, LEVEL_COMPLETE,
} = STATE;

const validAnimalStates = new Set([CHOOSE_START, COUNTING, SELECT_ANSWER]);
const validHintStates = new Set([CHOOSE_DIRECTION, ...validAnimalStates]);
const ignored = Object.freeze({ accepted: false });

export class Game {
  #machine = new GameStateMachine();
  #storage;
  #rng;
  #adaptive;
  #attempt;
  #feedbackNext;

  constructor({ storage = browserStorage(), rng = Math.random } = {}) {
    this.#storage = storage;
    this.#rng = rng;
    this.progress = readProgress(storage);
    this.#clearLevel();
  }

  get state() { return this.#machine.state; }
  get question() { return this.questions[this.questionIndex] ?? null; }
  get activeState() { return this.#machine.activeState; }

  get support() {
    return this.question ? this.#adaptive.supportFor(this.question, this.#attempt) : 1;
  }

  get startIndex() {
    const question = this.question;
    return question ? indexForOrdinal(question.animals.length, question.direction, 1) : null;
  }

  get targetIndex() {
    const question = this.question;
    return question ? indexForOrdinal(question.animals.length, question.direction, question.targetOrdinal) : null;
  }

  get nextIndex() {
    let stage = this.activeState;
    if (stage === CORRECT_FEEDBACK || stage === INCORRECT_FEEDBACK) stage = this.#feedbackNext;
    if (stage === CHOOSE_START) return this.startIndex;
    if (stage === SELECT_ANSWER) return this.targetIndex;
    return stage === COUNTING ? nextCountIndex(this.question, this.counted) : null;
  }

  boot() {
    return this.#machine.transition(MAIN_MENU);
  }

  showMenu() {
    this.#clearLevel();
    return this.#machine.navigate(MAIN_MENU);
  }

  showLevels() {
    return this.#machine.transition(LEVEL_SELECT);
  }

  startLevel(level) {
    if (this.state === BOOT || !LEVELS.some(({ id }) => id === level)) return false;
    this.#clearLevel();
    this.level = level;
    this.questions = generateQuestions(level, this.#rng);
    this.questionIndex = 0;
    this.#adaptive = new AdaptiveLearning(level);
    this.progress.lastLevel = level;
    this.#save();
    return this.#machine.navigate(QUESTION_PRESENTED);
  }

  showTutorial() {
    return this.#machine.transition(TUTORIAL);
  }

  beginQuestion() {
    if (this.state !== QUESTION_PRESENTED && this.state !== TUTORIAL) return false;
    const next = this.question.type === QuestionType.CHOOSE_END_ANIMAL ? CHOOSE_START : CHOOSE_DIRECTION;
    return this.#machine.transition(next);
  }

  chooseDirection(direction) {
    if (this.state !== CHOOSE_DIRECTION || !isDirection(direction)) return ignored;
    const action = { kind: 'direction', direction };
    if (direction !== this.question.direction) return this.#wrong(action, 'wrongDirection');

    this.confirmedDirection = direction;
    if (this.question.type === QuestionType.CHOOSE_FLAG) return this.#solve(action);
    return this.#feedback({ ...action, index: this.startIndex }, true, CHOOSE_START);
  }

  chooseAnimal(index) {
    if (!validAnimalStates.has(this.state) || !Number.isInteger(index) ||
        index < 0 || index >= this.question.animals.length) return ignored;

    if (this.state === SELECT_ANSWER || this.question.type === QuestionType.CHOOSE_END_ANIMAL) {
      const action = { kind: 'answer', index, ordinal: this.question.targetOrdinal };
      if (index !== this.targetIndex) return this.#wrong(action, 'wrongAnswer');
      return this.#solve(action);
    }

    const action = { kind: 'count', index };
    const result = countAnimal(this.question, this.counted, index);
    if (!result.correct) return this.#wrong(action, 'wrongCount');

    this.counted = result.counted;
    return this.#feedback({ ...action, ordinal: result.ordinal }, true,
      result.done ? SELECT_ANSWER : COUNTING);
  }

  useHint() {
    if (!validHintStates.has(this.state)) return false;
    this.hinted = true;
    this.#attempt.hints += 1;
    this.progress.stats.hints += 1;
    this.#save();
    return true;
  }

  finishFeedback() {
    if (this.state !== CORRECT_FEEDBACK && this.state !== INCORRECT_FEEDBACK) return false;
    const transitioned = this.#machine.transition(this.#feedbackNext);
    this.#feedbackNext = null;
    return transitioned;
  }

  nextQuestion() {
    if (this.state !== QUESTION_COMPLETE) return false;
    if (this.questionIndex + 1 === this.questions.length) {
      return this.#machine.transition(LEVEL_COMPLETE);
    }

    this.questionIndex += 1;
    this.#clearAttempt();
    return this.#machine.transition(QUESTION_PRESENTED);
  }

  pause() { return this.#machine.pause(); }

  resume() { return this.#machine.resume(); }

  setSound(enabled) {
    this.progress.sound = Boolean(enabled);
    this.#save();
  }

  #clearLevel() {
    this.level = null;
    this.questions = [];
    this.questionIndex = -1;
    this.sessionStars = 0;
    this.#clearAttempt();
  }

  #clearAttempt() {
    this.counted = Object.freeze([]);
    this.confirmedDirection = null;
    this.hinted = false;
    this.comparison = null;
    this.#attempt = { wrongDirection: 0, wrongCount: 0, wrongAnswer: 0, hints: 0 };
    this.#feedbackNext = null;
  }

  #feedback(action, correct, next) {
    this.hinted = !correct;
    this.#feedbackNext = next;
    this.#machine.transition(correct ? CORRECT_FEEDBACK : INCORRECT_FEEDBACK);
    return { accepted: true, correct, ...action };
  }

  #wrong(action, stat) {
    this.#attempt[stat] += 1;
    this.progress.stats[stat] += 1;
    this.#save();
    return this.#feedback(action, false, this.state);
  }

  #solve(action) {
    const feedback = this.#feedback(action, true, QUESTION_COMPLETE);
    this.sessionStars += 1;
    awardStar(this.progress, this.level, this.sessionStars, this.#attempt);
    if (this.question.comparisonRound === 2) this.comparison = comparisonResult(this.question);

    const simpler = this.#adaptive.observe(this.#attempt);
    const next = this.questionIndex + 1;
    if (simpler && this.questions[next]) {
      const minimum = this.level >= 3 ? 2 : 1;
      this.questions[next] = simplifyQuestion(this.questions[next], this.question.targetOrdinal, minimum);
    }
    this.#save();
    return feedback;
  }

  #save() {
    saveProgress(this.#storage, this.progress);
  }
}
