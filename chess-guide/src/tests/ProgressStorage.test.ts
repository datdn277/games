import { describe, expect, it } from "vitest";
import { calculateStars } from "../game/ProgressStorage";

describe("calculateStars", () => {
  it("trao 3 sao khi không sai và không dùng gợi ý", () => expect(calculateStars(0, 0)).toBe(3));
  it("trao 2 sao khi sai tối đa hai lần và dùng tối đa một gợi ý", () => expect(calculateStars(2, 1)).toBe(2));
  it("luôn trao ít nhất 1 sao", () => expect(calculateStars(8, 3)).toBe(1));
});
