import { TONE_TEXT_SYMBOLS } from "./tone-icons.js";

export const PART_TYPES = ["initial", "rhyme", "tone"];

export function getRequiredParts(item) {
  return item.tone === "ngang" ? ["initial", "rhyme"] : PART_TYPES;
}

export function createEmptySelection() {
  return { initial: null, rhyme: null, tone: null };
}

export function selectPart(selection, type, value) {
  if (!PART_TYPES.includes(type)) throw new Error(`Loại mảnh không hợp lệ: ${type}`);
  return { ...selection, [type]: value };
}

export function getWrongParts(selection, item) {
  return getRequiredParts(item).filter((type) => selection[type] !== item[type]);
}

export function buildSuccessFeedback(item) {
  const equation = getRequiredParts(item)
    .map((type) => displayPartValue(type, item[type]))
    .join(" + ");
  return `Đúng rồi! ${equation} tạo thành tiếng “${item.word}”.`;
}

export function buildCompletionSpeech(item) {
  return `${item.spelling}.`;
}

export function displayPartValue(type, value) {
  if (value === null || value === undefined) return "?";
  if (type === "initial" && value === "") return "∅";
  if (type === "tone") return TONE_TEXT_SYMBOLS[value] ?? value;
  return value;
}

export function buildErrorFeedback(wrong, item) {
  if (wrong.length === 1 && wrong[0] === "tone") {
    return `Gần đúng rồi. Tiếng này cần dấu ${item.tone} để đọc là “${item.word}”.`;
  }
  const messages = wrong.map((type) => {
    if (type === "initial") {
      return item.initial
        ? `tiếng “${item.word}” bắt đầu bằng âm ${item.initial}`
        : `tiếng “${item.word}” không có âm đầu`;
    }
    if (type === "rhyme") return `tiếng “${item.word}” có vần ${item.rhyme}`;
    return `tiếng “${item.word}” cần dấu ${item.tone}`;
  });
  return `Chưa đúng. ${capitalize(messages.join("; "))}. Con thay mảnh được đánh dấu nhé.`;
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
