import { cellKey, findPath } from "./PathFinder.js";

export const LEVEL_CONFIG = Object.freeze({
  1: { rows: 3, columns: 3, carrotMin: 1, carrotMax: 1, obstacleMin: 0, obstacleMax: 0, guideDefault: true },
  2: { rows: 4, columns: 4, carrotMin: 1, carrotMax: 2, obstacleMin: 0, obstacleMax: 1, guideDefault: true },
  3: { rows: 4, columns: 4, carrotMin: 2, carrotMax: 3, obstacleMin: 1, obstacleMax: 3, guideDefault: false },
  4: { rows: 4, columns: 4, carrotMin: 3, carrotMax: 3, obstacleMin: 2, obstacleMax: 3, guideDefault: false }
});

const OBSTACLE_TYPES = ["tree", "rock", "water"];

function randomInt(random, min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function shuffledCells(rows, columns, random) {
  const cells = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) cells.push({ row, column });
  }
  for (let index = cells.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [cells[index], cells[swapIndex]] = [cells[swapIndex], cells[index]];
  }
  return cells;
}

export function validateLevel(level) {
  if (!level || !level.player || !level.home || !level.carrots?.length) return false;
  const occupied = [level.player, level.home, ...level.carrots, ...level.obstacles];
  if (new Set(occupied.map(cellKey)).size !== occupied.length) return false;

  const routeOptions = {
    rows: level.rows,
    columns: level.columns,
    obstacles: level.obstacles,
    start: level.player
  };
  const targets = [...level.carrots, level.home];
  return targets.every((target) => {
    const path = findPath({ ...routeOptions, target });
    return path && path.length <= level.rows * level.columns;
  });
}

export class LevelGenerator {
  constructor(random = Math.random) {
    this.random = random;
  }

  generate(levelNumber = 1) {
    const safeLevel = Math.min(4, Math.max(1, Number(levelNumber) || 1));
    const config = LEVEL_CONFIG[safeLevel];

    for (let attempt = 0; attempt < 400; attempt += 1) {
      const candidate = this.#createCandidate(safeLevel, config);
      if (validateLevel(candidate) && this.#isAgeAppropriate(candidate, safeLevel)) return candidate;
    }

    return this.#fallback(safeLevel, config);
  }

  #createCandidate(levelNumber, config) {
    const cells = shuffledCells(config.rows, config.columns, this.random);
    const player = cells.shift();
    const carrotCount = randomInt(this.random, config.carrotMin, config.carrotMax);
    const obstacleCount = randomInt(this.random, config.obstacleMin, config.obstacleMax);

    let carrots;
    if (levelNumber === 1) {
      const adjacent = cells.filter((cell) => Math.abs(cell.row - player.row) + Math.abs(cell.column - player.column) === 1);
      const carrot = adjacent[Math.floor(this.random() * adjacent.length)];
      cells.splice(cells.findIndex((cell) => cellKey(cell) === cellKey(carrot)), 1);
      carrots = [{ ...carrot, id: "carrot-0" }];
    } else {
      carrots = cells.splice(0, carrotCount).map((cell, index) => ({ ...cell, id: `carrot-${index}` }));
    }

    const home = cells.shift();
    const obstacles = cells.splice(0, obstacleCount).map((cell, index) => ({
      ...cell,
      id: `obstacle-${index}`,
      type: OBSTACLE_TYPES[index % OBSTACLE_TYPES.length]
    }));

    return {
      level: levelNumber,
      rows: config.rows,
      columns: config.columns,
      player: { ...player, direction: "down" },
      carrots,
      obstacles,
      home: { ...home, unlocked: false },
      guideDefault: config.guideDefault
    };
  }

  #isAgeAppropriate(level, levelNumber) {
    const paths = [...level.carrots, level.home].map((target) => findPath({
      rows: level.rows,
      columns: level.columns,
      obstacles: level.obstacles,
      start: level.player,
      target
    }));
    if (paths.some((path) => !path || path.length > 9)) return false;
    if (levelNumber !== 4) return true;
    return paths.some((path) => path.length >= 4);
  }

  #fallback(levelNumber, config) {
    const base = {
      level: levelNumber,
      rows: config.rows,
      columns: config.columns,
      player: { row: config.rows - 1, column: 0, direction: "down" },
      home: { row: config.rows - 1, column: config.columns - 1, unlocked: false },
      guideDefault: config.guideDefault
    };
    const carrots = levelNumber === 1
      ? [{ row: config.rows - 2, column: 0, id: "carrot-0" }]
      : [
          { row: config.rows - 2, column: 0, id: "carrot-0" },
          { row: 0, column: config.columns - 1, id: "carrot-1" },
          { row: 0, column: config.columns - 2, id: "carrot-2" }
        ].slice(0, config.carrotMax);
    const obstacles = levelNumber >= 3
      ? [
          { row: config.rows - 1, column: 1, id: "obstacle-0", type: "tree" },
          ...(levelNumber === 4 ? [{ row: 1, column: 1, id: "obstacle-1", type: "rock" }] : [])
        ]
      : [];
    return { ...base, carrots, obstacles };
  }
}
