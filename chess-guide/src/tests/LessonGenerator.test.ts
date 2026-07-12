import { describe, expect, it } from "vitest";
import { MoveEngine } from "../chess/MoveEngine";
import { LessonGenerator } from "../game/LessonGenerator";
import { samePosition } from "../game/GameState";
import { allLessons } from "../lessons";

const seededRandom = (seed = 1234567) => {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
};

describe("LessonGenerator", () => {
  it("validate toàn bộ 18 lesson viết tay", () => {
    const generator = new LessonGenerator(seededRandom());
    expect(allLessons).toHaveLength(18);
    allLessons.forEach((lesson) => expect(generator.validate(lesson), lesson.id).toEqual([]));
  });

  it("sinh và validate 300 lesson ngẫu nhiên", () => {
    const generator = new LessonGenerator(seededRandom(42));
    const pieces = ["rook", "bishop", "knight"] as const;
    let previous = "";
    for (let index = 0; index < 300; index += 1) {
      const objective = index % 2 === 0 ? "reach-target" : "select-valid-squares";
      const lesson = generator.generate(pieces[index % 3], objective);
      expect(generator.validate(lesson), lesson.id).toEqual([]);
      const signature = JSON.stringify({
        piece: lesson.piece,
        objective: lesson.objective,
        start: lesson.startPosition,
        blockers: lesson.blockers,
        targets: lesson.targets,
      });
      expect(signature).not.toBe(previous);
      previous = signature;
    }
  });

  it("không đặt quân, mục tiêu và vật cản trùng nhau", () => {
    const generator = new LessonGenerator(seededRandom(7));
    for (let index = 0; index < 100; index += 1) {
      const lesson = generator.generate(index % 2 ? "rook" : "bishop", "reach-target");
      lesson.targets.forEach((target) => {
        expect(samePosition(target, lesson.startPosition)).toBe(false);
        expect(lesson.blockers.some((blocker) => samePosition(blocker, target))).toBe(false);
      });
    }
  });

  it("reach-target luôn có lời giải và không xuyên vật cản", () => {
    const generator = new LessonGenerator(seededRandom(99));
    const engine = new MoveEngine();
    for (let index = 0; index < 120; index += 1) {
      const piece = (["rook", "bishop", "knight"] as const)[index % 3];
      const lesson = generator.generate(piece, "reach-target");
      const board = {
        rows: lesson.boardSize.rows,
        cols: lesson.boardSize.cols,
        piece: { type: piece, position: lesson.startPosition },
        blockers: lesson.blockers,
        targets: lesson.targets,
      };
      expect(lesson.targets.some((target) => engine.isMoveValid(board, board.piece, target))).toBe(true);
    }
  });

  it("lesson Mã reach-target luôn dùng delta chữ L", () => {
    const generator = new LessonGenerator(seededRandom(2026));
    for (let index = 0; index < 50; index += 1) {
      const lesson = generator.generate("knight", "reach-target");
      const target = lesson.targets[0];
      const row = Math.abs(target.row - lesson.startPosition.row);
      const col = Math.abs(target.col - lesson.startPosition.col);
      expect([row, col].sort()).toEqual([1, 2]);
    }
  });

  it("select-valid-squares có danh sách đáp án đúng từ MoveEngine", () => {
    const generator = new LessonGenerator(seededRandom(314));
    for (let index = 0; index < 30; index += 1) {
      const lesson = generator.generate("rook", "select-valid-squares");
      const answers = generator.getAnswers(lesson);
      expect(answers.length).toBeGreaterThan(0);
      expect(new Set(answers.map((position) => `${position.row},${position.col}`)).size).toBe(answers.length);
    }
  });
});
