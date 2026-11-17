import { Direction, indexForOrdinal } from './Ordinal.js';

export const ANIMAL_NAMES = Object.freeze({
  cat: 'Mèo',
  bear: 'Gấu',
  rabbit: 'Thỏ',
  frog: 'Ếch',
  panda: 'Gấu trúc',
  fox: 'Cáo',
});

export const ANIMAL_IDS = Object.freeze(Object.keys(ANIMAL_NAMES));

export const QuestionType = Object.freeze({
  CHOOSE_FLAG: 'CHOOSE_FLAG',
  CHOOSE_END_ANIMAL: 'CHOOSE_END_ANIMAL',
  FIND_ANIMAL_BY_ORDINAL: 'FIND_ANIMAL_BY_ORDINAL',
});

export const LEVELS = Object.freeze([
  { id: 1, title: 'Trái hay phải?', description: 'Tìm hai đầu của hàng.', questionCount: 5 },
  { id: 2, title: 'Mimo tập đếm', description: 'Chạm từng bạn và đếm cùng Mimo.', questionCount: 5 },
  { id: 3, title: 'Đếm từ bên trái', description: 'Bắt đầu từ trái rồi đếm sang phải.', questionCount: 5 },
  { id: 4, title: 'Đếm từ bên phải', description: 'Bắt đầu từ phải rồi đếm sang trái.', questionCount: 5 },
  { id: 5, title: 'Thử thách đổi chiều', description: 'Giữ nguyên hàng và thử đếm từ hai đầu.', questionCount: 4 },
].map((level) => Object.freeze(level)));

const { LEFT_TO_RIGHT, RIGHT_TO_LEFT } = Direction;
const { CHOOSE_FLAG, CHOOSE_END_ANIMAL, FIND_ANIMAL_BY_ORDINAL } = QuestionType;

function makeRow(length, random) {
  const row = [...ANIMAL_IDS];
  for (let i = row.length - 1; i > 0; i -= 1) {
    const swap = Math.floor(random() * (i + 1));
    [row[i], row[swap]] = [row[swap], row[i]];
  }
  return Object.freeze(row.slice(0, length));
}

function question(id, direction, targetOrdinal, animals, extras = {}) {
  return Object.freeze({
    id,
    type: FIND_ANIMAL_BY_ORDINAL,
    direction,
    targetOrdinal,
    animals,
    ...extras,
  });
}

function comparisonPair(pairNumber, ordinal, animals) {
  const comparisonId = `compare-${pairNumber}`;
  return [LEFT_TO_RIGHT, RIGHT_TO_LEFT].map((direction, index) =>
    question(`${comparisonId}-${index + 1}`, direction, ordinal, animals, {
      comparisonId,
      comparisonRound: index + 1,
      support: pairNumber === 1 ? 1 : 3,
    }));
}

export function generateQuestions(level, random = Math.random) {
  if (level === 5) {
    return [...comparisonPair(1, 4, ANIMAL_IDS), ...comparisonPair(2, 2, ANIMAL_IDS)];
  }

  if (level === 1) {
    const prompts = [
      [LEFT_TO_RIGHT, CHOOSE_FLAG, 3],
      [RIGHT_TO_LEFT, CHOOSE_FLAG, 3],
      [LEFT_TO_RIGHT, CHOOSE_END_ANIMAL, 4],
      [RIGHT_TO_LEFT, CHOOSE_END_ANIMAL, 4],
      [random() < 0.5 ? LEFT_TO_RIGHT : RIGHT_TO_LEFT, CHOOSE_END_ANIMAL, 5],
    ];
    return prompts.map(([direction, type, length], index) =>
      question(`level-1-${index + 1}`, direction, 1, makeRow(length, random), { type }));
  }

  const templates = {
    2: [[3, 1], [3, 2], [4, 3], [4, 2], [5, 3]],
    3: [[5, 2], [5, 3], [6, 4], [6, 5], [6, 3]],
    4: [[5, 2], [5, 3], [6, 4], [6, 5], [6, 2]],
  };
  if (!Object.hasOwn(templates, level)) return [];
  const direction = level === 4 ? RIGHT_TO_LEFT : LEFT_TO_RIGHT;

  return templates[level].map(([length, ordinal], index) =>
    question(`level-${level}-${index + 1}`, direction, ordinal, makeRow(length, random), {
      support: index === 0 ? 1 : 3,
    }));
}

export function simplifyQuestion(question, previousOrdinal, minimumOrdinal = 1) {
  if (question.type !== FIND_ANIMAL_BY_ORDINAL || question.comparisonId) return question;
  const practiceOrdinal = Math.min(question.targetOrdinal, previousOrdinal) - 1;
  return Object.freeze({
    ...question,
    targetOrdinal: Math.max(minimumOrdinal, practiceOrdinal),
  });
}

export function comparisonResult(question) {
  const { animals, targetOrdinal: ordinal } = question;
  return {
    left: animals[indexForOrdinal(animals.length, LEFT_TO_RIGHT, ordinal)],
    right: animals[indexForOrdinal(animals.length, RIGHT_TO_LEFT, ordinal)],
    ordinal,
  };
}
