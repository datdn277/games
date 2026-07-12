import type { PieceType } from "../game/GameState";
import type { Lesson } from "./Lesson";
import { bishopLessons } from "./BishopLessons";
import { knightLessons } from "./KnightLessons";
import { rookLessons } from "./RookLessons";

export const lessonsByPiece: Record<PieceType, Lesson[]> = {
  rook: rookLessons,
  bishop: bishopLessons,
  knight: knightLessons,
};

export const allLessons = [...rookLessons, ...bishopLessons, ...knightLessons];
