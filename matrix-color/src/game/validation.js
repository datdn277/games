export function createEmptyGrid(rows, columns) {
  return Array.from({ length: rows }, () => Array(columns).fill(null));
}

export function isCellCorrect(templateGrid, playerGrid, row, column) {
  return templateGrid[row]?.[column] === playerGrid[row]?.[column];
}

export function isLevelComplete(templateGrid, playerGrid) {
  if (!Array.isArray(templateGrid) || templateGrid.length !== playerGrid?.length) return false;
  return templateGrid.every((row, rowIndex) => (
    Array.isArray(playerGrid[rowIndex])
    && row.length === playerGrid[rowIndex].length
    && row.every((value, columnIndex) => value === playerGrid[rowIndex][columnIndex])
  ));
}

export function countPaintedCells(grid) {
  return grid.flat().filter(Boolean).length;
}

export function gridSignature(level) {
  return `${level.rows}x${level.columns}:${level.templateGrid.flat().map((value) => value ?? "_").join(",")}`;
}

export function calculateStars({ mistakes, hintsUsed }) {
  if (mistakes === 0 && hintsUsed === 0) return 3;
  if (mistakes <= 2 && hintsUsed <= 1) return 2;
  return 1;
}
