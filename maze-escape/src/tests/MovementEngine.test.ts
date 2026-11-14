import { describe, expect, it } from "vitest";
import { createGameState, resetStateForLevel } from "../game/GameState";
import { moveRabbit, undoMove } from "../game/MovementEngine";
import { createLevel } from "../maze/LevelFactory";

const movementLevel = createLevel({
  id: "movement",
  name: "Movement",
  instruction: "Test",
  difficulty: "easy",
  layout: ["E..", ".S#", ".C."],
});

function stateAtLevel() {
  const state = createGameState();
  resetStateForLevel(state, movementLevel);
  return state;
}

describe("MovementEngine", () => {
  it.each([
    ["up", { row: 0, col: 1 }],
    ["down", { row: 2, col: 1 }],
    ["left", { row: 1, col: 0 }],
  ] as const)("moves one cell %s", (direction, expected) => {
    const state = stateAtLevel();
    const result = moveRabbit(state, direction);
    expect(result.success).toBe(true);
    expect(state.rabbitPosition).toEqual(expected);
    expect(state.stepCount).toBe(1);
  });

  it("moves right when the cell is open", () => {
    const level = createLevel({
      id: "right",
      name: "Right",
      instruction: "Test",
      difficulty: "easy",
      layout: ["SCE", "...", "..."],
    });
    const state = createGameState();
    resetStateForLevel(state, level);
    expect(moveRabbit(state, "right").success).toBe(true);
    expect(state.rabbitPosition).toEqual({ row: 0, col: 1 });
  });

  it("does not pass through a wall", () => {
    const state = stateAtLevel();
    const result = moveRabbit(state, "right");
    expect(result).toMatchObject({ success: false, blockedReason: "wall" });
    expect(state.rabbitPosition).toEqual(movementLevel.start);
  });

  it("does not leave the matrix", () => {
    const level = createLevel({
      id: "outside",
      name: "Outside",
      instruction: "Test",
      difficulty: "easy",
      layout: ["SCE", "...", "..."],
    });
    const state = createGameState();
    resetStateForLevel(state, level);
    const result = moveRabbit(state, "up");
    expect(result).toMatchObject({ success: false, blockedReason: "outside" });
  });

  it("ignores movement while interaction is locked", () => {
    const state = stateAtLevel();
    state.interactionLocked = true;
    expect(moveRabbit(state, "up").success).toBe(false);
    expect(state.rabbitPosition).toEqual(movementLevel.start);
  });

  it("collects a carrot only once", () => {
    const state = stateAtLevel();
    const result = moveRabbit(state, "down");
    expect(result.collectedItemIds).toEqual(["movement-carrot-1"]);
    moveRabbit(state, "left");
    moveRabbit(state, "right");
    expect(state.collectedItemIds).toHaveLength(1);
  });

  it("reaches the exit but cannot complete without the carrot", () => {
    const state = stateAtLevel();
    moveRabbit(state, "up");
    const result = moveRabbit(state, "left");
    expect(result.reachedExit).toBe(true);
    expect(result.completedLevel).toBe(false);
  });

  it("completes after collecting the carrot and reaching the exit", () => {
    const state = stateAtLevel();
    moveRabbit(state, "down");
    moveRabbit(state, "left");
    moveRabbit(state, "up");
    moveRabbit(state, "up");
    const result = moveRabbit(state, "right");
    expect(result.completedLevel).toBe(true);
    expect(state.completed).toBe(true);
  });
});

describe("undoMove", () => {
  it("undoes one and many moves", () => {
    const state = stateAtLevel();
    moveRabbit(state, "down");
    moveRabbit(state, "left");
    expect(undoMove(state).success).toBe(true);
    expect(state.rabbitPosition).toEqual({ row: 2, col: 1 });
    expect(undoMove(state).success).toBe(true);
    expect(state.rabbitPosition).toEqual(movementLevel.start);
  });

  it("restores a carrot collected by the undone step", () => {
    const state = stateAtLevel();
    moveRabbit(state, "down");
    const result = undoMove(state);
    expect(result.restoredItemIds).toEqual(["movement-carrot-1"]);
    expect(state.collectedItemIds).toEqual([]);
  });

  it("does nothing at the initial position or while locked", () => {
    const state = stateAtLevel();
    expect(undoMove(state).success).toBe(false);
    moveRabbit(state, "up");
    state.interactionLocked = true;
    expect(undoMove(state).success).toBe(false);
  });
});
