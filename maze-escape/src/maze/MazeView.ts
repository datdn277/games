import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { Rabbit } from "../entities/Rabbit";
import { Carrot } from "../entities/Carrot";
import { Burrow } from "../entities/Burrow";
import { Obstacle } from "../entities/Obstacle";
import { positionKey, type Direction, type MazeLevel, type Position } from "./MazeCell";

export function gridToWorld(position: Position, level: MazeLevel): THREE.Vector3 {
  return new THREE.Vector3(
    position.col - (level.cols - 1) / 2,
    0.1,
    position.row - (level.rows - 1) / 2,
  );
}

function disposeObject(root: THREE.Object3D): void {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => material.dispose());
  });
}

const ARROW_ROTATION: Record<Direction, number> = {
  up: 0,
  right: -Math.PI / 2,
  down: Math.PI,
  left: Math.PI / 2,
};

export class MazeView {
  readonly root = new THREE.Group();
  readonly rabbit = new Rabbit();
  private readonly carrots = new Map<string, Carrot>();
  private readonly walls = new Map<string, Obstacle>();
  private readonly tileMaterials = new Map<string, THREE.MeshStandardMaterial>();
  private readonly hints = new THREE.Group();
  private burrow: Burrow | null = null;
  private level: MazeLevel | null = null;

  constructor(private readonly scene: THREE.Scene) {
    this.root.name = "maze-view";
    this.hints.name = "maze-hints";
    this.scene.add(this.root);
  }

  load(level: MazeLevel): void {
    this.clear();
    this.level = level;
    const boardBase = new THREE.Mesh(
      new RoundedBoxGeometry(level.cols + 0.42, 0.24, level.rows + 0.42, 5, 0.16),
      new THREE.MeshStandardMaterial({ color: 0x856143, roughness: 0.92 }),
    );
    boardBase.position.y = -0.055;
    boardBase.receiveShadow = true;
    boardBase.castShadow = true;
    boardBase.name = "garden-board-base";
    this.root.add(boardBase);

    const tileGeometry = new RoundedBoxGeometry(0.92, 0.14, 0.92, 3, 0.065);
    for (let row = 0; row < level.rows; row += 1) {
      for (let col = 0; col < level.cols; col += 1) {
        const position = { row, col };
        const cell = level.cells[row]?.[col] ?? "wall";
        const key = positionKey(position);
        const material = new THREE.MeshStandardMaterial({
          color:
            cell === "wall"
              ? 0xb8d49a
              : cell === "start"
                ? 0xd5efb9
                : cell === "exit"
                  ? 0xf4d49c
                  : (row + col) % 2 === 0
                    ? 0xf7edcf
                    : 0xf2e3bd,
          roughness: 0.88,
          emissive: 0xffc94c,
          emissiveIntensity: 0,
        });
        const tile = new THREE.Mesh(tileGeometry.clone(), material);
        tile.position.copy(gridToWorld(position, level));
        tile.receiveShadow = true;
        tile.castShadow = true;
        tile.name = `tile-${key}`;
        this.root.add(tile);
        this.tileMaterials.set(key, material);

        if (cell === "wall") {
          const obstacle = new Obstacle(row * level.cols + col);
          obstacle.position.copy(gridToWorld(position, level));
          this.root.add(obstacle);
          this.walls.set(key, obstacle);
        }
      }
    }
    tileGeometry.dispose();

    for (const item of level.collectibles) {
      const carrot = new Carrot(item.id);
      const world = gridToWorld(item.position, level);
      carrot.position.x = world.x;
      carrot.position.z = world.z;
      this.root.add(carrot);
      this.carrots.set(item.id, carrot);
    }

    this.burrow = new Burrow();
    const exitWorld = gridToWorld(level.exit, level);
    this.burrow.position.set(exitWorld.x, 0.08, exitWorld.z - 0.03);
    this.root.add(this.burrow);
    const rabbitWorld = gridToWorld(level.start, level);
    this.rabbit.position.copy(rabbitWorld);
    this.rabbit.setGroundY(rabbitWorld.y);
    this.rabbit.face("down");
    this.root.add(this.rabbit);
    this.root.add(this.hints);
  }

  getWorldPosition(position: Position): THREE.Vector3 {
    if (!this.level) return new THREE.Vector3();
    return gridToWorld(position, this.level);
  }

  getCarrot(itemId: string): Carrot | null {
    return this.carrots.get(itemId) ?? null;
  }

  getWall(position: Position): Obstacle | null {
    return this.walls.get(positionKey(position)) ?? null;
  }

  syncCollectibles(collectedIds: readonly string[]): void {
    const collected = new Set(collectedIds);
    this.carrots.forEach((carrot, id) => carrot.setCollected(collected.has(id)));
    this.burrow?.setOpen(collected.size === this.carrots.size);
  }

  showHints(positions: readonly Position[], direction: Direction | null): void {
    this.clearHints();
    const footprintMaterial = new THREE.MeshBasicMaterial({
      color: 0xff9d36,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    positions.forEach((position, index) => {
      const tileMaterial = this.tileMaterials.get(positionKey(position));
      if (tileMaterial) tileMaterial.emissiveIntensity = 0.24;
      const marker = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.15, 16), footprintMaterial.clone());
      marker.rotation.x = -Math.PI / 2;
      marker.scale.set(1, 1.35, 1);
      const world = this.getWorldPosition(position);
      marker.position.set(world.x, 0.18, world.z);
      marker.name = `footprint-${index}`;
      this.hints.add(marker);
    });
    if (direction) {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0.26);
      shape.lineTo(-0.18, -0.14);
      shape.lineTo(0.18, -0.14);
      shape.closePath();
      const arrow = new THREE.Mesh(new THREE.ShapeGeometry(shape), footprintMaterial.clone());
      arrow.rotation.x = -Math.PI / 2;
      arrow.rotation.z = ARROW_ROTATION[direction];
      const rabbitPosition = this.rabbit.position;
      arrow.position.set(rabbitPosition.x, 0.2, rabbitPosition.z);
      arrow.name = "recommended-arrow";
      this.hints.add(arrow);
    }
  }

  clearHints(): void {
    this.tileMaterials.forEach((material) => {
      material.emissiveIntensity = 0;
    });
    this.hints.children.forEach((child) => disposeObject(child));
    this.hints.clear();
  }

  update(elapsed: number): void {
    this.rabbit.updateIdle(elapsed);
    let index = 0;
    this.carrots.forEach((carrot) => {
      carrot.update(elapsed, index * 0.9);
      index += 1;
    });
    this.burrow?.update(elapsed);
  }

  clear(): void {
    this.clearHints();
    this.root.children.forEach((child) => {
      if (child !== this.rabbit && child !== this.hints) disposeObject(child);
    });
    this.root.clear();
    this.carrots.clear();
    this.walls.clear();
    this.tileMaterials.clear();
    this.hints.clear();
    this.burrow = null;
  }

  dispose(): void {
    this.clear();
    disposeObject(this.rabbit);
    disposeObject(this.hints);
    this.scene.remove(this.root);
  }
}
