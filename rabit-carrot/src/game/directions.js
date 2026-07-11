export const DIRECTIONS = Object.freeze({
  up: { row: -1, column: 0, label: "Lên", speech: "Đi lên", arrow: "↑" },
  down: { row: 1, column: 0, label: "Xuống", speech: "Đi xuống", arrow: "↓" },
  left: { row: 0, column: -1, label: "Trái", speech: "Đi sang trái", arrow: "←" },
  right: { row: 0, column: 1, label: "Phải", speech: "Đi sang phải", arrow: "→" }
});

export const DIRECTION_NAMES = Object.freeze(Object.keys(DIRECTIONS));

export function directionBetween(from, to) {
  return DIRECTION_NAMES.find((name) => {
    const direction = DIRECTIONS[name];
    return from.row + direction.row === to.row && from.column + direction.column === to.column;
  }) ?? null;
}

export function keyToDirection(key) {
  return ({
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right"
  })[key] ?? null;
}
