import { describe, expect, it } from 'vitest';
import { CHALLENGE_BADGE, GameEngine, LEVELS, PHASES } from '../src/game.js';
import { createAnswers, createQuestion, generateLevelQuestions, isCorrectAnswer, OPERATIONS } from '../src/questions.js';

const { COUNT, ADDITION, SUBTRACTION } = OPERATIONS;
const random = () => 0;

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
  };
}

function setup(level = 2, mode = 'guided', storage = memoryStorage(), rng = random) {
  const game = new GameEngine({ storage, random: rng });
  game.start(level, mode);
  return game;
}

function beginCounting(game) {
  game.advance();
  if (game.state.phase === PHASES.REMEMBER_NUMBER) game.advance();
  if (game.state.mode !== 'guided') game.setFingerCount(game.state.question.fingerCount);
  game.advance();
  game.advance();
}

function countFingers(game) {
  for (let index = 0; index < game.state.openFingers; index += 1) {
    game.tapFinger(index);
  }
}

function finishLevel(game) {
  for (let index = 0; index < game.state.questionCount; index += 1) {
    beginCounting(game);
    countFingers(game);
    game.chooseAnswer(game.state.question.result);
    game.advance();
    game.advance();
  }
}

describe('arithmetic', () => {
  it.each([
    [ADDITION, 1, 4, [2, 3, 4, 5], 5],
    [SUBTRACTION, 7, 3, [6, 5, 4], 4],
    [ADDITION, 0, 1, [1], 1],
    [ADDITION, 5, 5, [6, 7, 8, 9, 10], 10],
    [SUBTRACTION, 10, 5, [9, 8, 7, 6, 5], 5],
    [SUBTRACTION, 3, 3, [2, 1, 0], 0],
    [COUNT, 0, 5, [1, 2, 3, 4, 5], 5],
  ])('counts %s from %i on %i fingers', (operation, start, fingers, sequence, result) => {
    expect(createQuestion(operation, start, fingers)).toMatchObject({ expectedSequence: sequence, result });
  });

  it.each([
    [SUBTRACTION, 3, 5],
    [ADDITION, 8, 4],
    [ADDITION, 1, 6],
    [ADDITION, 1, 0],
    [SUBTRACTION, 10.2, 1],
    [SUBTRACTION, 11, 1],
  ])('rejects %s with operands %i and %i', (operation, start, fingers) => {
    expect(createQuestion(operation, start, fingers)).toBeNull();
  });

  it.each(Array.from({ length: 11 }, (_, number) => number))('generates three distinct valid answers for %i', (result) => {
    const answers = createAnswers(result, 0, 10, random);
    expect(new Set(answers).size).toBe(3);
    expect(answers).toContain(result);
    expect(answers.every((answer) => answer >= 0 && answer <= 10)).toBe(true);
  });

  it('validates a numeric answer', () => {
    const question = createQuestion(ADDITION, 1, 4);
    expect(isCorrectAnswer(question, 5)).toBe(true);
    expect(isCorrectAnswer(question, 4)).toBe(false);
    expect(isCorrectAnswer(question, '5')).toBe(false);
  });
});

describe('question generation', () => {
  it.each(LEVELS)('creates a valid set of distinct questions for level $id', (level) => {
    const questions = generateLevelQuestions(level, random);
    const operations = new Set(questions.map(({ operation }) => operation));
    expect(questions).toHaveLength(level.questionCount);
    expect(new Set(questions.map(({ id }) => id)).size).toBe(questions.length);
    expect(operations).toEqual(new Set(level.operation === OPERATIONS.MIXED ? [ADDITION, SUBTRACTION] : [level.operation]));

    for (const question of questions) {
      const lower = question.operation === COUNT ? 1 : 0;
      const upper = question.operation === COUNT ? 5 : 10;
      expect(question.startNumber).toBeGreaterThanOrEqual(0);
      expect(question.startNumber).toBeLessThanOrEqual(10);
      expect(question.fingerCount).toBeGreaterThanOrEqual(1);
      expect(question.fingerCount).toBeLessThanOrEqual(5);
      expect(question.expectedSequence).toHaveLength(question.fingerCount);
      expect(question.expectedSequence.at(-1)).toBe(question.result);
      expect(question.expectedSequence.every((value) => value >= lower && value <= upper)).toBe(true);
      expect(question.answers).toHaveLength(3);
      expect(new Set(question.answers).size).toBe(3);
    }
  });

  it('avoids repeating the current question when restarting a level', () => {
    const game = setup();
    const previous = game.state.question.id;
    game.start(2);
    expect(game.state.question.id).not.toBe(previous);
  });
});

describe('game state machine', () => {
  it('progresses from a starting number to one unique counted step per finger', () => {
    const game = setup(3, 'guided', memoryStorage(), () => 0.4);
    const { question } = game.state;

    expect(game.state.phase).toBe(PHASES.QUESTION_PRESENTED);
    expect(game.state.currentValue).toBe(question.startNumber);
    expect(game.tapFinger(0)).toBe(false);
    expect(game.chooseAnswer(question.result)).toBe(false);
    game.advance();
    expect(game.state.phase).toBe(PHASES.REMEMBER_NUMBER);
    expect(game.state.openFingers).toBe(0);
    game.advance();
    expect(game.state.phase).toBe(PHASES.SHOW_FINGERS);
    expect(game.state.openFingers).toBe(question.fingerCount);
    game.advance();
    expect(game.state.phase).toBe(PHASES.READY_TO_COUNT);
    expect(game.state.nextFinger).toBe(0);
    expect(game.tapFinger(0)).toBe(false);
    game.advance();
    expect(game.state.phase).toBe(PHASES.COUNTING);
    expect(game.tapFinger(1)).toBe(false);
    expect(game.tapFinger(question.fingerCount)).toBe(false);
    expect(game.tapFinger(0)).toBe(true);
    expect(game.tapFinger(0)).toBe(false);
    expect(game.state.currentValue).toBe(question.startNumber - 1);
    expect(game.state.countedSteps).toBe(1);
    expect(game.chooseAnswer(question.result)).toBe(false);

    for (let index = 1; index < question.fingerCount; index += 1) {
      expect(game.state.nextFinger).toBe(index);
      expect(game.tapFinger(index)).toBe(true);
      expect(game.state.currentValue).toBe(question.startNumber - index - 1);
    }

    expect(game.state.phase).toBe(PHASES.CHOOSE_ANSWER);
    expect(game.state.currentValue).toBe(question.result);
    expect(game.chooseAnswer(question.result)).toBe(true);
    expect(game.state.phase).toBe(PHASES.CORRECT_FEEDBACK);
    expect(game.chooseAnswer(question.result)).toBe(false);
    expect(game.state.progress.stars).toBe(1);
    game.advance();
    expect(game.state.phase).toBe(PHASES.QUESTION_COMPLETE);
    game.advance();
    expect(game.state.phase).toBe(PHASES.QUESTION_PRESENTED);
    expect(game.state.questionIndex).toBe(1);
  });

  it('records a counted zero distinctly from an uncounted finger', () => {
    const game = setup(3, 'guided', memoryStorage(), () => 0.5);
    beginCounting(game);
    expect(game.state.question.result).toBe(0);
    expect(game.state.countedFingers[0]).toBeNull();
    expect(game.tapFinger(0)).toBe(true);
    expect(game.state.countedFingers[0]).toBe(0);
    expect(game.state.currentValue).toBe(0);
    expect(game.state.countedSteps).toBe(1);
    expect(game.chooseAnswer(0)).toBe(true);
  });

  it('allows another attempt without losing stars or changing the exercise', () => {
    const game = setup();
    const { question, answers } = game.state;
    beginCounting(game);
    countFingers(game);

    expect(game.chooseAnswer(answers.find((answer) => answer !== question.result))).toBe(true);
    expect(game.state.phase).toBe(PHASES.INCORRECT_FEEDBACK);
    expect(game.state.progress.stars).toBe(0);
    expect(game.advance()).toBe(false);
    expect(game.retry()).toBe(true);
    expect(game.state.phase).toBe(PHASES.READY_TO_COUNT);
    expect(game.state.currentValue).toBe(question.startNumber);
    expect(game.state.countedSteps).toBe(0);
    expect(game.state.question).toBe(question);
    expect(game.state.answers).toBe(answers);
    game.advance();
    countFingers(game);
    expect(game.chooseAnswer(question.result)).toBe(true);
    expect(game.state.progress.stars).toBe(1);
  });

  it('lets a child change an incorrect answer without counting again', () => {
    const game = setup();
    const { question, answers } = game.state;
    beginCounting(game);
    countFingers(game);
    game.chooseAnswer(answers.find((answer) => answer !== question.result));
    expect(game.chooseAnswer(question.result)).toBe(true);
    expect(game.state.phase).toBe(PHASES.CORRECT_FEEDBACK);
  });

  it('starts with finger recognition in level one and can reset a question', () => {
    const game = setup(1);
    const { question } = game.state;
    game.advance();
    expect(game.state.phase).toBe(PHASES.SHOW_FINGERS);
    game.advance();
    game.advance();
    game.tapFinger(0);
    expect(game.state.currentValue).toBe(1);
    expect(game.resetQuestion()).toBe(true);
    expect(game.state.phase).toBe(PHASES.QUESTION_PRESENTED);
    expect(game.state.question).toBe(question);
    expect(game.state.currentValue).toBe(0);
    expect(game.state.openFingers).toBe(0);
    expect(game.state.countedFingers.every((finger) => finger === null)).toBe(true);
    expect(game.state.completedQuestions).toBe(0);
    expect(game.state.progress.stars).toBe(0);
  });

  it('validates manual finger selection and lets independent players count in any order', () => {
    const game = setup(2, 'independent');
    const { question } = game.state;
    game.advance();
    game.advance();
    const wrong = question.fingerCount === 1 ? 2 : 1;
    expect(game.setFingerCount(wrong)).toBe(true);
    expect(game.setFingerCount(6)).toBe(false);
    expect(game.advance()).toBe(false);
    expect(game.state.fingerCountError).toBe(true);
    expect(game.state.phase).toBe(PHASES.SHOW_FINGERS);
    expect(game.setFingerCount(question.fingerCount)).toBe(true);
    expect(game.state.fingerCountError).toBe(false);
    game.advance();
    game.advance();
    expect(game.state.nextFinger).toBeNull();

    for (let index = question.fingerCount - 1; index >= 0; index -= 1) {
      expect(game.tapFinger(index)).toBe(true);
    }
    expect(game.state.countedFingers[question.fingerCount - 1]).toBe(question.startNumber + 1);
    expect(game.state.currentValue).toBe(question.result);
    expect(game.state.phase).toBe(PHASES.CHOOSE_ANSWER);
  });

  it('helps on a challenge without making the next question guided', () => {
    const game = setup(4, 'challenge');
    expect(game.state.showNumberLine).toBe(false);
    expect(game.state.assisted).toBe(false);
    game.advance();
    game.advance();
    expect(game.requestHelp()).toBe(true);
    expect(game.state.showNumberLine).toBe(true);
    expect(game.state.assisted).toBe(true);
    expect(game.state.openFingers).toBe(game.state.question.fingerCount);
    game.advance();
    expect(game.state.nextFinger).toBe(0);
    game.advance();
    countFingers(game);
    game.chooseAnswer(game.state.question.result);
    game.advance();
    game.advance();
    expect(game.state.assisted).toBe(false);
    expect(game.state.showNumberLine).toBe(false);
  });
});

describe('saving', () => {
  it('saves earned stars, level and challenge rewards, sound and number line preferences', () => {
    const storage = memoryStorage();
    const game = setup(4, 'challenge', storage);
    const { level } = game.state;
    game.toggleSound();
    game.toggleNumberLine();
    finishLevel(game);
    expect(game.state.phase).toBe(PHASES.LEVEL_COMPLETE);
    expect(game.state.earnedStars).toBe(level.questionCount);
    expect(game.state.earnedSticker).toBe(level.sticker);
    expect(game.state.earnedChallengeBadge).toBe(CHALLENGE_BADGE);

    const loaded = setup(4, 'challenge', storage);
    expect(loaded.state.soundEnabled).toBe(false);
    expect(loaded.state.showNumberLine).toBe(true);
    expect(loaded.state.progress).toEqual({
      stars: level.questionCount,
      completedLevels: [level.id],
      stickers: [level.sticker.id, CHALLENGE_BADGE.id],
    });
    finishLevel(loaded);
    expect(loaded.state.earnedSticker).toBeNull();
    expect(loaded.state.earnedChallengeBadge).toBeNull();
    expect(loaded.state.progress.stars).toBe(2 * level.questionCount);
    expect(loaded.state.progress.completedLevels).toEqual([level.id]);
    expect(loaded.state.progress.stickers).toEqual([level.sticker.id, CHALLENGE_BADGE.id]);
  });
});
