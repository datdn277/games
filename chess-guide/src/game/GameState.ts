import type { Lesson } from "../lessons/Lesson";

export type PieceType = "rook" | "bishop" | "knight";

export type Position = { row: number; col: number };

export type PieceState = { type: PieceType; position: Position };

export type BoardState = {
  rows: number;
  cols: number;
  piece: PieceState;
  blockers: Position[];
  targets: Position[];
};

export type GameState = {
  currentPiece: PieceType | null;
  currentLesson: Lesson | null;
  lessonIndex: number;
  selectedSquare: Position | null;
  validMoves: Position[];
  selectedSquares: Position[];
  interactionLocked: boolean;
  completed: boolean;
  mistakes: number;
  hintsUsed: number;
  hintStep: number;
  voiceEnabled: boolean;
};

export const samePosition = (a: Position, b: Position): boolean =>
  a.row === b.row && a.col === b.col;

export const positionKey = (position: Position): string =>
  `${position.row},${position.col}`;

export const createInitialGameState = (voiceEnabled: boolean): GameState => ({
  currentPiece: null,
  currentLesson: null,
  lessonIndex: 0,
  selectedSquare: null,
  validMoves: [],
  selectedSquares: [],
  interactionLocked: false,
  completed: false,
  mistakes: 0,
  hintsUsed: 0,
  hintStep: 0,
  voiceEnabled,
});
