export const OPERATIONS = Object.freeze({
  COUNT: 'count',
  ADDITION: 'addition',
  SUBTRACTION: 'subtraction',
  MIXED: 'mixed',
});

const MAX_NUMBER = 10;
export const HAND_FINGER_COUNT = 5;

function inRange(value, lower, upper) {
  return Number.isInteger(value) && value >= lower && value <= upper;
}

export function isValidProblem(operation, startNumber, fingerCount) {
  if (!inRange(startNumber, 0, MAX_NUMBER) || !inRange(fingerCount, 1, HAND_FINGER_COUNT)) {
    return false;
  }

  switch (operation) {
    case OPERATIONS.COUNT:
      return startNumber === 0;
    case OPERATIONS.ADDITION:
      return startNumber + fingerCount <= MAX_NUMBER;
    case OPERATIONS.SUBTRACTION:
      return startNumber - fingerCount >= 0;
    default:
      return false;
  }
}

function shuffle(values, random) {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  return shuffled;
}

export function createAnswers(result, lower = 0, upper = MAX_NUMBER, random = Math.random) {
  if (!inRange(result, lower, upper) || upper - lower < 2) return [];

  const nearby = [result];
  for (let offset = 1; nearby.length < 3; offset += 1) {
    for (const value of [result - offset, result + offset]) {
      if (inRange(value, lower, upper)) nearby.push(value);
    }
  }
  return shuffle(nearby.slice(0, 3), random);
}

export function createQuestion(operation, startNumber, fingerCount, random = Math.random) {
  if (!isValidProblem(operation, startNumber, fingerCount)) return null;

  const direction = operation === OPERATIONS.SUBTRACTION ? -1 : 1;
  const expectedSequence = Array.from({ length: fingerCount }, (_, index) => (
    startNumber + direction * (index + 1)
  ));
  const result = expectedSequence.at(-1);
  const answers = operation === OPERATIONS.COUNT
    ? createAnswers(result, 1, HAND_FINGER_COUNT, random)
    : createAnswers(result, 0, MAX_NUMBER, random);

  return {
    id: `${operation}-${startNumber}-${fingerCount}`,
    operation,
    startNumber,
    fingerCount,
    expectedSequence,
    result,
    answers,
  };
}

function problemPool(operation, random) {
  const problems = [];
  for (let start = 0; start <= MAX_NUMBER; start += 1) {
    for (let fingers = 1; fingers <= HAND_FINGER_COUNT; fingers += 1) {
      if (isValidProblem(operation, start, fingers)) problems.push({ start, fingers });
    }
  }
  return shuffle(problems, random);
}

export function generateLevelQuestions(level, random = Math.random, previousId = null) {
  const mixed = level.operation === OPERATIONS.MIXED;
  const operations = mixed
    ? shuffle([OPERATIONS.ADDITION, OPERATIONS.SUBTRACTION], random)
    : [level.operation];
  const pools = operations.map((operation) => problemPool(operation, random));
  const firstProblem = pools[0][0];

  if (`${operations[0]}-${firstProblem.start}-${firstProblem.fingers}` === previousId) {
    [pools[0][0], pools[0][1]] = [pools[0][1], pools[0][0]];
  }

  return Array.from({ length: level.questionCount }, (_, index) => {
    const poolIndex = index % pools.length;
    const { start, fingers } = pools[poolIndex][Math.floor(index / pools.length)];
    return createQuestion(operations[poolIndex], start, fingers, random);
  });
}

export function isCorrectAnswer(question, answer) {
  return Number.isInteger(answer) && answer === question?.result;
}
