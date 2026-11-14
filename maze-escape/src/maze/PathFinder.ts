import { getWalkableNeighborPositions } from "./MazeGrid";
import {
  positionKey,
  positionsEqual,
  type Collectible,
  type MazeLevel,
  type Position,
} from "./MazeCell";

export function findShortestPath(
  level: MazeLevel,
  from: Position,
  to: Position,
): Position[] | null {
  if (positionsEqual(from, to)) return [{ ...from }];

  const queue: Position[] = [{ ...from }];
  let head = 0;
  const visited = new Set<string>([positionKey(from)]);
  const parents = new Map<string, Position>();

  while (head < queue.length) {
    const current = queue[head];
    head += 1;
    if (!current) break;

    for (const neighbor of getWalkableNeighborPositions(current, level)) {
      const key = positionKey(neighbor);
      if (visited.has(key)) continue;
      visited.add(key);
      parents.set(key, current);

      if (positionsEqual(neighbor, to)) {
        const path: Position[] = [{ ...to }];
        let cursor: Position = neighbor;
        while (!positionsEqual(cursor, from)) {
          const parent = parents.get(positionKey(cursor));
          if (!parent) return null;
          path.push({ ...parent });
          cursor = parent;
        }
        return path.reverse();
      }
      queue.push(neighbor);
    }
  }

  return null;
}

export function getReachableCells(level: MazeLevel, from: Position): Position[] {
  const queue: Position[] = [{ ...from }];
  let head = 0;
  const visited = new Set<string>([positionKey(from)]);

  while (head < queue.length) {
    const current = queue[head];
    head += 1;
    if (!current) break;
    for (const neighbor of getWalkableNeighborPositions(current, level)) {
      const key = positionKey(neighbor);
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push(neighbor);
    }
  }

  return queue;
}

export function calculateDistance(
  level: MazeLevel,
  from: Position,
  to: Position,
): number | null {
  const path = findShortestPath(level, from, to);
  return path ? path.length - 1 : null;
}

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [Array.from(items)];
  return items.flatMap((item, index) =>
    permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [item, ...rest]),
  );
}

export type RoutePlan = {
  path: Position[];
  collectibleOrder: string[];
  length: number;
};

/** Finds the shortest mission route by trying every collectible order (at most 3 in the MVP). */
export function findOptimalMissionRoute(
  level: MazeLevel,
  from: Position = level.start,
  remainingCollectibles: readonly Collectible[] = level.collectibles,
): RoutePlan | null {
  if (remainingCollectibles.length > 8) {
    throw new Error("Too many collectibles for permutation route planning.");
  }

  const orders = permutations(remainingCollectibles);
  let best: RoutePlan | null = null;

  for (const order of orders) {
    const targets = [...order.map((item) => item.position), level.exit];
    let cursor = from;
    const fullPath: Position[] = [{ ...from }];
    let valid = true;

    for (const target of targets) {
      const segment = findShortestPath(level, cursor, target);
      if (!segment) {
        valid = false;
        break;
      }
      fullPath.push(...segment.slice(1));
      cursor = target;
    }

    if (!valid) continue;
    const route: RoutePlan = {
      path: fullPath,
      collectibleOrder: order.map((item) => item.id),
      length: fullPath.length - 1,
    };
    if (!best || route.length < best.length) best = route;
  }

  return best;
}
