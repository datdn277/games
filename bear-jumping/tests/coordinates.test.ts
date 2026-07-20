import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  CELL_SIZE,
  getCellCenter,
  gridToWorld,
  isInsideBoard,
  worldToGrid,
} from '../src/render/coordinates';

describe('grid/world coordinate conversion', () => {
  it('maps grid columns to X and rows to Z', () => {
    const start = gridToWorld({ row: 0, col: 0 });
    expect(start.x).toBeCloseTo(-2.5 * CELL_SIZE);
    expect(start.z).toBeCloseTo(-2.5 * CELL_SIZE);
    expect(getCellCenter({ row: 5, col: 5 }).x).toBeCloseTo(2.5 * CELL_SIZE);
  });

  it('round-trips every board cell', () => {
    for (let row = 0; row < 6; row += 1) {
      for (let col = 0; col < 6; col += 1) {
        expect(worldToGrid(gridToWorld({ row, col }))).toEqual({ row, col });
      }
    }
  });

  it('converts nearby world positions to the nearest cell', () => {
    const center = gridToWorld({ row: 2, col: 3 });
    const position = new THREE.Vector3(center.x + 0.2, 9, center.z - 0.15);
    expect(worldToGrid(position)).toEqual({ row: 2, col: 3 });
  });

  it('checks board bounds', () => {
    expect(isInsideBoard({ row: 5, col: 5 })).toBe(true);
    expect(isInsideBoard({ row: -1, col: 0 })).toBe(false);
    expect(isInsideBoard({ row: 6, col: 2 })).toBe(false);
  });
});
