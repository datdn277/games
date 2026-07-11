import { DIRECTIONS } from "./directions.js";
import { cellKey, isInside, sameCell } from "./PathFinder.js";

export class GameState {
  constructor(levelData) {
    this.load(levelData);
  }

  load(levelData) {
    this.level = levelData.level;
    this.rows = levelData.rows;
    this.columns = levelData.columns;
    this.player = { ...levelData.player, moving: false };
    this.carrots = levelData.carrots.map((carrot) => ({ ...carrot, collected: false }));
    this.obstacles = levelData.obstacles.map((obstacle) => ({ ...obstacle }));
    this.home = { ...levelData.home, unlocked: false };
    this.collectedCount = 0;
    this.totalCarrots = this.carrots.length;
    this.completed = false;
    this.guideEnabled = levelData.guideDefault;
    this.soundEnabled = true;
    this.moves = 0;
    return this;
  }

  attemptMove(directionName) {
    const direction = DIRECTIONS[directionName];
    if (!direction || this.completed) return { status: "ignored" };
    if (this.player.moving) return { status: "busy" };

    this.player.direction = directionName;
    const from = { row: this.player.row, column: this.player.column };
    const to = {
      row: from.row + direction.row,
      column: from.column + direction.column
    };
    if (!isInside(to, this.rows, this.columns)) return { status: "outside", from, to, direction: directionName };

    const obstacle = this.obstacles.find((item) => sameCell(item, to));
    if (obstacle) return { status: "blocked", from, to, obstacle, direction: directionName };

    this.player.row = to.row;
    this.player.column = to.column;
    this.moves += 1;

    const carrot = this.carrots.find((item) => !item.collected && sameCell(item, to));
    if (carrot) {
      carrot.collected = true;
      this.collectedCount += 1;
    }
    const justUnlocked = !this.home.unlocked && this.collectedCount === this.totalCarrots;
    if (justUnlocked) this.home.unlocked = true;
    const completed = this.home.unlocked && sameCell(this.player, this.home);
    if (completed) this.completed = true;

    return {
      status: "moved",
      from,
      to,
      carrot: carrot ?? null,
      justUnlocked,
      completed,
      direction: directionName
    };
  }

  get obstacleKeys() {
    return new Set(this.obstacles.map(cellKey));
  }

  get remainingCarrots() {
    return this.carrots.filter((carrot) => !carrot.collected);
  }
}
