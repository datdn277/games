import { MoveEngine } from "../chess/MoveEngine";
import type { BoardState, PieceType, Position } from "./GameState";
import { positionKey, samePosition } from "./GameState";
import type { Lesson, LessonObjective } from "../lessons/Lesson";
import { PIECE_NAMES } from "../lessons/Lesson";

const randomPosition = (rows: number, cols: number, random: () => number): Position => ({
  row: Math.floor(random() * rows),
  col: Math.floor(random() * cols),
});

export class LessonGenerator {
  private readonly engine = new MoveEngine();
  private previousSignature = "";
  private counter = 0;

  constructor(private readonly random: () => number = Math.random) {}

  generate(piece: PieceType, objective: Exclude<LessonObjective, "tutorial"> = "reach-target"): Lesson {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const rows = 6;
      const cols = 6;
      const startPosition = randomPosition(rows, cols, this.random);
      const blockerCount = Math.floor(this.random() * 4);
      const blockers: Position[] = [];
      while (blockers.length < blockerCount) {
        const candidate = randomPosition(rows, cols, this.random);
        if (!samePosition(candidate, startPosition) && !blockers.some((b) => samePosition(b, candidate))) {
          blockers.push(candidate);
        }
      }

      const board: BoardState = {
        rows, cols, piece: { type: piece, position: startPosition }, blockers, targets: [],
      };
      const validMoves = this.engine.getValidMoves(board, board.piece);
      if (validMoves.length === 0) continue;
      const target = validMoves[Math.floor(this.random() * validMoves.length)];
      const targets = objective === "reach-target" ? [target] : [];
      const signature = JSON.stringify({ piece, objective, startPosition, blockers, targets });
      if (signature === this.previousSignature) continue;
      this.previousSignature = signature;
      this.counter += 1;

      return {
        id: `generated-${piece}-${this.counter}`,
        piece,
        title: `Thử thách ${PIECE_NAMES[piece]}`,
        instruction: objective === "reach-target"
          ? `Đưa quân ${PIECE_NAMES[piece]} đến ngôi sao`
          : `Chọn tất cả ô ${PIECE_NAMES[piece]} có thể đi`,
        voiceInstruction: objective === "reach-target"
          ? `Hãy đưa quân ${PIECE_NAMES[piece]} đến ngôi sao.`
          : `Hãy chọn tất cả ô quân ${PIECE_NAMES[piece]} có thể đi đến.`,
        objective,
        boardSize: { rows, cols },
        startPosition,
        targets,
        blockers,
        hints: ["Nhớ lại năng lực của quân cờ.", "Quan sát các hướng đi.", "Tìm ô không bị vật cản chặn."],
        showValidMovesInitially: false,
      };
    }
    throw new Error("Không thể tạo lesson hợp lệ sau 100 lần thử.");
  }

  getAnswers(lesson: Lesson): Position[] {
    const board = this.toBoardState(lesson);
    return this.engine.getValidMoves(board, board.piece);
  }

  validate(lesson: Lesson): string[] {
    const errors: string[] = [];
    const { rows, cols } = lesson.boardSize;
    const inside = (position: Position) =>
      position.row >= 0 && position.row < rows && position.col >= 0 && position.col < cols;
    const occupied = new Set<string>();
    if (!inside(lesson.startPosition)) errors.push("Vị trí quân nằm ngoài bàn.");
    occupied.add(positionKey(lesson.startPosition));
    for (const blocker of lesson.blockers) {
      if (!inside(blocker)) errors.push("Vật cản nằm ngoài bàn.");
      if (occupied.has(positionKey(blocker))) errors.push("Vật cản trùng vị trí khác.");
      occupied.add(positionKey(blocker));
    }
    for (const target of lesson.targets) {
      if (!inside(target)) errors.push("Mục tiêu nằm ngoài bàn.");
      if (samePosition(target, lesson.startPosition)) errors.push("Mục tiêu trùng quân cờ.");
      if (lesson.blockers.some((blocker) => samePosition(blocker, target))) errors.push("Mục tiêu trùng vật cản.");
    }
    if (lesson.objective === "reach-target") {
      const board = this.toBoardState(lesson);
      if (!lesson.targets.some((target) => this.engine.isMoveValid(board, board.piece, target))) {
        errors.push("Bài đến mục tiêu không có lời giải một nước.");
      }
    }
    if (lesson.objective === "select-valid-squares" && this.getAnswers(lesson).length === 0) {
      errors.push("Bài chọn ô không có đáp án.");
    }
    return errors;
  }

  private toBoardState(lesson: Lesson): BoardState {
    return {
      rows: lesson.boardSize.rows,
      cols: lesson.boardSize.cols,
      piece: { type: lesson.piece, position: { ...lesson.startPosition } },
      blockers: lesson.blockers.map((position) => ({ ...position })),
      targets: lesson.targets.map((position) => ({ ...position })),
    };
  }
}
