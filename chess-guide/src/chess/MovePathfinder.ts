import type { BoardState, Position } from "../game/GameState";
import { positionKey, samePosition } from "../game/GameState";
import { MoveEngine } from "./MoveEngine";

export type ReachablePosition = {
  position: Position;
  distance: number;
};

type PathNode = {
  position: Position;
  path: Position[];
};

export class MovePathfinder {
  private readonly engine = new MoveEngine();

  findShortestPath(board: BoardState, from: Position, target: Position): Position[] | null {
    if (samePosition(from, target)) return [];
    const queue: PathNode[] = [{ position: { ...from }, path: [] }];
    const visited = new Set([positionKey(from)]);

    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      for (const move of this.movesFrom(board, current.position)) {
        const key = positionKey(move);
        if (visited.has(key)) continue;
        const path = [...current.path, { ...move }];
        if (samePosition(move, target)) return path;
        visited.add(key);
        queue.push({ position: { ...move }, path });
      }
    }

    return null;
  }

  getReachablePositions(board: BoardState, from: Position, maxDistance = Number.POSITIVE_INFINITY): ReachablePosition[] {
    const queue: Array<{ position: Position; distance: number }> = [{ position: { ...from }, distance: 0 }];
    const visited = new Set([positionKey(from)]);
    const reachable: ReachablePosition[] = [];

    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      if (current.distance >= maxDistance) continue;
      for (const move of this.movesFrom(board, current.position)) {
        const key = positionKey(move);
        if (visited.has(key)) continue;
        const distance = current.distance + 1;
        visited.add(key);
        reachable.push({ position: { ...move }, distance });
        queue.push({ position: { ...move }, distance });
      }
    }

    return reachable;
  }

  private movesFrom(board: BoardState, position: Position): Position[] {
    const piece = { type: board.piece.type, position: { ...position } };
    return this.engine.getValidMoves({ ...board, piece }, piece);
  }
}
