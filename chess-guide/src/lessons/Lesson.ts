import type { PieceType, Position } from "../game/GameState";

export type LessonObjective = "tutorial" | "reach-target" | "select-valid-squares";

export type Lesson = {
  id: string;
  piece: PieceType;
  title: string;
  instruction: string;
  voiceInstruction: string;
  objective: LessonObjective;
  boardSize: { rows: number; cols: number };
  startPosition: Position;
  targets: Position[];
  blockers: Position[];
  hints: string[];
  showValidMovesInitially: boolean;
};

export const PIECE_NAMES: Record<PieceType, string> = {
  rook: "Xe",
  bishop: "Tượng",
  knight: "Mã",
};

export const PIECE_RULES: Record<PieceType, string> = {
  rook: "Xe đi theo đường thẳng: lên, xuống, sang trái hoặc sang phải.",
  bishop: "Tượng chỉ đi theo đường chéo và không thể nhảy qua vật cản.",
  knight: "Mã đi theo hình chữ L: hai ô rồi rẽ một ô. Mã có thể nhảy qua vật cản.",
};
