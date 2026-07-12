import type { PieceType } from "./GameState";
import type { Lesson } from "../lessons/Lesson";
import { lessonsByPiece } from "../lessons";

export class LessonManager {
  getLessons(piece: PieceType): Lesson[] {
    return lessonsByPiece[piece];
  }

  getLesson(piece: PieceType, index: number): Lesson {
    const lessons = this.getLessons(piece);
    return lessons[Math.max(0, Math.min(index, lessons.length - 1))];
  }

  getNext(lesson: Lesson): Lesson | null {
    const lessons = this.getLessons(lesson.piece);
    const index = lessons.findIndex((candidate) => candidate.id === lesson.id);
    return lessons[index + 1] ?? null;
  }
}
