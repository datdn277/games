import {
  DIRECTION_DELTAS,
  DIRECTIONS,
  type Direction,
  type MazeLevel,
  type Position,
} from "./MazeCell";

export function getNextPosition(current: Position, direction: Direction): Position {
  const delta = DIRECTION_DELTAS[direction];
  return { row: current.row + delta.row, col: current.col + delta.col };
}

export function isInsideMaze(position: Position, level: MazeLevel): boolean {
  return (
    position.row >= 0 &&
    position.col >= 0 &&
    position.row < level.rows &&
    position.col < level.cols
  );
}

export function isWalkable(position: Position, level: MazeLevel): boolean {
  return isInsideMaze(position, level) && level.cells[position.row]?.[position.col] !== "wall";
}

export function canMove(current: Position, direction: Direction, level: MazeLevel): boolean {
  return isWalkable(getNextPosition(current, direction), level);
}

export function getAvailableDirections(position: Position, level: MazeLevel): Direction[] {
  return DIRECTIONS.filter((direction) => canMove(position, direction, level));
}

export function getWalkableNeighborPositions(position: Position, level: MazeLevel): Position[] {
  return DIRECTIONS.map((direction) => getNextPosition(position, direction)).filter((candidate) =>
    isWalkable(candidate, level),
  );
}

export function countDeadEnds(level: MazeLevel): number {
  let count = 0;
  for (let row = 0; row < level.rows; row += 1) {
    for (let col = 0; col < level.cols; col += 1) {
      const position = { row, col };
      if (!isWalkable(position, level)) continue;
      const isEndpoint =
        (row === level.start.row && col === level.start.col) ||
        (row === level.exit.row && col === level.exit.col);
      if (!isEndpoint && getWalkableNeighborPositions(position, level).length === 1) count += 1;
    }
  }
  return count;
}
