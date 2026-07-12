import type { ChessBoard } from "../chess/ChessBoard";
import type { Position } from "../game/GameState";

export class HighlightAnimator {
  constructor(private readonly board: ChessBoard) {}

  pulse(positions: Position[]): void {
    positions.forEach((position) => this.board.setSquareState(position, "hinted"));
  }
}
