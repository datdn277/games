import type { BoardState, PieceState, PieceType, Position } from "../game/GameState";
import { samePosition } from "../game/GameState";
import { BishopRule } from "./rules/BishopRule";
import { KnightRule } from "./rules/KnightRule";
import type { MoveRule } from "./rules/MoveRule";
import { RookRule } from "./rules/RookRule";

export class MoveEngine {
  private readonly rules: Record<PieceType, MoveRule> = {
    rook: new RookRule(),
    bishop: new BishopRule(),
    knight: new KnightRule(),
  };

  getValidMoves(board: BoardState, piece: PieceState): Position[] {
    return this.rules[piece.type].getValidMoves(board, piece);
  }

  isMoveValid(board: BoardState, piece: PieceState, destination: Position): boolean {
    return this.getValidMoves(board, piece).some((move) => samePosition(move, destination));
  }

  isPathBlocked(board: BoardState, from: Position, to: Position): boolean {
    const rowDelta = to.row - from.row;
    const colDelta = to.col - from.col;
    const straight = rowDelta === 0 || colDelta === 0;
    const diagonal = Math.abs(rowDelta) === Math.abs(colDelta);
    if (!straight && !diagonal) return false;
    const rowStep = Math.sign(rowDelta);
    const colStep = Math.sign(colDelta);
    let row = from.row + rowStep;
    let col = from.col + colStep;
    while (row !== to.row || col !== to.col) {
      if (board.blockers.some((b) => b.row === row && b.col === col)) return true;
      row += rowStep;
      col += colStep;
    }
    return board.blockers.some((b) => b.row === to.row && b.col === to.col);
  }
}
