import type { Difficulty } from "./MazeCell";

export type DifficultyConfig = {
  label: string;
  rows: number;
  cols: number;
  collectibleCount: number;
  minPathLength: number;
  maxPathLength: number;
  maxDeadEnds: number;
  showAvailableMoves: boolean;
  defaultHintLevel: number;
  allowUndo: boolean;
  commandLimit: number;
};

export const difficultyConfigs: Record<Difficulty, DifficultyConfig> = {
  easy: {
    label: "Dễ",
    rows: 4,
    cols: 4,
    collectibleCount: 1,
    minPathLength: 3,
    maxPathLength: 7,
    maxDeadEnds: 1,
    showAvailableMoves: true,
    defaultHintLevel: 2,
    allowUndo: true,
    commandLimit: 12,
  },
  medium: {
    label: "Trung bình",
    rows: 5,
    cols: 5,
    collectibleCount: 1,
    minPathLength: 6,
    maxPathLength: 12,
    maxDeadEnds: 3,
    showAvailableMoves: false,
    defaultHintLevel: 1,
    allowUndo: true,
    commandLimit: 16,
  },
  hard: {
    label: "Khó",
    rows: 6,
    cols: 6,
    collectibleCount: 3,
    minPathLength: 10,
    maxPathLength: 20,
    maxDeadEnds: 6,
    showAvailableMoves: false,
    defaultHintLevel: 0,
    allowUndo: true,
    commandLimit: 20,
  },
};
