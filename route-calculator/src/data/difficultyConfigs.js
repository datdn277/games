export const difficultyConfigs = {
  easy: {
    label: "Dễ",
    minStartValue: 1,
    maxStartValue: 5,
    operationCount: 3,
    allowedOperators: ["+"],
    minOperand: 1,
    maxOperand: 2,
    maxResult: 8,
    answerOptionCount: 3,
    autoPlayAnimation: true,
    detailedCounting: true,
  },
  medium: {
    label: "Trung bình",
    minStartValue: 2,
    maxStartValue: 7,
    operationCount: 4,
    allowedOperators: ["+", "-"],
    minOperand: 1,
    maxOperand: 3,
    maxResult: 10,
    answerOptionCount: 3,
    autoPlayAnimation: true,
    detailedCounting: true,
  },
  hard: {
    label: "Khó",
    minStartValue: 3,
    maxStartValue: 10,
    operationCount: 5,
    allowedOperators: ["+", "-"],
    minOperand: 1,
    maxOperand: 5,
    maxResult: 15,
    answerOptionCount: 4,
    autoPlayAnimation: true,
    detailedCounting: false,
  },
};

export function getDifficultyConfig(key) {
  return difficultyConfigs[key] ?? difficultyConfigs.easy;
}
