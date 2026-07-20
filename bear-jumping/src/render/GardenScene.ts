import * as THREE from 'three';
import { GARDEN_LEVEL } from '../game/level';
import type { Direction, GridCell, LevelDefinition } from '../game/types';
import { AnimationController } from './AnimationController';
import { CELL_SIZE, TILE_HEIGHT } from './coordinates';
import { Arrow3D } from './objects/Arrow3D';
import { Bear3D } from './objects/Bear3D';
import { Board3D } from './objects/Board3D';
import { DirectionPicker3D } from './objects/DirectionPicker3D';
import { Pond3D } from './objects/Pond3D';
import { RabbitHouse3D } from './objects/RabbitHouse3D';

export class GardenScene {
  readonly group = new THREE.Group();
  readonly board = new Board3D();
  readonly arrows = new Arrow3D();
  readonly bear = new Bear3D();
  readonly directionPicker = new DirectionPicker3D();
  readonly ponds = new Pond3D(GARDEN_LEVEL.obstacles);
  readonly rabbitHouse = new RabbitHouse3D(GARDEN_LEVEL.goal);

  private readonly ownedGeometries = new Set<THREE.BufferGeometry>();
  private readonly ownedMaterials = new Set<THREE.Material>();

  constructor() {
    this.group.name = 'GardenScene';
    this.addGardenBase();
    this.addDecorations();
    this.group.add(
      this.board.group,
      this.arrows.group,
      this.ponds.group,
      this.rabbitHouse.group,
      this.bear.root,
      this.directionPicker.group,
    );
  }

  private addGardenBase(): void {
    const geometry = this.ownGeometry(
      new THREE.CylinderGeometry(CELL_SIZE * 5.2, CELL_SIZE * 5.35, 0.3, 48),
    );
    const material = this.ownMaterial(
      new THREE.MeshStandardMaterial({ color: 0x72b76d, roughness: 0.98 }),
    );
    const base = new THREE.Mesh(geometry, material);
    base.position.y = -TILE_HEIGHT / 2 - 0.13;
    base.receiveShadow = true;
    this.group.add(base);
  }

  private addDecorations(): void {
    const bushGeometry = this.ownGeometry(new THREE.DodecahedronGeometry(0.34, 1));
    const bushMaterial = this.ownMaterial(
      new THREE.MeshStandardMaterial({ color: 0x3f9254, roughness: 0.96 }),
    );
    const flowerGeometry = this.ownGeometry(new THREE.SphereGeometry(0.075, 8, 6));
    const flowerMaterials = [0xffdf5d, 0xff8177, 0xf8f1e3].map((color) =>
      this.ownMaterial(new THREE.MeshStandardMaterial({ color, roughness: 0.9 })),
    );
    const decorations = [
      [-4.75, -3.85],
      [-4.65, 3.95],
      [4.75, -3.7],
      [4.6, 3.65],
      [-3.55, 4.55],
      [3.3, -4.65],
    ] as const;
    decorations.forEach(([x, z], index) => {
      const bush = new THREE.Mesh(bushGeometry, bushMaterial);
      bush.position.set(x, 0.2, z);
      bush.scale.set(1.25, 0.8, 1.05);
      bush.castShadow = true;
      this.group.add(bush);
      for (let flowerIndex = 0; flowerIndex < 3; flowerIndex += 1) {
        const flower = new THREE.Mesh(
          flowerGeometry,
          flowerMaterials[(index + flowerIndex) % flowerMaterials.length],
        );
        flower.position.set(
          x + (flowerIndex - 1) * 0.2,
          0.48 + (flowerIndex % 2) * 0.05,
          z - 0.05 + flowerIndex * 0.08,
        );
        this.group.add(flower);
      }
    });
  }

  private ownGeometry<T extends THREE.BufferGeometry>(geometry: T): T {
    this.ownedGeometries.add(geometry);
    return geometry;
  }

  private ownMaterial<T extends THREE.Material>(material: T): T {
    this.ownedMaterials.add(material);
    return material;
  }

  setCommand(cell: GridCell, direction: Direction): void {
    this.arrows.setCommand(cell, direction);
    this.board.flashSelection(cell);
    this.clearFeedback();
  }

  setLevel(level: LevelDefinition): void {
    this.directionPicker.hide();
    this.clearCommands();
    this.board.setMarkers(level.start, level.goal);
    this.ponds.setCells(level.obstacles);
    this.rabbitHouse.setCell(level.goal);
    this.bear.setCell(level.start);
  }

  removeCommand(cell: GridCell): void {
    this.arrows.removeCommand(cell);
    this.board.flashSelection(cell);
    this.clearFeedback();
  }

  clearCommands(): void {
    this.arrows.clear();
    this.clearFeedback();
  }

  setActiveCommand(cell: GridCell | null): void {
    this.arrows.setActive(cell);
  }

  setProblem(cell: GridCell | null): void {
    this.arrows.setProblem(cell);
    this.board.setError(cell);
  }

  clearFeedback(): void {
    this.arrows.setActive(null);
    this.arrows.setProblem(null);
    this.board.clearFeedback();
  }

  update(delta: number, animationController: AnimationController): void {
    this.board.update(delta);
    this.arrows.update(delta);
    this.ponds.update(delta);
    this.directionPicker.update(delta);
    if (!animationController.isAnimating) this.bear.update(delta);
  }

  dispose(): void {
    this.board.dispose();
    this.arrows.dispose();
    this.bear.dispose();
    this.ponds.dispose();
    this.rabbitHouse.dispose();
    this.directionPicker.dispose();
    this.ownedGeometries.forEach((geometry) => geometry.dispose());
    this.ownedMaterials.forEach((material) => material.dispose());
  }
}
