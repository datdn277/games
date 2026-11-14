import type { GameState } from "../game/GameState";
import type { Direction } from "../maze/MazeCell";
import type { CommandQueueController } from "./CommandQueueController";

export type CommandRunResult = {
  success: boolean;
  errorIndex: number | null;
  executedCount: number;
};

export class CommandRunner {
  constructor(
    private readonly state: GameState,
    private readonly queue: CommandQueueController,
  ) {}

  async run(
    execute: (direction: Direction, index: number) => Promise<boolean>,
    onIndex?: (index: number) => void,
  ): Promise<CommandRunResult> {
    if (this.state.interactionLocked || this.state.commandQueue.length === 0 || this.state.completed) {
      return { success: false, errorIndex: null, executedCount: 0 };
    }
    this.state.interactionLocked = true;
    const startIndex = this.queue.getRunStartIndex();
    let executedCount = 0;

    for (let index = startIndex; index < this.state.commandQueue.length; index += 1) {
      const direction = this.state.commandQueue[index];
      if (!direction) break;
      this.state.currentCommandIndex = index;
      this.state.commandErrorIndex = null;
      onIndex?.(index);
      const success = await execute(direction, index);
      if (!success) {
        this.queue.markError(index);
        this.state.interactionLocked = false;
        return { success: false, errorIndex: index, executedCount };
      }
      executedCount += 1;
      if (this.state.completed) break;
    }

    this.queue.markComplete();
    this.state.interactionLocked = this.state.completed;
    return { success: true, errorIndex: null, executedCount };
  }
}
