export type Position = {
  row: number;
  col: number;
};

export type Direction = "up" | "down" | "left" | "right";

export type CellType = "wall" | "floor" | "start" | "exit";

export type Difficulty = "easy" | "medium" | "hard";

export type GameMode = "step" | "commands";

export type Collectible = {
  id: string;
  type: "carrot";
  position: Position;
  collected: boolean;
};

export type MazeLevel = {
  id: string;
  name: string;
  instruction: string;
  difficulty: Difficulty;
  rows: number;
  cols: number;
  cells: CellType[][];
  start: Position;
  exit: Position;
  collectibles: Collectible[];
  optimalPathLength: number;
  recommendedMode: GameMode;
};

export const DIRECTIONS: readonly Direction[] = ["up", "down", "left", "right"];

export const DIRECTION_DELTAS: Readonly<Record<Direction, Position>> = {
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
  right: { row: 0, col: 1 },
};

export function positionsEqual(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

export function positionKey(position: Position): string {
  return `${position.row},${position.col}`;
}

export function clonePosition(position: Position): Position {
  return { row: position.row, col: position.col };
}
