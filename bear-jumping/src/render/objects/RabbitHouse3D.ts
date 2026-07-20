import * as THREE from 'three';
import type { GridCell } from '../../game/types';
import { gridToWorld, TILE_TOP_Y } from '../coordinates';

export class RabbitHouse3D {
  readonly group = new THREE.Group();
  private readonly geometries = new Set<THREE.BufferGeometry>();
  private readonly materials = new Set<THREE.Material>();

  constructor(cell: GridCell) {
    this.group.name = 'RabbitHouse3D';
    this.group.scale.setScalar(0.74);

    const wall = this.material(new THREE.MeshStandardMaterial({ color: 0xffd77b, roughness: 0.88 }));
    const roof = this.material(new THREE.MeshStandardMaterial({ color: 0xe56e50, roughness: 0.8 }));
    const wood = this.material(new THREE.MeshStandardMaterial({ color: 0x8b5138, roughness: 0.94 }));
    const white = this.material(new THREE.MeshStandardMaterial({ color: 0xfff8ed, roughness: 0.92 }));
    const pink = this.material(new THREE.MeshStandardMaterial({ color: 0xf2a5ad, roughness: 0.9 }));
    const dark = this.material(new THREE.MeshStandardMaterial({ color: 0x372b2d, roughness: 0.85 }));

    const house = this.mesh(new THREE.BoxGeometry(0.88, 0.72, 0.75), wall);
    house.position.y = 0.38;
    this.group.add(house);

    const roofMesh = this.mesh(new THREE.ConeGeometry(0.72, 0.54, 4), roof);
    roofMesh.position.y = 0.94;
    roofMesh.rotation.y = Math.PI / 4;
    roofMesh.scale.z = 0.86;
    this.group.add(roofMesh);

    const door = this.mesh(new THREE.BoxGeometry(0.3, 0.48, 0.045), wood);
    door.position.set(0.12, 0.26, -0.4);
    this.group.add(door);
    const windowMesh = this.mesh(new THREE.BoxGeometry(0.2, 0.2, 0.05), white);
    windowMesh.position.set(-0.24, 0.48, -0.405);
    this.group.add(windowMesh);

    const rabbit = new THREE.Group();
    rabbit.position.set(-0.48, 0.31, -0.3);
    const head = this.mesh(new THREE.SphereGeometry(0.19, 12, 10), white);
    rabbit.add(head);
    const earGeometry = this.geometry(new THREE.CapsuleGeometry(0.065, 0.23, 4, 8));
    for (const x of [-0.1, 0.1]) {
      const ear = this.mesh(earGeometry, white);
      ear.position.set(x, 0.27, 0);
      ear.rotation.z = x * 1.8;
      rabbit.add(ear);
      const inner = this.mesh(new THREE.CapsuleGeometry(0.026, 0.15, 3, 6), pink);
      inner.position.set(x, 0.27, -0.06);
      inner.rotation.z = x * 1.8;
      rabbit.add(inner);
    }
    const eyeGeometry = this.geometry(new THREE.SphereGeometry(0.025, 7, 6));
    for (const x of [-0.07, 0.07]) {
      const eye = this.mesh(eyeGeometry, dark);
      eye.position.set(x, 0.035, -0.17);
      rabbit.add(eye);
    }
    this.group.add(rabbit);
    this.setCell(cell);
  }

  setCell(cell: GridCell): void {
    const center = gridToWorld(cell);
    this.group.position.set(center.x + 0.07, TILE_TOP_Y, center.z + 0.07);
  }

  private material<T extends THREE.Material>(material: T): T {
    this.materials.add(material);
    return material;
  }

  private geometry<T extends THREE.BufferGeometry>(geometry: T): T {
    this.geometries.add(geometry);
    return geometry;
  }

  private mesh(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
    this.geometries.add(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  dispose(): void {
    this.geometries.forEach((geometry) => geometry.dispose());
    this.materials.forEach((material) => material.dispose());
  }
}
