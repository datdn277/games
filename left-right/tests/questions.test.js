import { describe, expect, it } from 'vitest';
import { findAnswer, isCorrect, levels, makeRound, tutorialQuestion } from '../src/gameplay/questions.js';

function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

describe('Sinh nhiệm vụ', () => {
  it('bắt đầu hướng dẫn bằng quả bóng bên trái Mimo', () => {
    expect(tutorialQuestion.objects.map(({ type }) => type)).toEqual(['ball', 'mimo', 'car']);
    expect(tutorialQuestion.direction).toBe('LEFT');
    expect(findAnswer(tutorialQuestion)?.type).toBe('ball');
  });

  it.each(levels)('$title có 5 câu rõ ràng với hai hướng cân bằng', (level) => {
    const referencePositions = new Set();
    const objectCounts = new Set();
    const observedBalances = new Set();
    for (let seed = 1; seed <= 100; seed += 1) {
      const round = makeRound(level.id, seededRandom(Math.imul(seed, 2654435761)));
      const leftCount = round.filter(({ direction }) => direction === 'LEFT').length;
      expect(round).toHaveLength(5);
      expect(new Set(round.map(({ id }) => id)).size).toBe(5);
      expect([2, 3]).toContain(leftCount);
      observedBalances.add(leftCount);
      expect(round.slice(1).every(({ prompt }, index) => prompt !== round[index].prompt)).toBe(true);

      for (const question of round) {
        const { objects, referenceId, direction, targetType } = question;
        const reference = objects.find(({ id }) => id === referenceId);
        const target = findAnswer(question);
        const sign = direction === 'LEFT' ? -1 : 1;
        expect(reference).toBeDefined();
        expect(reference.selectable).toBe(false);
        expect(Math.sign(target.x - reference.x)).toBe(sign);
        expect(target.id).toBe(question.correctAnswer);
        expect(target.type).toBe(targetType);
        expect(objects.filter(({ id }) => isCorrect(question, id))).toEqual([target]);
        expect(objects.every(({ label }) => typeof label === 'string' && label.length > 0)).toBe(true);
        expect(question.prompt).toContain(question.directionLabel);
        expect(question.prompt).toContain(question.referenceLabel);
        expect(question.prompt).not.toContain('undefined');
        referencePositions.add(reference.x);
        objectCounts.add(objects.length);

        if (level.id === 2) {
          const nearer = objects.filter(({ x }) =>
            Math.sign(x - reference.x) === sign && Math.abs(x - reference.x) < Math.abs(target.x - reference.x),
          );
          expect(nearer).toHaveLength(0);
          expect(question.prompt).toContain('ngay bên');
        }
        if (level.id === 3) {
          const oppositeMatches = objects.filter(({ x, type }) =>
            type === targetType && Math.sign(x - reference.x) === -sign,
          );
          expect(oppositeMatches).toHaveLength(1);
          expect(question.prompt).toContain(question.targetLabel);
        }
      }
    }

    expect([...observedBalances].sort()).toEqual([2, 3]);
    if (level.id === 1) {
      expect([...referencePositions]).toEqual([0]);
      expect([...objectCounts]).toEqual([3]);
    }
    if (level.id === 2) {
      expect(referencePositions.size).toBeGreaterThan(1);
      expect([...objectCounts].sort()).toEqual([4, 5]);
    }
    if (level.id === 3) {
      expect([...objectCounts]).toEqual([5]);
    }
  });

  it('từ chối cấp độ không tồn tại', () => {
    expect(() => makeRound(7)).toThrow(RangeError);
  });
});

describe('Kiểm tra vị trí', () => {
  const fixture = {
    ...tutorialQuestion,
    objects: [
      { id: 'right', x: 2, type: 'car', selectable: true },
      { id: 'left', x: -2, type: 'ball', selectable: true },
      { id: 'reference', x: 0, type: 'mimo', selectable: false },
    ],
    referenceId: 'reference',
    targetId: 'right',
    correctAnswer: 'right',
  };

  it('đọc tọa độ theo màn hình dù dữ liệu sắp xếp theo thứ tự khác', () => {
    expect(isCorrect(fixture, 'left')).toBe(true);
    expect(isCorrect(fixture, 'right')).toBe(false);
    expect(isCorrect({ ...fixture, direction: 'RIGHT' }, 'right')).toBe(true);
    expect(isCorrect(fixture, 'reference')).toBe(false);
    expect(isCorrect(fixture, undefined)).toBe(false);
  });

  it('từ chối câu có nhiều đáp án, vị trí ngang nhau và vật mốc bị thiếu', () => {
    const moreChoices = [...fixture.objects, { id: 'extra', x: -4, selectable: true }];
    expect(findAnswer({ ...fixture, objects: moreChoices })).toBeNull();
    expect(findAnswer({ ...fixture, rule: 'adjacent', objects: moreChoices })?.id).toBe('left');
    const tied = [...fixture.objects, { id: 'extra', x: -2, selectable: true }];
    expect(findAnswer({ ...fixture, rule: 'adjacent', objects: tied })).toBeNull();
    expect(findAnswer({ ...fixture, referenceId: 'missing' })).toBeNull();
    const aligned = fixture.objects.map((object) => ({ ...object, x: 0 }));
    expect(findAnswer({ ...fixture, objects: aligned })).toBeNull();
  });
});
