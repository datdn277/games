import * as THREE from 'three';
import { GARDEN_LEVEL } from '../game/level';
import type { GridCell } from '../game/types';

export const CELL_SIZE = 1.45;
export const TILE_HEIGHT = 0.18;
export const TILE_TOP_Y = TILE_HEIGHT / 2;

export function gridToWorld(cell: GridCell, target = new THREE.Vector3()): THREE.Vector3 {
  const worldX = (cell.col - (GARDEN_LEVEL.columns - 1) / 2) * CELL_SIZE;
  const worldZ = (cell.row - (GARDEN_LEVEL.rows - 1) / 2) * CELL_SIZE;
  return target.set(worldX, TILE_TOP_Y, worldZ);
}

export function worldToGrid(position: Pick<THREE.Vector3, 'x' | 'z'>): GridCell {
  return {
    row: Math.round(position.z / CELL_SIZE + (GARDEN_LEVEL.rows - 1) / 2),
    col: Math.round(position.x / CELL_SIZE + (GARDEN_LEVEL.columns - 1) / 2),
  };
}

export function isInsideBoard(cell: GridCell): boolean {
  return (
    cell.row >= 0 &&
    cell.row < GARDEN_LEVEL.rows &&
    cell.col >= 0 &&
    cell.col < GARDEN_LEVEL.columns
  );
}

export function getCellCenter(cell: GridCell, target = new THREE.Vector3()): THREE.Vector3 {
  return gridToWorld(cell, target).setY(TILE_TOP_Y);
}
