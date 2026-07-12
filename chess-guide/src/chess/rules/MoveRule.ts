import type { BoardState, PieceState, Position } from "../../game/GameState";

export interface MoveRule {
  getValidMoves(board: BoardState, piece: PieceState): Position[];
}

export const inBounds = (board: BoardState, position: Position): boolean =>
  position.row >= 0 &&
  position.row < board.rows &&
  position.col >= 0 &&
  position.col < board.cols;

export const isBlocker = (board: BoardState, position: Position): boolean =>
  board.blockers.some(
    (blocker) => blocker.row === position.row && blocker.col === position.col,
  );

export const rayMoves = (
  board: BoardState,
  from: Position,
  directions: ReadonlyArray<readonly [number, number]>,
): Position[] => {
  const moves: Position[] = [];
  for (const [rowStep, colStep] of directions) {
    let row = from.row + rowStep;
    let col = from.col + colStep;
    while (inBounds(board, { row, col })) {
      const next = { row, col };
      if (isBlocker(board, next)) break;
      moves.push(next);
      row += rowStep;
      col += colStep;
    }
  }
  return moves;
};
