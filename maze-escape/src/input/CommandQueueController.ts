import type { GameState } from "../game/GameState";
import type { Direction } from "../maze/MazeCell";

export class CommandQueueController {
  constructor(
    private readonly state: GameState,
    private limit: number,
  ) {}

  setLimit(limit: number): void {
    this.limit = Math.max(1, limit);
    if (this.state.commandQueue.length > this.limit) {
      this.state.commandQueue = this.state.commandQueue.slice(0, this.limit);
    }
  }

  add(direction: Direction): boolean {
    if (this.state.interactionLocked || this.state.commandQueue.length >= this.limit) return false;
    if (this.state.selectedCommandIndex !== null) {
      return this.replace(this.state.selectedCommandIndex, direction);
    }
    this.state.commandQueue.push(direction);
    this.resetRunMarker();
    return true;
  }

  replace(index: number, direction: Direction): boolean {
    if (this.state.interactionLocked || index < 0 || index >= this.state.commandQueue.length) return false;
    this.state.commandQueue[index] = direction;
    this.state.selectedCommandIndex = null;
    if (this.state.commandErrorIndex === index) this.state.commandErrorIndex = null;
    return true;
  }

  select(index: number): boolean {
    if (this.state.interactionLocked || index < 0 || index >= this.state.commandQueue.length) return false;
    if (this.state.commandErrorIndex !== null && index < this.state.commandErrorIndex) return false;
    this.state.selectedCommandIndex = index;
    return true;
  }

  removeLast(): Direction | null {
    if (this.state.interactionLocked) return null;
    const removed = this.state.commandQueue.pop() ?? null;
    this.resetRunMarker();
    return removed;
  }

  clear(): void {
    if (this.state.interactionLocked) return;
    this.state.commandQueue = [];
    this.resetRunMarker();
  }

  markError(index: number): void {
    this.state.currentCommandIndex = index;
    this.state.commandErrorIndex = index;
    this.state.selectedCommandIndex = index;
  }

  markComplete(): void {
    this.state.currentCommandIndex = this.state.commandQueue.length;
    this.state.commandErrorIndex = null;
    this.state.selectedCommandIndex = null;
  }

  getRunStartIndex(): number {
    if (this.state.commandErrorIndex !== null) return this.state.commandErrorIndex;
    return this.state.currentCommandIndex > 0 && this.state.currentCommandIndex < this.state.commandQueue.length
      ? this.state.currentCommandIndex
      : 0;
  }

  private resetRunMarker(): void {
    this.state.currentCommandIndex = 0;
    this.state.commandErrorIndex = null;
    this.state.selectedCommandIndex = null;
  }
}
