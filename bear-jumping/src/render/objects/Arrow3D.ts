import * as THREE from 'three';
import type { Direction, GridCell } from '../../game/types';
import { cellKey } from '../../game/types';
import { gridToWorld, TILE_TOP_Y } from '../coordinates';

const DIRECTION_ROTATION: Readonly<Record<Direction, number>> = {
  up: 0,
  right: -Math.PI / 2,
  down: Math.PI,
  left: Math.PI / 2,
};

export class Arrow3D {
  readonly group = new THREE.Group();

  private readonly geometry: THREE.ExtrudeGeometry;
  private readonly materials: Record<Direction, THREE.MeshStandardMaterial>;
  private readonly arrows = new Map<string, THREE.Group>();
  private readonly scaleIn = new Map<string, number>();
  private activeKey: string | null = null;
  private problemKey: string | null = null;
  private elapsed = 0;

  constructor() {
    this.group.name = 'ArrowCommands3D';
    const shape = new THREE.Shape();
    shape.moveTo(-0.13, -0.34);
    shape.lineTo(0.13, -0.34);
    shape.lineTo(0.13, 0.04);
    shape.lineTo(0.31, 0.04);
    shape.lineTo(0, 0.38);
    shape.lineTo(-0.31, 0.04);
    shape.lineTo(-0.13, 0.04);
    shape.closePath();
    this.geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelSegments: 1,
      bevelSize: 0.025,
      bevelThickness: 0.02,
    });
    this.geometry.center();
    this.materials = {
      up: this.createMaterial(0x2f9eec),
      down: this.createMaterial(0xef6c62),
      left: this.createMaterial(0x8f72e8),
      right: this.createMaterial(0xf2a62d),
    };
  }

  private createMaterial(color: number): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.55,
      metalness: 0.02,
      emissive: new THREE.Color(color).multiplyScalar(0.08),
    });
  }

  setCommand(cell: GridCell, direction: Direction): void {
    const key = cellKey(cell);
    const previous = this.arrows.get(key);
    if (previous) this.group.remove(previous);

    const arrowGroup = new THREE.Group();
    const arrow = new THREE.Mesh(this.geometry, this.materials[direction]);
    arrow.rotation.x = -Math.PI / 2;
    arrow.castShadow = true;
    arrowGroup.add(arrow);

    const world = gridToWorld(cell);
    arrowGroup.position.set(world.x + 0.31, TILE_TOP_Y + 0.11, world.z - 0.3);
    arrowGroup.rotation.y = DIRECTION_ROTATION[direction];
    arrowGroup.scale.setScalar(0.01);
    arrowGroup.userData = { type: 'command-arrow', row: cell.row, col: cell.col, direction };
    this.arrows.set(key, arrowGroup);
    this.scaleIn.set(key, 0);
    this.group.add(arrowGroup);
  }

  removeCommand(cell: GridCell): void {
    const key = cellKey(cell);
    const arrow = this.arrows.get(key);
    if (arrow) this.group.remove(arrow);
    this.arrows.delete(key);
    this.scaleIn.delete(key);
    if (this.activeKey === key) this.activeKey = null;
    if (this.problemKey === key) this.problemKey = null;
  }

  clear(): void {
    for (const arrow of this.arrows.values()) this.group.remove(arrow);
    this.arrows.clear();
    this.scaleIn.clear();
    this.activeKey = null;
    this.problemKey = null;
  }

  setActive(cell: GridCell | null): void {
    this.activeKey = cell ? cellKey(cell) : null;
  }

  setProblem(cell: GridCell | null): void {
    this.problemKey = cell ? cellKey(cell) : null;
  }

  update(delta: number): void {
    this.elapsed += delta;
    for (const [key, progress] of this.scaleIn) {
      const next = Math.min(1, progress + delta / 0.22);
      const overshoot = 1 + Math.sin(next * Math.PI) * 0.18;
      this.arrows.get(key)?.scale.setScalar(next * overshoot * 0.78);
      if (next >= 1) this.scaleIn.delete(key);
      else this.scaleIn.set(key, next);
    }

    for (const [key, arrow] of this.arrows) {
      if (this.scaleIn.has(key)) continue;
      if (key === this.activeKey) {
        arrow.scale.setScalar(0.82 + Math.sin(this.elapsed * 10) * 0.1);
        arrow.position.y = TILE_TOP_Y + 0.13 + Math.sin(this.elapsed * 10) * 0.025;
      } else if (key === this.problemKey) {
        arrow.scale.setScalar(0.78 + Math.sin(this.elapsed * 14) * 0.08);
        arrow.position.y = TILE_TOP_Y + 0.11;
      } else {
        arrow.scale.setScalar(0.78);
        arrow.position.y = TILE_TOP_Y + 0.11;
      }
    }
  }

  dispose(): void {
    this.clear();
    this.geometry.dispose();
    Object.values(this.materials).forEach((material) => material.dispose());
  }
}
