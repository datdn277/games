import type { Difficulty, Direction, GameMode, MazeLevel, Position } from "../maze/MazeCell";

export type HistoryEntry = {
  rabbitPosition: Position;
  collectedItemIds: string[];
  stepCount: number;
};

export type GameState = {
  difficulty: Difficulty;
  mode: GameMode;
  currentLevel: MazeLevel | null;
  rabbitPosition: Position;
  previousPositions: Position[];
  history: HistoryEntry[];
  collectedItemIds: string[];
  stepCount: number;
  commandQueue: Direction[];
  currentCommandIndex: number;
  commandErrorIndex: number | null;
  selectedCommandIndex: number | null;
  interactionLocked: boolean;
  completed: boolean;
  mistakes: number;
  hintsUsed: number;
  hintLevel: number;
  voiceEnabled: boolean;
};

export function createGameState(voiceEnabled = true): GameState {
  return {
    difficulty: "easy",
    mode: "step",
    currentLevel: null,
    rabbitPosition: { row: 0, col: 0 },
    previousPositions: [],
    history: [],
    collectedItemIds: [],
    stepCount: 0,
    commandQueue: [],
    currentCommandIndex: 0,
    commandErrorIndex: null,
    selectedCommandIndex: null,
    interactionLocked: false,
    completed: false,
    mistakes: 0,
    hintsUsed: 0,
    hintLevel: 0,
    voiceEnabled,
  };
}

export function resetStateForLevel(
  state: GameState,
  level: MazeLevel,
  mode: GameMode = level.recommendedMode,
): void {
  state.difficulty = level.difficulty;
  state.mode = mode;
  state.currentLevel = level;
  state.rabbitPosition = { ...level.start };
  state.previousPositions = [];
  state.history = [];
  state.collectedItemIds = [];
  state.stepCount = 0;
  state.commandQueue = [];
  state.currentCommandIndex = 0;
  state.commandErrorIndex = null;
  state.selectedCommandIndex = null;
  state.interactionLocked = false;
  state.completed = false;
  state.mistakes = 0;
  state.hintsUsed = 0;
  state.hintLevel = 0;
}
