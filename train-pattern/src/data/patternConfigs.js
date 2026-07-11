export const patternConfigs = {
  AB: ["A", "B"],
  AAB: ["A", "A", "B"],
  ABB: ["A", "B", "B"],
  ABC: ["A", "B", "C"],
};

export const difficultyConfigs = {
  easy: {
    label: "Dễ",
    allowedPatterns: ["AB"],
    minTrainCars: 5,
    maxTrainCars: 6,
    answerOptionCount: 2,
    showPatternGrouping: true,
    hintLevel: 3,
  },
  medium: {
    label: "Trung bình",
    allowedPatterns: ["AB", "AAB", "ABC"],
    minTrainCars: 6,
    maxTrainCars: 8,
    answerOptionCount: 3,
    showPatternGrouping: false,
    hintLevel: 2,
  },
  hard: {
    label: "Khó",
    allowedPatterns: ["AAB", "ABB", "ABC"],
    minTrainCars: 7,
    maxTrainCars: 9,
    answerOptionCount: 4,
    showPatternGrouping: false,
    hintLevel: 1,
  },
};
