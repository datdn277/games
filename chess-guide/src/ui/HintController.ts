import type { Lesson } from "../lessons/Lesson";

export class HintController {
  getHint(lesson: Lesson, step: number): string {
    return lesson.hints[Math.max(0, Math.min(step - 1, lesson.hints.length - 1))];
  }
}
