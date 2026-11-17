import { describe, expect, it } from 'vitest';
import { BALANCE, CAPACITY, Game, PHASE, SUPPORT } from '../src/game.js';

function openLevel(id, savedProgress) {
  const game = new Game(savedProgress);
  expect(game.startLevel(id)).toBe(true);
  expect(game.begin()).toBe(true);
  return game;
}

function settle(game, token) {
  expect(token).not.toBeNull();
  expect(game.phase).toBe(PHASE.WEIGHING);
  expect(game.finishWeigh(token)).toBe(true);
}

describe('Lesson flow', () => {
  it('asks about left-heavy, right-heavy, equal and light sides', () => {
    const game = openLevel(1);
    expect(game.answer('right')).toBe(false);
    expect(game.phase).toBe(PHASE.PREDICTING);
    expect(game.progress.stars).toBe(0);

    for (const choice of ['left', 'right', 'equal', 'left']) {
      expect(game.answer(choice)).toBe(true);
      expect(game.answer(choice)).toBeNull();
      expect(game.phase).toBe(PHASE.QUESTION_COMPLETE);
      expect(game.next()).toBe(true);
    }
    expect(game.phase).toBe(PHASE.LEVEL_COMPLETE);
    expect(game.progress).toMatchObject({ attempts: 5, wrong: 1, stars: 4, levels: { 1: { finished: true } } });
  });

  it('reveals a balance only after experimentation and counts a round once after reset', () => {
    const game = openLevel(2);
    expect(game.available).toEqual(['dog']);
    expect(game.place('dog', 'left')).toBeNull();
    expect(game.remove(game.board.left[0].id)).toBeNull();
    settle(game, game.place('dog', 'right'));
    expect(game.phase).toBe(PHASE.OBSERVING);
    expect(game.balance.state).toBe(BALANCE.LEFT_HEAVIER);
    settle(game, game.place('dog', 'right'));
    expect(game.phase).toBe(PHASE.BALANCE_FEEDBACK);
    expect(game.balance.state).toBe(BALANCE.BALANCED);
    expect(game.feedback).toContain('Hai bạn chó');
    expect(game.canExperiment).toBe(true);
    expect(game.progress.stars).toBe(0);

    settle(game, game.place('dog', 'right'));
    expect(game.balance.state).toBe(BALANCE.RIGHT_HEAVIER);
    expect(game.next()).toBe(false);
    settle(game, game.remove(game.board.right.at(-1).id));
    expect(game.balance.state).toBe(BALANCE.BALANCED);
    expect(game.next()).toBe(true);
    expect(game.phase).toBe(PHASE.QUESTION_COMPLETE);

    expect(game.reset()).toBe(true);
    settle(game, game.place('dog', 'right'));
    settle(game, game.place('dog', 'right'));
    expect(game.next()).toBe(true);
    expect(game.progress.stars).toBe(1);
  });

  it('requires each fox to be lifted and replaced, then two groups to be matched', () => {
    const game = openLevel(4);
    expect(game.balance.state).toBe(BALANCE.BALANCED);
    expect(game.available).toEqual([]);
    expect(game.place('dog', 'right')).toBeNull();

    const [firstFox, secondFox] = game.board.right;
    expect(game.move(firstFox.id, 'left')).toBeNull();
    settle(game, game.remove(firstFox.id));
    expect(game.step).toBe(1);
    expect(game.remove(secondFox.id)).toBeNull();
    settle(game, game.place('dog', 'right'));
    expect(game.balance.state).toBe(BALANCE.LEFT_HEAVIER);
    expect(game.phase).toBe(PHASE.SUBSTITUTING);
    settle(game, game.place('dog', 'right'));
    expect(game.phase).toBe(PHASE.BALANCE_FEEDBACK);
    expect(game.feedback).toContain('một cáo và hai chó');
    expect(game.next()).toBe(true);

    settle(game, game.remove(secondFox.id));
    expect(game.step).toBe(3);
    expect(game.board.right.filter(({ kind, locked }) => kind === 'dog' && locked)).toHaveLength(2);
    settle(game, game.place('dog', 'right'));
    expect(game.next()).toBe(false);
    settle(game, game.place('dog', 'right'));
    expect(game.next()).toBe(true);

    expect(game.phase).toBe(PHASE.REASONING);
    expect(game.progress.stars).toBe(0);
    expect(game.placeGroup(0, 1)).toBe(true);
    expect(game.placeGroup(0, 0)).toBe(false);
    expect(game.placeGroup(1, 1)).toBe(false);
    expect(game.placeGroup(1, 0)).toBe(true);
    expect(game.phase).toBe(PHASE.QUESTION_COMPLETE);
    expect(game.feedback).toContain('bốn bạn chó');
    expect(game.progress).toMatchObject({ stars: 1, skills: { substitution: 1 } });
  });

  it('offers progressive hints and requires both detective results', () => {
    const game = openLevel(5);
    expect(game.facts.every(({ relation }) => relation === BALANCE.BALANCED)).toBe(true);
    game.useHint();
    expect(game.hint).toContain('cân A');
    expect(game.hint).not.toContain('bốn');
    game.useHint();
    expect(game.hint).toContain('cân B');
    for (let index = 0; index < 4; index += 1) settle(game, game.place('dog', 'right'));
    expect(game.phase).toBe(PHASE.QUESTION_COMPLETE);
    expect(game.next()).toBe(true);
    expect(game.facts.every(({ relation }) => relation === BALANCE.LEFT_HEAVIER)).toBe(true);
    expect(game.answer('equal')).toBe(false);
    expect(game.answer('left')).toBe(true);
    expect(game.feedback).toContain('trâu nặng hơn chó');
    expect(game.progress).toMatchObject({ hints: 2, skills: { reasoning: 2 }, levels: { 5: { finished: true } } });
  });

  it('adapts across successful questions and preserves normalized saved progress', () => {
    const game = openLevel(1);
    for (const choice of ['left', 'right']) {
      game.answer(choice);
      game.next();
    }
    expect(game.support).toBe(SUPPORT.ASSISTED);
    const restored = openLevel(2, JSON.parse(JSON.stringify(game.progress)));
    expect(restored.progress.stars).toBe(2);
    expect(restored.progress.levels[1].completed).toBe(2);
    expect(restored.support).toBe(SUPPORT.ASSISTED);
    restored.useHint();
    restored.useHint();
    expect(restored.support).toBe(SUPPORT.GUIDED);
  });
});

describe('Interaction transactions', () => {
  it('ignores concurrent drags, invalid or canceled drops, and duplicate settling', () => {
    const game = openLevel(6);
    const firstDrag = game.beginDrag({ kind: 'dog' });
    expect(game.beginDrag({ kind: 'dog' })).toBeNull();
    expect(game.drop(firstDrag, 'outside')).toBeNull();
    expect(game.balance.state).toBe(BALANCE.EMPTY);
    expect(game.drop(firstDrag, 'left')).toBeNull();

    const canceled = game.beginDrag({ kind: 'fox' });
    expect(game.cancelDrag(canceled)).toBe(true);
    expect(game.drop(canceled, 'left')).toBeNull();
    expect(game.progress.attempts).toBe(0);

    const fresh = game.beginDrag({ kind: 'dog' });
    const weigh = game.drop(fresh, 'left');
    expect(game.drop(fresh, 'left')).toBeNull();
    expect(game.place('dog', 'right')).toBeNull();
    settle(game, weigh);
    expect(game.finishWeigh(weigh)).toBe(false);
    expect(game.board.left).toHaveLength(1);
    expect(game.progress.attempts).toBe(1);
  });

  it('supports moving, returning and capacity limits in free play', () => {
    const game = openLevel(6);
    for (let index = 0; index < CAPACITY; index += 1) settle(game, game.place('dog', 'left'));
    expect(game.canDrop('left')).toBe(false);
    expect(game.place('fox', 'left')).toBeNull();
    const dogId = game.board.left[0].id;
    settle(game, game.move(dogId, 'right'));
    expect(game.board.right[0].id).toBe(dogId);
    settle(game, game.remove(dogId));
    expect(game.board.right).toHaveLength(0);
    expect(game.reset()).toBe(true);
    expect(game.balance.state).toBe(BALANCE.EMPTY);
  });

  it('allows pause and resume while invalidating callbacks when reset during weighing', () => {
    const game = openLevel(2);
    const dragToken = game.beginDrag({ kind: 'dog' });
    game.pause();
    expect(game.drop(dragToken, 'right')).toBeNull();
    game.resume();
    expect(game.phase).toBe(PHASE.OBSERVING);

    const weighToken = game.place('dog', 'right');
    game.pause();
    expect(game.finishWeigh(weighToken)).toBe(false);
    expect(game.phase).toBe(PHASE.PAUSED);
    game.resume();
    expect(game.finishWeigh(weighToken)).toBe(true);

    const stale = game.place('dog', 'right');
    game.reset();
    const fresh = game.place('dog', 'right');
    expect(game.finishWeigh(stale)).toBe(false);
    settle(game, fresh);
    expect(game.board.right).toHaveLength(1);
    expect(game.progress.stars).toBe(0);
  });
});
