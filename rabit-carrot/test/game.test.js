import test from "node:test";
import assert from "node:assert/strict";
import { AudioController } from "../src/game/AudioController.js";
import { keyToDirection } from "../src/game/directions.js";
import { GameState } from "../src/game/GameState.js";
import { LevelGenerator, validateLevel } from "../src/game/LevelGenerator.js";
import { directionBetween, DIRECTIONS } from "../src/game/directions.js";
import { findNearestPath, findPath } from "../src/game/PathFinder.js";

function makeLevel(overrides = {}) {
  return {
    level: 2,
    rows: 4,
    columns: 4,
    player: { row: 1, column: 1, direction: "down" },
    carrots: [{ row: 0, column: 3, id: "carrot-0" }],
    obstacles: [],
    home: { row: 3, column: 3, unlocked: false },
    guideDefault: true,
    ...overrides
  };
}

test("bốn hướng thay đổi đúng một hàng hoặc một cột", () => {
  const expectations = {
    up: [0, 1],
    down: [2, 1],
    left: [1, 0],
    right: [1, 2]
  };
  for (const [direction, [row, column]] of Object.entries(expectations)) {
    const state = new GameState(makeLevel());
    const result = state.attemptMove(direction);
    assert.equal(result.status, "moved");
    assert.deepEqual([state.player.row, state.player.column], [row, column]);
    assert.equal(state.moves, 1);
  }
});

test("không đi ra ngoài ma trận và không tăng số bước", () => {
  const state = new GameState(makeLevel({ player: { row: 0, column: 0, direction: "down" } }));
  assert.equal(state.attemptMove("up").status, "outside");
  assert.equal(state.attemptMove("left").status, "outside");
  assert.deepEqual([state.player.row, state.player.column], [0, 0]);
  assert.equal(state.moves, 0);
});

test("cây, đá và vũng nước đều chặn đường", () => {
  for (const type of ["tree", "rock", "water"]) {
    const state = new GameState(makeLevel({ obstacles: [{ row: 1, column: 2, id: type, type }] }));
    const result = state.attemptMove("right");
    assert.equal(result.status, "blocked");
    assert.equal(result.obstacle.type, type);
    assert.deepEqual([state.player.row, state.player.column], [1, 1]);
  }
});

test("khóa di chuyển bỏ qua lệnh bấm liên tục", () => {
  const state = new GameState(makeLevel());
  state.player.moving = true;
  assert.equal(state.attemptMove("right").status, "busy");
  assert.equal(state.moves, 0);
});

test("nhặt nhiều cà rốt, mở hang và hoàn thành đúng thứ tự", () => {
  const state = new GameState(makeLevel({
    rows: 3,
    columns: 3,
    player: { row: 2, column: 0, direction: "right" },
    carrots: [
      { row: 2, column: 1, id: "carrot-0" },
      { row: 1, column: 1, id: "carrot-1" }
    ],
    home: { row: 0, column: 1, unlocked: false }
  }));
  const first = state.attemptMove("right");
  assert.equal(first.carrot.id, "carrot-0");
  assert.equal(state.collectedCount, 1);
  assert.equal(state.home.unlocked, false);

  const second = state.attemptMove("up");
  assert.equal(second.carrot.id, "carrot-1");
  assert.equal(second.justUnlocked, true);
  assert.equal(state.home.unlocked, true);
  assert.equal(state.completed, false);

  const finish = state.attemptMove("up");
  assert.equal(finish.completed, true);
  assert.equal(state.completed, true);
  assert.equal(state.collectedCount, 2);
});

test("tạo GameState mới đặt lại toàn bộ tiến độ", () => {
  const level = makeLevel({ carrots: [{ row: 1, column: 2, id: "carrot-0" }] });
  const first = new GameState(level);
  first.attemptMove("right");
  assert.equal(first.collectedCount, 1);
  const reset = new GameState(level);
  assert.equal(reset.collectedCount, 0);
  assert.equal(reset.carrots[0].collected, false);
  assert.equal(reset.completed, false);
});

test("BFS tìm đường và trả về đúng hướng của bước kế tiếp", () => {
  const path = findPath({
    rows: 4,
    columns: 4,
    obstacles: [{ row: 1, column: 2 }],
    start: { row: 1, column: 1 },
    target: { row: 1, column: 3 }
  });
  assert.ok(path);
  assert.notDeepEqual(path[1], { row: 1, column: 2 });
  const direction = directionBetween(path[0], path[1]);
  assert.ok(DIRECTIONS[direction]);

  const nearest = findNearestPath({
    rows: 4,
    columns: 4,
    obstacles: [],
    start: { row: 2, column: 2 },
    targets: [{ row: 2, column: 3, id: "near" }, { row: 0, column: 0, id: "far" }]
  });
  assert.equal(nearest.target.id, "near");
  assert.equal(directionBetween(nearest.path[0], nearest.path[1]), "right");
});

test("sinh 100 màn ngẫu nhiên đều hợp lệ và có đường đến mọi mục tiêu", () => {
  let seed = 20260711;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const generator = new LevelGenerator(random);
  for (let index = 0; index < 100; index += 1) {
    const level = generator.generate((index % 4) + 1);
    assert.equal(validateLevel(level), true, `Màn ${index + 1} phải hợp lệ`);
    for (const target of [...level.carrots, level.home]) {
      assert.ok(findPath({ ...level, start: level.player, target }), `Màn ${index + 1} phải có đường đi`);
    }
  }
});

test("màn 1 luôn có cà rốt cách thỏ đúng một ô", () => {
  const generator = new LevelGenerator(() => 0.42);
  const level = generator.generate(1);
  const distance = Math.abs(level.player.row - level.carrots[0].row) + Math.abs(level.player.column - level.carrots[0].column);
  assert.equal(level.rows, 3);
  assert.equal(distance, 1);
  assert.equal(level.obstacles.length, 0);
});

test("chế độ lưới tùy chọn sinh màn hợp lệ từ 3×3 đến 6×6", () => {
  let seed = 20260712;
  const random = () => {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return seed / 4294967296;
  };
  const generator = new LevelGenerator(random);
  for (const levelNumber of [1, 2, 3, 4]) {
    for (const size of [3, 4, 5, 6]) {
      const level = generator.generate(levelNumber, { gridSize: size });
      assert.equal(level.rows, size);
      assert.equal(level.columns, size);
      assert.equal(validateLevel(level), true, `Màn ${levelNumber}, lưới ${size}×${size} phải hợp lệ`);
    }
  }
});

test("phím mũi tên map đúng và phím khác bị bỏ qua", () => {
  assert.equal(keyToDirection("ArrowUp"), "up");
  assert.equal(keyToDirection("ArrowDown"), "down");
  assert.equal(keyToDirection("ArrowLeft"), "left");
  assert.equal(keyToDirection("ArrowRight"), "right");
  assert.equal(keyToDirection("Enter"), null);
});

test("voice hủy câu cũ trước khi phát câu mới và tắt âm vẫn an toàn", () => {
  const events = [];
  const synth = {
    cancel: () => events.push("cancel"),
    speak: (utterance) => events.push(`speak:${utterance.text}`),
    getVoices: () => [{ lang: "vi-VN", name: "Vietnamese" }]
  };
  class FakeUtterance {
    constructor(text) { this.text = text; }
  }
  const audio = new AudioController(synth, FakeUtterance);
  audio.speak("Đi lên.");
  audio.speak("Đi sang phải.");
  assert.deepEqual(events, ["cancel", "speak:Đi lên.", "cancel", "speak:Đi sang phải."]);
  audio.setEnabled(false);
  audio.speak("Không được phát.");
  assert.equal(events.filter((event) => event.startsWith("speak:")).length, 2);
});
