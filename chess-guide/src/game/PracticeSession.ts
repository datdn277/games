import { MoveEngine } from "../chess/MoveEngine";
import { MovePathfinder } from "../chess/MovePathfinder";
import type { BoardState, PieceType, Position } from "./GameState";
import { samePosition } from "./GameState";

export type PracticeMoveResult = {
  status: "invalid" | "moved" | "target";
  starsFound: number;
  nextTarget: Position | null;
};

type TargetMode = "near" | "far";

const randomPosition = (rows: number, cols: number, random: () => number): Position => ({
  row: Math.min(rows - 1, Math.floor(random() * rows)),
  col: Math.min(cols - 1, Math.floor(random() * cols)),
});

export class PracticeSession {
  private readonly engine = new MoveEngine();
  private readonly pathfinder = new MovePathfinder();
  private board: BoardState | null = null;
  private selected = false;
  private starsFound = 0;
  private targetModeBag: TargetMode[] = [];

  constructor(private readonly random: () => number = Math.random) {}

  start(piece: PieceType): BoardState {
    const rows = 6;
    const cols = 6;
    this.board = {
      rows,
      cols,
      piece: { type: piece, position: randomPosition(rows, cols, this.random) },
      blockers: [],
      targets: [],
    };
    this.selected = false;
    this.starsFound = 0;
    this.targetModeBag = [];
    this.board.targets = [this.pickTarget(this.board)];
    return this.board;
  }

  stop(): void {
    this.board = null;
    this.selected = false;
    this.starsFound = 0;
    this.targetModeBag = [];
  }

  isActive(): boolean {
    return this.board !== null;
  }

  getBoard(): BoardState | null {
    return this.board;
  }

  getStarsFound(): number {
    return this.starsFound;
  }

  isSelected(): boolean {
    return this.selected;
  }

  selectPiece(): Position[] {
    if (!this.board) return [];
    this.selected = true;
    return this.engine.getValidMoves(this.board, this.board.piece);
  }

  canMove(destination: Position): boolean {
    return Boolean(
      this.board &&
      this.selected &&
      this.engine.isMoveValid(this.board, this.board.piece, destination),
    );
  }

  isTarget(position: Position): boolean {
    return Boolean(this.board?.targets.some((target) => samePosition(target, position)));
  }

  commitMove(destination: Position): PracticeMoveResult {
    if (!this.board || !this.canMove(destination)) {
      return { status: "invalid", starsFound: this.starsFound, nextTarget: null };
    }

    const reachedTarget = this.isTarget(destination);
    this.board.piece.position = { ...destination };
    this.selected = false;

    if (!reachedTarget) {
      return { status: "moved", starsFound: this.starsFound, nextTarget: null };
    }

    this.starsFound += 1;
    const nextTarget = this.pickTarget(this.board);
    this.board.targets = [{ ...nextTarget }];
    return { status: "target", starsFound: this.starsFound, nextTarget };
  }

  private pickTarget(board: BoardState): Position {
    const mode = this.drawTargetMode();
    const reachable = this.pathfinder.getReachablePositions(board, board.piece.position, 4);
    const candidates = reachable.filter((candidate) =>
      mode === "near" ? candidate.distance === 1 : candidate.distance >= 2,
    );
    if (candidates.length === 0) throw new Error(`Không thể sinh ngôi sao ${mode === "near" ? "một bước" : "nhiều bước"}.`);

    const distances = [...new Set(candidates.map((candidate) => candidate.distance))].sort((a, b) => a - b);
    const distanceIndex = Math.min(distances.length - 1, Math.floor(this.random() * distances.length));
    const selectedDistance = distances[distanceIndex];
    const targets = candidates.filter((candidate) => candidate.distance === selectedDistance);
    const targetIndex = Math.min(targets.length - 1, Math.floor(this.random() * targets.length));
    return { ...targets[targetIndex].position };
  }

  private drawTargetMode(): TargetMode {
    if (this.targetModeBag.length === 0) {
      this.targetModeBag = this.random() < 0.5 ? ["far", "near"] : ["near", "far"];
    }
    return this.targetModeBag.pop()!;
  }
}
