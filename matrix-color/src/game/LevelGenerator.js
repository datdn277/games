import { PALETTE } from "../data/colors.js";
import { resolveLevelConfig } from "../data/levels.js";
import { createEmptyGrid, gridSignature } from "./validation.js";

function randomInt(random, min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function shuffle(values, random) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function allCells(rows, columns) {
  return Array.from({ length: rows * columns }, (_, index) => ({
    row: Math.floor(index / columns),
    column: index % columns
  }));
}

function isSpreadEnough(cells, config) {
  if (cells.length <= 1) return true;
  const rowCount = new Set(cells.map((cell) => cell.row)).size;
  const columnCount = new Set(cells.map((cell) => cell.column)).size;
  if (rowCount < 2 || columnCount < 2) return false;
  if (config.rows < 4) return true;
  const rowMiddle = config.rows / 2;
  const columnMiddle = config.columns / 2;
  const quadrants = new Set(cells.map((cell) => `${cell.row < rowMiddle ? 0 : 1}:${cell.column < columnMiddle ? 0 : 1}`));
  return quadrants.size >= 2;
}

export function validateGeneratedLevel(level, difficulty = level?.difficulty) {
  const config = resolveLevelConfig(difficulty, level?.sizeMode ?? "auto");
  if (!config || level.rows !== config.rows || level.columns !== config.columns) return false;
  if (!Array.isArray(level.templateGrid) || level.templateGrid.length !== config.rows) return false;
  if (level.templateGrid.some((row) => !Array.isArray(row) || row.length !== config.columns)) return false;
  const painted = level.templateGrid.flat().filter(Boolean);
  if (painted.length < config.minPaintedCells || painted.length > config.maxPaintedCells) return false;
  const usedColors = new Set(painted);
  if (usedColors.size !== level.colors.length) return false;
  if (usedColors.size < config.minColorCount || usedColors.size > config.maxColorCount) return false;
  if ([...usedColors].some((id) => !PALETTE.some((color) => color.id === id))) return false;
  if (level.colors.some((id) => !usedColors.has(id))) return false;
  const cells = [];
  level.templateGrid.forEach((row, rowIndex) => row.forEach((value, columnIndex) => {
    if (value) cells.push({ row: rowIndex, column: columnIndex });
  }));
  return isSpreadEnough(cells, config);
}

export class LevelGenerator {
  constructor(random = Math.random) {
    this.random = random;
    this.previousSignature = null;
  }

  generate(difficulty = "easy", previousSignature = this.previousSignature, sizeMode = "auto") {
    const config = resolveLevelConfig(difficulty, sizeMode);
    for (let attempt = 0; attempt < 300; attempt += 1) {
      const candidate = this.#createCandidate(difficulty, config);
      const signature = gridSignature(candidate);
      if (validateGeneratedLevel(candidate, difficulty) && signature !== previousSignature) {
        this.previousSignature = signature;
        return candidate;
      }
    }
    const fallback = this.#createFallback(difficulty, config, previousSignature);
    this.previousSignature = gridSignature(fallback);
    return fallback;
  }

  #createCandidate(difficulty, config) {
    const paintedCount = randomInt(this.random, config.minPaintedCells, config.maxPaintedCells);
    const colorCount = randomInt(this.random, config.minColorCount, config.maxColorCount);
    const colors = shuffle(PALETTE.map((color) => color.id), this.random).slice(0, colorCount);
    const positions = shuffle(allCells(config.rows, config.columns), this.random).slice(0, paintedCount);
    const assignments = shuffle([
      ...colors,
      ...Array.from({ length: paintedCount - colors.length }, () => colors[randomInt(this.random, 0, colors.length - 1)])
    ], this.random);
    const templateGrid = createEmptyGrid(config.rows, config.columns);
    positions.forEach((cell, index) => { templateGrid[cell.row][cell.column] = assignments[index]; });
    return {
      difficulty,
      sizeMode: config.sizeMode,
      rows: config.rows,
      columns: config.columns,
      colors,
      templateGrid,
      paintedCount,
      autoSelectColor: config.autoSelectColor,
      interactionMode: config.interactionMode,
      validationMode: config.validationMode
    };
  }

  #createFallback(difficulty, config, previousSignature) {
    const cornersFirst = [
      [0, 0],
      [config.rows - 1, config.columns - 1],
      [0, config.columns - 1],
      [config.rows - 1, 0],
      [Math.floor(config.rows / 2), Math.floor(config.columns / 2)]
    ];
    const everyCell = allCells(config.rows, config.columns).map((cell) => [cell.row, cell.column]);
    const makeUnique = (cells) => [...new Map(cells.map((cell) => [`${cell[0]}:${cell[1]}`, cell])).values()];
    const variants = [
      makeUnique([...cornersFirst, ...everyCell]),
      makeUnique([...cornersFirst.slice().reverse(), ...everyCell.slice().reverse()])
    ];
    const paintedCount = config.minPaintedCells;
    const colorCount = config.minColorCount;
    const colors = PALETTE.slice(0, colorCount).map((color) => color.id);
    for (const cells of variants) {
      const templateGrid = createEmptyGrid(config.rows, config.columns);
      cells.slice(0, paintedCount).forEach(([row, column], index) => {
        if (row < config.rows && column < config.columns) templateGrid[row][column] = colors[index % colors.length];
      });
      const candidate = { difficulty, sizeMode: config.sizeMode, rows: config.rows, columns: config.columns, colors, templateGrid, paintedCount, autoSelectColor: config.autoSelectColor, interactionMode: config.interactionMode, validationMode: config.validationMode };
      if (gridSignature(candidate) !== previousSignature && validateGeneratedLevel(candidate, difficulty)) return candidate;
    }
    return this.#createCandidate(difficulty, config);
  }
}
