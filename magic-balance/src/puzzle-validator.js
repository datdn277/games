import { ANIMALS, BALANCE, getBalance } from './weights.js';

const kinds = Object.keys(ANIMALS);
const relations = [BALANCE.LEFT_HEAVIER, BALANCE.RIGHT_HEAVIER, BALANCE.BALANCED];

function differenceVector(left, right) {
  return kinds.map((kind) =>
    left.filter((animal) => animal === kind).length - right.filter((animal) => animal === kind).length);
}

function relationConstraints(left, right, relation) {
  const coefficients = differenceVector(left, right);
  const opposite = coefficients.map((coefficient) => -coefficient);
  if (relation === BALANCE.LEFT_HEAVIER) return [{ coefficients, minimum: 1 }];
  if (relation === BALANCE.RIGHT_HEAVIER) return [{ coefficients: opposite, minimum: 1 }];
  return [{ coefficients, minimum: 0 }, { coefficients: opposite, minimum: 0 }];
}

// Strict comparisons and positive weights can use a margin of 1. Every relation
// is homogeneous, so a feasible world can be scaled to make each margin that large.
function withPositiveWeights(constraints) {
  return [
    ...constraints,
    ...kinds.map((_, index) => ({
      coefficients: kinds.map((_, column) => Number(index === column)),
      minimum: 1,
    })),
  ];
}

// Eliminate one species at a time by requiring each lower bound on its weight
// to be no higher than every upper bound. Rational weights can be scaled to integers.
function feasible(initialConstraints) {
  let constraints = withPositiveWeights(initialConstraints);
  for (let column = 0; column < kinds.length; column += 1) {
    const lower = [];
    const upper = [];
    const remaining = [];
    for (const constraint of constraints) {
      const coefficient = constraint.coefficients[column];
      if (coefficient > 0) lower.push(constraint);
      else if (coefficient < 0) upper.push(constraint);
      else remaining.push(constraint);
    }
    for (const low of lower) {
      for (const high of upper) {
        const lowerMultiplier = -high.coefficients[column];
        const upperMultiplier = low.coefficients[column];
        const coefficients = low.coefficients.map((coefficient, index) =>
          coefficient * lowerMultiplier + high.coefficients[index] * upperMultiplier);
        const minimum = low.minimum * lowerMultiplier + high.minimum * upperMultiplier;
        remaining.push({ coefficients, minimum });
      }
    }
    constraints = remaining;
  }
  return constraints.every(({ minimum }) => minimum <= 0);
}

export function possibleRelations(facts, left, right) {
  const constraints = facts.flatMap((fact) => relationConstraints(fact.left, fact.right, fact.relation));
  return relations.filter((relation) => feasible([
    ...constraints,
    ...relationConstraints(left, right, relation),
  ]));
}

function validSide(side) {
  return Array.isArray(side) && side.every((kind) => Object.hasOwn(ANIMALS, kind));
}

export function validatePuzzle({ facts, challenge, capacity = 6 }) {
  if (!Array.isArray(facts) || !facts.length || !challenge || !Number.isSafeInteger(capacity) || capacity < 1) {
    return { valid: false, reason: 'invalid-configuration' };
  }
  for (const fact of facts) {
    const { left, right, relation } = fact ?? {};
    if (!validSide(left) || !validSide(right) || left.length > capacity || right.length > capacity ||
      !relations.includes(relation)) {
      return { valid: false, reason: 'invalid-fact' };
    }
  }
  const constraints = facts.flatMap((fact) => relationConstraints(fact.left, fact.right, fact.relation));
  if (!feasible(constraints)) return { valid: false, reason: 'contradictory-facts' };
  if (facts.some(({ left, right, relation }) => getBalance(left, right).state !== relation)) {
    return { valid: false, reason: 'fact-contradicts-weights' };
  }

  const { left, right, availableAnimal, maxAvailableCount } = challenge;
  if (!validSide(left) || !left.length || left.length > capacity) {
    return { valid: false, reason: 'invalid-challenge' };
  }
  if (availableAnimal === undefined) {
    if (!validSide(right) || !right.length || right.length > capacity) {
      return { valid: false, reason: 'invalid-challenge' };
    }
    const impliedRelations = possibleRelations(facts, left, right);
    return impliedRelations.length === 1
      ? { valid: true, relation: impliedRelations[0] }
      : { valid: false, reason: 'underdetermined-relation' };
  }
  if (!Object.hasOwn(ANIMALS, availableAnimal) || !Number.isSafeInteger(maxAvailableCount) ||
    maxAvailableCount > capacity || maxAvailableCount < 1) {
    return { valid: false, reason: 'invalid-capacity' };
  }

  const exactMatches = [];
  const possibleMatches = [];
  for (let count = 1; count <= maxAvailableCount; count += 1) {
    const added = Array(count).fill(availableAnimal);
    const possibilities = possibleRelations(facts, left, added);
    if (possibilities.includes(BALANCE.BALANCED)) possibleMatches.push(count);
    if (possibilities.length === 1 && possibilities[0] === BALANCE.BALANCED) exactMatches.push(count);
  }
  if (!possibleMatches.length) return { valid: false, reason: 'no-integer-solution' };
  if (possibleMatches.length !== 1 || exactMatches.length !== 1) {
    return { valid: false, reason: 'underdetermined-count' };
  }
  return { valid: true, count: exactMatches[0] };
}
