import { generateLevelQuestions, HAND_FINGER_COUNT, isCorrectAnswer, OPERATIONS } from './questions.js';

export const PHASES = Object.freeze({
  MENU: 'MENU',
  QUESTION_PRESENTED: 'QUESTION_PRESENTED',
  REMEMBER_NUMBER: 'REMEMBER_NUMBER',
  SHOW_FINGERS: 'SHOW_FINGERS',
  READY_TO_COUNT: 'READY_TO_COUNT',
  COUNTING: 'COUNTING',
  CHOOSE_ANSWER: 'CHOOSE_ANSWER',
  CORRECT_FEEDBACK: 'CORRECT_FEEDBACK',
  INCORRECT_FEEDBACK: 'INCORRECT_FEEDBACK',
  QUESTION_COMPLETE: 'QUESTION_COMPLETE',
  LEVEL_COMPLETE: 'LEVEL_COMPLETE',
});

export const LEVELS = [
  {
    id: 1,
    title: 'Làm quen bàn tay',
    description: 'Giơ ngón và tập đếm từ 1 đến 5.',
    icon: '✋',
    operation: OPERATIONS.COUNT,
    questionCount: 5,
    sticker: { id: 'magic-hand', icon: '✋', title: 'Bàn tay phép thuật' },
  },
  {
    id: 2,
    title: 'Cây cầu phép cộng',
    description: 'Đếm tiếp để giúp Mimo xây cầu.',
    icon: '🌈',
    operation: OPERATIONS.ADDITION,
    questionCount: 5,
    sticker: { id: 'rainbow-bridge', icon: '🌈', title: 'Cây cầu cầu vồng' },
  },
  {
    id: 3,
    title: 'Cầu thang phép trừ',
    description: 'Đếm lùi cùng Mimo qua từng bậc thang.',
    icon: '🪜',
    operation: OPERATIONS.SUBTRACTION,
    questionCount: 5,
    sticker: { id: 'magic-stairs', icon: '🪄', title: 'Đũa phép đếm lùi' },
  },
  {
    id: 4,
    title: 'Lâu đài Toán học',
    description: 'Cộng và trừ để mở cửa lâu đài.',
    icon: '🏰',
    operation: OPERATIONS.MIXED,
    questionCount: 6,
    sticker: { id: 'math-castle', icon: '🏰', title: 'Lâu đài Toán học' },
  },
];

export const MODES = [
  { id: 'guided', title: 'Học cùng Mimo', description: 'Mimo chỉ bé cách đếm từng bước.', icon: '🐻' },
  { id: 'independent', title: 'Bé tự tính', description: 'Bé tự chọn số ngón và đếm.', icon: '✋' },
  { id: 'challenge', title: 'Thử thách ngôi sao', description: 'Bé chinh phục màn chơi để nhận huy hiệu.', icon: '⭐' },
];

export const CHALLENGE_BADGE = { id: 'star-challenge', icon: '🏅', title: 'Huy hiệu ngôi sao' };

const SAVE_KEY = 'magic-fingers-progress-v1';
const DEFAULT_NUMBER_LINES = { guided: true, independent: true, challenge: false };
const COUNTING_PHASES = [PHASES.READY_TO_COUNT, PHASES.COUNTING];
const ANSWER_PHASES = [PHASES.CHOOSE_ANSWER, PHASES.INCORRECT_FEEDBACK];

function defaultStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

function savedValues(values, allowed) {
  return Array.isArray(values) ? [...new Set(values.filter((value) => allowed.includes(value)))] : [];
}

function loadGame(storage) {
  let data;
  try {
    data = JSON.parse(storage?.getItem(SAVE_KEY) ?? 'null');
  } catch {
    // Storage can be malformed or blocked by browser privacy settings.
  }

  const stars = data?.progress?.stars;
  const progress = {
    stars: Number.isSafeInteger(stars) && stars >= 0 ? stars : 0,
    completedLevels: savedValues(data?.progress?.completedLevels, LEVELS.map(({ id }) => id)),
    stickers: savedValues(data?.progress?.stickers, [...LEVELS.map(({ sticker }) => sticker.id), CHALLENGE_BADGE.id]),
  };
  const numberLines = { ...DEFAULT_NUMBER_LINES };
  for (const { id } of MODES) {
    const value = data?.numberLines?.[id];
    if (typeof value === 'boolean') numberLines[id] = value;
  }

  return { progress, numberLines, soundEnabled: data?.soundEnabled !== false };
}

function questionState(question = null) {
  return {
    question,
    assisted: false,
    openFingers: 0,
    fingerCountError: false,
    countedFingers: Array(HAND_FINGER_COUNT).fill(null),
    countedSteps: 0,
    nextFinger: null,
    currentValue: question?.startNumber ?? 0,
    answers: question?.answers ?? [],
    chosenAnswer: null,
  };
}

function menuState() {
  return {
    ...questionState(),
    phase: PHASES.MENU,
    level: null,
    questionIndex: 0,
    questionCount: 0,
    completedQuestions: 0,
    earnedStars: 0,
    earnedSticker: null,
    earnedChallengeBadge: null,
  };
}

function guided({ mode, assisted }) {
  return mode === 'guided' || assisted;
}

export class GameEngine {
  #storage;
  #random;
  #onChange;
  #questions = [];
  #previousId = null;
  #numberLines;

  constructor({ storage = defaultStorage(), random = Math.random, onChange = () => {} } = {}) {
    this.#storage = storage;
    this.#random = random;
    this.#onChange = onChange;

    const { progress, numberLines, soundEnabled } = loadGame(storage);
    this.#numberLines = numberLines;
    this.state = {
      ...menuState(),
      mode: 'guided',
      progress,
      soundEnabled,
      showNumberLine: this.#numberLines.guided,
    };
  }

  #update(changes) {
    const previousState = this.state;
    const state = { ...previousState, ...changes, nextFinger: null };
    if (COUNTING_PHASES.includes(state.phase) && guided(state)) {
      state.nextFinger = state.countedFingers.findIndex((value) => value === null);
    }
    this.state = state;
    this.#onChange(state, previousState);
    return true;
  }

  #persist() {
    const { progress, soundEnabled } = this.state;
    try {
      this.#storage?.setItem(SAVE_KEY, JSON.stringify({ progress, soundEnabled, numberLines: this.#numberLines }));
    } catch {
      // Keep in-memory progress available when saving is unavailable.
    }
  }

  #presentQuestion(index, overrides = {}) {
    const question = this.#questions[index];
    const mode = overrides.mode ?? this.state.mode;
    this.#previousId = question.id;
    return this.#update({
      ...questionState(question),
      ...overrides,
      phase: PHASES.QUESTION_PRESENTED,
      questionIndex: index,
      showNumberLine: this.#numberLines[mode],
    });
  }

  start(levelId, mode = this.state.mode) {
    const level = LEVELS.find(({ id }) => id === levelId);
    if (!level || !MODES.some(({ id }) => id === mode)) return false;

    this.#questions = generateLevelQuestions(level, this.#random, this.#previousId);
    return this.#presentQuestion(0, {
      level,
      mode,
      questionCount: this.#questions.length,
      completedQuestions: 0,
      earnedStars: 0,
      earnedSticker: null,
      earnedChallengeBadge: null,
    });
  }

  goHome() {
    this.#questions = [];
    return this.#update({ ...menuState(), showNumberLine: this.#numberLines[this.state.mode] });
  }

  #showFingers() {
    return this.#update({
      phase: PHASES.SHOW_FINGERS,
      openFingers: guided(this.state) ? this.state.question.fingerCount : 1,
    });
  }

  advance() {
    const { phase, question, openFingers, questionIndex, questionCount } = this.state;
    switch (phase) {
      case PHASES.QUESTION_PRESENTED:
        return question.operation === OPERATIONS.COUNT
          ? this.#showFingers()
          : this.#update({ phase: PHASES.REMEMBER_NUMBER });
      case PHASES.REMEMBER_NUMBER:
        return this.#showFingers();
      case PHASES.SHOW_FINGERS:
        if (openFingers !== question.fingerCount) {
          this.#update({ fingerCountError: true });
          return false;
        }
        return this.#update({ phase: PHASES.READY_TO_COUNT });
      case PHASES.READY_TO_COUNT:
        return this.#update({ phase: PHASES.COUNTING });
      case PHASES.CORRECT_FEEDBACK:
        return this.#update({ phase: PHASES.QUESTION_COMPLETE });
      case PHASES.QUESTION_COMPLETE:
        return questionIndex + 1 < questionCount
          ? this.#presentQuestion(questionIndex + 1)
          : this.#completeLevel();
      default:
        return false;
    }
  }

  setFingerCount(count) {
    if (this.state.phase !== PHASES.SHOW_FINGERS || guided(this.state)
      || !Number.isInteger(count) || count < 1 || count > HAND_FINGER_COUNT) return false;

    return this.#update({ openFingers: count, fingerCountError: false });
  }

  tapFinger(index) {
    const { phase, question, openFingers, countedFingers, countedSteps, nextFinger } = this.state;
    if (phase !== PHASES.COUNTING || !Number.isInteger(index) || index < 0 || index >= openFingers
      || countedFingers[index] !== null || (nextFinger !== null && index !== nextFinger)) return false;

    const currentValue = question.expectedSequence[countedSteps];
    const nextStep = countedSteps + 1;
    const fingers = [...countedFingers];
    fingers[index] = currentValue;
    return this.#update({
      phase: nextStep === question.fingerCount ? PHASES.CHOOSE_ANSWER : PHASES.COUNTING,
      countedFingers: fingers,
      countedSteps: nextStep,
      currentValue,
    });
  }

  chooseAnswer(answer) {
    const { phase, question, answers, progress, earnedStars, completedQuestions } = this.state;
    if (!ANSWER_PHASES.includes(phase) || !answers.includes(answer)) return false;

    if (!isCorrectAnswer(question, answer)) {
      return this.#update({ phase: PHASES.INCORRECT_FEEDBACK, chosenAnswer: answer });
    }

    this.#update({
      phase: PHASES.CORRECT_FEEDBACK,
      chosenAnswer: answer,
      completedQuestions: completedQuestions + 1,
      earnedStars: earnedStars + 1,
      progress: { ...progress, stars: progress.stars + 1 },
    });
    this.#persist();
    return true;
  }

  retry() {
    if (this.state.phase !== PHASES.INCORRECT_FEEDBACK) return false;

    const { question } = this.state;
    return this.#update({
      phase: PHASES.READY_TO_COUNT,
      countedFingers: Array(HAND_FINGER_COUNT).fill(null),
      countedSteps: 0,
      currentValue: question.startNumber,
      chosenAnswer: null,
    });
  }

  resetQuestion() {
    const { phase, questionIndex } = this.state;
    if (!this.state.question || [PHASES.CORRECT_FEEDBACK, PHASES.QUESTION_COMPLETE, PHASES.LEVEL_COMPLETE].includes(phase)) {
      return false;
    }
    return this.#presentQuestion(questionIndex);
  }

  requestHelp() {
    const { phase, question, openFingers } = this.state;
    if (!question || [PHASES.CORRECT_FEEDBACK, PHASES.QUESTION_COMPLETE, PHASES.LEVEL_COMPLETE].includes(phase)) {
      return false;
    }

    return this.#update({
      assisted: true,
      showNumberLine: true,
      openFingers: phase === PHASES.SHOW_FINGERS ? question.fingerCount : openFingers,
      fingerCountError: false,
    });
  }

  toggleNumberLine() {
    const showNumberLine = !this.state.showNumberLine;
    this.#numberLines[this.state.mode] = showNumberLine;
    this.#update({ showNumberLine });
    this.#persist();
    return true;
  }

  toggleSound() {
    this.#update({ soundEnabled: !this.state.soundEnabled });
    this.#persist();
    return true;
  }

  #completeLevel() {
    const { level, mode, progress } = this.state;
    const completedLevels = [...new Set([...progress.completedLevels, level.id])];
    const stickers = new Set(progress.stickers);
    const earnedSticker = stickers.has(level.sticker.id) ? null : level.sticker;
    const earnedChallengeBadge = mode === 'challenge' && !stickers.has(CHALLENGE_BADGE.id)
      ? CHALLENGE_BADGE
      : null;

    stickers.add(level.sticker.id);
    if (earnedChallengeBadge) stickers.add(earnedChallengeBadge.id);
    this.#update({
      phase: PHASES.LEVEL_COMPLETE,
      earnedSticker,
      earnedChallengeBadge,
      progress: { ...progress, completedLevels, stickers: [...stickers] },
    });
    this.#persist();
    return true;
  }
}
