const randomInt = (min, max, rng = Math.random) => Math.floor(rng() * (max - min + 1)) + min;

const shuffle = (items, rng = Math.random) => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
};

export function levelSignature(level) {
  return `${level.startValue}|${level.steps.map((step) => `${step.operator}${step.operand}`).join("|")}`;
}

function createOperatorPlan(config, rng) {
  if (config.allowedOperators.length === 1) {
    return Array(config.operationCount).fill(config.allowedOperators[0]);
  }

  const operators = Array.from(
    { length: config.operationCount },
    (_, index) => config.allowedOperators[index % config.allowedOperators.length],
  );
  return shuffle(operators, rng);
}

function validOperands(operator, currentValue, config) {
  const operands = [];
  for (let operand = config.minOperand; operand <= config.maxOperand; operand += 1) {
    const result = operator === "+" ? currentValue + operand : currentValue - operand;
    if (result >= 0 && result <= config.maxResult) operands.push(operand);
  }
  return operands;
}

function buildLevel(config, difficulty, rng) {
  const startValue = randomInt(config.minStartValue, config.maxStartValue, rng);
  const operators = createOperatorPlan(config, rng);
  const steps = [];
  let currentValue = startValue;

  for (let index = 0; index < operators.length; index += 1) {
    let operator = operators[index];
    let operands = validOperands(operator, currentValue, config);

    if (operands.length === 0 && config.allowedOperators.length > 1) {
      operator = operator === "+" ? "-" : "+";
      operands = validOperands(operator, currentValue, config);
    }

    if (operands.length === 0) return null;

    const operand = operands[randomInt(0, operands.length - 1, rng)];
    const result = operator === "+" ? currentValue + operand : currentValue - operand;
    steps.push({ operator, operand, inputValue: currentValue, result });
    currentValue = result;
  }

  if (
    config.allowedOperators.length > 1 &&
    !config.allowedOperators.every((operator) => steps.some((step) => step.operator === operator))
  ) {
    return null;
  }

  return {
    id: `${difficulty}-${Date.now().toString(36)}-${Math.floor(rng() * 1e6).toString(36)}`,
    difficulty,
    startValue,
    steps,
  };
}

export function generateArithmeticPath(config, options = {}) {
  const { difficulty = "easy", previousSignature = "", rng = Math.random } = options;

  for (let attempt = 0; attempt < 250; attempt += 1) {
    const level = buildLevel(config, difficulty, rng);
    if (level && levelSignature(level) !== previousSignature) return level;
  }

  throw new Error("Không thể tạo đường tính hợp lệ với cấu hình hiện tại.");
}

export function validateLevel(level, config) {
  if (!level || level.steps.length !== config.operationCount) return false;
  if (level.startValue < config.minStartValue || level.startValue > config.maxStartValue) return false;

  let currentValue = level.startValue;
  for (const step of level.steps) {
    if (!config.allowedOperators.includes(step.operator)) return false;
    if (step.operand < config.minOperand || step.operand > config.maxOperand) return false;
    if (step.inputValue !== currentValue) return false;
    const result = step.operator === "+" ? currentValue + step.operand : currentValue - step.operand;
    if (result !== step.result || result < 0 || result > config.maxResult) return false;
    currentValue = result;
  }

  if (config.allowedOperators.length > 1) {
    return config.allowedOperators.every((operator) => level.steps.some((step) => step.operator === operator));
  }
  return true;
}
