export const ANIMALS = Object.freeze({
  dog: Object.freeze({ id: 'dog', name: 'Chó', weight: 1 }),
  fox: Object.freeze({ id: 'fox', name: 'Cáo', weight: 2 }),
  buffalo: Object.freeze({ id: 'buffalo', name: 'Trâu', weight: 4 }),
});

export const BALANCE = Object.freeze({
  EMPTY: 'EMPTY',
  LEFT_HEAVIER: 'LEFT_HEAVIER',
  RIGHT_HEAVIER: 'RIGHT_HEAVIER',
  BALANCED: 'BALANCED',
  ANIMATING: 'ANIMATING',
});

export function sumWeights(animals) {
  return animals.reduce((sum, animal) => {
    const kind = typeof animal === 'string' ? animal : animal.kind;
    if (!Object.hasOwn(ANIMALS, kind)) throw new RangeError('Unknown animal kind');
    return sum + ANIMALS[kind].weight;
  }, 0);
}

export function weightRelation(difference) {
  if (difference > 0) return BALANCE.LEFT_HEAVIER;
  if (difference < 0) return BALANCE.RIGHT_HEAVIER;
  return BALANCE.BALANCED;
}

export function getBalance(left, right) {
  const leftWeight = sumWeights(left);
  const rightWeight = sumWeights(right);
  const difference = leftWeight - rightWeight;
  const state = left.length || right.length ? weightRelation(difference) : BALANCE.EMPTY;
  return { leftWeight, rightWeight, difference, state };
}

export function isEquivalent(animal, replacement) {
  return replacement.length > 0 && sumWeights([animal]) === sumWeights(replacement);
}
