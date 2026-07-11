import { DIRECTIONS } from "./directions.js";

export function cellKey(cell) {
  return `${cell.row}:${cell.column}`;
}

export function sameCell(a, b) {
  return Boolean(a && b && a.row === b.row && a.column === b.column);
}

export function isInside(cell, rows, columns) {
  return cell.row >= 0 && cell.row < rows && cell.column >= 0 && cell.column < columns;
}

export function findPath({ rows, columns, obstacles = [], start, target }) {
  if (!start || !target) return null;
  if (sameCell(start, target)) return [{ ...start }];

  const blocked = new Set(obstacles.map(cellKey));
  const visited = new Set([cellKey(start)]);
  const queue = [[{ ...start }]];

  while (queue.length) {
    const path = queue.shift();
    const current = path[path.length - 1];

    for (const direction of Object.values(DIRECTIONS)) {
      const next = {
        row: current.row + direction.row,
        column: current.column + direction.column
      };
      const key = cellKey(next);
      if (!isInside(next, rows, columns) || blocked.has(key) || visited.has(key)) continue;
      const nextPath = [...path, next];
      if (sameCell(next, target)) return nextPath;
      visited.add(key);
      queue.push(nextPath);
    }
  }

  return null;
}

export function isReachable(options) {
  return Boolean(findPath(options));
}

export function findNearestPath({ rows, columns, obstacles, start, targets }) {
  return targets
    .map((target) => ({ target, path: findPath({ rows, columns, obstacles, start, target }) }))
    .filter(({ path }) => path)
    .sort((a, b) => a.path.length - b.path.length)[0] ?? null;
}
