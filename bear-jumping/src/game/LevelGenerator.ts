import { GARDEN_LEVEL } from './level';
import type { GridCell, LevelDefinition, LevelGenerationOptions } from './types';
import { cellKey, sameCell } from './types';

const MAX_GENERATION_ATTEMPTS = 160;
export const MAX_OBSTACLE_COUNT = 12;

export class LevelGenerator {
  constructor(private readonly random: () => number = Math.random) {}

  generate(options: LevelGenerationOptions): LevelDefinition {
    const obstacleCount = Math.max(
      0,
      Math.min(MAX_OBSTACLE_COUNT, Math.floor(options.obstacleCount)),
    );

    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
      const goal = this.chooseGoal(options.layout);
      const obstacles = this.chooseObstacles(options.layout, goal, obstacleCount);
      const level = this.createLevel(goal, obstacles);
      if (hasReachableGoal(level)) return level;
    }

    return this.createFallbackLevel(options.layout, obstacleCount);
  }

  private chooseGoal(layout: LevelGenerationOptions['layout']): GridCell {
    if (layout !== 'random-goal' && layout !== 'random-all') {
      return { ...GARDEN_LEVEL.goal };
    }

    const avoidPresetObstacles = layout === 'random-goal';
    const candidates = this.allCells().filter((cell) => {
      const farEnough = cell.row + cell.col >= 4;
      const conflictsWithPreset = GARDEN_LEVEL.obstacles.some((obstacle) => sameCell(obstacle, cell));
      return (
        !sameCell(cell, GARDEN_LEVEL.start) &&
        farEnough &&
        (!avoidPresetObstacles || !conflictsWithPreset)
      );
    });

    return { ...(candidates[this.randomIndex(candidates.length)] ?? GARDEN_LEVEL.goal) };
  }

  private chooseObstacles(
    layout: LevelGenerationOptions['layout'],
    goal: GridCell,
    count: number,
  ): GridCell[] {
    const usePreset = layout === 'classic' || layout === 'random-goal';
    const obstacles = usePreset
      ? GARDEN_LEVEL.obstacles
          .filter((cell) => !sameCell(cell, goal))
          .slice(0, count)
          .map((cell) => ({ ...cell }))
      : [];
    const occupied = new Set(obstacles.map(cellKey));
    const candidates = this.shuffle(
      this.allCells().filter(
        (cell) =>
          !sameCell(cell, GARDEN_LEVEL.start) &&
          !sameCell(cell, goal) &&
          !occupied.has(cellKey(cell)),
      ),
    );

    for (const cell of candidates) {
      if (obstacles.length >= count) break;
      obstacles.push(cell);
    }
    return obstacles;
  }

  private createFallbackLevel(
    layout: LevelGenerationOptions['layout'],
    obstacleCount: number,
  ): LevelDefinition {
    const goal = this.chooseGoal(layout);
    const safePath = new Set<string>();
    for (let row = GARDEN_LEVEL.start.row; row <= goal.row; row += 1) {
      safePath.add(cellKey({ row, col: GARDEN_LEVEL.start.col }));
    }
    for (let col = GARDEN_LEVEL.start.col; col <= goal.col; col += 1) {
      safePath.add(cellKey({ row: goal.row, col }));
    }

    const candidates = this.shuffle(
      this.allCells().filter(
        (cell) =>
          !safePath.has(cellKey(cell)) &&
          !sameCell(cell, GARDEN_LEVEL.start) &&
          !sameCell(cell, goal),
      ),
    );
    return this.createLevel(goal, candidates.slice(0, obstacleCount));
  }

  private createLevel(goal: GridCell, obstacles: GridCell[]): LevelDefinition {
    return {
      rows: GARDEN_LEVEL.rows,
      columns: GARDEN_LEVEL.columns,
      start: { ...GARDEN_LEVEL.start },
      goal: { ...goal },
      obstacles: obstacles.map((cell) => ({ ...cell })),
    };
  }

  private allCells(): GridCell[] {
    const cells: GridCell[] = [];
    for (let row = 0; row < GARDEN_LEVEL.rows; row += 1) {
      for (let col = 0; col < GARDEN_LEVEL.columns; col += 1) cells.push({ row, col });
    }
    return cells;
  }

  private shuffle(cells: GridCell[]): GridCell[] {
    for (let index = cells.length - 1; index > 0; index -= 1) {
      const swapIndex = this.randomIndex(index + 1);
      const current = cells[index];
      const other = cells[swapIndex];
      if (!current || !other) continue;
      cells[index] = other;
      cells[swapIndex] = current;
    }
    return cells;
  }

  private randomIndex(length: number): number {
    if (length <= 1) return 0;
    return Math.min(length - 1, Math.floor(Math.max(0, this.random()) * length));
  }
}

export function hasReachableGoal(level: LevelDefinition): boolean {
  const obstacles = new Set(level.obstacles.map(cellKey));
  const visited = new Set<string>([cellKey(level.start)]);
  const queue: GridCell[] = [{ ...level.start }];
  const deltas = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
  ];

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    if (!current) continue;
    if (sameCell(current, level.goal)) return true;

    for (const delta of deltas) {
      const next = { row: current.row + delta.row, col: current.col + delta.col };
      const key = cellKey(next);
      const inside =
        next.row >= 0 && next.row < level.rows && next.col >= 0 && next.col < level.columns;
      if (!inside || obstacles.has(key) || visited.has(key)) continue;
      visited.add(key);
      queue.push(next);
    }
  }
  return false;
}
