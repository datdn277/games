import { Vector3 } from "three";
import type { Position } from "../game/GameState";

export const SQUARE_SIZE = 1.2;

export function boardToWorldPosition(
  position: Position,
  rows = 6,
  cols = 6,
  y = 0,
): Vector3 {
  return new Vector3(
    (position.col - (cols - 1) / 2) * SQUARE_SIZE,
    y,
    (position.row - (rows - 1) / 2) * SQUARE_SIZE,
  );
}

export function worldToBoardPosition(
  point: Vector3,
  rows = 6,
  cols = 6,
): Position | null {
  const col = Math.round(point.x / SQUARE_SIZE + (cols - 1) / 2);
  const row = Math.round(point.z / SQUARE_SIZE + (rows - 1) / 2);
  if (row < 0 || row >= rows || col < 0 || col >= cols) return null;
  return { row, col };
}
