import type { MoveRule } from "./MoveRule";
import { rayMoves } from "./MoveRule";

export const BISHOP_DIRECTIONS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
] as const;

export class BishopRule implements MoveRule {
  getValidMoves(board: Parameters<MoveRule["getValidMoves"]>[0], piece: Parameters<MoveRule["getValidMoves"]>[1]) {
    return rayMoves(board, piece.position, BISHOP_DIRECTIONS);
  }
}
