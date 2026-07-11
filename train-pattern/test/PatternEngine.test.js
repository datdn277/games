import { describe, expect, it } from "vitest";
import { PatternEngine } from "../src/game/PatternEngine.js";

const items = {
  A: { id: "a", label: "A", speechLabel: "a" },
  B: { id: "b", label: "B", speechLabel: "b" },
  C: { id: "c", label: "C", speechLabel: "c" },
};

describe("PatternEngine", () => {
  const engine = new PatternEngine();

  it.each([
    ["AB", "ababab"],
    ["AAB", "aabaab"],
    ["ABB", "abbabb"],
    ["ABC", "abcabc"],
  ])("tạo đúng chuỗi %s", (pattern, expected) => {
    const sequence = engine.buildPatternSequence(pattern, items, 6);
    expect(sequence.map((item) => item.id).join("")).toBe(expected);
    sequence.forEach((item, index) => expect(engine.getExpectedItemAt(pattern, items, index)).toBe(item));
  });

  it("tạo ô trống mà không sửa chuỗi gốc", () => {
    const sequence = engine.buildPatternSequence("AB", items, 6);
    const visible = engine.createMissingSequence(sequence, 5);
    expect(visible[5]).toBeNull();
    expect(sequence[5].id).toBe("b");
    expect(engine.validateAnswer("b", sequence[5])).toBe(true);
    expect(engine.validateAnswer(items.A, sequence[5])).toBe(false);
  });

  it("chia nhóm kể cả nhóm cuối chưa đủ", () => {
    expect(engine.getPatternGroups("ABC", 8)).toEqual([[0, 1, 2], [3, 4, 5], [6, 7]]);
  });

  it("mô tả đơn vị quy luật bằng tiếng Việt", () => {
    expect(engine.describePattern("AAB", items)).toEqual(expect.objectContaining({
      short: "a, a, b",
      sentence: "Mỗi nhóm gồm a, a rồi b.",
    }));
  });
});
