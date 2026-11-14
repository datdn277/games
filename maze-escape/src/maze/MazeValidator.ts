import { isInsideMaze, isWalkable } from "./MazeGrid";
import { findOptimalMissionRoute, getReachableCells } from "./PathFinder";
import { positionKey, positionsEqual, type MazeLevel, type Position } from "./MazeCell";

export type ValidationResult = {
  valid: boolean;
  errors: string[];
  calculatedOptimalPathLength: number | null;
};

function isIntegerPosition(position: Position): boolean {
  return Number.isInteger(position.row) && Number.isInteger(position.col);
}

export function validateMazeLevel(level: MazeLevel): ValidationResult {
  const errors: string[] = [];
  if (!Number.isInteger(level.rows) || !Number.isInteger(level.cols) || level.rows <= 0 || level.cols <= 0) {
    errors.push("Kích thước mê cung không hợp lệ.");
  }
  if (level.cells.length !== level.rows || level.cells.some((row) => row.length !== level.cols)) {
    errors.push("Ma trận ô không khớp kích thước khai báo.");
  }
  if (!isIntegerPosition(level.start) || !isInsideMaze(level.start, level)) {
    errors.push("Vị trí bắt đầu nằm ngoài mê cung.");
  }
  if (!isIntegerPosition(level.exit) || !isInsideMaze(level.exit, level)) {
    errors.push("Vị trí hang nằm ngoài mê cung.");
  }
  if (positionsEqual(level.start, level.exit)) errors.push("Vị trí bắt đầu trùng với hang.");
  if (isInsideMaze(level.start, level) && !isWalkable(level.start, level)) {
    errors.push("Vị trí bắt đầu nằm trong tường.");
  }
  if (isInsideMaze(level.exit, level) && !isWalkable(level.exit, level)) {
    errors.push("Hang nằm trong tường.");
  }

  const occupied = new Set<string>([positionKey(level.start), positionKey(level.exit)]);
  for (const item of level.collectibles) {
    if (!isIntegerPosition(item.position) || !isInsideMaze(item.position, level)) {
      errors.push(`Vật phẩm ${item.id} nằm ngoài mê cung.`);
      continue;
    }
    if (!isWalkable(item.position, level)) errors.push(`Vật phẩm ${item.id} nằm trong tường.`);
    const key = positionKey(item.position);
    if (occupied.has(key)) errors.push(`Vật phẩm ${item.id} trùng vị trí khác.`);
    occupied.add(key);
  }

  let calculatedOptimalPathLength: number | null = null;
  if (errors.length === 0) {
    const reachable = new Set(getReachableCells(level, level.start).map(positionKey));
    if (!reachable.has(positionKey(level.exit))) errors.push("Không có đường đến hang.");
    for (const item of level.collectibles) {
      if (!reachable.has(positionKey(item.position))) {
        errors.push(`Không có đường đến vật phẩm ${item.id}.`);
      }
    }
    const route = findOptimalMissionRoute(level);
    calculatedOptimalPathLength = route?.length ?? null;
    if (!route) errors.push("Không có hành trình thu thập hợp lệ.");
    if (route && level.optimalPathLength !== route.length) {
      errors.push(
        `optimalPathLength phải là ${route.length}, hiện là ${level.optimalPathLength}.`,
      );
    }
  }

  return { valid: errors.length === 0, errors, calculatedOptimalPathLength };
}

export class MazeValidator {
  validate(level: MazeLevel): ValidationResult {
    return validateMazeLevel(level);
  }
}
