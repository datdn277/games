import * as THREE from 'three';
import type { Direction, GridCell } from '../../game/types';
import { DIRECTIONS } from '../../game/types';
import { gridToWorld, TILE_TOP_Y } from '../coordinates';

const DIRECTION_ROTATION: Readonly<Record<Direction, number>> = {
  up: 0,
  right: -Math.PI / 2,
  down: Math.PI,
  left: Math.PI / 2,
};

// Compensate for the fixed isometric camera: the two directions behind the
// bear sit higher and farther out, while the two foreground choices sit lower.
const DIRECTION_OFFSET: Readonly<Record<Direction, readonly [number, number, number]>> = {
  up: [0, 0.42, -1.08],
  right: [0.92, -0.21, 0],
  down: [0, -0.21, 0.92],
  left: [-1.08, 0.42, 0],
};

const COLORS: Readonly<Record<Direction, number>> = {
  up: 0x2f9eec,
  right: 0xf2a62d,
  down: 0xef6c62,
  left: 0x8f72e8,
};

interface ChoiceVisual {
  root: THREE.Group;
  mesh: THREE.Mesh<THREE.ExtrudeGeometry, THREE.MeshStandardMaterial>;
  material: THREE.MeshStandardMaterial;
}

/**
 * A render-only radial menu. It reports a direction through raycasting but never
 * decides whether the bear may move there.
 */
export class DirectionPicker3D {
  readonly group = new THREE.Group();
  readonly choiceMeshes: THREE.Mesh[] = [];

  private readonly geometry: THREE.ExtrudeGeometry;
  private readonly hitGeometry = new THREE.CircleGeometry(0.5, 18);
  private readonly hitMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  private readonly choices = new Map<Direction, ChoiceVisual>();
  private readonly center = new THREE.Vector3();
  private visible = false;
  private revealProgress = 0;
  private elapsed = 0;
  private hovered: Direction | null = null;
  private invalidDirection: Direction | null = null;
  private invalidTime = 0;

  constructor() {
    this.group.name = 'DirectionPicker3D';
    const shape = new THREE.Shape();
    shape.moveTo(-0.16, -0.3);
    shape.lineTo(0.16, -0.3);
    shape.lineTo(0.16, 0);
    shape.lineTo(0.34, 0);
    shape.lineTo(0, 0.36);
    shape.lineTo(-0.34, 0);
    shape.lineTo(-0.16, 0);
    shape.closePath();
    this.geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.09,
      bevelEnabled: true,
      bevelSegments: 1,
      bevelSize: 0.025,
      bevelThickness: 0.025,
    });
    this.geometry.center();

    for (const direction of DIRECTIONS) {
      const material = new THREE.MeshStandardMaterial({
        color: COLORS[direction],
        emissive: new THREE.Color(COLORS[direction]).multiplyScalar(0.12),
        roughness: 0.48,
        metalness: 0.03,
        depthTest: false,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.castShadow = true;
      mesh.renderOrder = 20;
      mesh.userData = { type: 'direction-choice', direction };

      const hitTarget = new THREE.Mesh(this.hitGeometry, this.hitMaterial);
      hitTarget.rotation.x = -Math.PI / 2;
      hitTarget.userData = { type: 'direction-choice', direction };

      const root = new THREE.Group();
      root.rotation.y = DIRECTION_ROTATION[direction];
      root.add(hitTarget, mesh);
      this.group.add(root);
      this.choiceMeshes.push(hitTarget);
      this.choices.set(direction, { root, mesh, material });
    }
    this.group.visible = false;
  }

  show(cell: GridCell): void {
    gridToWorld(cell, this.center);
    this.group.position.set(this.center.x, TILE_TOP_Y + 0.62, this.center.z);
    this.group.visible = true;
    this.visible = true;
    this.revealProgress = 0;
    this.invalidDirection = null;
    this.invalidTime = 0;
    for (const choice of this.choices.values()) {
      choice.root.position.set(0, 0, 0);
      choice.root.scale.setScalar(0.01);
    }
  }

  hide(): void {
    this.visible = false;
    this.group.visible = false;
    this.setHover(null);
    this.invalidDirection = null;
  }

  getDirectionFromObject(object: THREE.Object3D): Direction | null {
    const direction = object.userData.direction;
    return DIRECTIONS.includes(direction as Direction) ? direction as Direction : null;
  }

  setHover(direction: Direction | null): void {
    this.hovered = direction;
    for (const [itemDirection, choice] of this.choices) {
      choice.material.emissive.set(COLORS[itemDirection]).multiplyScalar(
        itemDirection === direction ? 0.34 : 0.12,
      );
    }
  }

  flashInvalid(direction: Direction): void {
    this.invalidDirection = direction;
    this.invalidTime = 0.48;
  }

  update(delta: number): void {
    if (!this.visible) return;
    this.elapsed += delta;
    this.revealProgress = Math.min(1, this.revealProgress + delta / 0.38);
    const t = this.revealProgress;
    const eased = t * t * (3 - 2 * t);
    const overshoot = 1 + Math.sin(t * Math.PI) * 0.22;
    this.invalidTime = Math.max(0, this.invalidTime - delta);
    if (this.invalidTime === 0) this.invalidDirection = null;

    for (const [direction, choice] of this.choices) {
      const [targetX, targetY, targetZ] = DIRECTION_OFFSET[direction];
      const isInvalid = direction === this.invalidDirection;
      const shake = isInvalid ? Math.sin(this.invalidTime * 70) * 0.07 : 0;
      choice.root.position.set(
        targetX * eased + shake,
        targetY * eased + Math.sin(this.elapsed * 4.2) * 0.018,
        targetZ * eased,
      );
      const hoverScale = direction === this.hovered ? 1.18 : 1;
      const pulse = 1 + Math.sin(this.elapsed * 5.4 + DIRECTIONS.indexOf(direction)) * 0.035;
      choice.root.scale.setScalar(Math.max(0.01, eased * overshoot * hoverScale * pulse * 0.95));
      choice.material.emissive.set(isInvalid ? 0xff2e25 : COLORS[direction]).multiplyScalar(
        isInvalid ? 0.55 : direction === this.hovered ? 0.34 : 0.12,
      );
    }
  }

  dispose(): void {
    this.hide();
    this.geometry.dispose();
    this.hitGeometry.dispose();
    this.hitMaterial.dispose();
    for (const choice of this.choices.values()) choice.material.dispose();
  }
}
