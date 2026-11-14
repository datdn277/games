import { describe, expect, it } from "vitest";
import { createGameState } from "../game/GameState";
import { CommandQueueController } from "../input/CommandQueueController";
import { CommandRunner } from "../input/CommandRunner";

describe("command queue mode", () => {
  it("adds, removes and clears commands with a limit", () => {
    const state = createGameState();
    const queue = new CommandQueueController(state, 2);
    expect(queue.add("right")).toBe(true);
    expect(queue.add("down")).toBe(true);
    expect(queue.add("left")).toBe(false);
    expect(queue.removeLast()).toBe("down");
    queue.clear();
    expect(state.commandQueue).toEqual([]);
  });

  it("runs a valid sequence and highlights each current command", async () => {
    const state = createGameState();
    const queue = new CommandQueueController(state, 12);
    ["right", "right", "down"].forEach((direction) => queue.add(direction as "right" | "down"));
    const runner = new CommandRunner(state, queue);
    const highlighted: number[] = [];
    const result = await runner.run(async () => true, (index) => highlighted.push(index));
    expect(result).toEqual({ success: true, errorIndex: null, executedCount: 3 });
    expect(highlighted).toEqual([0, 1, 2]);
    expect(state.currentCommandIndex).toBe(3);
  });

  it("locks editing while running and stops exactly at a blocked command", async () => {
    const state = createGameState();
    const queue = new CommandQueueController(state, 12);
    queue.add("right");
    queue.add("down");
    queue.add("left");
    const runner = new CommandRunner(state, queue);
    const result = await runner.run(async (_, index) => {
      expect(state.interactionLocked).toBe(true);
      expect(queue.add("up")).toBe(false);
      return index !== 1;
    });
    expect(result).toEqual({ success: false, errorIndex: 1, executedCount: 1 });
    expect(state.commandErrorIndex).toBe(1);
    expect(state.currentCommandIndex).toBe(1);
  });

  it("replaces the bad command and resumes from that position", async () => {
    const state = createGameState();
    const queue = new CommandQueueController(state, 12);
    queue.add("right");
    queue.add("down");
    const runner = new CommandRunner(state, queue);
    await runner.run(async (_, index) => index !== 1);
    expect(queue.replace(1, "right")).toBe(true);
    const visited: number[] = [];
    const result = await runner.run(async (_, index) => {
      visited.push(index);
      return true;
    });
    expect(result.success).toBe(true);
    expect(visited).toEqual([1]);
  });
});
