import { describe, expect, it } from 'vitest';
import { countAnimal, nextCountIndex } from '../src/gameplay/CountingEngine.js';
import { Direction, indexForOrdinal, traversal } from '../src/gameplay/Ordinal.js';
import { ANIMAL_IDS, generateQuestions, LEVELS, QuestionType } from '../src/gameplay/Questions.js';

const { LEFT_TO_RIGHT, RIGHT_TO_LEFT } = Direction;

describe('ordinal positions', () => {
  it('finds a different fourth animal from each end of a fixed row', () => {
    expect(ANIMAL_IDS[indexForOrdinal(6, LEFT_TO_RIGHT, 4)]).toBe('frog');
    expect(ANIMAL_IDS[indexForOrdinal(6, RIGHT_TO_LEFT, 4)]).toBe('rabbit');
    expect(traversal(6, LEFT_TO_RIGHT)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(traversal(6, RIGHT_TO_LEFT)).toEqual([5, 4, 3, 2, 1, 0]);
    expect(ANIMAL_IDS).toEqual(['cat', 'bear', 'rabbit', 'frog', 'panda', 'fox']);
  });

  it('rejects ordinals that do not correspond to a real slot', () => {
    expect(indexForOrdinal(6, LEFT_TO_RIGHT, 0)).toBeNull();
    expect(indexForOrdinal(6, LEFT_TO_RIGHT, 7)).toBeNull();
    expect(indexForOrdinal(6, LEFT_TO_RIGHT, 1.5)).toBeNull();
    expect(indexForOrdinal(6, 'UP', 1)).toBeNull();
    expect(traversal(0, LEFT_TO_RIGHT)).toEqual([]);
  });
});

describe('participatory counting', () => {
  it('requires each next animal from the right and stops at the requested ordinal', () => {
    const question = { animals: ANIMAL_IDS, direction: RIGHT_TO_LEFT, targetOrdinal: 4 };
    let counted = [];
    expect(nextCountIndex(question, counted)).toBe(5);
    expect(countAnimal(question, counted, 0)).toEqual({ correct: false, counted: [] });

    counted = countAnimal(question, counted, 5).counted;
    expect(countAnimal(question, counted, 5)).toEqual({ correct: false, counted: [5] });
    expect(countAnimal(question, counted, 3)).toEqual({ correct: false, counted: [5] });
    counted = countAnimal(question, counted, 4).counted;
    counted = countAnimal(question, counted, 3).counted;

    const last = countAnimal(question, counted, 2);
    expect(last).toEqual({ correct: true, counted: [5, 4, 3, 2], ordinal: 4, done: true });
    expect(nextCountIndex(question, last.counted)).toBeNull();
    expect(countAnimal(question, last.counted, 1)).toEqual({ correct: false, counted: last.counted });
  });
});

describe('lessons', () => {
  it('generates solvable questions of the configured lengths without duplicated animals', () => {
    for (const level of LEVELS) {
      for (const random of [() => 0, () => 0.999]) {
        const questions = generateQuestions(level.id, random);
        expect(questions).toHaveLength(level.questionCount);
        expect(new Set(questions.map(({ id }) => id)).size).toBe(level.questionCount);
        for (const question of questions) {
          const { animals, targetOrdinal, direction } = question;
          expect(animals.length).toBeGreaterThanOrEqual(3);
          expect(animals.length).toBeLessThanOrEqual(6);
          expect(new Set(animals).size).toBe(animals.length);
          expect(animals.every((animal) => ANIMAL_IDS.includes(animal))).toBe(true);
          expect(animals[indexForOrdinal(animals.length, direction, targetOrdinal)]).toBeDefined();
        }
      }
    }
  });

  it('starts with both side flags and ends with balanced comparisons of the same row', () => {
    const firstLesson = generateQuestions(1);
    expect(firstLesson.slice(0, 2).map(({ direction, type }) => [direction, type])).toEqual([
      [LEFT_TO_RIGHT, QuestionType.CHOOSE_FLAG],
      [RIGHT_TO_LEFT, QuestionType.CHOOSE_FLAG],
    ]);
    expect(firstLesson.slice(2).every(({ type }) => type === QuestionType.CHOOSE_END_ANIMAL)).toBe(true);

    const comparisons = generateQuestions(5);
    for (let index = 0; index < comparisons.length; index += 2) {
      const [left, right] = comparisons.slice(index, index + 2);
      expect(left.comparisonId).toBe(right.comparisonId);
      expect(left.targetOrdinal).toBe(right.targetOrdinal);
      expect(left.animals).toBe(right.animals);
      expect(left.direction).toBe(LEFT_TO_RIGHT);
      expect(right.direction).toBe(RIGHT_TO_LEFT);
      expect(indexForOrdinal(left.animals.length, left.direction, left.targetOrdinal))
        .not.toBe(indexForOrdinal(right.animals.length, right.direction, right.targetOrdinal));
    }
  });
});
