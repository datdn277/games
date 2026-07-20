import * as THREE from 'three';
import { GARDEN_LEVEL } from '../../game/level';
import type { GridCell } from '../../game/types';
import { CELL_SIZE, gridToWorld, TILE_HEIGHT, TILE_TOP_Y } from '../coordinates';

export class Board3D {
  readonly group = new THREE.Group();
  readonly cellMeshes: THREE.Mesh[] = [];

  private readonly tileGeometry = new THREE.BoxGeometry(CELL_SIZE * 0.93, TILE_HEIGHT, CELL_SIZE * 0.93);
  private readonly tileMaterials = [
    new THREE.MeshStandardMaterial({ color: 0xf8edc9, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0xaed889, roughness: 0.88 }),
  ];
  private readonly overlayGeometry = new THREE.PlaneGeometry(CELL_SIZE * 0.86, CELL_SIZE * 0.86);
  private readonly hoverMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd45c,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  });
  private readonly selectionMaterial = new THREE.MeshBasicMaterial({
    color: 0xff9f43,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  private readonly errorMaterial = new THREE.MeshBasicMaterial({
    color: 0xff6b5d,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  private readonly hoverOverlay = this.createOverlay(this.hoverMaterial, TILE_TOP_Y + 0.012);
  private readonly selectionOverlay = this.createOverlay(this.selectionMaterial, TILE_TOP_Y + 0.018);
  private readonly errorOverlay = this.createOverlay(this.errorMaterial, TILE_TOP_Y + 0.022);
  private readonly ringGeometry = new THREE.TorusGeometry(CELL_SIZE * 0.32, 0.045, 8, 36);
  private readonly startMaterial = new THREE.MeshBasicMaterial({ color: 0x39b86b });
  private readonly goalMaterial = new THREE.MeshBasicMaterial({ color: 0xff922e });
  private readonly startRing: THREE.Mesh;
  private readonly goalRing: THREE.Mesh;
  private flashTime = 0;
  private elapsed = 0;

  constructor() {
    this.group.name = 'Board3D';
    this.buildCells();
    this.group.add(this.hoverOverlay, this.selectionOverlay, this.errorOverlay);
    this.startRing = this.createCellRing(GARDEN_LEVEL.start, this.startMaterial);
    this.goalRing = this.createCellRing(GARDEN_LEVEL.goal, this.goalMaterial);
    this.group.add(this.startRing, this.goalRing);
  }

  private buildCells(): void {
    for (let row = 0; row < GARDEN_LEVEL.rows; row += 1) {
      for (let col = 0; col < GARDEN_LEVEL.columns; col += 1) {
        const mesh = new THREE.Mesh(this.tileGeometry, this.tileMaterials[(row + col) % 2]);
        const world = gridToWorld({ row, col });
        mesh.position.set(world.x, 0, world.z);
        mesh.receiveShadow = true;
        mesh.userData = { type: 'board-cell', row, col };
        mesh.name = `BoardCell-${row + 1}-${col + 1}`;
        this.cellMeshes.push(mesh);
        this.group.add(mesh);
      }
    }
  }

  private createOverlay(material: THREE.Material, y: number): THREE.Mesh {
    const overlay = new THREE.Mesh(this.overlayGeometry, material);
    overlay.rotation.x = -Math.PI / 2;
    overlay.position.y = y;
    overlay.visible = false;
    overlay.renderOrder = 2;
    return overlay;
  }

  private createCellRing(cell: GridCell, material: THREE.Material): THREE.Mesh {
    const ring = new THREE.Mesh(this.ringGeometry, material);
    ring.rotation.x = Math.PI / 2;
    ring.renderOrder = 3;
    this.positionMarker(ring, cell);
    return ring;
  }

  private positionMarker(ring: THREE.Mesh, cell: GridCell): void {
    const world = gridToWorld(cell);
    ring.position.set(world.x, TILE_TOP_Y + 0.035, world.z);
  }

  setMarkers(start: GridCell, goal: GridCell): void {
    this.positionMarker(this.startRing, start);
    this.positionMarker(this.goalRing, goal);
    this.clearFeedback();
  }

  setHover(cell: GridCell | null): void {
    this.positionOverlay(this.hoverOverlay, cell);
  }

  flashSelection(cell: GridCell): void {
    this.positionOverlay(this.selectionOverlay, cell);
    this.flashTime = 0.36;
    this.selectionOverlay.scale.setScalar(0.72);
  }

  setError(cell: GridCell | null): void {
    this.positionOverlay(this.errorOverlay, cell);
  }

  clearFeedback(): void {
    this.errorOverlay.visible = false;
  }

  private positionOverlay(overlay: THREE.Mesh, cell: GridCell | null): void {
    if (!cell) {
      overlay.visible = false;
      return;
    }
    const world = gridToWorld(cell);
    overlay.position.x = world.x;
    overlay.position.z = world.z;
    overlay.visible = true;
  }

  update(delta: number): void {
    this.elapsed += delta;
    if (this.flashTime > 0) {
      this.flashTime = Math.max(0, this.flashTime - delta);
      const progress = 1 - this.flashTime / 0.36;
      const scale = 0.72 + Math.sin(progress * Math.PI) * 0.18 + progress * 0.28;
      this.selectionOverlay.scale.setScalar(scale);
      if (this.flashTime === 0) this.selectionOverlay.visible = false;
    }
    if (this.errorOverlay.visible) {
      this.errorMaterial.opacity = 0.34 + Math.sin(this.elapsed * 7) * 0.16;
    }
  }

  getCellFromMesh(object: THREE.Object3D): GridCell | null {
    if (object.userData.type !== 'board-cell') return null;
    const row = object.userData.row as number;
    const col = object.userData.col as number;
    return Number.isInteger(row) && Number.isInteger(col) ? { row, col } : null;
  }

  dispose(): void {
    this.tileGeometry.dispose();
    this.overlayGeometry.dispose();
    this.ringGeometry.dispose();
    for (const material of this.tileMaterials) material.dispose();
    this.hoverMaterial.dispose();
    this.selectionMaterial.dispose();
    this.errorMaterial.dispose();
    this.startMaterial.dispose();
    this.goalMaterial.dispose();
  }
}
