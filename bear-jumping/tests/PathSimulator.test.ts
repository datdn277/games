import { describe, expect, it } from 'vitest';
import { GameSession } from '../src/game/GameSession';
import { GARDEN_LEVEL } from '../src/game/level';
import { PathSimulator } from '../src/game/PathSimulator';

function createSession(): GameSession {
  return new GameSession(GARDEN_LEVEL);
}

describe('PathSimulator', () => {
  const simulator = new PathSimulator();

  it('returns missing-command when the start cell has no arrow', () => {
    expect(simulator.simulate(createSession()).kind).toBe('missing-command');
  });

  it('stops before the pond to the right of the start', () => {
    const session = createSession();
    session.setCommand({ row: 0, col: 0 }, 'right');
    const outcome = simulator.simulate(session);
    expect(outcome.kind).toBe('obstacle');
    expect(outcome.steps).toHaveLength(0);
  });

  it('detects a move above the board boundary', () => {
    const session = createSession();
    session.setCommand({ row: 0, col: 0 }, 'up');
    expect(simulator.simulate(session).kind).toBe('boundary');
  });

  it('detects two commands that revisit the start', () => {
    const session = createSession();
    session.setCommand({ row: 0, col: 0 }, 'down');
    session.setCommand({ row: 1, col: 0 }, 'up');
    const outcome = simulator.simulate(session);
    expect(outcome.kind).toBe('loop');
    expect(outcome.steps).toHaveLength(2);
  });

  it('reaches the rabbit house with the ten-step sample path', () => {
    const session = createSession();
    session.setCommand({ row: 0, col: 0 }, 'down');
    for (let col = 0; col < 5; col += 1) {
      session.setCommand({ row: 1, col }, 'right');
    }
    for (let row = 1; row < 5; row += 1) {
      session.setCommand({ row, col: 5 }, 'down');
    }

    const outcome = simulator.simulate(session);
    expect(outcome.kind).toBe('success');
    expect(outcome.steps).toHaveLength(10);
    expect(outcome.terminalCell).toEqual({ row: 5, col: 5 });
  });
});
