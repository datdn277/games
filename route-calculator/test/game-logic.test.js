import test from "node:test";
import assert from "node:assert/strict";
import { createAnswerOptions } from "../src/game/AnswerController.js";
import {
  AudioController,
  buildOperationInstruction,
  buildOperationQuestion,
} from "../src/game/AudioController.js";
import { calculateFruitLayout } from "../src/game/BasketScene.js";
import { calculateStars, GameState } from "../src/game/GameState.js";

test("đáp án đúng xuất hiện đúng một lần và không có số âm", () => {
  for (let correct = 0; correct <= 15; correct += 1) {
    for (const count of [3, 4]) {
      const options = createAnswerOptions(correct, count);
      assert.equal(options.length, count);
      assert.equal(new Set(options).size, count);
      assert.equal(options.filter((value) => value === correct).length, 1);
      assert.ok(options.every((value) => value >= 0));
    }
  }
});

test("layout rổ hỗ trợ 0, 1, 5, 10 và 15 quả không trùng vị trí", () => {
  for (const count of [0, 1, 5, 10, 15]) {
    const layout = calculateFruitLayout(count);
    assert.equal(layout.length, count);
    const unique = new Set(layout.map(({ x, y, z }) => `${x}|${y}|${z}`));
    assert.equal(unique.size, count);
    assert.ok(layout.every(({ x }) => Math.abs(x) <= 2.84));
  }
});

test("GameState chuyển kết quả thành currentValue của bước tiếp theo", () => {
  const level = {
    startValue: 4,
    steps: [
      { operator: "+", operand: 2, inputValue: 4, result: 6 },
      { operator: "-", operand: 1, inputValue: 6, result: 5 },
    ],
  };
  const state = new GameState();
  state.startLevel(level);
  state.completeCurrentStep();
  assert.equal(state.currentValue, 6);
  assert.equal(state.currentStep.inputValue, 6);
  assert.equal(state.completed, false);
  state.completeCurrentStep();
  assert.equal(state.currentValue, 5);
  assert.equal(state.completed, true);
});

test("tính sao nhẹ nhàng theo lỗi và gợi ý", () => {
  assert.equal(calculateStars({ mistakes: 0, hintsUsed: 0 }), 3);
  assert.equal(calculateStars({ mistakes: 2, hintsUsed: 1 }), 2);
  assert.equal(calculateStars({ mistakes: 3, hintsUsed: 0 }), 1);
});

test("câu đọc mô tả thao tác trước rồi mới hỏi kết quả", () => {
  const addition = { operator: "+", operand: 2, inputValue: 3, result: 5 };
  const subtraction = { operator: "-", operand: 2, inputValue: 5, result: 3 };
  assert.equal(buildOperationInstruction(addition), "Bắt đầu với 3 quả. Ta thêm 2 quả vào rổ.");
  assert.equal(buildOperationQuestion(addition), "Trong rổ lúc này có bao nhiêu quả?");
  assert.equal(buildOperationInstruction(subtraction), "Bắt đầu với 5 quả. Ta lấy 2 quả trong rổ ra.");
  assert.equal(buildOperationQuestion(subtraction), "Trong rổ lúc này còn bao nhiêu quả?");
});

test("AudioController chỉ hoàn tất sau sự kiện giọng đọc kết thúc", async () => {
  const originalWindow = globalThis.window;
  const originalUtterance = globalThis.SpeechSynthesisUtterance;
  let spokenUtterance = null;

  class MockUtterance {
    constructor(text) {
      this.text = text;
    }
  }

  globalThis.window = {
    SpeechSynthesisUtterance: MockUtterance,
    setTimeout,
    clearTimeout,
    speechSynthesis: {
      addEventListener() {},
      cancel() {},
      getVoices() { return []; },
      speak(utterance) { spokenUtterance = utterance; },
    },
  };
  globalThis.SpeechSynthesisUtterance = MockUtterance;

  try {
    const audio = new AudioController(true);
    let resolved = false;
    const speech = audio.speak("Ta thêm 2 quả vào rổ.").then((value) => {
      resolved = true;
      return value;
    });
    await Promise.resolve();
    assert.equal(resolved, false);
    spokenUtterance.onend();
    assert.equal(await speech, true);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalUtterance === undefined) delete globalThis.SpeechSynthesisUtterance;
    else globalThis.SpeechSynthesisUtterance = originalUtterance;
  }
});
