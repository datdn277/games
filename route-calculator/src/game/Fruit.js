import * as THREE from "three";
import { fruitThemes } from "../data/fruitThemes.js";

export class Fruit {
  constructor(theme = fruitThemes.apple) {
    this.theme = theme;
    this.group = this.createMesh();
  }

  createMesh() {
    const group = new THREE.Group();
    group.name = "apple";

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.theme.color,
      roughness: 0.46,
      metalness: 0,
      emissive: 0x000000,
      emissiveIntensity: 0,
    });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 18), bodyMaterial);
    body.scale.set(1, 0.92, 1);
    body.castShadow = true;
    body.receiveShadow = true;

    const cheek = new THREE.Mesh(
      new THREE.SphereGeometry(0.46, 18, 14),
      new THREE.MeshStandardMaterial({ color: this.theme.darkColor, roughness: 0.5 }),
    );
    cheek.position.set(0.25, -0.04, -0.13);
    cheek.scale.set(0.9, 0.88, 0.88);

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.075, 0.42, 10),
      new THREE.MeshStandardMaterial({ color: this.theme.stemColor, roughness: 0.9 }),
    );
    stem.position.y = 0.66;
    stem.rotation.z = -0.16;

    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 12, 8),
      new THREE.MeshStandardMaterial({ color: this.theme.leafColor, roughness: 0.75 }),
    );
    leaf.scale.set(1.35, 0.28, 0.58);
    leaf.position.set(0.24, 0.72, 0);
    leaf.rotation.z = -0.48;

    group.add(body, cheek, stem, leaf);
    group.scale.setScalar(0.84);
    group.userData.bodyMaterial = bodyMaterial;
    return group;
  }

  setHighlight(active) {
    const material = this.group.userData.bodyMaterial;
    if (!material) return;
    material.emissive.setHex(active ? 0xffd65a : 0x000000);
    material.emissiveIntensity = active ? 0.72 : 0;
  }

  dispose() {
    this.group.traverse((object) => {
      object.geometry?.dispose?.();
      if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
      else object.material?.dispose?.();
    });
  }
}
