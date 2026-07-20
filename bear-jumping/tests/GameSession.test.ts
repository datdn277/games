import { describe, expect, it } from 'vitest';
import { GameSession } from '../src/game/GameSession';
import { GARDEN_LEVEL } from '../src/game/level';

describe('GameSession', () => {
  it('does not place a command on a pond', () => {
    const session = new GameSession(GARDEN_LEVEL);
    expect(session.setCommand({ row: 0, col: 1 }, 'down')).toEqual({
      ok: false,
      reason: 'obstacle',
    });
  });

  it('does not place a command on the rabbit house', () => {
    const session = new GameSession(GARDEN_LEVEL);
    expect(session.setCommand({ row: 5, col: 5 }, 'left')).toEqual({
      ok: false,
      reason: 'goal',
    });
  });

  it('replaces an old command in the same cell', () => {
    const session = new GameSession(GARDEN_LEVEL);
    expect(session.setCommand({ row: 0, col: 0 }, 'down')).toEqual({ ok: true, replaced: false });
    expect(session.setCommand({ row: 0, col: 0 }, 'left')).toEqual({ ok: true, replaced: true });
    expect(session.getCommand({ row: 0, col: 0 })).toBe('left');
    expect(session.getCommands()).toHaveLength(1);
  });

  it('deletes a command', () => {
    const session = new GameSession(GARDEN_LEVEL);
    session.setCommand({ row: 0, col: 0 }, 'down');
    expect(session.deleteCommand({ row: 0, col: 0 })).toBe(true);
    expect(session.getCommand({ row: 0, col: 0 })).toBeUndefined();
  });
});
