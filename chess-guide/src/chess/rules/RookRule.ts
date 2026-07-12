import type { MoveRule } from "./MoveRule";
import { rayMoves } from "./MoveRule";

export const ROOK_DIRECTIONS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;

export class RookRule implements MoveRule {
  getValidMoves(board: Parameters<MoveRule["getValidMoves"]>[0], piece: Parameters<MoveRule["getValidMoves"]>[1]) {
    return rayMoves(board, piece.position, ROOK_DIRECTIONS);
  }
}
