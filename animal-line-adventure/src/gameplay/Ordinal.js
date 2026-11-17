export const Direction = Object.freeze({
  LEFT_TO_RIGHT: 'LEFT_TO_RIGHT',
  RIGHT_TO_LEFT: 'RIGHT_TO_LEFT',
});

export function isDirection(direction) {
  return direction === Direction.LEFT_TO_RIGHT || direction === Direction.RIGHT_TO_LEFT;
}

export function indexForOrdinal(length, direction, ordinal) {
  if (!isDirection(direction) || !Number.isInteger(length) ||
      !Number.isInteger(ordinal) || ordinal < 1 || ordinal > length) {
    return null;
  }

  return direction === Direction.LEFT_TO_RIGHT ? ordinal - 1 : length - ordinal;
}

export function traversal(length, direction) {
  if (!Number.isInteger(length) || length < 1 || !isDirection(direction)) return [];
  return Array.from({ length }, (_, index) => indexForOrdinal(length, direction, index + 1));
}
