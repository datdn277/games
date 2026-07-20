import * as THREE from 'three';
import type { GridCell } from '../../game/types';
import { gridToWorld, TILE_TOP_Y } from '../coordinates';

export class Pond3D {
  readonly group = new THREE.Group();
  private readonly waterGeometry = new THREE.CircleGeometry(0.48, 28);
  private readonly rippleGeometry = new THREE.RingGeometry(0.22, 0.245, 24);
  private readonly rockGeometry = new THREE.DodecahedronGeometry(0.1, 0);
  private readonly waterMaterial = new THREE.MeshStandardMaterial({
    color: 0x54c6ee,
    roughness: 0.28,
    metalness: 0.06,
    transparent: true,
    opacity: 0.9,
  });
  private readonly rippleMaterial = new THREE.MeshBasicMaterial({
    color: 0xd4f6ff,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  private readonly rockMaterial = new THREE.MeshStandardMaterial({ color: 0xb2b99d, roughness: 1 });
  private readonly ripples: THREE.Mesh[] = [];
  private elapsed = 0;

  constructor(cells: readonly GridCell[]) {
    this.group.name = 'Ponds3D';
    this.setCells(cells);
  }

  setCells(cells: readonly GridCell[]): void {
    this.group.clear();
    this.ripples.length = 0;
    cells.forEach((cell, index) => this.addPond(cell, index));
  }

  private addPond(cell: GridCell, index: number): void {
    const pond = new THREE.Group();
    const center = gridToWorld(cell);
    pond.position.set(center.x, TILE_TOP_Y + 0.025, center.z);

    const water = new THREE.Mesh(this.waterGeometry, this.waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.scale.set(1.15, 0.82, 1);
    water.receiveShadow = true;
    pond.add(water);

    const ripple = new THREE.Mesh(this.rippleGeometry, this.rippleMaterial);
    ripple.rotation.x = -Math.PI / 2;
    ripple.position.y = 0.018;
    ripple.scale.y = 0.72;
    ripple.userData.phase = index * 1.7;
    this.ripples.push(ripple);
    pond.add(ripple);

    for (let rockIndex = 0; rockIndex < 5; rockIndex += 1) {
      const angle = (rockIndex / 5) * Math.PI * 2 + index;
      const rock = new THREE.Mesh(this.rockGeometry, this.rockMaterial);
      rock.position.set(Math.cos(angle) * 0.53, 0.035, Math.sin(angle) * 0.4);
      rock.scale.set(1.2, 0.7, 1);
      rock.castShadow = true;
      pond.add(rock);
    }
    this.group.add(pond);
  }

  update(delta: number): void {
    this.elapsed += delta;
    for (const ripple of this.ripples) {
      const pulse = 1 + Math.sin(this.elapsed * 1.8 + (ripple.userData.phase as number)) * 0.07;
      ripple.scale.set(pulse, pulse * 0.72, 1);
      this.rippleMaterial.opacity = 0.42 + Math.sin(this.elapsed * 1.4) * 0.08;
    }
  }

  dispose(): void {
    this.waterGeometry.dispose();
    this.rippleGeometry.dispose();
    this.rockGeometry.dispose();
    this.waterMaterial.dispose();
    this.rippleMaterial.dispose();
    this.rockMaterial.dispose();
  }
}
