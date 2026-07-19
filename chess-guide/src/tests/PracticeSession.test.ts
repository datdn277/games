import { describe, expect, it } from "vitest";
import { MoveEngine } from "../chess/MoveEngine";
import { MovePathfinder } from "../chess/MovePathfinder";
import { PracticeSession } from "../game/PracticeSession";
import { samePosition } from "../game/GameState";

const seededRandom = (seed = 20260719) => {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
};

describe("PracticeSession", () => {
  it("tạo bàn luyện tập có đúng một ngôi sao đi tới được trong tối đa bốn nước", () => {
    const session = new PracticeSession(seededRandom());
    const board = session.start("rook");
    const target = board.targets[0];
    const path = new MovePathfinder().findShortestPath(board, board.piece.position, target);

    expect(board.rows).toBe(6);
    expect(board.cols).toBe(6);
    expect(board.blockers).toEqual([]);
    expect(board.targets).toHaveLength(1);
    expect(samePosition(target, board.piece.position)).toBe(false);
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThanOrEqual(1);
    expect(path!.length).toBeLessThanOrEqual(4);
  });

  it("chỉ cho đi sau khi bé chọn quân và giữ lựa chọn khi bấm sai", () => {
    const session = new PracticeSession(seededRandom(8));
    const board = session.start("bishop");
    const target = board.targets[0];

    expect(session.canMove(target)).toBe(false);
    const moves = session.selectPiece();
    expect(moves.some((move) => samePosition(move, target))).toBe(
      new MoveEngine().isMoveValid(board, board.piece, target),
    );

    const invalid = session.commitMove(board.piece.position);
    expect(invalid.status).toBe("invalid");
    expect(session.isSelected()).toBe(true);
  });

  it("cân bằng chính xác 50/50 mục tiêu một bước và nhiều bước cho cả ba quân", () => {
    const pathfinder = new MovePathfinder();
    const pieces = ["rook", "bishop", "knight"] as const;

    for (const [pieceIndex, piece] of pieces.entries()) {
      const session = new PracticeSession(seededRandom(42 + pieceIndex));
      const board = session.start(piece);
      const distances: number[] = [];

      for (let count = 1; count <= 20; count += 1) {
        const target = { ...board.targets[0] };
        const path = pathfinder.findShortestPath(board, board.piece.position, target);
        expect(path, `${piece} target ${count}`).not.toBeNull();
        expect(path!.length).toBeGreaterThanOrEqual(1);
        expect(path!.length).toBeLessThanOrEqual(4);
        distances.push(path!.length);

        path!.forEach((step, index) => {
          session.selectPiece();
          expect(session.canMove(step)).toBe(true);
          const result = session.commitMove(step);
          const finalStep = index === path!.length - 1;
          expect(result.status).toBe(finalStep ? "target" : "moved");
          if (!finalStep) expect(board.targets[0]).toEqual(target);
        });

        expect(session.getStarsFound()).toBe(count);
        expect(samePosition(board.piece.position, target)).toBe(true);
        expect(board.targets).toHaveLength(1);
        expect(session.isSelected()).toBe(false);
      }

      expect(distances.filter((distance) => distance === 1)).toHaveLength(10);
      expect(distances.filter((distance) => distance >= 2)).toHaveLength(10);
      for (let index = 0; index < distances.length; index += 2) {
        const pair = distances.slice(index, index + 2);
        expect(pair.filter((distance) => distance === 1)).toHaveLength(1);
        expect(pair.filter((distance) => distance >= 2)).toHaveLength(1);
      }
    }
  });

  it("cho phép đi một nước hợp lệ chưa tới sao rồi chọn lại quân", () => {
    const session = new PracticeSession(seededRandom(91));
    const board = session.start("rook");
    const moves = session.selectPiece();
    const detour = moves.find((move) => !samePosition(move, board.targets[0]));

    expect(detour).toBeDefined();
    const result = session.commitMove(detour!);
    expect(result.status).toBe("moved");
    expect(result.starsFound).toBe(0);
    expect(session.isSelected()).toBe(false);
    expect(board.targets).toHaveLength(1);
  });
});
