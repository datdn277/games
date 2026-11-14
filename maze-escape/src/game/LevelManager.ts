import type { ProgressData } from "./ProgressStorage";
import { MazeGenerator } from "../maze/MazeGenerator";
import { predefinedLevels } from "../maze/predefinedLevels";
import type { Difficulty, MazeLevel } from "../maze/MazeCell";

export class LevelManager {
  readonly levels = predefinedLevels;

  constructor(private readonly generator = new MazeGenerator()) {}

  getById(levelId: string): MazeLevel | null {
    return this.levels.find((level) => level.id === levelId) ?? null;
  }

  getNext(levelId: string): MazeLevel | null {
    const index = this.levels.findIndex((level) => level.id === levelId);
    return index >= 0 ? (this.levels[index + 1] ?? null) : null;
  }

  isUnlocked(level: MazeLevel, progress: ProgressData): boolean {
    const index = this.levels.indexOf(level);
    if (index <= 0) return true;
    const previous = this.levels[index - 1];
    return previous ? progress.completedLevelIds.includes(previous.id) : true;
  }

  generate(difficulty: Difficulty): MazeLevel {
    return this.generator.generate(difficulty);
  }
}
