import { createEmptyGrid, isCellCorrect, isLevelComplete } from "./validation.js";

export class GameState {
  constructor(level) {
    this.load(level);
  }

  load(level) {
    this.difficulty = level.difficulty;
    this.rows = level.rows;
    this.columns = level.columns;
    this.levelColors = [...level.colors];
    this.templateGrid = level.templateGrid.map((row) => [...row]);
    this.playerGrid = createEmptyGrid(level.rows, level.columns);
    this.selectedColor = level.autoSelectColor ? level.colors[0] : null;
    this.autoSelectColor = level.autoSelectColor;
    this.interactionMode = level.interactionMode;
    this.validationMode = level.validationMode;
    this.eraserEnabled = false;
    this.completed = false;
    this.mistakes = 0;
    this.hintsUsed = 0;
    this.hintStep = 0;
    this.hintTarget = null;
    this.soundEnabled = true;
    this.interactionLocked = false;
    return this;
  }

  selectColor(colorId) {
    if (!this.levelColors.includes(colorId)) return false;
    this.selectedColor = colorId;
    this.eraserEnabled = false;
    return true;
  }

  toggleEraser(force) {
    this.eraserEnabled = typeof force === "boolean" ? force : !this.eraserEnabled;
    return this.eraserEnabled;
  }

  paintCell(row, column, colorId = this.selectedColor) {
    if (this.interactionLocked || this.completed || !this.#inside(row, column)) return { status: "ignored" };
    const previous = this.playerGrid[row][column];
    const expected = this.templateGrid[row][column];

    if (this.eraserEnabled) {
      return this.eraseCell(row, column);
    }
    if (!colorId || !this.levelColors.includes(colorId)) return { status: "no-color", row, column };
    if (previous === colorId && expected === colorId) return { status: "noop", row, column, previous, expected, remaining: this.remainingCount };

    this.clearHint();
    if (expected !== colorId) {
      this.mistakes += 1;
      return { status: "wrong", row, column, attempted: colorId, previous, expected, remaining: this.remainingCount };
    }

    this.playerGrid[row][column] = colorId;
    this.completed = isLevelComplete(this.templateGrid, this.playerGrid);
    return {
      status: "correct",
      row,
      column,
      colorId,
      previous,
      expected,
      remaining: this.remainingCount,
      completed: this.completed
    };
  }

  eraseCell(row, column) {
    if (this.interactionLocked || this.completed || !this.#inside(row, column)) return { status: "ignored" };
    const previous = this.playerGrid[row][column];
    const expected = this.templateGrid[row][column];
    this.playerGrid[row][column] = null;
    this.clearHint();
    return { status: previous ? "erased" : "noop", row, column, previous, expected, remaining: this.remainingCount };
  }

  isCellCorrect(row, column) {
    return isCellCorrect(this.templateGrid, this.playerGrid, row, column);
  }

  get remainingCount() {
    let remaining = 0;
    for (let row = 0; row < this.rows; row += 1) {
      for (let column = 0; column < this.columns; column += 1) {
        if (this.templateGrid[row][column] && !this.isCellCorrect(row, column)) remaining += 1;
      }
    }
    return remaining;
  }

  nextHint() {
    if (this.completed) return null;
    if (!this.hintTarget || this.isCellCorrect(this.hintTarget.row, this.hintTarget.column)) {
      this.hintTarget = this.#firstIncompleteCell();
      this.hintStep = 0;
    }
    if (!this.hintTarget) return null;
    this.hintsUsed += 1;
    this.hintStep = (this.hintStep % 3) + 1;
    return {
      step: this.hintStep,
      row: this.hintTarget.row,
      column: this.hintTarget.column,
      colorId: this.templateGrid[this.hintTarget.row][this.hintTarget.column]
    };
  }

  clearHint() {
    this.hintStep = 0;
    this.hintTarget = null;
  }

  #firstIncompleteCell() {
    for (let row = 0; row < this.rows; row += 1) {
      for (let column = 0; column < this.columns; column += 1) {
        if (this.templateGrid[row][column] && !this.isCellCorrect(row, column)) return { row, column };
      }
    }
    return null;
  }

  #inside(row, column) {
    return row >= 0 && row < this.rows && column >= 0 && column < this.columns;
  }
}
