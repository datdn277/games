import { describe, expect, it } from "vitest";
import { createLevel } from "../maze/LevelFactory";
import { validateMazeLevel } from "../maze/MazeValidator";
import { predefinedLevels } from "../maze/predefinedLevels";

describe("LevelFactory and predefined levels", () => {
  it("creates a typed level and calculates the optimal mission length", () => {
    const level = createLevel({
      id: "factory",
      name: "Factory",
      instruction: "Test",
      difficulty: "easy",
      layout: ["SCE", "...", "..."],
    });
    expect(level.start).toEqual({ row: 0, col: 0 });
    expect(level.exit).toEqual({ row: 0, col: 2 });
    expect(level.collectibles).toHaveLength(1);
    expect(level.optimalPathLength).toBe(2);
  });

  it("ships exactly 12 valid, unique, pedagogically ordered levels", () => {
    expect(predefinedLevels).toHaveLength(12);
    expect(new Set(predefinedLevels.map((level) => level.id)).size).toBe(12);
    for (const level of predefinedLevels) {
      const result = validateMazeLevel(level);
      expect(result.errors, level.id).toEqual([]);
    }
    expect(predefinedLevels.slice(0, 4).every((level) => level.difficulty === "easy")).toBe(true);
    expect(predefinedLevels.slice(4, 8).every((level) => level.difficulty === "medium")).toBe(true);
    expect(predefinedLevels.slice(8).every((level) => level.difficulty === "hard")).toBe(true);
    expect(predefinedLevels[10]?.recommendedMode).toBe("commands");
    expect(predefinedLevels[11]?.recommendedMode).toBe("commands");
  });

  it("rejects malformed layouts", () => {
    expect(() =>
      createLevel({
        id: "bad",
        name: "Bad",
        instruction: "Test",
        difficulty: "easy",
        layout: ["S.", "..E"],
      }),
    ).toThrow(/rectangular/i);
  });
});
