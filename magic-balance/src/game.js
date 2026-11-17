import { CAPACITY, LEVELS, SUBSTITUTION_STEPS } from './levels.js';
import { ANIMALS, BALANCE, getBalance } from './weights.js';

export { ANIMALS, BALANCE, getBalance, isEquivalent, sumWeights } from './weights.js';
export { CAPACITY, LEVELS } from './levels.js';

export const PHASE = Object.freeze({
  BOOT: 'BOOT',
  MAIN_MENU: 'MAIN_MENU',
  LEVEL_SELECT: 'LEVEL_SELECT',
  TUTORIAL: 'TUTORIAL',
  QUESTION_PRESENTED: 'QUESTION_PRESENTED',
  OBSERVING: 'OBSERVING',
  PREDICTING: 'PREDICTING',
  DRAGGING: 'DRAGGING',
  WEIGHING: 'WEIGHING',
  BALANCE_FEEDBACK: 'BALANCE_FEEDBACK',
  SUBSTITUTING: 'SUBSTITUTING',
  REASONING: 'REASONING',
  QUESTION_COMPLETE: 'QUESTION_COMPLETE',
  LEVEL_COMPLETE: 'LEVEL_COMPLETE',
  PAUSED: 'PAUSED',
});

export const SUPPORT = Object.freeze({
  GUIDED: 'GUIDED',
  ASSISTED: 'ASSISTED',
  INDEPENDENT: 'INDEPENDENT',
});

const sides = ['left', 'right'];
const activeWeighing = [PHASE.OBSERVING, PHASE.SUBSTITUTING];
const validSupport = Object.values(SUPPORT);
const counter = (number) => Number.isSafeInteger(number) && number >= 0 ? number : 0;
const emptyBoard = () => ({ left: [], right: [] });
const skills = {
  compare: 'compare',
  balance: 'balance',
  substitute: 'substitution',
  detective: 'reasoning',
};

function normalize(saved) {
  return {
    version: 1,
    stars: counter(saved?.stars),
    completed: counter(saved?.completed),
    attempts: counter(saved?.attempts),
    hints: counter(saved?.hints),
    wrong: counter(saved?.wrong),
    support: validSupport.includes(saved?.support) ? saved.support : SUPPORT.GUIDED,
    cleanStreak: counter(saved?.cleanStreak),
    skills: Object.fromEntries(Object.values(skills).map((skill) => [skill, counter(saved?.skills?.[skill])])),
    levels: Object.fromEntries(LEVELS.map(({ id }) => [id, {
      completed: counter(saved?.levels?.[id]?.completed),
      stars: counter(saved?.levels?.[id]?.stars),
      finished: saved?.levels?.[id]?.finished === true,
    }])),
  };
}

export class Game {
  #serial = 0;
  #drag = null;
  #weigh = null;
  #pausedPhase = null;
  #hintIndex = 0;
  #friction = 0;
  #credited = new Set();

  constructor(savedProgress) {
    this.progress = normalize(savedProgress);
    this.phase = PHASE.BOOT;
    this.openMenu();
  }

  get question() {
    return this.level?.rounds[this.roundIndex] ?? null;
  }

  get roundCount() {
    return this.level?.rounds.length ?? 0;
  }

  get phaseBeforePause() {
    return this.#pausedPhase;
  }

  get balance() {
    return getBalance(this.board.left, this.board.right);
  }

  get support() {
    return this.progress.support;
  }

  get canExperiment() {
    return activeWeighing.includes(this.#weighingPhase());
  }

  get facts() {
    return this.question?.facts ?? [];
  }

  get knowledge() {
    return this.level?.knowledge ?? [];
  }

  get available() {
    if (this.question?.type === 'substitute' && this.step !== 1 && this.step !== 3) return [];
    return this.question?.animals ?? [];
  }

  get prompt() {
    if (this.question?.type === 'substitute') return SUBSTITUTION_STEPS[this.step].prompt;
    return this.question?.prompt ?? '';
  }

  #resetInteraction() {
    this.#drag = null;
    this.#weigh = null;
    this.#pausedPhase = null;
    this.#hintIndex = 0;
    this.#friction = 0;
    this.step = 0;
    this.groups = [null, null];
    this.feedback = '';
    this.hint = '';
    this.lastAction = null;
  }

  #open(phase) {
    this.#credited.clear();
    this.#resetInteraction();
    this.level = null;
    this.roundIndex = 0;
    this.board = emptyBoard();
    this.phase = phase;
  }

  openMenu() {
    this.#open(PHASE.MAIN_MENU);
  }

  openLevels() {
    this.#open(PHASE.LEVEL_SELECT);
  }

  #item(kind, locked) {
    return { id: `toy-${++this.#serial}`, kind, locked };
  }

  #loadRound(tutorial) {
    this.#resetInteraction();
    const { type, board } = this.question;
    this.board = Object.fromEntries(sides.map((side) => [
      side,
      board[side].map((kind) => this.#item(kind, type !== 'substitute' || side === 'left')),
    ]));
    this.phase = tutorial ? PHASE.TUTORIAL : PHASE.QUESTION_PRESENTED;
    if (!tutorial) this.#activateQuestion();
  }

  startLevel(id) {
    const level = LEVELS.find((candidate) => candidate.id === id);
    if (!level) return false;
    this.#credited.clear();
    this.level = level;
    this.roundIndex = 0;
    this.#loadRound(true);
    return true;
  }

  #activateQuestion() {
    if (this.question.type === 'compare') this.phase = PHASE.PREDICTING;
    else if (this.question.type === 'substitute') this.phase = PHASE.SUBSTITUTING;
    else this.phase = PHASE.OBSERVING;
  }

  begin() {
    if (this.phase !== PHASE.TUTORIAL) return false;
    this.phase = PHASE.QUESTION_PRESENTED;
    this.#activateQuestion();
    return true;
  }

  reset() {
    if (!this.question) return false;
    if (this.phase === PHASE.LEVEL_COMPLETE) return this.startLevel(this.level.id);
    this.#loadRound(this.phase === PHASE.TUTORIAL);
    return true;
  }

  #weighingPhase() {
    const phase = this.phase === PHASE.DRAGGING ? this.#drag.phase : this.phase;
    if (phase === PHASE.BALANCE_FEEDBACK && this.level.id === 2) return PHASE.OBSERVING;
    return phase;
  }

  canLift(id) {
    return this.canExperiment &&
      sides.some((side) => this.board[side].some((item) => item.id === id && !item.locked));
  }

  canDrop(side) {
    if (!this.canExperiment) return false;
    const sourceSide = this.#drag?.sourceSide;
    if (side === 'tray') return Boolean(sourceSide);
    if (!sides.includes(side) || sourceSide === side || this.board[side].length >= CAPACITY) return false;
    if (this.question.type === 'substitute' && (this.step === 0 || this.step === 2)) return false;
    return !this.question.target || this.question.target === side;
  }

  beginDrag(source) {
    if (this.phase === PHASE.DRAGGING || !this.canExperiment || !source) return null;
    const { id, kind } = source;
    const sourceSide = sides.find((side) => this.board[side].some((item) => item.id === id));
    const canDrag = id ? this.canLift(id) : this.available.includes(kind);
    if (!canDrag) return null;
    const token = ++this.#serial;
    this.#drag = { token, phase: this.phase, source: { id, kind }, sourceSide };
    this.phase = PHASE.DRAGGING;
    return token;
  }

  cancelDrag(token) {
    if (this.phase !== PHASE.DRAGGING || this.#drag.token !== token) return false;
    this.phase = this.#drag.phase;
    this.#drag = null;
    return true;
  }

  drop(token, side) {
    if (this.phase !== PHASE.DRAGGING || this.#drag.token !== token) return null;
    if (!this.canDrop(side)) {
      this.cancelDrag(token);
      return null;
    }

    const { source, sourceSide } = this.#drag;
    const phase = this.#weighingPhase();
    let animal;
    if (sourceSide) {
      animal = this.board[sourceSide].find((item) => item.id === source.id);
      this.board[sourceSide] = this.board[sourceSide].filter((item) => item.id !== source.id);
    } else {
      animal = this.#item(source.kind, false);
    }
    if (side !== 'tray') this.board[side] = [...this.board[side], animal];
    this.lastAction = {
      kind: side === 'tray' ? 'remove' : sourceSide ? 'move' : 'place',
      animal,
      side,
      from: sourceSide ?? 'tray',
    };
    this.progress.attempts += 1;
    this.feedback = '';
    this.hint = '';
    this.#drag = null;
    this.#weigh = { phase, token: ++this.#serial };
    this.phase = PHASE.WEIGHING;
    return this.#weigh.token;
  }

  #act(source, side) {
    const token = this.beginDrag(source);
    return token === null ? null : this.drop(token, side);
  }

  place(kind, side) {
    return this.#act({ kind }, side);
  }

  move(id, side) {
    return this.#act({ id }, side);
  }

  remove(id) {
    return this.#act({ id }, 'tray');
  }

  #setStep(step) {
    this.step = step;
    this.#hintIndex = 0;
    this.hint = '';
    this.feedback = '';
    const liftingFox = step === 0 || step === 2;
    this.board.right = this.board.right.map((item) => ({
      ...item,
      locked: item.kind !== 'fox' || !liftingFox,
    }));
    this.phase = step === 4 ? PHASE.REASONING : PHASE.SUBSTITUTING;
  }

  #observeFeedback() {
    const { state } = this.balance;
    if (state === BALANCE.EMPTY) return 'Bé thử đặt một bạn lên cân xem!';
    if (state === BALANCE.BALANCED) return 'Hai đĩa đã ngang nhau. Cân thăng bằng!';
    const side = state === BALANCE.LEFT_HEAVIER ? 'trái' : 'phải';
    return `Đĩa bên ${side} đang thấp hơn và nặng hơn.`;
  }

  finishWeigh(token) {
    if (this.phase !== PHASE.WEIGHING || this.#weigh.token !== token) return false;
    this.phase = this.#weigh.phase;
    this.#weigh = null;
    const balanced = this.balance.state === BALANCE.BALANCED;
    switch (this.question.type) {
      case 'substitute':
        if (this.step === 0 || this.step === 2) {
          this.#setStep(this.step + 1);
        } else if (balanced) {
          this.phase = PHASE.BALANCE_FEEDBACK;
          this.feedback = SUBSTITUTION_STEPS[this.step].success;
        }
        break;
      case 'balance':
      case 'detective':
        if (balanced && this.level.id === 2) {
          this.phase = PHASE.BALANCE_FEEDBACK;
          this.feedback = this.question.success;
        } else if (balanced) {
          this.#completeQuestion();
        } else if (this.level.id === 2 && this.balance.state === BALANCE.RIGHT_HEAVIER) {
          this.feedback = 'Cân nghiêng sang bên kia rồi. Đĩa nào đang thấp hơn? Bé thử bớt một bạn nhé!';
        }
        break;
      default:
        // In free play the player can keep experimenting after every result.
        break;
    }
    if (!this.feedback) this.feedback = this.#observeFeedback();
    return true;
  }

  #recordFriction() {
    this.#friction += 1;
    this.progress.cleanStreak = 0;
    if (this.#friction >= 2 || this.progress.support === SUPPORT.INDEPENDENT) {
      this.progress.support = SUPPORT.GUIDED;
    }
  }

  answer(choice) {
    if (this.phase !== PHASE.PREDICTING || !this.question.choices.some(({ id }) => id === choice)) {
      return null;
    }
    this.progress.attempts += 1;
    this.hint = '';
    if (choice === this.question.expected) {
      this.#completeQuestion();
      return true;
    }
    this.progress.wrong += 1;
    this.#recordFriction();
    this.feedback = this.facts.length
      ? 'Bé thử xem lại hai cân manh mối rồi chọn lại nhé!'
      : 'Bé nhìn lại độ cao của hai đĩa rồi thử thêm một lần nhé!';
    return false;
  }

  placeGroup(group, slot) {
    if (this.phase !== PHASE.REASONING || ![0, 1].includes(group) || ![0, 1].includes(slot) ||
      this.groups[slot] !== null || this.groups.includes(group)) return false;
    this.groups[slot] = group;
    this.progress.attempts += 1;
    this.hint = '';
    if (this.groups.every((part) => part !== null)) this.#completeQuestion();
    else this.feedback = 'Một nhóm hai chó thay được một cáo. Bé ghép nốt nhóm còn lại nhé!';
    return true;
  }

  #completeQuestion() {
    if (!this.#credited.has(this.roundIndex)) {
      this.#credited.add(this.roundIndex);
      this.progress.completed += 1;
      this.progress.stars += 1;

      const skill = this.facts.length ? 'reasoning' : skills[this.question.type];
      this.progress.skills[skill] += 1;
      const level = this.progress.levels[this.level.id];
      level.completed += 1;
      level.stars += 1;
      if (this.roundIndex + 1 === this.roundCount) level.finished = true;

      if (!this.#friction) this.progress.cleanStreak += 1;
      if (this.progress.support === SUPPORT.GUIDED && this.progress.cleanStreak >= 2) {
        this.progress.support = SUPPORT.ASSISTED;
        this.progress.cleanStreak = 0;
      } else if (this.progress.support === SUPPORT.ASSISTED && this.progress.cleanStreak >= 3) {
        this.progress.support = SUPPORT.INDEPENDENT;
        this.progress.cleanStreak = 0;
      }
    }
    this.phase = PHASE.QUESTION_COMPLETE;
    this.feedback = this.question.success;
  }

  useHint() {
    if (![PHASE.PREDICTING, PHASE.OBSERVING, PHASE.SUBSTITUTING, PHASE.REASONING].includes(this.phase)) {
      return false;
    }
    const hints = this.question.type === 'substitute' ? SUBSTITUTION_STEPS[this.step].hints : this.question.hints;
    this.hint = hints[Math.min(this.#hintIndex, hints.length - 1)];
    this.#hintIndex += 1;
    this.progress.hints += 1;
    this.#recordFriction();
    return true;
  }

  next() {
    if (this.phase === PHASE.BALANCE_FEEDBACK) {
      if (this.level.id === 2) this.#completeQuestion();
      else this.#setStep(this.step + 1);
      return true;
    }
    if (this.phase === PHASE.LEVEL_COMPLETE && this.level.id < LEVELS.length) {
      return this.startLevel(this.level.id + 1);
    }
    if (this.phase !== PHASE.QUESTION_COMPLETE) return false;
    if (this.roundIndex + 1 === this.roundCount) {
      this.phase = PHASE.LEVEL_COMPLETE;
    } else {
      this.roundIndex += 1;
      this.#loadRound(false);
    }
    return true;
  }

  pause() {
    if (!this.level || this.phase === PHASE.PAUSED) return false;
    if (this.#drag) this.cancelDrag(this.#drag.token);
    this.#pausedPhase = this.phase;
    this.phase = PHASE.PAUSED;
    return true;
  }

  resume() {
    if (this.phase !== PHASE.PAUSED) return false;
    this.phase = this.#pausedPhase;
    this.#pausedPhase = null;
    return true;
  }
}
