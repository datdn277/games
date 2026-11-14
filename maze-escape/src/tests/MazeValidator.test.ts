import { describe, expect, it } from "vitest";
import { createLevel } from "../maze/LevelFactory";
import { validateMazeLevel } from "../maze/MazeValidator";

const validLevel = createLevel({
  id: "valid",
  name: "Valid",
  instruction: "Test",
  difficulty: "easy",
  layout: ["S.C", "...", "..E"],
});

describe("MazeValidator", () => {
  it("accepts a valid level and confirms optimalPathLength", () => {
    const result = validateMazeLevel(validLevel);
    expect(result.valid).toBe(true);
    expect(result.calculatedOptimalPathLength).toBe(validLevel.optimalPathLength);
  });

  it("rejects invalid dimensions and outside coordinates", () => {
    const level = { ...validLevel, rows: 4, start: { row: -1, col: 0 } };
    const result = validateMazeLevel(level);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/kích thước|ngoài/i);
  });

  it("rejects a start, exit or collectible in a wall", () => {
    const wallCells = validLevel.cells.map((row) => [...row]);
    wallCells[0]![0] = "wall";
    wallCells[0]![2] = "wall";
    const result = validateMazeLevel({ ...validLevel, cells: wallCells });
    expect(result.errors.join(" ")).toMatch(/bắt đầu nằm trong tường/i);
    expect(result.errors.join(" ")).toMatch(/vật phẩm.*tường/i);
  });

  it("rejects unreachable collectibles and exit", () => {
    const cells = validLevel.cells.map((row) => [...row]);
    cells[0]![1] = "wall";
    cells[1] = ["wall", "wall", "wall"];
    const result = validateMazeLevel({ ...validLevel, cells });
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/không có đường/i);
  });

  it("rejects duplicate collectible coordinates", () => {
    const duplicate = {
      ...validLevel.collectibles[0]!,
      id: "duplicate",
    };
    const result = validateMazeLevel({
      ...validLevel,
      collectibles: [...validLevel.collectibles, duplicate],
    });
    expect(result.errors.join(" ")).toMatch(/trùng vị trí/i);
  });

  it("rejects an incorrect optimalPathLength", () => {
    const result = validateMazeLevel({
      ...validLevel,
      optimalPathLength: validLevel.optimalPathLength + 1,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/optimalPathLength/);
  });
});
