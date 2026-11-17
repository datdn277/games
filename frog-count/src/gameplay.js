export const DIRECTION = Object.freeze({
  LEFT_TO_RIGHT: 'LEFT_TO_RIGHT',
  RIGHT_TO_LEFT: 'RIGHT_TO_LEFT',
});

export const PHASE = Object.freeze({
  BOOT: 'BOOT',
  MAIN_MENU: 'MAIN_MENU',
  LEVEL_SELECT: 'LEVEL_SELECT',
  TUTORIAL: 'TUTORIAL',
  QUESTION_PRESENTED: 'QUESTION_PRESENTED',
  SELECT_DIRECTION: 'SELECT_DIRECTION',
  READY_TO_JUMP: 'READY_TO_JUMP',
  JUMPING: 'JUMPING',
  COUNTING_FEEDBACK: 'COUNTING_FEEDBACK',
  QUESTION_COMPLETE: 'QUESTION_COMPLETE',
  INCORRECT_FEEDBACK: 'INCORRECT_FEEDBACK',
  LEVEL_COMPLETE: 'LEVEL_COMPLETE',
  PAUSED: 'PAUSED',
});

export const SUPPORT = Object.freeze({
  GUIDED: 'GUIDED',
  ASSISTED: 'ASSISTED',
  INDEPENDENT: 'INDEPENDENT',
});

const { LEFT_TO_RIGHT: left, RIGHT_TO_LEFT: right } = DIRECTION;

export const LEVELS = [
  {
    id: 1,
    title: 'Làm quen hai bờ',
    description: 'Tìm bờ trái, bờ phải và những lá sen ngoài cùng.',
    rounds: [
      [3, left, 1, 'bank'], [3, right, 1, 'bank'],
      [4, left, 1, 'edge'], [4, right, 1, 'edge'],
    ],
  },
  {
    id: 2,
    title: 'Ếch tập đếm',
    description: 'Cùng Froggy tập đếm từ một đến ba.',
    rounds: [[3, left, 1], [4, left, 2], [4, left, 3]],
  },
  {
    id: 3,
    title: 'Nhảy từ bờ trái',
    description: 'Bắt đầu ở bờ trái và đếm từng lá sen.',
    rounds: [[5, left, 2], [5, left, 3], [6, left, 4], [6, left, 5]],
  },
  {
    id: 4,
    title: 'Nhảy từ bờ phải',
    description: 'Bắt đầu ở bờ phải và đếm từng lá sen.',
    rounds: [[5, right, 2], [5, right, 3], [6, right, 4], [6, right, 5]],
  },
  {
    id: 5,
    title: 'Thử thách hai bờ',
    description: 'Nghe câu hỏi và tìm lá sen từ một trong hai bờ.',
    rounds: [[6, left, 3], [7, right, 4], [7, left, 5], [6, right, 2]],
  },
];

export const COMPARE = {
  id: 'compare',
  title: 'Đổi bờ – Đổi hướng',
  description: 'Tìm lá thứ tư từ cả hai bờ để xem Froggy đáp xuống đâu.',
  rounds: [[6, left, 4], [6, right, 4]],
};

const allLevels = [...LEVELS, COMPARE];
const directions = Object.values(DIRECTION);
const supportLevels = Object.values(SUPPORT);

export function getTargetIndex(lilyPadCount, direction, targetOrdinal) {
  if (!Number.isInteger(lilyPadCount) || !Number.isInteger(targetOrdinal)
    || targetOrdinal < 1 || targetOrdinal > lilyPadCount || !directions.includes(direction)) {
    throw new RangeError('Invalid ordinal or direction');
  }
  return direction === left ? targetOrdinal - 1 : lilyPadCount - targetOrdinal;
}

export function getTraversal(lilyPadCount, direction) {
  getTargetIndex(lilyPadCount, direction, 1);
  return Array.from(
    { length: lilyPadCount },
    (_, index) => getTargetIndex(lilyPadCount, direction, index + 1),
  );
}

export function generateQuestions(levelId, random = Math.random) {
  const level = allLevels.find(({ id }) => id === levelId);
  if (!level) return [];

  const questions = level.rounds.map(([lilyPadCount, direction, targetOrdinal, kind = 'ordinal'], index) => ({
    id: `question-${levelId}-${index + 1}`,
    kind,
    lilyPadCount,
    direction,
    targetOrdinal,
    expectedTargetIndex: kind === 'bank' ? null : getTargetIndex(lilyPadCount, direction, targetOrdinal),
  }));

  if (levelId === 5) {
    for (let index = questions.length - 1; index > 0; index -= 1) {
      const other = Math.floor(random() * (index + 1));
      [questions[index], questions[other]] = [questions[other], questions[index]];
    }
  }

  return questions;
}

function safeCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

export function normalizeProgress(saved) {
  return {
    version: 1,
    stars: safeCount(saved?.stars),
    completed: safeCount(saved?.completed),
    wrongDirection: safeCount(saved?.wrongDirection),
    wrongPad: safeCount(saved?.wrongPad),
    hints: safeCount(saved?.hints),
    support: supportLevels.includes(saved?.support) ? saved.support : SUPPORT.GUIDED,
    cleanStreak: safeCount(saved?.cleanStreak),
    struggleStreak: safeCount(saved?.struggleStreak),
    levels: Object.fromEntries(allLevels.map(({ id }) => {
      const level = saved?.levels?.[id];
      return [id, {
        completed: safeCount(level?.completed),
        stars: safeCount(level?.stars),
        finished: level?.finished === true,
      }];
    })),
  };
}

export class Game {
  #random;
  #questions = [];
  #solved = new Set();
  #jumpSerial = 0;
  #pendingJump = null;
  #feedbackPhase = null;
  #pausedPhase = null;
  #hintRequested = false;
  #friction = 0;

  constructor(savedProgress, random = Math.random) {
    this.#random = random;
    this.progress = normalizeProgress(savedProgress);
    this.phase = PHASE.BOOT;
    this.openMenu();
  }

  get question() {
    return this.#questions[this.roundIndex] ?? null;
  }

  get roundCount() {
    return this.#questions.length;
  }

  get nextPadIndex() {
    const question = this.question;
    if (!question || question.kind === 'bank' || this.counted.length >= question.targetOrdinal) {
      return null;
    }
    return getTargetIndex(question.lilyPadCount, question.direction, this.counted.length + 1);
  }

  get support() {
    return this.level?.id === 1 || this.level?.id === 2 ? SUPPORT.GUIDED : this.progress.support;
  }

  get showHint() {
    const activePhase = this.phase === PHASE.INCORRECT_FEEDBACK ? this.#feedbackPhase : this.phase;
    if (activePhase === PHASE.SELECT_DIRECTION) return this.#hintRequested;
    if (activePhase !== PHASE.READY_TO_JUMP) return false;
    return this.#hintRequested || this.support === SUPPORT.GUIDED;
  }

  get comparison() {
    if (this.level?.id !== COMPARE.id || this.#solved.size < this.roundCount) return null;
    const [fromLeft, fromRight] = this.#questions;
    return { leftIndex: fromLeft.expectedTargetIndex, rightIndex: fromRight.expectedTargetIndex };
  }

  #clearRound() {
    this.counted = [];
    this.feedback = null;
    this.#pendingJump = null;
    this.#feedbackPhase = null;
    this.#pausedPhase = null;
    this.#hintRequested = false;
    this.#friction = 0;
  }

  #goToMenu(phase) {
    this.#clearRound();
    this.#questions = [];
    this.#solved.clear();
    this.level = null;
    this.roundIndex = 0;
    this.phase = phase;
  }

  openMenu() {
    this.#goToMenu(PHASE.MAIN_MENU);
  }

  openLevelSelect() {
    this.#goToMenu(PHASE.LEVEL_SELECT);
  }

  startLevel(levelId) {
    const level = allLevels.find(({ id }) => id === levelId);
    if (!level) return false;
    this.#clearRound();
    this.#solved.clear();
    this.level = level;
    this.roundIndex = 0;
    this.#questions = generateQuestions(levelId, this.#random);
    this.phase = PHASE.TUTORIAL;
    return true;
  }

  presentQuestion() {
    if (this.phase !== PHASE.TUTORIAL) return false;
    this.phase = PHASE.QUESTION_PRESENTED;
    return true;
  }

  beginDirection() {
    if (this.phase !== PHASE.QUESTION_PRESENTED) return false;
    this.phase = PHASE.SELECT_DIRECTION;
    return true;
  }

  #recordFriction(stat) {
    this.progress[stat] += 1;
    this.#friction += 1;
    this.progress.cleanStreak = 0;
    if (this.#friction >= 2) this.progress.support = SUPPORT.GUIDED;
  }

  #wrongInput(feedback, stat) {
    this.#recordFriction(stat);
    this.#feedbackPhase = this.phase;
    this.phase = PHASE.INCORRECT_FEEDBACK;
    this.feedback = feedback;
    return feedback;
  }

  chooseDirection(direction) {
    if (this.phase !== PHASE.SELECT_DIRECTION || !directions.includes(direction)) return null;
    if (direction !== this.question.direction) {
      return this.#wrongInput({ kind: 'wrong-direction', direction }, 'wrongDirection');
    }
    this.#hintRequested = false;
    this.feedback = null;
    if (this.question.kind === 'bank') {
      return this.#completeRound({ kind: 'complete', direction });
    }
    this.phase = PHASE.READY_TO_JUMP;
    return { kind: 'start', direction };
  }

  tapPad(index) {
    if (this.phase !== PHASE.READY_TO_JUMP || !Number.isInteger(index)
      || index < 0 || index >= this.question.lilyPadCount) return null;
    if (index !== this.nextPadIndex) {
      return this.#wrongInput({ kind: 'wrong-pad', index }, 'wrongPad');
    }
    this.#hintRequested = false;
    const jump = { kind: 'jump', token: ++this.#jumpSerial, index, ordinal: this.counted.length + 1 };
    this.#pendingJump = jump;
    this.phase = PHASE.JUMPING;
    return jump;
  }

  land(token) {
    if (this.phase !== PHASE.JUMPING || this.#pendingJump?.token !== token) return null;
    const { index, ordinal } = this.#pendingJump;
    this.#pendingJump = null;
    this.counted.push(index);
    if (ordinal === this.question.targetOrdinal) {
      return this.#completeRound({ kind: 'complete', index, ordinal });
    }
    this.phase = PHASE.COUNTING_FEEDBACK;
    this.feedback = { kind: 'counted', index, ordinal };
    return this.feedback;
  }

  continueFeedback() {
    if (this.phase === PHASE.INCORRECT_FEEDBACK) {
      this.phase = this.#feedbackPhase;
    } else if (this.phase === PHASE.COUNTING_FEEDBACK) {
      this.phase = PHASE.READY_TO_JUMP;
    } else {
      return false;
    }
    this.#feedbackPhase = null;
    this.feedback = null;
    return true;
  }

  useHint() {
    if (![PHASE.SELECT_DIRECTION, PHASE.READY_TO_JUMP].includes(this.phase) || this.#hintRequested) {
      return false;
    }
    this.#hintRequested = true;
    this.#recordFriction('hints');
    return true;
  }

  #adaptSupport() {
    if (this.#friction > 0) {
      this.progress.struggleStreak += 1;
      if (this.progress.struggleStreak >= 2) this.progress.support = SUPPORT.GUIDED;
      return;
    }
    this.progress.struggleStreak = 0;
    if (this.question.kind !== 'ordinal') return;

    this.progress.cleanStreak += 1;
    if (this.progress.support === SUPPORT.GUIDED && this.progress.cleanStreak >= 2) {
      this.progress.support = SUPPORT.ASSISTED;
      this.progress.cleanStreak = 0;
    } else if (this.progress.support === SUPPORT.ASSISTED && this.progress.cleanStreak >= 3) {
      this.progress.support = SUPPORT.INDEPENDENT;
      this.progress.cleanStreak = 0;
    }
  }

  #completeRound(feedback) {
    if (!this.#solved.has(this.roundIndex)) {
      this.#solved.add(this.roundIndex);
      this.progress.completed += 1;
      this.progress.stars += 1;
      const levelProgress = this.progress.levels[this.level.id];
      levelProgress.completed += 1;
      levelProgress.stars += 1;
      if (this.#solved.size === this.roundCount) levelProgress.finished = true;
      this.#adaptSupport();
    }
    this.phase = PHASE.QUESTION_COMPLETE;
    this.feedback = feedback;
    return feedback;
  }

  resetRound() {
    if (!this.question || this.phase === PHASE.LEVEL_COMPLETE) return false;
    this.#clearRound();
    this.phase = PHASE.QUESTION_PRESENTED;
    return true;
  }

  nextRound() {
    if (this.phase !== PHASE.QUESTION_COMPLETE) return false;
    if (this.roundIndex + 1 === this.roundCount) {
      this.phase = PHASE.LEVEL_COMPLETE;
      return true;
    }
    this.#clearRound();
    this.roundIndex += 1;
    this.phase = PHASE.QUESTION_PRESENTED;
    return true;
  }

  pause() {
    if (!this.level || this.phase === PHASE.PAUSED) return false;
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
