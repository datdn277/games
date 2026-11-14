import { describe, expect, it } from "vitest";
import { createLevel } from "../maze/LevelFactory";
import {
  calculateDistance,
  findOptimalMissionRoute,
  findShortestPath,
  getReachableCells,
} from "../maze/PathFinder";

describe("PathFinder BFS", () => {
  it("finds the shortest path through a simple maze with dead ends", () => {
    const level = createLevel({
      id: "bfs",
      name: "BFS",
      instruction: "Test",
      difficulty: "medium",
      layout: ["S..#", "##.#", "C..E", "####"],
    });
    const path = findShortestPath(level, level.start, level.exit);
    expect(path?.[0]).toEqual(level.start);
    expect(path?.at(-1)).toEqual(level.exit);
    expect(calculateDistance(level, level.start, level.exit)).toBe(5);
  });

  it("returns null when no path exists", () => {
    const level = {
      ...createLevel({
        id: "base",
        name: "Base",
        instruction: "Test",
        difficulty: "easy" as const,
        layout: ["SCE", "...", "..."],
      }),
      cells: [
        ["start", "wall", "exit"],
        ["wall", "wall", "wall"],
        ["floor", "floor", "floor"],
      ] satisfies import("../maze/MazeCell").CellType[][],
      collectibles: [],
    };
    expect(findShortestPath(level, level.start, level.exit)).toBeNull();
  });

  it("returns the start when start equals target", () => {
    const level = createLevel({
      id: "same",
      name: "Same",
      instruction: "Test",
      difficulty: "easy",
      layout: ["SCE", "...", "..."],
    });
    expect(findShortestPath(level, level.start, level.start)).toEqual([level.start]);
  });

  it("returns all and only reachable cells", () => {
    const level = createLevel({
      id: "reachable",
      name: "Reachable",
      instruction: "Test",
      difficulty: "easy",
      layout: ["SCE", "###", "..."],
    });
    expect(getReachableCells(level, level.start)).toHaveLength(3);
  });

  it("plans the best order for multiple collectibles and exposes the first hint step", () => {
    const level = createLevel({
      id: "multi",
      name: "Multi",
      instruction: "Test",
      difficulty: "hard",
      layout: ["S.C", "...", "C.E"],
    });
    const route = findOptimalMissionRoute(level);
    expect(route).not.toBeNull();
    expect(route?.collectibleOrder).toHaveLength(2);
    expect(route?.path[1]).toEqual({ row: 0, col: 1 });
    expect(route?.length).toBe(level.optimalPathLength);
  });
});
