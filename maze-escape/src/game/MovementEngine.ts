import type { GameState, HistoryEntry } from "./GameState";
import { getNextPosition, isInsideMaze, isWalkable } from "../maze/MazeGrid";
import { positionsEqual, type Direction, type Position } from "../maze/MazeCell";

export type MoveResult = {
  success: boolean;
  from: Position;
  to: Position;
  blockedReason?: "wall" | "outside";
  collectedItemIds: string[];
  reachedExit: boolean;
  completedLevel: boolean;
};

export type UndoResult = {
  success: boolean;
  from: Position;
  to: Position;
  restoredItemIds: string[];
};

function snapshot(state: GameState): HistoryEntry {
  return {
    rabbitPosition: { ...state.rabbitPosition },
    collectedItemIds: [...state.collectedItemIds],
    stepCount: state.stepCount,
  };
}

export function moveRabbit(state: GameState, direction: Direction): MoveResult {
  const level = state.currentLevel;
  const from = { ...state.rabbitPosition };
  if (!level || state.interactionLocked || state.completed) {
    return {
      success: false,
      from,
      to: from,
      collectedItemIds: [],
      reachedExit: false,
      completedLevel: state.completed,
    };
  }

  const target = getNextPosition(from, direction);
  if (!isInsideMaze(target, level)) {
    return {
      success: false,
      from,
      to: from,
      blockedReason: "outside",
      collectedItemIds: [],
      reachedExit: false,
      completedLevel: false,
    };
  }
  if (!isWalkable(target, level)) {
    return {
      success: false,
      from,
      to: from,
      blockedReason: "wall",
      collectedItemIds: [],
      reachedExit: false,
      completedLevel: false,
    };
  }

  state.history.push(snapshot(state));
  state.previousPositions.push(from);
  state.rabbitPosition = { ...target };
  state.stepCount += 1;

  const newlyCollected = level.collectibles
    .filter(
      (item) =>
        positionsEqual(item.position, target) && !state.collectedItemIds.includes(item.id),
    )
    .map((item) => item.id);
  state.collectedItemIds.push(...newlyCollected);

  const reachedExit = positionsEqual(target, level.exit);
  const collectedEverything = state.collectedItemIds.length === level.collectibles.length;
  state.completed = reachedExit && collectedEverything;

  return {
    success: true,
    from,
    to: { ...target },
    collectedItemIds: newlyCollected,
    reachedExit,
    completedLevel: state.completed,
  };
}

export function undoMove(state: GameState): UndoResult {
  const from = { ...state.rabbitPosition };
  if (state.interactionLocked || state.history.length === 0) {
    return { success: false, from, to: from, restoredItemIds: [] };
  }

  const previous = state.history.pop();
  if (!previous) return { success: false, from, to: from, restoredItemIds: [] };
  const restoredItemIds = state.collectedItemIds.filter(
    (id) => !previous.collectedItemIds.includes(id),
  );
  state.rabbitPosition = { ...previous.rabbitPosition };
  state.collectedItemIds = [...previous.collectedItemIds];
  state.stepCount = previous.stepCount;
  state.previousPositions.pop();
  state.completed = false;
  state.hintLevel = 0;
  return {
    success: true,
    from,
    to: { ...state.rabbitPosition },
    restoredItemIds,
  };
}

export function calculateStars(params: {
  stepCount: number;
  optimalPathLength: number;
  mistakes: number;
  hintsUsed: number;
}): number {
  const { stepCount, optimalPathLength, mistakes, hintsUsed } = params;
  if (stepCount <= optimalPathLength + 1 && mistakes === 0 && hintsUsed === 0) return 3;
  if (stepCount <= optimalPathLength + 4 && mistakes <= 2 && hintsUsed <= 1) return 2;
  return 1;
}
