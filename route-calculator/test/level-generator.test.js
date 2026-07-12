import test from "node:test";
import assert from "node:assert/strict";
import { difficultyConfigs } from "../src/data/difficultyConfigs.js";
import {
  generateArithmeticPath,
  levelSignature,
  validateLevel,
} from "../src/game/LevelGenerator.js";

test("các chuỗi mẫu dùng kết quả trước làm đầu vào bước sau", () => {
  const chains = [
    {
      startValue: 4,
      steps: [
        { operator: "+", operand: 2, inputValue: 4, result: 6 },
        { operator: "-", operand: 1, inputValue: 6, result: 5 },
        { operator: "+", operand: 3, inputValue: 5, result: 8 },
      ],
    },
    {
      startValue: 7,
      steps: [
        { operator: "-", operand: 2, inputValue: 7, result: 5 },
        { operator: "+", operand: 4, inputValue: 5, result: 9 },
        { operator: "-", operand: 3, inputValue: 9, result: 6 },
      ],
    },
  ];

  for (const chain of chains) {
    let current = chain.startValue;
    for (const step of chain.steps) {
      assert.equal(step.inputValue, current);
      current = step.operator === "+" ? current + step.operand : current - step.operand;
      assert.equal(current, step.result);
      assert.ok(current >= 0);
    }
  }
});

for (const [difficulty, config] of Object.entries(difficultyConfigs)) {
  test(`sinh 500 level ${difficulty} hợp lệ và không lặp liên tiếp`, () => {
    let previousSignature = "";
    for (let index = 0; index < 500; index += 1) {
      const level = generateArithmeticPath(config, { difficulty, previousSignature });
      const signature = levelSignature(level);
      assert.ok(validateLevel(level, config), `Level không hợp lệ: ${signature}`);
      assert.notEqual(signature, previousSignature);
      assert.equal(level.steps.length, config.operationCount);
      assert.ok(level.steps.every((step) => step.result >= 0 && step.result <= config.maxResult));
      if (config.allowedOperators.length > 1) {
        assert.ok(level.steps.some((step) => step.operator === "+"));
        assert.ok(level.steps.some((step) => step.operator === "-"));
      }
      previousSignature = signature;
    }
  });
}
