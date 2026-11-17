import { describe, expect, it } from 'vitest';
import {
  COMPARE,
  DIRECTION,
  Game,
  LEVELS,
  PHASE,
  SUPPORT,
  generateQuestions,
  getTargetIndex,
  getTraversal,
} from '../src/gameplay.js';

const { LEFT_TO_RIGHT: left, RIGHT_TO_LEFT: right } = DIRECTION;

function startLevel(id, savedProgress) {
  const game = new Game(savedProgress, () => 0.5);
  game.startLevel(id);
  expect(game.phase).toBe(PHASE.TUTORIAL);
  game.presentQuestion();
  game.beginDirection();
  return game;
}

function solveQuestion(game) {
  const visited = [];
  game.chooseDirection(game.question.direction);
  while (game.phase === PHASE.READY_TO_JUMP) {
    const jump = game.tapPad(game.nextPadIndex);
    visited.push(jump.index);
    game.land(jump.token);
    game.continueFeedback();
  }
  expect(game.phase).toBe(PHASE.QUESTION_COMPLETE);
  return visited;
}

function enterNextQuestion(game) {
  game.nextRound();
  game.beginDirection();
}

describe('ordinal rules', () => {
  it('finds the fourth of six pads from the left', () => {
    expect(getTargetIndex(6, left, 4)).toBe(3);
  });

  it('finds the fourth of six pads from the right', () => {
    expect(getTargetIndex(6, right, 4)).toBe(2);
  });

  it('traverses indices from right to left', () => {
    expect(getTraversal(6, right)).toEqual([5, 4, 3, 2, 1, 0]);
  });

  it('generates valid questions for every level and both comparison rounds', () => {
    for (const { id } of [...LEVELS, COMPARE]) {
      for (const seed of [0, 0.5, 0.99]) {
        const questions = generateQuestions(id, () => seed);
        expect(new Set(questions.map((question) => question.id)).size).toBe(questions.length);
        for (const { kind, lilyPadCount, direction, targetOrdinal, expectedTargetIndex } of questions) {
          expect(lilyPadCount).toBeGreaterThanOrEqual(3);
          expect(lilyPadCount).toBeLessThanOrEqual(7);
          expect(targetOrdinal).toBeGreaterThanOrEqual(1);
          expect(targetOrdinal).toBeLessThanOrEqual(lilyPadCount);
          expect(expectedTargetIndex).toBe(
            kind === 'bank' ? null : getTargetIndex(lilyPadCount, direction, targetOrdinal),
          );
        }
        if (id === 5) expect(new Set(questions.map((question) => question.direction))).toEqual(new Set([left, right]));
      }
    }
  });

  it('rejects ordinals outside the available pads and unknown directions', () => {
    expect(() => getTargetIndex(6, right, 0)).toThrow(RangeError);
    expect(() => getTargetIndex(6, right, 7)).toThrow(RangeError);
    expect(() => getTargetIndex(6, 'UP', 3)).toThrow(RangeError);
  });
});

describe('counting and animation state', () => {
  it('counts the first landing as one and finishes after exactly four jumps', () => {
    const game = startLevel(COMPARE.id);
    game.chooseDirection(left);
    expect(game.counted).toEqual([]);
    expect(game.nextPadIndex).toBe(0);
    for (let index = 0; index < 4; index += 1) {
      const jump = game.tapPad(index);
      expect(jump.ordinal).toBe(index + 1);
      expect(game.counted).toHaveLength(index);
      expect(game.land(jump.token).ordinal).toBe(index + 1);
      game.continueFeedback();
    }
    expect(game.counted).toEqual([0, 1, 2, 3]);
    expect(game.phase).toBe(PHASE.QUESTION_COMPLETE);
    expect(game.tapPad(4)).toBeNull();
    expect(game.nextPadIndex).toBeNull();
  });

  it('gates input before choosing a bank, during a jump, and during landing feedback', () => {
    const game = startLevel(3);
    expect(game.tapPad(0)).toBeNull();
    game.chooseDirection(left);
    const jump = game.tapPad(0);
    expect(game.tapPad(1)).toBeNull();
    expect(game.chooseDirection(right)).toBeNull();
    expect(game.land(jump.token + 1)).toBeNull();
    expect(game.counted).toEqual([]);
    game.land(jump.token);
    expect(game.phase).toBe(PHASE.COUNTING_FEEDBACK);
    expect(game.tapPad(1)).toBeNull();
    game.continueFeedback();
    expect(game.tapPad(1).kind).toBe('jump');
  });

  it('preserves the next step after a wrong direction, skipped pad or repeated pad', () => {
    const game = startLevel(3);
    expect(game.chooseDirection(right).kind).toBe('wrong-direction');
    expect(game.phase).toBe(PHASE.INCORRECT_FEEDBACK);
    expect(game.chooseDirection(left)).toBeNull();
    game.continueFeedback();
    game.chooseDirection(left);
    expect(game.tapPad(1).kind).toBe('wrong-pad');
    expect(game.counted).toEqual([]);
    game.continueFeedback();
    game.land(game.tapPad(0).token);
    game.continueFeedback();
    expect(game.tapPad(0).kind).toBe('wrong-pad');
    expect(game.counted).toEqual([0]);
    expect(game.nextPadIndex).toBe(1);
    expect(game.progress.wrongDirection).toBe(1);
    expect(game.progress.wrongPad).toBe(2);
    expect(game.progress.stars).toBe(0);
  });

  it('invalidates a landing after reset even if a new jump has started', () => {
    const game = startLevel(2);
    game.chooseDirection(left);
    const previousJump = game.tapPad(0);
    game.resetRound();
    expect(game.phase).toBe(PHASE.QUESTION_PRESENTED);
    game.beginDirection();
    game.chooseDirection(left);
    const jump = game.tapPad(0);
    expect(game.land(previousJump.token)).toBeNull();
    expect(game.counted).toEqual([]);
    expect(game.progress.stars).toBe(0);
    game.land(jump.token);
    expect(game.counted).toEqual([0]);
    expect(game.progress.stars).toBe(1);
  });

  it('credits a question just once across repeated input, callbacks and replay', () => {
    const game = startLevel(2);
    game.chooseDirection(left);
    const jump = game.tapPad(0);
    expect(game.tapPad(0)).toBeNull();
    game.land(jump.token);
    expect(game.land(jump.token)).toBeNull();
    expect(game.tapPad(0)).toBeNull();
    game.resetRound();
    game.beginDirection();
    solveQuestion(game);
    expect(game.progress.stars).toBe(1);
    expect(game.progress.completed).toBe(1);
    expect(game.progress.levels[2].stars).toBe(1);
  });

  it('keeps a pending jump valid when resumed, without applying it during pause', () => {
    const game = startLevel(2);
    game.chooseDirection(left);
    const jump = game.tapPad(0);
    game.pause();
    expect(game.phase).toBe(PHASE.PAUSED);
    expect(game.tapPad(0)).toBeNull();
    expect(game.land(jump.token)).toBeNull();
    game.resume();
    expect(game.phase).toBe(PHASE.JUMPING);
    expect(game.land(jump.token).kind).toBe('complete');
  });
});

describe('lessons and learning support', () => {
  it('uses the same six physical indices for comparison and changes the traversal', () => {
    const game = startLevel(COMPARE.id);
    const firstPositions = Array.from({ length: game.question.lilyPadCount }, (_, index) => index);
    expect(solveQuestion(game)).toEqual([0, 1, 2, 3]);
    expect(game.comparison).toBeNull();
    enterNextQuestion(game);
    expect(Array.from({ length: game.question.lilyPadCount }, (_, index) => index)).toEqual(firstPositions);
    expect(solveQuestion(game)).toEqual([5, 4, 3, 2]);
    expect(game.comparison).toEqual({ leftIndex: 3, rightIndex: 2 });
    expect(game.progress.levels.compare.finished).toBe(true);
    game.nextRound();
    expect(game.phase).toBe(PHASE.LEVEL_COMPLETE);
  });

  it('begins with two bank-only questions, then finds the two edge pads', () => {
    const game = startLevel(1);
    for (const direction of [left, right]) {
      expect(game.question.kind).toBe('bank');
      expect(game.chooseDirection(direction)).toEqual({ kind: 'complete', direction });
      expect(game.counted).toEqual([]);
      enterNextQuestion(game);
    }
    expect(game.question.kind).toBe('edge');
    expect(solveQuestion(game)).toEqual([0]);
    enterNextQuestion(game);
    expect(game.question.kind).toBe('edge');
    expect(solveQuestion(game)).toEqual([3]);
    game.nextRound();
    expect(game.progress.levels[1]).toEqual({ completed: 4, stars: 4, finished: true });
  });

  it('adapts after successful rounds, persists progress and restores guidance when needed', () => {
    let game = startLevel(3);
    expect(game.support).toBe(SUPPORT.GUIDED);
    solveQuestion(game);
    enterNextQuestion(game);
    solveQuestion(game);
    expect(game.support).toBe(SUPPORT.ASSISTED);
    enterNextQuestion(game);
    solveQuestion(game);
    enterNextQuestion(game);
    solveQuestion(game);
    game.nextRound();

    game = startLevel(4, JSON.parse(JSON.stringify(game.progress)));
    expect(game.progress.levels[3].finished).toBe(true);
    expect(game.progress.stars).toBe(4);
    solveQuestion(game);
    expect(game.support).toBe(SUPPORT.INDEPENDENT);

    enterNextQuestion(game);
    expect(game.showHint).toBe(false);
    expect(game.useHint()).toBe(true);
    expect(game.showHint).toBe(true);
    expect(game.useHint()).toBe(false);
    game.chooseDirection(right);
    expect(game.showHint).toBe(false);
    game.tapPad(0);
    game.continueFeedback();
    expect(game.support).toBe(SUPPORT.GUIDED);
    expect(game.showHint).toBe(true);
    expect(game.progress.hints).toBe(1);
  });
});
