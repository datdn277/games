import test from "node:test";
import assert from "node:assert/strict";
import { PALETTE } from "../src/data/colors.js";
import { DIFFICULTY_CONFIGS, GRID_SIZE_MODES, normalizeGridSizeMode, resolveLevelConfig } from "../src/data/levels.js";
import { AudioController } from "../src/game/AudioController.js";
import { GameState } from "../src/game/GameState.js";
import { keyToGridAction } from "../src/game/InputController.js";
import { LevelGenerator, validateGeneratedLevel } from "../src/game/LevelGenerator.js";
import { ProgressStore, STORAGE_KEY } from "../src/game/ProgressStore.js";
import { calculateStars, createEmptyGrid, gridSignature, isLevelComplete } from "../src/game/validation.js";

function seededRandom(seed = 314159) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function sampleLevel(overrides = {}) {
  return {
    difficulty: "medium",
    rows: 3,
    columns: 3,
    colors: ["red", "blue"],
    templateGrid: [
      ["red", null, "blue"],
      [null, "red", null],
      ["blue", null, null]
    ],
    paintedCount: 4,
    autoSelectColor: false,
    interactionMode: "tap",
    validationMode: "instant",
    ...overrides
  };
}

test("sinh 500 level hợp lệ cho Dễ, Trung bình và Khó", () => {
  const generator = new LevelGenerator(seededRandom());
  let previous = null;
  const paletteIds = new Set(PALETTE.map((color) => color.id));
  for (let index = 0; index < 500; index += 1) {
    const difficulty = ["easy", "medium", "hard"][index % 3];
    const config = DIFFICULTY_CONFIGS[difficulty];
    const level = generator.generate(difficulty, previous);
    const signature = gridSignature(level);
    assert.equal(validateGeneratedLevel(level, difficulty), true, `Level ${index + 1} phải hợp lệ`);
    assert.equal(level.rows, config.rows);
    assert.equal(level.columns, config.columns);
    assert.ok(level.paintedCount >= config.minPaintedCells && level.paintedCount <= config.maxPaintedCells);
    assert.ok(level.colors.length >= config.minColorCount && level.colors.length <= config.maxColorCount);
    assert.ok(level.colors.every((color) => paletteIds.has(color)));
    assert.notEqual(signature, previous, "Không lặp đúng mẫu ngay trước đó");
    previous = signature;
  }
});

test("mức Dễ là 3x3, đúng một màu, 2-4 ô và tự chọn màu", () => {
  const generator = new LevelGenerator(seededRandom(1));
  for (let index = 0; index < 30; index += 1) {
    const level = generator.generate("easy");
    const painted = level.templateGrid.flat().filter(Boolean);
    assert.equal(level.rows, 3);
    assert.equal(level.columns, 3);
    assert.equal(new Set(painted).size, 1);
    assert.ok(painted.length >= 2 && painted.length <= 4);
    const state = new GameState(level);
    assert.equal(state.selectedColor, level.colors[0]);
  }
});

test("mode nhập tay sinh đúng ma trận từ 2x2 đến 7x7 cho mọi độ khó", () => {
  const generator = new LevelGenerator(seededRandom(2026));
  for (const difficulty of ["easy", "medium", "hard"]) {
    for (const sizeMode of GRID_SIZE_MODES.filter((value) => value !== "auto")) {
      const config = resolveLevelConfig(difficulty, sizeMode);
      for (let index = 0; index < 25; index += 1) {
        const level = generator.generate(difficulty, null, sizeMode);
        assert.equal(level.sizeMode, sizeMode);
        assert.equal(level.rows, Number(sizeMode));
        assert.equal(level.columns, Number(sizeMode));
        assert.equal(validateGeneratedLevel(level, difficulty), true);
        assert.ok(level.paintedCount >= config.minPaintedCells && level.paintedCount <= config.maxPaintedCells);
      }
    }
  }
});

test("kích thước nhập tay được chuẩn hóa an toàn trong khoảng 2 đến 7", () => {
  assert.equal(normalizeGridSizeMode("6"), "6");
  assert.equal(normalizeGridSizeMode("1"), "2");
  assert.equal(normalizeGridSizeMode("99"), "7");
  assert.equal(normalizeGridSizeMode("không hợp lệ"), "auto");
});

test("mode Tự động giữ kích thước mặc định theo độ khó", () => {
  const generator = new LevelGenerator(seededRandom(88));
  assert.equal(generator.generate("easy", null, "auto").rows, 3);
  assert.equal(generator.generate("medium", null, "auto").rows, 3);
  assert.equal(generator.generate("hard", null, "auto").rows, 4);
});

test("mức Trung bình luôn dùng hai màu và mức Khó dùng ba hoặc bốn màu", () => {
  const generator = new LevelGenerator(seededRandom(2));
  for (let index = 0; index < 40; index += 1) {
    const medium = generator.generate("medium");
    assert.equal(new Set(medium.templateGrid.flat().filter(Boolean)).size, 2);
    const hard = generator.generate("hard");
    const used = hard.templateGrid.flat().filter(Boolean);
    assert.ok(new Set(used).size === 3 || new Set(used).size === 4);
    assert.ok(new Set(used).size < used.length, "Mức Khó phải có nhiều ô cùng màu");
  }
});

test("tô đúng vị trí và đúng màu được giữ lại", () => {
  const state = new GameState(sampleLevel());
  state.selectColor("red");
  const result = state.paintCell(0, 0);
  assert.equal(result.status, "correct");
  assert.equal(state.playerGrid[0][0], "red");
  assert.equal(state.mistakes, 0);
});

test("đúng vị trí sai màu, sai vị trí đúng màu và tô thừa ô trắng đều hoàn tác", () => {
  const state = new GameState(sampleLevel());
  assert.equal(state.paintCell(0, 0, "blue").status, "wrong");
  assert.equal(state.playerGrid[0][0], null);
  assert.equal(state.paintCell(1, 0, "red").status, "wrong");
  assert.equal(state.playerGrid[1][0], null);
  assert.equal(state.paintCell(2, 2, "blue").status, "wrong");
  assert.equal(state.playerGrid[2][2], null);
  assert.equal(state.mistakes, 3);
});

test("tô đè sai lên ô đúng giữ lại màu trước đó", () => {
  const state = new GameState(sampleLevel());
  state.paintCell(0, 0, "red");
  const result = state.paintCell(0, 0, "blue");
  assert.equal(result.status, "wrong");
  assert.equal(result.previous, "red");
  assert.equal(state.playerGrid[0][0], "red");
});

test("tẩy màu xóa riêng một ô và không reset toàn màn", () => {
  const state = new GameState(sampleLevel());
  state.paintCell(0, 0, "red");
  state.paintCell(0, 2, "blue");
  const result = state.eraseCell(0, 0);
  assert.equal(result.status, "erased");
  assert.equal(state.playerGrid[0][0], null);
  assert.equal(state.playerGrid[0][2], "blue");
});

test("bỏ sót ô không thể hoàn thành và tô đủ toàn ma trận sẽ hoàn thành", () => {
  const state = new GameState(sampleLevel());
  state.paintCell(0, 0, "red");
  state.paintCell(0, 2, "blue");
  state.paintCell(1, 1, "red");
  assert.equal(state.completed, false);
  const finish = state.paintCell(2, 0, "blue");
  assert.equal(finish.completed, true);
  assert.equal(state.completed, true);
  assert.equal(isLevelComplete(state.templateGrid, state.playerGrid), true);
});

test("so sánh toàn ma trận phát hiện cả ô trắng bị tô thừa", () => {
  const template = [["red", null], [null, null]];
  const player = [["red", null], [null, "red"]];
  assert.equal(isLevelComplete(template, player), false);
  assert.equal(isLevelComplete(template, createEmptyGrid(2, 2)), false);
});

test("gợi ý chạy đúng ba bước và không tự tô", () => {
  const state = new GameState(sampleLevel());
  const before = structuredClone(state.playerGrid);
  const first = state.nextHint();
  const second = state.nextHint();
  const third = state.nextHint();
  assert.equal(first.step, 1);
  assert.equal(second.step, 2);
  assert.equal(third.step, 3);
  assert.deepEqual([first.row, first.column], [second.row, second.column]);
  assert.deepEqual([second.row, second.column], [third.row, third.column]);
  assert.equal(third.colorId, "red");
  assert.deepEqual(state.playerGrid, before);
  assert.equal(state.hintsUsed, 3);
});

test("reset bằng GameState mới xóa màu, lỗi và gợi ý", () => {
  const level = sampleLevel();
  const state = new GameState(level);
  state.paintCell(0, 0, "blue");
  state.nextHint();
  const reset = new GameState(level);
  assert.deepEqual(reset.playerGrid, createEmptyGrid(3, 3));
  assert.equal(reset.mistakes, 0);
  assert.equal(reset.hintsUsed, 0);
});

test("tính sao đúng theo số lỗi và số gợi ý", () => {
  assert.equal(calculateStars({ mistakes: 0, hintsUsed: 0 }), 3);
  assert.equal(calculateStars({ mistakes: 2, hintsUsed: 1 }), 2);
  assert.equal(calculateStars({ mistakes: 3, hintsUsed: 0 }), 1);
});

test("lưu, đọc tiến trình và phục hồi an toàn khi dữ liệu hỏng", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  const store = new ProgressStore(storage);
  const initial = store.load();
  const updated = store.recordCompletion(initial, "easy", 3);
  assert.equal(updated.completedLevels, 1);
  assert.equal(updated.totalStars, 3);
  assert.equal(updated.unlockedDifficulty, "medium");
  assert.deepEqual(store.load(), updated);
  const withSize = store.save({ ...updated, gridSize: "5" });
  assert.equal(store.load().gridSize, "5");
  assert.equal(withSize.gridSize, "5");
  values.set(STORAGE_KEY, "{broken");
  assert.equal(store.load().completedLevels, 0);
});

test("keyboard hỗ trợ điều hướng, tô và tẩy", () => {
  assert.deepEqual(keyToGridAction("ArrowRight"), { type: "move-focus", row: 0, column: 1 });
  assert.deepEqual(keyToGridAction("Enter"), { type: "paint" });
  assert.deepEqual(keyToGridAction("Delete"), { type: "erase" });
  assert.equal(keyToGridAction("Escape"), null);
});

test("voice luôn hủy câu cũ trước khi phát câu mới", () => {
  const events = [];
  const synth = {
    cancel: () => events.push("cancel"),
    speak: (utterance) => events.push(`speak:${utterance.text}`),
    getVoices: () => [{ lang: "vi-VN" }]
  };
  class FakeUtterance { constructor(text) { this.text = text; } }
  const audio = new AudioController(synth, FakeUtterance);
  audio.speak("Màu đỏ.");
  audio.speak("Đúng rồi.");
  assert.deepEqual(events, ["cancel", "speak:Màu đỏ.", "cancel", "speak:Đúng rồi."]);
  audio.setEnabled(false);
  audio.speak("Không phát.");
  assert.equal(events.filter((value) => value.startsWith("speak:")).length, 2);
});
