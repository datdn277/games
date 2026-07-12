import type { Position, PieceType } from "../game/GameState";
import { ChessBoard } from "../chess/ChessBoard";
import { PieceAnimator } from "./PieceAnimator";

export class AnimationController {
  private readonly pieceAnimator = new PieceAnimator();
  private readonly reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  constructor(private readonly board: ChessBoard) {}

  async move(from: Position, to: Position, type: PieceType): Promise<void> {
    const piece = this.board.getPiece();
    const start = this.board.getWorldPosition(from, 0.09);
    const end = this.board.getWorldPosition(to, 0.09);
    this.board.showGuidePath(from, to, type);
    const distance = Math.max(Math.abs(to.row - from.row), Math.abs(to.col - from.col));
    await this.pieceAnimator.move(piece, start, end, type, distance, this.reducedMotion);
    window.setTimeout(() => this.board.clearGuide(), this.reducedMotion ? 0 : 350);
  }

  celebrate(): Promise<void> {
    return this.pieceAnimator.celebrate(this.board.getPiece(), this.reducedMotion);
  }
}
