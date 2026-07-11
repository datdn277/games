export const DIFFICULTY_ORDER = Object.freeze(["easy", "medium", "hard"]);

export const MIN_GRID_SIZE = 2;
export const MAX_GRID_SIZE = 7;

export const GRID_SIZE_MODES = Object.freeze([
  "auto",
  ...Array.from({ length: MAX_GRID_SIZE - MIN_GRID_SIZE + 1 }, (_, index) => String(index + MIN_GRID_SIZE))
]);

export const GRID_SIZE_OPTIONS = Object.freeze([
  { id: "auto", label: "Tự động" },
  { id: "custom", label: "Nhập tay" }
]);

const PAINTED_CELL_PROFILES = Object.freeze({
  2: Object.freeze({
    easy: [1, 1],
    medium: [2, 3],
    hard: [3, 4]
  }),
  3: Object.freeze({
    easy: [2, 4],
    medium: [3, 5],
    hard: [4, 6]
  }),
  4: Object.freeze({
    easy: [3, 6],
    medium: [5, 7],
    hard: [6, 8]
  }),
  5: Object.freeze({
    easy: [4, 8],
    medium: [6, 10],
    hard: [10, 14]
  }),
  6: Object.freeze({
    easy: [6, 12],
    medium: [9, 15],
    hard: [14, 20]
  }),
  7: Object.freeze({
    easy: [8, 15],
    medium: [12, 20],
    hard: [18, 26]
  })
});

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

export function normalizeGridSizeMode(value, fallback = "auto") {
  if (String(value) === "auto") return "auto";
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return String(Math.min(MAX_GRID_SIZE, Math.max(MIN_GRID_SIZE, parsed)));
}

export function resolveLevelConfig(difficulty = "easy", sizeMode = "auto") {
  const safeDifficulty = DIFFICULTY_CONFIGS[difficulty] ? difficulty : "easy";
  const base = DIFFICULTY_CONFIGS[safeDifficulty];
  const safeSizeMode = normalizeGridSizeMode(sizeMode);
  if (safeSizeMode === "auto") return { ...base, difficulty: safeDifficulty, sizeMode: "auto" };

  const size = Number(safeSizeMode);
  const [minPaintedCells, maxPaintedCells] = PAINTED_CELL_PROFILES[size][safeDifficulty];
  return {
    ...base,
    difficulty: safeDifficulty,
    sizeMode: safeSizeMode,
    rows: size,
    columns: size,
    minPaintedCells,
    maxPaintedCells: Math.min(size * size, maxPaintedCells),
    minColorCount: Math.min(base.minColorCount, minPaintedCells),
    maxColorCount: Math.min(base.maxColorCount, Math.min(size * size, maxPaintedCells))
  };
}
