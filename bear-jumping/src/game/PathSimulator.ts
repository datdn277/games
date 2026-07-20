import { GameSession } from './GameSession';
import type { GridCell, MoveStep, RunOutcome } from './types';
import { cellKey, cloneCell, DIRECTION_DELTAS, sameCell } from './types';

export class PathSimulator {
  constructor(private readonly maxSteps = 128) {}

  simulate(session: GameSession, start: GridCell = session.level.start): RunOutcome {
    let current = cloneCell(start);
    const steps: MoveStep[] = [];
    const visited = new Set<string>([cellKey(current)]);

    if (sameCell(current, session.level.goal)) {
      return this.outcome('success', steps, current, current);
    }

    for (let index = 0; index < this.maxSteps; index += 1) {
      const direction = session.getCommand(current);
      if (!direction) return this.outcome('missing-command', steps, current, current);

      const delta = DIRECTION_DELTAS[direction];
      const next = { row: current.row + delta.row, col: current.col + delta.col };

      if (!session.isInsideBoard(next)) {
        return this.outcome('boundary', steps, current, current);
      }
      if (session.isObstacle(next)) {
        return this.outcome('obstacle', steps, current, current);
      }

      steps.push({ from: cloneCell(current), to: cloneCell(next), direction, index });

      if (sameCell(next, session.level.goal)) {
        return this.outcome('success', steps, next, current);
      }
      if (visited.has(cellKey(next))) {
        return this.outcome('loop', steps, next, current);
      }

      visited.add(cellKey(next));
      current = next;
    }

    return this.outcome('loop', steps, current, current);
  }

  private outcome(
    kind: RunOutcome['kind'],
    steps: MoveStep[],
    terminalCell: GridCell,
    commandCell: GridCell,
  ): RunOutcome {
    return {
      kind,
      steps,
      terminalCell: cloneCell(terminalCell),
      commandCell: cloneCell(commandCell),
    };
  }
}
