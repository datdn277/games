import { findOptimalMissionRoute } from "./PathFinder";
import type { Difficulty, GameMode, MazeLevel, Position } from "./MazeCell";

export type LevelBlueprint = {
  id: string;
  name: string;
  instruction: string;
  difficulty: Difficulty;
  layout: string[];
  recommendedMode?: GameMode;
};

const VALID_SYMBOLS = new Set(["#", ".", "S", "E", "C"]);

export function createLevel(blueprint: LevelBlueprint): MazeLevel {
  if (blueprint.layout.length === 0) throw new Error("Level layout cannot be empty.");
  const cols = blueprint.layout[0]?.length ?? 0;
  if (cols === 0 || blueprint.layout.some((row) => row.length !== cols)) {
    throw new Error(`Level ${blueprint.id} must be rectangular.`);
  }

  let start: Position | null = null;
  let exit: Position | null = null;
  const collectiblePositions: Position[] = [];
  const cells = blueprint.layout.map((line, row) =>
    Array.from(line).map((symbol, col) => {
      if (!VALID_SYMBOLS.has(symbol)) throw new Error(`Unknown symbol ${symbol} in ${blueprint.id}.`);
      if (symbol === "S") {
        if (start) throw new Error(`Level ${blueprint.id} has more than one start.`);
        start = { row, col };
        return "start" as const;
      }
      if (symbol === "E") {
        if (exit) throw new Error(`Level ${blueprint.id} has more than one exit.`);
        exit = { row, col };
        return "exit" as const;
      }
      if (symbol === "C") {
        collectiblePositions.push({ row, col });
        return "floor" as const;
      }
      return symbol === "#" ? ("wall" as const) : ("floor" as const);
    }),
  );

  if (!start || !exit) throw new Error(`Level ${blueprint.id} needs one start and one exit.`);
  const level: MazeLevel = {
    id: blueprint.id,
    name: blueprint.name,
    instruction: blueprint.instruction,
    difficulty: blueprint.difficulty,
    rows: cells.length,
    cols,
    cells,
    start,
    exit,
    collectibles: collectiblePositions.map((position, index) => ({
      id: `${blueprint.id}-carrot-${index + 1}`,
      type: "carrot",
      position,
      collected: false,
    })),
    optimalPathLength: 0,
    recommendedMode: blueprint.recommendedMode ?? "step",
  };
  const route = findOptimalMissionRoute(level);
  if (!route) throw new Error(`Level ${blueprint.id} has no valid mission route.`);
  level.optimalPathLength = route.length;
  return level;
}

export class LevelFactory {
  create(blueprint: LevelBlueprint): MazeLevel {
    return createLevel(blueprint);
  }
}
