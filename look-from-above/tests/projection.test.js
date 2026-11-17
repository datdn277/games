import { describe, expect, it } from 'vitest';
import { COLORS, LEVELS, compareGrids, getAnswerOptions, getColumns, getTopView } from '../src/game.js';

const { WHITE, DARK } = COLORS;
const cube = (x, y, z, topColor, sideColor = topColor) => ({ x, y, z, topColor, sideColor });
const board = { minX: -1, maxX: 1, minZ: -1, maxZ: 1 };

describe('top projection', () => {
  it('projects a single cube to one square and keeps the rest of a fixed board empty', () => {
    const cubes = [cube(0, 0, 0, WHITE, DARK)];
    expect(getTopView(cubes)).toEqual([[WHITE]]);
    expect(getTopView(cubes, board)).toEqual([
      [null, null, null],
      [null, WHITE, null],
      [null, null, null],
    ]);
  });

  it('keeps +X to the right and -Z at the top for separate cubes on the same level', () => {
    const cubes = [cube(-1, 0, 0, DARK), cube(1, 0, -1, WHITE), cube(0, 0, 1, DARK)];
    expect(getTopView(cubes, board)).toEqual([
      [null, null, WHITE],
      [DARK, null, null],
      [null, DARK, null],
    ]);
  });

  it('uses the highest top color even when the upper cube comes first in the input', () => {
    const base = cube(0, 0, 0, WHITE);
    const top = cube(0, 2, 0, DARK, WHITE);
    const middle = cube(0, 1, 0, WHITE);
    const cubes = [top, base, middle];
    expect(getTopView(cubes)).toEqual([[DARK]]);
    expect(getColumns(cubes)).toEqual([{ x: 0, z: 0, visible: top, hidden: [middle, base] }]);
    expect(cubes).toEqual([top, base, middle]);
  });

  it('rejects occupied coordinates and out-of-bounds data', () => {
    expect(() => getTopView([cube(0, 0, 0, WHITE), cube(0, 0, 0, DARK)])).toThrow(/occupy/);
    expect(() => getTopView([cube(2, 0, 0, WHITE)], board)).toThrow(/bounds/);
  });
});

describe('grid comparison', () => {
  it('matches identical grids, including empty cells', () => {
    expect(compareGrids([[WHITE, null], [null, DARK]], [[WHITE, null], [null, DARK]]))
      .toEqual({ correct: true, errors: [] });
  });

  it.each([
    ['color', [[DARK, null]], [[WHITE, null]]],
    ['position', [[DARK, null]], [[null, DARK]]],
    ['missing', [[DARK, null]], [[null, null]]],
    ['extra', [[DARK, null]], [[DARK, WHITE]]],
  ])('reports %s errors with the coordinates to mark', (type, expected, actual) => {
    const result = compareGrids(expected, actual);
    expect(result.correct).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.every((error) => error.type === type && error.row === 0)).toBe(true);
  });
});

describe('multiple choices', () => {
  it('gives each challenge four unique grids of equal size and exactly one geometric solution', () => {
    for (const { rounds } of LEVELS) {
      const choices = rounds.filter((round) => round.options);
      for (const { options, cubes, bounds } of choices) {
        const answer = getTopView(cubes, bounds);
        expect(options).toHaveLength(4);
        expect(new Set(options.map((option) => JSON.stringify(option))).size).toBe(4);
        expect(options.filter((grid) => compareGrids(answer, grid).correct)).toHaveLength(1);
        for (const grid of options) {
          expect(grid.length).toBe(answer.length);
          expect(grid.every((row, index) => row.length === answer[index].length)).toBe(true);
          expect(grid.flat().every((value) => [null, WHITE, DARK].includes(value))).toBe(true);
          expect(grid.flat().some(Boolean)).toBe(true);
        }
      }
    }
  });

  it('includes a plausible lower-cube distractor for a stacked model', () => {
    const cubes = [cube(-1, 0, -1, WHITE), cube(-1, 1, -1, DARK), cube(1, 0, 0, WHITE)];
    const options = getAnswerOptions(cubes, board, { advanced: true, correctSlot: 2 });
    expect(options[2][0][0]).toBe(DARK);
    expect(options.some((option) => compareGrids(option, [
      [WHITE, null, null],
      [null, null, WHITE],
      [null, null, null],
    ]).correct)).toBe(true);
  });
});
