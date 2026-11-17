export const COLORS = Object.freeze({ WHITE: 'WHITE', DARK: 'DARK' });
export const COLOR_LABELS = Object.freeze({ WHITE: 'Kem', DARK: 'Tím', empty: 'Trống' });

const palette = Object.values(COLORS);
const at = (x, z) => `${x}:${z}`;

export function isColor(color) {
  return palette.includes(color);
}

// Rows run from back to front (-Z to +Z). Columns run from left to right (-X to +X).
export function emptyGrid(bounds) {
  if (!bounds) return [];
  const { minX, maxX, minZ, maxZ } = bounds;
  if (![minX, maxX, minZ, maxZ].every(Number.isInteger) || minX > maxX || minZ > maxZ) {
    throw new RangeError('Invalid projection bounds');
  }
  return Array.from({ length: maxZ - minZ + 1 }, () => Array(maxX - minX + 1).fill(null));
}

function getBounds(cubes) {
  if (cubes.length === 0) return null;
  const [first] = cubes;
  return cubes.reduce((bounds, { x, z }) => ({
    minX: Math.min(bounds.minX, x),
    maxX: Math.max(bounds.maxX, x),
    minZ: Math.min(bounds.minZ, z),
    maxZ: Math.max(bounds.maxZ, z),
  }), { minX: first.x, maxX: first.x, minZ: first.z, maxZ: first.z });
}

export function getColumns(cubes) {
  const columns = new Map();
  const occupied = new Set();
  for (const cube of cubes) {
    const { x, y, z, topColor } = cube;
    if (![x, y, z].every(Number.isInteger) || y < 0 || !isColor(topColor)) {
      throw new RangeError('Invalid cube');
    }
    const key = at(x, z);
    const cell = `${key}:${y}`;
    if (occupied.has(cell)) throw new RangeError('Two cubes occupy one cell');
    occupied.add(cell);
    if (!columns.has(key)) columns.set(key, []);
    columns.get(key).push(cube);
  }
  return [...columns.values()].map((stack) => {
    stack.sort((left, right) => right.y - left.y);
    const [visible, ...hidden] = stack;
    return { x: visible.x, z: visible.z, visible, hidden };
  });
}

export function getTopView(cubes, bounds = getBounds(cubes)) {
  const grid = emptyGrid(bounds);
  if (!bounds) return grid;
  for (const { x, z, visible } of getColumns(cubes)) {
    const row = z - bounds.minZ;
    const col = x - bounds.minX;
    if (!grid[row] || col < 0 || col >= grid[row].length) throw new RangeError('Cube outside projection bounds');
    grid[row][col] = visible.topColor;
  }
  return grid;
}

export function compareGrids(expected, actual) {
  const errors = [];
  const missing = new Map();
  const extra = new Map();
  let sameSize = expected.length === actual.length;
  for (let row = 0; row < Math.max(expected.length, actual.length); row += 1) {
    const expectedRow = expected[row] ?? [];
    const actualRow = actual[row] ?? [];
    sameSize = sameSize && expectedRow.length === actualRow.length;
    for (let col = 0; col < Math.max(expectedRow.length, actualRow.length); col += 1) {
      const correct = expectedRow[col] ?? null;
      const submitted = actualRow[col] ?? null;
      if (correct === submitted) continue;
      const type = correct === null ? 'extra' : submitted === null ? 'missing' : 'color';
      const error = { row, col, expected: correct, actual: submitted, type };
      errors.push(error);
      if (type === 'missing' || type === 'extra') {
        const list = type === 'missing' ? missing : extra;
        const color = correct ?? submitted;
        if (!list.has(color)) list.set(color, []);
        list.get(color).push(error);
      }
    }
  }
  for (const [color, gaps] of missing) {
    const extras = extra.get(color) ?? [];
    for (let index = 0; index < Math.min(gaps.length, extras.length); index += 1) {
      gaps[index].type = 'position';
      extras[index].type = 'position';
    }
  }
  return { correct: sameSize && errors.length === 0, errors };
}

const opposite = (color) => color === COLORS.WHITE ? COLORS.DARK : COLORS.WHITE;

export function getAnswerOptions(cubes, bounds = getBounds(cubes), { advanced = false, correctSlot = 0 } = {}) {
  if (!Number.isInteger(correctSlot) || correctSlot < 0 || correctSlot > 3) throw new RangeError('Invalid answer slot');
  const correct = getTopView(cubes, bounds);
  const occupied = [];
  const empty = [];
  correct.forEach((row, r) => row.forEach((color, c) => (color === null ? empty : occupied).push([r, c])));
  if (!occupied.length) throw new RangeError('Answers need a visible cube');
  const candidates = [];
  const keyOf = (grid) => JSON.stringify(grid);
  const known = new Set([keyOf(correct)]);
  const propose = (grid) => {
    const key = keyOf(grid);
    if (known.has(key) || !grid.some((row) => row.some(Boolean))) return false;
    known.add(key);
    candidates.push(grid);
    return true;
  };
  const replace = (row, col, color) => {
    const grid = correct.map((line) => [...line]);
    grid[row][col] = color;
    return grid;
  };

  if (advanced) {
    const columns = getColumns(cubes);
    // First test the common idea that the lower cube's color remains visible.
    for (const { x, z, visible, hidden } of columns) {
      const lower = hidden.find(({ topColor }) => topColor !== visible.topColor);
      if (lower && propose(replace(z - bounds.minZ, x - bounds.minX, lower.topColor))) break;
    }
    const rotated = correct.length === correct[0].length
      ? propose(correct.map((row, r) => row.map((_, c) => correct[correct.length - 1 - c][r])))
      : false;
    if (!rotated) propose(correct.map((row) => [...row].reverse()));
    for (const { x, z, visible } of columns) {
      if (isColor(visible.sideColor) && propose(replace(z - bounds.minZ, x - bounds.minX, visible.sideColor))) break;
    }
  }

  const [firstRow, firstCol] = occupied[0];
  const firstColor = correct[firstRow][firstCol];
  propose(replace(firstRow, firstCol, opposite(firstColor)));
  if (empty.length) {
    const [emptyRow, emptyCol] = [...empty].sort(([r, c], [otherR, otherC]) =>
      Math.abs(r - firstRow) + Math.abs(c - firstCol) - Math.abs(otherR - firstRow) - Math.abs(otherC - firstCol))[0];
    const moved = replace(firstRow, firstCol, null);
    moved[emptyRow][emptyCol] = firstColor;
    propose(moved);
    propose(replace(emptyRow, emptyCol, opposite(firstColor)));
  }
  for (const [row, col] of occupied) {
    propose(replace(row, col, null));
    propose(replace(row, col, opposite(correct[row][col])));
  }

  if (candidates.length < 3) throw new RangeError('Grid too small for four distinct answers');
  const options = candidates.slice(0, 3);
  options.splice(correctSlot, 0, correct);
  return options;
}
