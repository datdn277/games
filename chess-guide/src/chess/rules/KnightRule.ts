import type { MoveRule } from "./MoveRule";
import { inBounds, isBlocker } from "./MoveRule";

export const KNIGHT_DELTAS = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1],
] as const;

export class KnightRule implements MoveRule {
  getValidMoves(board: Parameters<MoveRule["getValidMoves"]>[0], piece: Parameters<MoveRule["getValidMoves"]>[1]) {
    return KNIGHT_DELTAS
      .map(([row, col]) => ({
        row: piece.position.row + row,
        col: piece.position.col + col,
      }))
      .filter((position) => inBounds(board, position) && !isBlocker(board, position));
  }
}
