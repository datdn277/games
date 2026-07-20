import type { Direction, GridCell, LevelDefinition, PlacementResult } from './types';
import { cellKey, cloneCell, sameCell } from './types';

export class GameSession {
  private readonly commands = new Map<string, Direction>();

  constructor(readonly level: LevelDefinition) {}

  isInsideBoard(cell: GridCell): boolean {
    return (
      Number.isInteger(cell.row) &&
      Number.isInteger(cell.col) &&
      cell.row >= 0 &&
      cell.row < this.level.rows &&
      cell.col >= 0 &&
      cell.col < this.level.columns
    );
  }

  isObstacle(cell: GridCell): boolean {
    return this.level.obstacles.some((obstacle) => sameCell(obstacle, cell));
  }

  canPlaceCommand(cell: GridCell): PlacementResult | { ok: true; replaced: false } {
    if (!this.isInsideBoard(cell)) return { ok: false, reason: 'outside-board' };
    if (this.isObstacle(cell)) return { ok: false, reason: 'obstacle' };
    if (sameCell(cell, this.level.goal)) return { ok: false, reason: 'goal' };
    return { ok: true, replaced: false };
  }

  setCommand(cell: GridCell, direction: Direction): PlacementResult {
    const validation = this.canPlaceCommand(cell);
    if (!validation.ok) return validation;

    const key = cellKey(cell);
    const replaced = this.commands.has(key);
    this.commands.set(key, direction);
    return { ok: true, replaced };
  }

  getCommand(cell: GridCell): Direction | undefined {
    return this.commands.get(cellKey(cell));
  }

  deleteCommand(cell: GridCell): boolean {
    return this.commands.delete(cellKey(cell));
  }

  clearCommands(): void {
    this.commands.clear();
  }

  getCommands(): ReadonlyArray<{ cell: GridCell; direction: Direction }> {
    return [...this.commands.entries()].map(([key, direction]) => {
      const [row = '0', col = '0'] = key.split(':');
      return {
        cell: cloneCell({ row: Number(row), col: Number(col) }),
        direction,
      };
    });
  }
}
