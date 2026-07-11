export const DIFFICULTY_ORDER = Object.freeze(["easy", "medium", "hard"]);

export const DIFFICULTY_CONFIGS = Object.freeze({
  easy: {
    label: "Dễ",
    shortLabel: "Nhìn vị trí",
    rows: 3,
    columns: 3,
    minColorCount: 1,
    maxColorCount: 1,
    minPaintedCells: 2,
    maxPaintedCells: 4,
    autoSelectColor: true,
    interactionMode: "tap",
    validationMode: "instant"
  },
  medium: {
    label: "Trung bình",
    shortLabel: "Vị trí + màu",
    rows: 3,
    columns: 3,
    minColorCount: 2,
    maxColorCount: 2,
    minPaintedCells: 3,
    maxPaintedCells: 5,
    autoSelectColor: false,
    interactionMode: "tap",
    validationMode: "instant"
  },
  hard: {
    label: "Khó",
    shortLabel: "Nhiều ô hơn",
    rows: 4,
    columns: 4,
    minColorCount: 3,
    maxColorCount: 4,
    minPaintedCells: 6,
    maxPaintedCells: 8,
    autoSelectColor: false,
    interactionMode: "tap-and-drag",
    validationMode: "instant"
  }
});
