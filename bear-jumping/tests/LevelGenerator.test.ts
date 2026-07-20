import { describe, expect, it } from 'vitest';
import { GARDEN_LEVEL } from '../src/game/level';
import { hasReachableGoal, LevelGenerator } from '../src/game/LevelGenerator';
import { cellKey, sameCell } from '../src/game/types';

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

describe('LevelGenerator', () => {
  it('keeps the original classic layout with three ponds', () => {
    const level = new LevelGenerator(seededRandom(1)).generate({
      layout: 'classic',
      obstacleCount: 3,
    });
    expect(level.goal).toEqual(GARDEN_LEVEL.goal);
    expect(level.obstacles).toEqual(GARDEN_LEVEL.obstacles);
  });

  it('randomizes obstacles without covering the start or goal', () => {
    const level = new LevelGenerator(seededRandom(42)).generate({
      layout: 'random-obstacles',
      obstacleCount: 9,
    });
    expect(level.obstacles).toHaveLength(9);
    expect(new Set(level.obstacles.map(cellKey))).toHaveLength(9);
    expect(level.obstacles.some((cell) => sameCell(cell, level.start))).toBe(false);
    expect(level.obstacles.some((cell) => sameCell(cell, level.goal))).toBe(false);
    expect(hasReachableGoal(level)).toBe(true);
  });

  it('randomizes the goal while keeping it reachable', () => {
    const goals = new Set<string>();
    const generator = new LevelGenerator(seededRandom(456));
    for (let index = 0; index < 8; index += 1) {
      const level = generator.generate({
        layout: 'random-goal',
        obstacleCount: 6,
      });
      goals.add(cellKey(level.goal));
      expect(sameCell(level.goal, level.start)).toBe(false);
      expect(level.obstacles.some((cell) => sameCell(cell, level.goal))).toBe(false);
      expect(hasReachableGoal(level)).toBe(true);
    }
    expect(goals.size).toBeGreaterThan(1);
  });

  it('supports the maximum challenge mode with twelve reachable obstacles', () => {
    for (let seed = 20; seed < 40; seed += 1) {
      const level = new LevelGenerator(seededRandom(seed)).generate({
        layout: 'random-all',
        obstacleCount: 12,
      });
      expect(level.obstacles).toHaveLength(12);
      expect(hasReachableGoal(level)).toBe(true);
    }
  });
});
