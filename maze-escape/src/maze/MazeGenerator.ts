import { countDeadEnds } from "./MazeGrid";
import { difficultyConfigs } from "./difficultyConfigs";
import { findOptimalMissionRoute, findShortestPath } from "./PathFinder";
import { validateMazeLevel } from "./MazeValidator";
import {
  positionKey,
  type CellType,
  type Difficulty,
  type MazeLevel,
  type Position,
} from "./MazeCell";

type RandomSource = () => number;

export function createSeededRandom(seed: number): RandomSource {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function shuffle<T>(items: readonly T[], random: RandomSource): T[] {
  const result = Array.from(items);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    const value = result[index];
    const replacement = result[other];
    if (value === undefined || replacement === undefined) continue;
    result[index] = replacement;
    result[other] = value;
  }
  return result;
}

function floorNeighbors(position: Position, cells: CellType[][]): Position[] {
  const candidates = [
    { row: position.row - 1, col: position.col },
    { row: position.row + 1, col: position.col },
    { row: position.row, col: position.col - 1 },
    { row: position.row, col: position.col + 1 },
  ];
  return candidates.filter(
    ({ row, col }) => row >= 0 && col >= 0 && cells[row]?.[col] !== undefined && cells[row]?.[col] !== "wall",
  );
}

/** Finds connected floor regions with iterative DFS so generator validation stays deterministic. */
function findComponents(cells: CellType[][]): Position[][] {
  const visited = new Set<string>();
  const components: Position[][] = [];
  for (let row = 0; row < cells.length; row += 1) {
    for (let col = 0; col < (cells[row]?.length ?? 0); col += 1) {
      const origin = { row, col };
      if (cells[row]?.[col] === "wall" || visited.has(positionKey(origin))) continue;
      const component: Position[] = [];
      const stack = [origin];
      visited.add(positionKey(origin));
      while (stack.length > 0) {
        const current = stack.pop();
        if (!current) break;
        component.push(current);
        for (const neighbor of floorNeighbors(current, cells)) {
          const key = positionKey(neighbor);
          if (visited.has(key)) continue;
          visited.add(key);
          stack.push(neighbor);
        }
      }
      components.push(component);
    }
  }
  return components;
}

function makeTemporaryLevel(cells: CellType[][], start: Position, exit: Position): MazeLevel {
  return {
    id: "generator-candidate",
    name: "Mê cung mới",
    instruction: "Nhặt đủ cà rốt rồi về hang.",
    difficulty: "easy",
    rows: cells.length,
    cols: cells[0]?.length ?? 0,
    cells,
    start,
    exit,
    collectibles: [],
    optimalPathLength: 0,
    recommendedMode: "step",
  };
}

function signatureOf(level: MazeLevel): string {
  const cells = level.cells.map((row) => row.map((cell) => (cell === "wall" ? "#" : ".")).join("")).join("/");
  const items = level.collectibles.map((item) => positionKey(item.position)).join(";");
  return `${cells}|${positionKey(level.start)}|${positionKey(level.exit)}|${items}`;
}

function getFallbackLayout(difficulty: Difficulty): string[] {
  if (difficulty === "easy") return ["S..#", "##.#", "...#", "E###"];
  if (difficulty === "medium") return ["S...#", "###.#", "#...#", "#.###", "#...E"];
  return ["S...##", "###.##", "#...##", "#.####", "#....E", "######"];
}

function transformSquareLayout(layout: string[], turns: number, flip: boolean): string[] {
  let grid = layout.map((row) => Array.from(row));
  for (let turn = 0; turn < turns; turn += 1) {
    const size = grid.length;
    grid = Array.from({ length: size }, (_, row) =>
      Array.from({ length: size }, (__, col) => grid[size - 1 - col]?.[row] ?? "#"),
    );
  }
  if (flip) grid = grid.map((row) => [...row].reverse());
  return grid.map((row) => row.join(""));
}

export class MazeGenerator {
  private lastSignature = "";
  private generatedCount = 0;

  constructor(private readonly random: RandomSource = Math.random) {}

  generate(difficulty: Difficulty): MazeLevel {
    const config = difficultyConfigs[difficulty];
    const wallChance = difficulty === "easy" ? 0.24 : difficulty === "medium" ? 0.32 : 0.39;

    for (let attempt = 0; attempt < 5_000; attempt += 1) {
      const cells: CellType[][] = Array.from({ length: config.rows }, () =>
        Array.from({ length: config.cols }, () => (this.random() < wallChance ? "wall" : "floor")),
      );
      const components = findComponents(cells).sort((a, b) => b.length - a.length);
      const component = components[0];
      if (!component || component.length < config.minPathLength + 1) continue;
      const componentKeys = new Set(component.map(positionKey));
      for (let row = 0; row < config.rows; row += 1) {
        for (let col = 0; col < config.cols; col += 1) {
          if (!componentKeys.has(positionKey({ row, col }))) cells[row]![col] = "wall";
        }
      }

      const pairs: Array<{ start: Position; exit: Position; distance: number }> = [];
      const pairOrder = shuffle(component, this.random);
      for (let fromIndex = 0; fromIndex < pairOrder.length; fromIndex += 1) {
        for (let toIndex = fromIndex + 1; toIndex < pairOrder.length; toIndex += 1) {
          const start = pairOrder[fromIndex];
          const exit = pairOrder[toIndex];
          if (!start || !exit) continue;
          const candidate = makeTemporaryLevel(cells, start, exit);
          const path = findShortestPath(candidate, start, exit);
          const distance = path ? path.length - 1 : -1;
          if (distance >= config.minPathLength && distance <= config.maxPathLength) {
            pairs.push({ start, exit, distance });
          }
        }
      }
      pairs.sort((a, b) => b.distance - a.distance);
      const topPairs = pairs.slice(0, Math.min(12, pairs.length));
      const selected = topPairs[Math.floor(this.random() * topPairs.length)];
      if (!selected) continue;

      const level = makeTemporaryLevel(cells, selected.start, selected.exit);
      level.id = `random-${difficulty}-${Date.now()}-${this.generatedCount + 1}`;
      level.difficulty = difficulty;
      level.recommendedMode = difficulty === "hard" ? "commands" : "step";
      level.cells[selected.start.row]![selected.start.col] = "start";
      level.cells[selected.exit.row]![selected.exit.col] = "exit";
      const path = findShortestPath(level, selected.start, selected.exit);
      if (!path || path.length - 2 < config.collectibleCount) continue;

      const usedIndices = new Set<number>();
      for (let itemIndex = 0; itemIndex < config.collectibleCount; itemIndex += 1) {
        let pathIndex = Math.round(((itemIndex + 1) * (path.length - 1)) / (config.collectibleCount + 1));
        pathIndex = Math.max(1, Math.min(path.length - 2, pathIndex));
        while (usedIndices.has(pathIndex) && pathIndex < path.length - 2) pathIndex += 1;
        usedIndices.add(pathIndex);
        const position = path[pathIndex];
        if (!position) continue;
        level.collectibles.push({
          id: `${level.id}-carrot-${itemIndex + 1}`,
          type: "carrot",
          position: { ...position },
          collected: false,
        });
      }
      if (level.collectibles.length !== config.collectibleCount) continue;
      const route = findOptimalMissionRoute(level);
      if (!route) continue;
      level.optimalPathLength = route.length;
      if (level.optimalPathLength < config.minPathLength || level.optimalPathLength > config.maxPathLength) continue;
      if (countDeadEnds(level) > config.maxDeadEnds) continue;
      const signature = signatureOf(level);
      if (signature === this.lastSignature) continue;
      const validation = validateMazeLevel(level);
      if (!validation.valid) continue;

      this.lastSignature = signature;
      this.generatedCount += 1;
      return level;
    }

    return this.createFallback(difficulty);
  }

  private createFallback(difficulty: Difficulty): MazeLevel {
    const config = difficultyConfigs[difficulty];
    for (let variant = 0; variant < 16; variant += 1) {
      const turns = (variant + this.generatedCount) % 4;
      const flip = (variant + this.generatedCount) % 2 === 1;
      const layout = transformSquareLayout(getFallbackLayout(difficulty), turns, flip);
      const cells: CellType[][] = layout.map((row) =>
        Array.from(row).map((symbol) => (symbol === "#" ? "wall" : symbol === "S" ? "start" : symbol === "E" ? "exit" : "floor")),
      );
      let start: Position | undefined;
      let exit: Position | undefined;
      cells.forEach((row, rowIndex) =>
        row.forEach((cell, colIndex) => {
          if (cell === "start") start = { row: rowIndex, col: colIndex };
          if (cell === "exit") exit = { row: rowIndex, col: colIndex };
        }),
      );
      if (!start || !exit) continue;
      const level = makeTemporaryLevel(cells, start, exit);
      level.id = `random-${difficulty}-fallback-${this.generatedCount + 1}`;
      level.difficulty = difficulty;
      level.recommendedMode = difficulty === "hard" ? "commands" : "step";
      const path = findShortestPath(level, start, exit);
      if (!path) continue;
      for (let index = 0; index < config.collectibleCount; index += 1) {
        const pathIndex = Math.max(
          1,
          Math.min(path.length - 2, Math.round(((index + 1) * (path.length - 1)) / (config.collectibleCount + 1))),
        );
        const position = path[pathIndex];
        if (!position) continue;
        level.collectibles.push({
          id: `${level.id}-carrot-${index + 1}`,
          type: "carrot",
          position: { ...position },
          collected: false,
        });
      }
      const route = findOptimalMissionRoute(level);
      if (!route) continue;
      level.optimalPathLength = route.length;
      const signature = signatureOf(level);
      if (signature === this.lastSignature || !validateMazeLevel(level).valid) continue;
      this.lastSignature = signature;
      this.generatedCount += 1;
      return level;
    }
    throw new Error(`Không thể sinh mê cung hợp lệ cho độ khó ${difficulty}.`);
  }
}
