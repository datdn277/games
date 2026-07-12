import type { PieceType, Position } from "../game/GameState";

export type TruthQuestion = {
  id: string;
  piece: PieceType;
  from: Position;
  to: Position;
  correct: boolean;
  explanation: string;
};

export const truthQuestions: TruthQuestion[] = [
  { id: "truth-rook-1", piece: "rook", from: { row: 4, col: 1 }, to: { row: 4, col: 5 }, correct: true, explanation: "Xe đi ngang theo đường thẳng." },
  { id: "truth-rook-2", piece: "rook", from: { row: 3, col: 2 }, to: { row: 1, col: 4 }, correct: false, explanation: "Xe không đi đường chéo." },
  { id: "truth-rook-3", piece: "rook", from: { row: 5, col: 3 }, to: { row: 0, col: 3 }, correct: true, explanation: "Xe đi dọc theo đường thẳng." },
  { id: "truth-bishop-1", piece: "bishop", from: { row: 4, col: 1 }, to: { row: 1, col: 4 }, correct: true, explanation: "Tượng đi theo đường chéo." },
  { id: "truth-bishop-2", piece: "bishop", from: { row: 3, col: 2 }, to: { row: 3, col: 5 }, correct: false, explanation: "Tượng không đi ngang." },
  { id: "truth-bishop-3", piece: "bishop", from: { row: 2, col: 2 }, to: { row: 5, col: 5 }, correct: true, explanation: "Hai ô nằm trên cùng đường chéo." },
  { id: "truth-knight-1", piece: "knight", from: { row: 4, col: 1 }, to: { row: 2, col: 2 }, correct: true, explanation: "Mã đi đúng hình chữ L." },
  { id: "truth-knight-2", piece: "knight", from: { row: 3, col: 2 }, to: { row: 0, col: 2 }, correct: false, explanation: "Mã không đi thẳng ba ô." },
  { id: "truth-knight-3", piece: "knight", from: { row: 2, col: 2 }, to: { row: 4, col: 3 }, correct: true, explanation: "Hai ô rồi rẽ một ô là chữ L." },
];
