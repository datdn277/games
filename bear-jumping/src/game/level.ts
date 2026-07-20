import type { LevelDefinition } from './types';

export const GARDEN_LEVEL: LevelDefinition = Object.freeze({
  rows: 6,
  columns: 6,
  start: Object.freeze({ row: 0, col: 0 }),
  goal: Object.freeze({ row: 5, col: 5 }),
  obstacles: Object.freeze([
    Object.freeze({ row: 0, col: 1 }),
    Object.freeze({ row: 3, col: 0 }),
    Object.freeze({ row: 5, col: 3 }),
  ]),
});
