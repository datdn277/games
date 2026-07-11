/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InputController } from "../src/game/InputController.js";
import { HintController } from "../src/game/HintController.js";
import { GameState, calculateStars } from "../src/game/GameState.js";
import { PatternEngine } from "../src/game/PatternEngine.js";

describe("Tương tác và trạng thái", () => {
  beforeEach(() => {
    document.body.innerHTML = `<div id="options"><button data-option-id="apple">Táo</button></div>`;
  });

  it("chọn đáp án bằng bàn phím", () => {
    const onSelect = vi.fn();
    const input = new InputController({
      container: document.querySelector("#options"),
      getItem: (id) => ({ id }),
      canInteract: () => true,
      canDropAt: () => false,
      onSelect,
      onInvalidDrop: vi.fn(),
      onDropHover: vi.fn(),
    });
    input.bind();
    document.querySelector("button").dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(onSelect).toHaveBeenCalledWith({ id: "apple" }, { method: "keyboard" });
  });

  it("khóa input ngăn lựa chọn liên tiếp", () => {
    const onSelect = vi.fn();
    const input = new InputController({
      container: document.querySelector("#options"),
      getItem: (id) => ({ id }),
      canInteract: () => false,
      canDropAt: () => true,
      onSelect,
      onInvalidDrop: vi.fn(),
      onDropHover: vi.fn(),
    });
    input.bind();
    document.querySelector("button").dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("gợi ý tăng dần qua ba bước và không tự trả lời", () => {
    const engine = new PatternEngine();
    const audio = { speak: vi.fn() };
    const actions = { message: vi.fn(), group: vi.fn(), highlight: vi.fn() };
    const hint = new HintController({
      engine,
      audio,
      onMessage: actions.message,
      onGroup: actions.group,
      onHighlightAnswer: actions.highlight,
    });
    const apple = { id: "apple", label: "Táo", speechLabel: "quả táo" };
    const banana = { id: "banana", label: "Chuối", speechLabel: "quả chuối" };
    const level = {
      patternType: "AB",
      itemsByToken: { A: apple, B: banana },
      visibleSequence: [apple, banana, apple, null],
      groups: [[0, 1], [2, 3]],
      correctAnswer: "banana",
    };
    expect(hint.show(level, 0)).toBe(1);
    expect(actions.highlight).not.toHaveBeenCalled();
    expect(hint.show(level, 1)).toBe(2);
    expect(actions.group).toHaveBeenCalled();
    expect(hint.show(level, 2)).toBe(3);
    expect(actions.highlight).toHaveBeenCalledWith("banana");
    expect(hint.show(level, 3)).toBe(3);
  });

  it("reset màn và tính sao nhẹ nhàng", () => {
    const state = new GameState({ mistakes: 3, hintsUsed: 2, interactionLocked: true });
    state.startLevel({ id: "new" });
    expect(state.snapshot).toEqual(expect.objectContaining({ mistakes: 0, hintsUsed: 0, interactionLocked: false }));
    expect(calculateStars({ mistakes: 0, hintsUsed: 0 })).toBe(3);
    expect(calculateStars({ mistakes: 2, hintsUsed: 1 })).toBe(2);
    expect(calculateStars({ mistakes: 4, hintsUsed: 3 })).toBe(1);
  });
});
