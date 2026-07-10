import test from "node:test";
import assert from "node:assert/strict";
import { buildVietnameseSyllable } from "../src/vietnamese.js";
import { createSpeechController } from "../src/speech.js";
import {
  buildCompletionSpeech,
  buildErrorFeedback,
  buildSuccessFeedback,
  createEmptySelection,
  displayPartValue,
  getRequiredParts,
  getWrongParts,
  selectPart
} from "../src/game-logic.js";
import { WORDS, getRoundOptions } from "../src/data.js";
import { toneIconMarkup } from "../src/tone-icons.js";

const cases = [
  ["ba", "b", "a", "ngang"],
  ["bà", "b", "a", "huyền"],
  ["bé", "b", "e", "sắc"],
  ["mẹ", "m", "e", "nặng"],
  ["bàn", "b", "an", "huyền"],
  ["bút", "b", "ut", "sắc"],
  ["cặp", "c", "ap", "nặng"],
  ["mèo", "m", "eo", "huyền"],
  ["đèn", "đ", "en", "huyền"],
  ["táo", "t", "ao", "sắc"]
];

for (const [expected, initial, rhyme, tone] of cases) {
  test(`${expected} = ${initial} + ${rhyme} + ${tone}`, () => {
    assert.equal(buildVietnameseSyllable(initial, rhyme, tone), expected);
  });
}

test("hỗ trợ tiếng không có âm đầu", () => {
  assert.equal(buildVietnameseSyllable("", "ao", "sắc"), "áo");
});

test("hủy câu cũ trước khi phát câu mới", () => {
  const calls = [];
  const synth = {
    onvoiceschanged: null,
    getVoices: () => [],
    cancel: () => calls.push("cancel"),
    speak: () => calls.push("speak")
  };
  const OriginalUtterance = globalThis.SpeechSynthesisUtterance;
  globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  try {
    const voice = createSpeechController(synth);
    assert.equal(voice.speak("Xin chào"), true);
    assert.deepEqual(calls, ["cancel", "speak"]);
  } finally {
    globalThis.SpeechSynthesisUtterance = OriginalUtterance;
  }
});

const ban = { word: "bàn", initial: "b", rhyme: "an", tone: "huyền" };

test("phát hiện và giải thích sai âm đầu", () => {
  const wrong = getWrongParts({ initial: "d", rhyme: "an", tone: "huyền" }, ban);
  assert.deepEqual(wrong, ["initial"]);
  assert.match(buildErrorFeedback(wrong, ban), /bắt đầu bằng âm b/);
});

test("phát hiện và giải thích sai vần", () => {
  const wrong = getWrongParts({ initial: "b", rhyme: "am", tone: "huyền" }, ban);
  assert.deepEqual(wrong, ["rhyme"]);
  assert.match(buildErrorFeedback(wrong, ban), /có vần an/);
});

test("phát hiện và giải thích sai thanh", () => {
  const wrong = getWrongParts({ initial: "b", rhyme: "an", tone: "sắc" }, ban);
  assert.deepEqual(wrong, ["tone"]);
  assert.match(buildErrorFeedback(wrong, ban), /cần dấu huyền/);
});

test("chọn mảnh mới thay thế mảnh cũ và reset xóa toàn bộ lựa chọn", () => {
  const first = selectPart(createEmptySelection(), "initial", "d");
  const replaced = selectPart(first, "initial", "b");
  assert.equal(replaced.initial, "b");
  assert.deepEqual(createEmptySelection(), { initial: null, rhyme: null, tone: null });
});

test("tiếng thanh ngang chỉ yêu cầu âm đầu và vần", () => {
  for (const wordText of ["ba", "to", "cam", "hoa"]) {
    const item = WORDS.find((word) => word.word === wordText);
    assert.deepEqual(getRequiredParts(item), ["initial", "rhyme"]);
    assert.deepEqual(
      getWrongParts({ initial: item.initial, rhyme: item.rhyme, tone: null }, item),
      []
    );
  }
});

test("feedback và câu đọc của tiếng thanh ngang không chứa từ ngang", () => {
  const item = WORDS.find((word) => word.word === "ba");
  assert.equal(item.spelling, "bờ - a - ba");
  assert.equal(buildSuccessFeedback(item), "Đúng rồi! b + a tạo thành tiếng “ba”.");
  assert.equal(buildCompletionSpeech(item), "bờ - a - ba.");
  assert.doesNotMatch(`${item.spelling} ${buildSuccessFeedback(item)} ${buildCompletionSpeech(item)}`, /ngang/i);
});

test("tiếng có dấu vẫn yêu cầu và kiểm tra thanh", () => {
  assert.deepEqual(getRequiredParts(ban), ["initial", "rhyme", "tone"]);
  assert.deepEqual(getWrongParts({ initial: "b", rhyme: "an", tone: null }, ban), ["tone"]);
  assert.match(buildCompletionSpeech({ ...ban, spelling: "bờ - an - ban - huyền - bàn" }), /huyền/);
});

test("các dấu tiếng Việt hiển thị bằng ký hiệu nhưng giữ tên cho logic", () => {
  assert.equal(displayPartValue("tone", "sắc"), "ˊ");
  assert.equal(displayPartValue("tone", "huyền"), "ˋ");
  assert.equal(displayPartValue("tone", "hỏi"), "ˀ");
  assert.equal(displayPartValue("tone", "ngã"), "˜");
  assert.equal(displayPartValue("tone", "nặng"), "•");
  assert.match(toneIconMarkup("sắc"), /<svg/);
  assert.match(toneIconMarkup("hỏi"), /<path/);
  assert.match(toneIconMarkup("nặng"), /<circle/);
  assert.equal(buildSuccessFeedback(ban), "Đúng rồi! b + an + ˋ tạo thành tiếng “bàn”.");
  assert.equal(buildCompletionSpeech({ ...ban, spelling: "bờ - an - ban - huyền - bàn" }), "bờ - an - ban - huyền - bàn.");
});

test("mọi khay lựa chọn luôn giữ đáp án đúng sau khi random distractor", () => {
  for (const item of WORDS) {
    for (const type of getRequiredParts(item)) {
      for (const difficulty of ["easy", "medium", "hard", "mixed"]) {
        const options = getRoundOptions(item, type, difficulty, () => 0.91);
        assert.ok(options.includes(item[type]), `${item.word}/${type}/${difficulty} thiếu đáp án đúng`);
      }
    }
  }
});

test("khay chọn dấu không hiển thị lựa chọn không dấu", () => {
  for (const item of WORDS.filter((word) => getRequiredParts(word).includes("tone"))) {
    const options = getRoundOptions(item, "tone", item.level, () => 0.75);
    assert.ok(!options.includes("ngang"), `${item.word} vẫn còn lựa chọn ngang`);
  }
});
