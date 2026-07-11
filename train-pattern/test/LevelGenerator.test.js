import { describe, expect, it } from "vitest";
import { difficultyConfigs, patternConfigs } from "../src/data/patternConfigs.js";
import { LevelGenerator } from "../src/game/LevelGenerator.js";
import { PatternEngine } from "../src/game/PatternEngine.js";

describe("LevelGenerator", () => {
  it("sinh 500 màn hợp lệ, duy nhất và không lặp màn liền trước", () => {
    const engine = new PatternEngine();
    const generator = new LevelGenerator({ engine });
    let previousSignature = null;

    for (let index = 0; index < 500; index += 1) {
      const difficulty = ["easy", "medium", "hard"][index % 3];
      const config = difficultyConfigs[difficulty];
      const level = generator.generate(difficulty);
      const signature = `${level.patternType}:${level.itemCategory}:${level.patternUnit.join("-")}:${level.fullSequence.length}:${level.missingIndex}`;

      expect(config.allowedPatterns).toContain(level.patternType);
      expect(level.fullSequence.length).toBeGreaterThanOrEqual(config.minTrainCars);
      expect(level.fullSequence.length).toBeLessThanOrEqual(config.maxTrainCars);
      expect(level.fullSequence.length).toBeGreaterThanOrEqual(patternConfigs[level.patternType].length * 2);
      expect(level.visibleSequence).toHaveLength(level.fullSequence.length);
      expect(level.visibleSequence.filter((item) => item === null)).toHaveLength(1);
      expect(level.missingIndex).toBe(level.fullSequence.length - 1);
      expect(level.answerOptions).toHaveLength(config.answerOptionCount);
      expect(new Set(level.answerOptions.map((item) => item.id)).size).toBe(config.answerOptionCount);
      expect(level.answerOptions.filter((item) => item.id === level.correctAnswer)).toHaveLength(1);
      expect(new Set(level.patternUnit).size).toBe(new Set(patternConfigs[level.patternType]).size);
      expect(engine.validateAnswer(level.fullSequence[level.missingIndex], level.correctItem)).toBe(true);
      expect(level.fullSequence.every(Boolean)).toBe(true);
      expect(signature).not.toBe(previousSignature);
      previousSignature = signature;
    }
  });
});
