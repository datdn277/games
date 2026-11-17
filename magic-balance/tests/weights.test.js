import { describe, expect, it } from 'vitest';
import { BALANCE, getBalance, isEquivalent, sumWeights } from '../src/weights.js';
import { possibleRelations, validatePuzzle } from '../src/puzzle-validator.js';

const { BALANCED, LEFT_HEAVIER, RIGHT_HEAVIER, EMPTY } = BALANCE;
const equalFacts = [
  { left: ['buffalo'], right: ['fox', 'fox'], relation: BALANCED },
  { left: ['fox'], right: ['dog', 'dog'], relation: BALANCED },
];
const heavierFacts = [
  { left: ['buffalo'], right: ['fox'], relation: LEFT_HEAVIER },
  { left: ['fox'], right: ['dog'], relation: LEFT_HEAVIER },
];
const findDogs = { left: ['buffalo'], availableAnimal: 'dog', maxAvailableCount: 6 };

describe('Weights and equivalent animals', () => {
  it('computes totals for equal groups and for rendered board records', () => {
    expect(sumWeights(['buffalo'])).toBe(4);
    expect(sumWeights(['fox', 'fox'])).toBe(4);
    expect(sumWeights(Array(4).fill('dog'))).toBe(4);
    expect(sumWeights([{ id: 'toy-1', kind: 'fox', locked: false }])).toBe(2);
  });

  it('reports which plate is heavier, equal or empty', () => {
    expect(getBalance(['buffalo'], ['fox', 'fox']).state).toBe(BALANCED);
    expect(getBalance(['buffalo'], ['fox'])).toMatchObject({ state: LEFT_HEAVIER, difference: 2 });
    expect(getBalance(['fox'], ['dog', 'dog', 'dog'])).toMatchObject({ state: RIGHT_HEAVIER, difference: -1 });
    expect(getBalance([], []).state).toBe(EMPTY);
  });

  it('checks a replacement independently of the plate composition', () => {
    expect(isEquivalent('fox', ['dog', 'dog'])).toBe(true);
    expect(isEquivalent('fox', ['dog'])).toBe(false);
  });
});

describe('Puzzle validator', () => {
  it('deduces four dogs from two exact balance facts', () => {
    expect(validatePuzzle({ facts: equalFacts, challenge: findDogs })).toEqual({ valid: true, count: 4 });
    expect(possibleRelations(equalFacts, ['buffalo'], ['dog', 'dog', 'dog', 'dog'])).toEqual([BALANCED]);
  });

  it('deduces a strict comparison through two tilted facts', () => {
    const challenge = { left: ['buffalo'], right: ['dog'] };
    expect(validatePuzzle({ facts: heavierFacts, challenge })).toEqual({ valid: true, relation: LEFT_HEAVIER });
  });

  it('refuses to infer a unique count just from tilted plates', () => {
    expect(validatePuzzle({ facts: heavierFacts, challenge: findDogs })).toEqual({
      valid: false, reason: 'underdetermined-count',
    });
    const bounded = [{ left: ['buffalo'], right: ['dog', 'dog', 'dog'], relation: LEFT_HEAVIER }];
    expect(validatePuzzle({ facts: bounded, challenge: { ...findDogs, maxAvailableCount: 4 } })).toEqual({
      valid: false, reason: 'underdetermined-count',
    });
  });

  it('rejects impossible facts, false game facts, and unreachable capacities', () => {
    expect(validatePuzzle({ facts: [...equalFacts, { ...equalFacts[0], relation: LEFT_HEAVIER }], challenge: findDogs }))
      .toMatchObject({ valid: false, reason: 'contradictory-facts' });
    expect(validatePuzzle({ facts: [{ ...equalFacts[0], relation: RIGHT_HEAVIER }], challenge: findDogs }))
      .toMatchObject({ valid: false, reason: 'fact-contradicts-weights' });
    expect(validatePuzzle({ facts: equalFacts, challenge: { ...findDogs, maxAvailableCount: 3 } }))
      .toMatchObject({ valid: false, reason: 'no-integer-solution' });
    expect(validatePuzzle({ facts: [null], challenge: findDogs })).toMatchObject({ valid: false, reason: 'invalid-fact' });
  });
});
