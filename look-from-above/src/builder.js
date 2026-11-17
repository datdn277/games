import { BUILD_BOUNDS } from './levels.js';
import { isColor } from './projection.js';

export const BUILD_HEIGHT = 3;
const HISTORY_SIZE = 32;

function inBounds(x, z) {
  const { minX, maxX, minZ, maxZ } = BUILD_BOUNDS;
  return Number.isInteger(x) && Number.isInteger(z) &&
    x >= minX && x <= maxX && z >= minZ && z <= maxZ;
}

function highest(cubes, x, z) {
  return cubes.reduce((top, cube) => cube.x === x && cube.z === z &&
    (top === null || cube.y > top.y) ? cube : top, null);
}

export class Builder {
  #history = [];
  #serial = 0;
  cubes = [];
  moveSource = null;

  constructor(saved) {
    const cubes = Array.isArray(saved) ? saved : saved?.cubes;
    if (!Array.isArray(cubes)) return;
    const ordered = cubes.filter((cube) => cube && inBounds(cube.x, cube.z) &&
      Number.isInteger(cube.y) && cube.y >= 0 && cube.y < BUILD_HEIGHT && isColor(cube.topColor))
      .sort((left, right) => left.y - right.y);
    for (const cube of ordered) {
      const { x, z, y, topColor, sideColor } = cube;
      if (y !== (highest(this.cubes, x, z)?.y ?? -1) + 1) continue;
      this.cubes.push(this.makeCube(x, y, z, topColor, isColor(sideColor) ? sideColor : topColor));
    }
  }

  get canUndo() {
    return this.#history.length > 0;
  }

  makeCube(x, y, z, topColor, sideColor = topColor) {
    return { id: `build-${++this.#serial}`, x, y, z, topColor, sideColor };
  }

  commit(next) {
    this.#history.push(this.cubes);
    if (this.#history.length > HISTORY_SIZE) this.#history.shift();
    this.cubes = next;
    this.moveSource = null;
    return true;
  }

  cancelMove() {
    this.moveSource = null;
  }

  edit(mode, x, z, color) {
    if (!inBounds(x, z) || !['add', 'remove', 'color', 'move'].includes(mode)) return false;
    if (mode !== 'move') this.cancelMove();
    const top = highest(this.cubes, x, z);
    const height = (top?.y ?? -1) + 1;
    if (mode === 'add') {
      if (!isColor(color) || height >= BUILD_HEIGHT) return false;
      return this.commit([...this.cubes, this.makeCube(x, height, z, color)]);
    }
    if (mode === 'remove') {
      return top ? this.commit(this.cubes.filter((cube) => cube !== top)) : false;
    }
    if (mode === 'color') {
      if (!top || !isColor(color) || (top.topColor === color && top.sideColor === color)) return false;
      return this.commit(this.cubes.map((cube) => cube === top ? { ...top, topColor: color, sideColor: color } : cube));
    }
    if (!this.moveSource) {
      this.moveSource = top;
      return Boolean(top);
    }
    const source = this.moveSource;
    if (source === top) {
      this.cancelMove();
      return true;
    }
    if (height >= BUILD_HEIGHT) return false;
    return this.commit(this.cubes.map((cube) => cube === source ? { ...source, x, z, y: height } : cube));
  }

  undo() {
    if (!this.canUndo) return false;
    this.cubes = this.#history.pop();
    this.cancelMove();
    return true;
  }

  clear() {
    return this.cubes.length ? this.commit([]) : false;
  }
}
