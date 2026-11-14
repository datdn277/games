import { toyNames } from '../objects/toyNames.js';

export const levels = [
  {
    id: 1,
    title: 'Khám phá trái và phải',
    description: 'Tìm đồ chơi ở hai bên vật mốc.',
    sticker: '🧭',
    stickerName: 'La bàn nhỏ',
    missionCount: 5,
  },
  {
    id: 2,
    title: 'Thám tử đồ chơi',
    description: 'Tìm món đồ ngay cạnh vật mốc.',
    sticker: '🔎',
    stickerName: 'Kính lúp tinh mắt',
    missionCount: 5,
  },
  {
    id: 3,
    title: 'Siêu thị của Mimo',
    description: 'Chọn đúng món hàng ở đúng phía.',
    sticker: '🛒',
    stickerName: 'Giỏ hàng của Mimo',
    missionCount: 5,
  },
];

const toyIcons = {
  mimo: '🐻',
  ball: '⚽',
  car: '🚗',
  gift: '🎁',
  teddy: '🧸',
  blocks: '🧩',
  plane: '✈️',
  doll: '🪆',
  apple: '🍎',
  backpack: '🎒',
  pencilCase: '✏️',
  milk: '🥛',
  bread: '🥖',
  banana: '🍌',
};

const beginnerSets = [
  ['mimo', 'ball', 'plane'],
  ['mimo', 'car', 'gift'],
  ['mimo', 'backpack', 'pencilCase'],
  ['mimo', 'blocks', 'doll'],
  ['teddy', 'gift', 'ball'],
  ['teddy', 'plane', 'car'],
  ['teddy', 'backpack', 'doll'],
  ['teddy', 'pencilCase', 'blocks'],
];

const detectiveSets = [
  ['gift', 'ball', 'plane', 'doll'],
  ['backpack', 'car', 'blocks', 'pencilCase'],
  ['blocks', 'gift', 'plane', 'teddy'],
  ['doll', 'ball', 'gift', 'car', 'pencilCase'],
  ['car', 'backpack', 'plane', 'doll', 'teddy'],
  ['pencilCase', 'gift', 'car', 'blocks', 'ball'],
  ['plane', 'blocks', 'teddy', 'ball'],
  ['ball', 'gift', 'teddy', 'plane', 'backpack'],
];

const shoppingSets = [
  ['milk', 'apple'],
  ['bread', 'banana'],
  ['banana', 'milk'],
  ['apple', 'bread'],
  ['bread', 'apple'],
  ['apple', 'banana'],
  ['banana', 'bread'],
  ['milk', 'banana'],
];

const groceries = ['apple', 'banana', 'bread', 'milk'];
const spacing = {
  3: [-2.55, 0, 2.55],
  4: [-3.9, -1.3, 1.3, 3.9],
  5: [-4.2, -2.1, 0, 2.1, 4.2],
};

function labelFor(type) {
  return type === 'mimo' ? 'Mimo' : toyNames[type];
}

function shuffle(values, random) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function choose(values, random) {
  return values[Math.floor(random() * values.length)];
}

function sideOf(x, referenceX) {
  if (x < referenceX) return 'LEFT';
  if (x > referenceX) return 'RIGHT';
  return null;
}

export function findAnswer(question) {
  const reference = question.objects.find(({ id }) => id === question.referenceId);
  if (!reference || !['LEFT', 'RIGHT'].includes(question.direction)) return null;

  let matches = question.objects.filter(({ x, selectable }) =>
    selectable && sideOf(x, reference.x) === question.direction,
  );
  if (question.rule === 'named') {
    matches = matches.filter(({ type }) => type === question.targetType);
  }
  if (question.rule === 'adjacent') {
    const distance = ({ x }) => Math.abs(x - reference.x);
    const nearest = Math.min(...matches.map(distance));
    matches = matches.filter((object) => distance(object) === nearest);
  }

  return matches.length === 1 ? matches[0] : null;
}

export function isCorrect(question, choiceId) {
  const answer = findAnswer(question);
  return Boolean(answer && answer.id === choiceId);
}

function makeQuestion({ id, level, direction, arrangement, referenceType, targetType, rule }) {
  const directionLabel = direction === 'LEFT' ? 'trái' : 'phải';
  const referenceLabel = labelFor(referenceType);
  const objects = arrangement.map((type, index) => ({
    id: `${type}-${index + 1}`,
    type,
    label: labelFor(type),
    x: spacing[arrangement.length][index],
    z: 0,
    selectable: type !== referenceType,
  }));
  const referenceId = objects.find(({ selectable }) => !selectable).id;
  const question = {
    id,
    level,
    direction,
    directionLabel,
    directionIcon: direction === 'LEFT' ? '←' : '→',
    referenceId,
    referenceLabel,
    referenceIcon: toyIcons[referenceType],
    rule,
    objects,
    targetType,
  };
  const answer = findAnswer(question);
  if (!answer) throw new Error(`Nhiệm vụ ${id} phải có đúng một đáp án.`);

  const targetLabel = answer.label;
  let prompt = `Bé hãy chọn đồ vật bên ${directionLabel} của ${referenceLabel}!`;
  if (id === 'tutorial') {
    prompt = `Chạm vào đồ vật bên ${directionLabel} của ${referenceLabel} nhé!`;
  }
  if (rule === 'adjacent') {
    prompt = `Bé hãy chọn đồ vật ngay bên ${directionLabel} của ${referenceLabel}!`;
  }
  if (rule === 'named') {
    prompt = `Mimo muốn mua ${targetLabel} bên ${directionLabel} của ${referenceLabel}. Bé giúp Mimo nhé!`;
  }

  return {
    ...question,
    prompt,
    targetId: answer.id,
    correctAnswer: answer.id,
    targetType: answer.type,
    targetLabel,
    targetIcon: toyIcons[answer.type],
  };
}

export const tutorialQuestion = makeQuestion({
  id: 'tutorial',
  level: 0,
  direction: 'LEFT',
  arrangement: ['ball', 'mimo', 'car'],
  referenceType: 'mimo',
  rule: 'side',
});

function beginnerQuestion(set, direction, id, random) {
  const [referenceType, ...choices] = set;
  const [left, right] = shuffle(choices, random);
  return makeQuestion({
    id, level: 1, direction, referenceType, rule: 'side', arrangement: [left, referenceType, right],
  });
}

function detectiveQuestion(set, direction, id, random) {
  const [referenceType, ...choices] = set;
  const arrangement = shuffle(choices, random);
  const referenceIndex = 1 + Math.floor(random() * (choices.length - 1));
  arrangement.splice(referenceIndex, 0, referenceType);
  return makeQuestion({ id, level: 2, direction, referenceType, rule: 'adjacent', arrangement });
}

function shoppingQuestion(set, direction, id, random) {
  const [referenceType, targetType] = set;
  const referenceIndex = choose([1, 2, 3], random);
  const leftIndex = Math.floor(random() * referenceIndex);
  const rightIndex = referenceIndex + 1 + Math.floor(random() * (4 - referenceIndex));
  const extras = shuffle(groceries.filter((type) => type !== referenceType && type !== targetType), random);
  const arrangement = Array.from({ length: 5 }, (_, index) => {
    if (index === referenceIndex) return referenceType;
    if (index === leftIndex || index === rightIndex) return targetType;
    return extras.pop();
  });
  return makeQuestion({ id, level: 3, direction, referenceType, targetType, rule: 'named', arrangement });
}

const generators = {
  1: { sets: beginnerSets, generate: beginnerQuestion },
  2: { sets: detectiveSets, generate: detectiveQuestion },
  3: { sets: shoppingSets, generate: shoppingQuestion },
};

export function makeRound(level, random = Math.random) {
  const levelId = typeof level === 'object' && level !== null ? level.id : level;
  const config = levels.find(({ id }) => id === levelId);
  if (!config) throw new RangeError(`Cấp độ không hợp lệ: ${levelId}`);

  const { sets, generate } = generators[levelId];
  const directions = shuffle(['LEFT', 'RIGHT', 'LEFT', 'RIGHT', choose(['LEFT', 'RIGHT'], random)], random);
  const availableSets = shuffle(sets, random);
  let previousReference;
  return directions.slice(0, config.missionCount).map((direction, index) => {
    const avoidRepeatedPrompt = levelId === 1 && direction === directions[index - 1];
    const nextSetIndex = avoidRepeatedPrompt
      ? availableSets.findIndex(([reference]) => reference !== previousReference)
      : 0;
    const [set] = availableSets.splice(Math.max(0, nextSetIndex), 1);
    previousReference = set[0];
    return generate(set, direction, `${levelId}-${set.join('-')}-${direction.toLowerCase()}`, random);
  });
}
