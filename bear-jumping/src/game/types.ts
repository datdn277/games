export type Direction = 'up' | 'down' | 'left' | 'right';

export interface GridCell {
  row: number;
  col: number;
}

export interface MoveStep {
  from: GridCell;
  to: GridCell;
  direction: Direction;
  index: number;
}

export type RunOutcomeKind =
  | 'success'
  | 'missing-command'
  | 'obstacle'
  | 'boundary'
  | 'loop';

export interface RunOutcome {
  kind: RunOutcomeKind;
  steps: MoveStep[];
  terminalCell: GridCell;
  commandCell: GridCell;
}

export interface LevelDefinition {
  rows: number;
  columns: number;
  start: GridCell;
  goal: GridCell;
  obstacles: readonly GridCell[];
}

export type LevelLayout =
  | 'classic'
  | 'random-obstacles'
  | 'random-goal'
  | 'random-all';

export interface LevelGenerationOptions {
  layout: LevelLayout;
  obstacleCount: number;
}

export type PlacementResult =
  | { ok: true; replaced: boolean }
  | { ok: false; reason: 'outside-board' | 'obstacle' | 'goal' };

export const DIRECTIONS: readonly Direction[] = ['up', 'down', 'left', 'right'];

export const DIRECTION_DELTAS: Readonly<Record<Direction, GridCell>> = {
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
  right: { row: 0, col: 1 },
};

export function cellKey(cell: GridCell): string {
  return `${cell.row}:${cell.col}`;
}

export function sameCell(a: GridCell, b: GridCell): boolean {
  return a.row === b.row && a.col === b.col;
}

export function cloneCell(cell: GridCell): GridCell {
  return { row: cell.row, col: cell.col };
}
