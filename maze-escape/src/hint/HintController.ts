import type { GameState } from "../game/GameState";
import { getAvailableDirections } from "../maze/MazeGrid";
import { findOptimalMissionRoute } from "../maze/PathFinder";
import {
  DIRECTION_DELTAS,
  type Direction,
  type MazeLevel,
  type Position,
} from "../maze/MazeCell";

export type HintResult = {
  level: number;
  availableDirections: Direction[];
  recommendedDirection: Direction | null;
  highlightedPositions: Position[];
  message: string;
};

const DIRECTION_LABELS: Record<Direction, string> = {
  up: "lên",
  down: "xuống",
  left: "sang trái",
  right: "sang phải",
};

export function directionBetween(from: Position, to: Position): Direction | null {
  const rowDelta = to.row - from.row;
  const colDelta = to.col - from.col;
  return (
    (Object.entries(DIRECTION_DELTAS) as Array<[Direction, Position]>).find(
      ([, delta]) => delta.row === rowDelta && delta.col === colDelta,
    )?.[0] ?? null
  );
}

export class HintController {
  getHint(state: GameState, level: MazeLevel): HintResult {
    state.hintsUsed += 1;
    state.hintLevel = Math.min(4, state.hintLevel + 1);
    const remaining = level.collectibles.filter((item) => !state.collectedItemIds.includes(item.id));
    const route = findOptimalMissionRoute(level, state.rabbitPosition, remaining);
    const next = route?.path[1];
    const direction = next ? directionBetween(state.rabbitPosition, next) : null;
    const available = getAvailableDirections(state.rabbitPosition, level);
    let highlightedPositions: Position[] = [];
    let message = "Hãy nhìn các ô quanh Thỏ nhé.";

    if (state.hintLevel === 1) {
      highlightedPositions = available.map((candidate) => {
        const delta = DIRECTION_DELTAS[candidate];
        return {
          row: state.rabbitPosition.row + delta.row,
          col: state.rabbitPosition.col + delta.col,
        };
      });
      const labels = available.map((candidate) => DIRECTION_LABELS[candidate]);
      message = labels.length > 0 ? `Thỏ có thể đi ${labels.join(" hoặc ")}.` : "Đây là ngõ cụt. Con có thể quay lại.";
    } else if (state.hintLevel === 2) {
      highlightedPositions = next ? [next] : [];
      message = direction ? `Con thử đi ${DIRECTION_LABELS[direction]} nhé.` : "Con đã đứng đúng chỗ rồi.";
    } else {
      const count = state.hintLevel === 3 ? 3 : 1;
      highlightedPositions = route?.path.slice(1, count + 1) ?? [];
      message =
        state.hintLevel === 4
          ? "Thỏ sẽ làm mẫu một bước nhé."
          : `Hãy thử theo ${highlightedPositions.length} dấu chân này.`;
    }

    return {
      level: state.hintLevel,
      availableDirections: available,
      recommendedDirection: direction,
      highlightedPositions,
      message,
    };
  }
}
