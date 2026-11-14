import { describe, expect, it } from "vitest";
import { countDeadEnds } from "../maze/MazeGrid";
import { createSeededRandom, MazeGenerator } from "../maze/MazeGenerator";
import { validateMazeLevel } from "../maze/MazeValidator";
import { difficultyConfigs } from "../maze/difficultyConfigs";
import { positionKey, type Difficulty, type MazeLevel } from "../maze/MazeCell";

function signature(level: MazeLevel): string {
  return `${level.cells.map((row) => row.join(",")).join("|")}/${positionKey(level.start)}/${positionKey(level.exit)}/${level.collectibles.map((item) => positionKey(item.position)).join(";")}`;
}

describe("MazeGenerator", () => {
  it("generates and validates 500 non-empty mazes without consecutive duplicates", () => {
    const generator = new MazeGenerator(createSeededRandom(20260722));
    const difficulties: Difficulty[] = ["easy", "medium", "hard"];
    let previousSignature = "";

    for (let index = 0; index < 500; index += 1) {
      const difficulty = difficulties[index % difficulties.length]!;
      const config = difficultyConfigs[difficulty];
      const level = generator.generate(difficulty);
      const result = validateMazeLevel(level);
      expect(result.errors, `maze ${index} (${difficulty})`).toEqual([]);
      expect(level.rows).toBe(config.rows);
      expect(level.cols).toBe(config.cols);
      expect(level.collectibles).toHaveLength(config.collectibleCount);
      expect(level.cells.flat().some((cell) => cell !== "wall")).toBe(true);
      expect(level.optimalPathLength).toBeGreaterThanOrEqual(config.minPathLength);
      expect(level.optimalPathLength).toBeLessThanOrEqual(config.maxPathLength);
      expect(countDeadEnds(level)).toBeLessThanOrEqual(config.maxDeadEnds);
      const currentSignature = signature(level);
      expect(currentSignature).not.toBe(previousSignature);
      previousSignature = currentSignature;
    }
  }, 30_000);
});
