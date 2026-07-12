import { describe, expect, it } from "vitest";
import { MoveEngine } from "../chess/MoveEngine";
import type { BoardState, PieceType, Position } from "../game/GameState";

const engine = new MoveEngine();

const board = (
  type: PieceType,
  position: Position,
  blockers: Position[] = [],
): BoardState => ({
  rows: 6,
  cols: 6,
  piece: { type, position },
  blockers,
  targets: [],
});

const keys = (positions: Position[]) => positions.map((position) => `${position.row},${position.col}`).sort();

describe("MoveEngine - quân Xe", () => {
  it("trả về toàn bộ ô cùng hàng và cột khi Xe ở giữa bàn", () => {
    const state = board("rook", { row: 2, col: 2 });
    expect(keys(engine.getValidMoves(state, state.piece))).toEqual(keys([
      { row: 0, col: 2 }, { row: 1, col: 2 }, { row: 3, col: 2 }, { row: 4, col: 2 }, { row: 5, col: 2 },
      { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 3 }, { row: 2, col: 4 }, { row: 2, col: 5 },
    ]));
  });

  it("dừng trước vật cản và không cho đến ô vật cản hoặc đi xuyên qua", () => {
    const state = board("rook", { row: 3, col: 1 }, [{ row: 3, col: 3 }]);
    const moves = engine.getValidMoves(state, state.piece);
    expect(engine.isMoveValid(state, state.piece, { row: 3, col: 2 })).toBe(true);
    expect(engine.isMoveValid(state, state.piece, { row: 3, col: 3 })).toBe(false);
    expect(engine.isMoveValid(state, state.piece, { row: 3, col: 4 })).toBe(false);
    expect(keys(moves)).not.toContain("3,3");
    expect(engine.isPathBlocked(state, state.piece.position, { row: 3, col: 5 })).toBe(true);
  });

  it("không đi chéo", () => {
    const state = board("rook", { row: 2, col: 2 });
    [{ row: 1, col: 1 }, { row: 1, col: 3 }, { row: 3, col: 1 }, { row: 3, col: 3 }]
      .forEach((position) => expect(engine.isMoveValid(state, state.piece, position)).toBe(false));
  });
});

describe("MoveEngine - quân Tượng", () => {
  it("trả về bốn đường chéo khi Tượng ở giữa bàn", () => {
    const state = board("bishop", { row: 2, col: 2 });
    expect(keys(engine.getValidMoves(state, state.piece))).toEqual(keys([
      { row: 1, col: 1 }, { row: 0, col: 0 }, { row: 1, col: 3 }, { row: 0, col: 4 },
      { row: 3, col: 1 }, { row: 4, col: 0 }, { row: 3, col: 3 }, { row: 4, col: 4 }, { row: 5, col: 5 },
    ]));
  });

  it("không cho đi qua vật cản trên đường chéo", () => {
    const state = board("bishop", { row: 4, col: 1 }, [{ row: 2, col: 3 }]);
    expect(engine.isMoveValid(state, state.piece, { row: 3, col: 2 })).toBe(true);
    expect(engine.isMoveValid(state, state.piece, { row: 2, col: 3 })).toBe(false);
    expect(engine.isMoveValid(state, state.piece, { row: 1, col: 4 })).toBe(false);
  });

  it("không đi ngang hoặc dọc", () => {
    const state = board("bishop", { row: 3, col: 3 });
    [{ row: 3, col: 0 }, { row: 3, col: 5 }, { row: 0, col: 3 }, { row: 5, col: 3 }]
      .forEach((position) => expect(engine.isMoveValid(state, state.piece, position)).toBe(false));
  });

  it("luôn giữ nguyên màu ô", () => {
    const state = board("bishop", { row: 2, col: 3 });
    const startColor = (2 + 3) % 2;
    engine.getValidMoves(state, state.piece).forEach((position) => {
      expect((position.row + position.col) % 2).toBe(startColor);
    });
  });
});

describe("MoveEngine - quân Mã", () => {
  it("có đủ 8 nước chữ L ở giữa bàn", () => {
    const state = board("knight", { row: 2, col: 2 });
    expect(keys(engine.getValidMoves(state, state.piece))).toEqual(keys([
      { row: 0, col: 1 }, { row: 0, col: 3 }, { row: 1, col: 0 }, { row: 1, col: 4 },
      { row: 3, col: 0 }, { row: 3, col: 4 }, { row: 4, col: 1 }, { row: 4, col: 3 },
    ]));
  });

  it("chỉ giữ các nước nằm trong bàn khi ở góc", () => {
    const state = board("knight", { row: 0, col: 0 });
    expect(keys(engine.getValidMoves(state, state.piece))).toEqual(["1,2", "2,1"]);
  });

  it("nhảy được khi bị vật cản bao quanh", () => {
    const blockers = [{ row: 1, col: 2 }, { row: 2, col: 1 }, { row: 2, col: 3 }, { row: 3, col: 2 }];
    const state = board("knight", { row: 2, col: 2 }, blockers);
    expect(engine.getValidMoves(state, state.piece)).toHaveLength(8);
  });

  it("không đi ngang, dọc hoặc chéo thông thường", () => {
    const state = board("knight", { row: 2, col: 2 });
    [{ row: 2, col: 5 }, { row: 5, col: 2 }, { row: 4, col: 4 }, { row: 3, col: 3 }]
      .forEach((position) => expect(engine.isMoveValid(state, state.piece, position)).toBe(false));
  });
});
