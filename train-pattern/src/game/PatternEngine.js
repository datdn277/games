import { patternConfigs } from "../data/patternConfigs.js";

export class PatternEngine {
  parsePattern(pattern) {
    if (Array.isArray(pattern)) return [...pattern];
    if (typeof pattern !== "string" || pattern.length < 2) {
      throw new Error("Quy luật phải là chuỗi như AB, AAB hoặc ABC.");
    }
    const parsed = patternConfigs[pattern] ?? [...pattern.toUpperCase()];
    if (parsed.some((token) => !/^[A-Z]$/.test(token))) {
      throw new Error(`Quy luật không hợp lệ: ${pattern}`);
    }
    return [...parsed];
  }

  buildPatternSequence(pattern, itemsByToken, length) {
    const unit = this.parsePattern(pattern);
    if (!Number.isInteger(length) || length <= 0) throw new Error("Độ dài chuỗi phải lớn hơn 0.");
    return Array.from({ length }, (_, index) => {
      const token = unit[index % unit.length];
      const item = itemsByToken[token];
      if (!item) throw new Error(`Thiếu phần tử cho ký hiệu ${token}.`);
      return item;
    });
  }

  getExpectedItemAt(pattern, itemsByToken, index) {
    if (!Number.isInteger(index) || index < 0) throw new Error("Vị trí không hợp lệ.");
    const unit = this.parsePattern(pattern);
    return itemsByToken[unit[index % unit.length]];
  }

  createMissingSequence(sequence, missingIndex) {
    if (!Array.isArray(sequence) || missingIndex < 0 || missingIndex >= sequence.length) {
      throw new Error("Không thể tạo ô trống ở vị trí này.");
    }
    const visible = [...sequence];
    visible[missingIndex] = null;
    return visible;
  }

  validateAnswer(answer, expectedItem) {
    const answerId = typeof answer === "string" ? answer : answer?.id;
    const expectedId = typeof expectedItem === "string" ? expectedItem : expectedItem?.id;
    return Boolean(answerId && expectedId && answerId === expectedId);
  }

  getPatternGroups(pattern, sequenceLength) {
    const size = this.parsePattern(pattern).length;
    const groups = [];
    for (let start = 0; start < sequenceLength; start += size) {
      groups.push(Array.from({ length: Math.min(size, sequenceLength - start) }, (_, offset) => start + offset));
    }
    return groups;
  }

  describePattern(pattern, itemsByToken) {
    const unit = this.parsePattern(pattern).map((token) => itemsByToken[token]);
    const names = unit.map((item) => item?.speechLabel ?? item?.label ?? "").filter(Boolean);
    return {
      unit,
      names,
      short: names.join(", "),
      sentence: `Mỗi nhóm gồm ${this.joinVietnamese(names)}.`,
    };
  }

  joinVietnamese(words) {
    if (words.length <= 1) return words[0] ?? "";
    return `${words.slice(0, -1).join(", ")} rồi ${words.at(-1)}`;
  }
}

export default PatternEngine;
