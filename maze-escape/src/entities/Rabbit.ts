import * as THREE from "three";
import type { Direction } from "../maze/MazeCell";

const FACING_ROTATION: Record<Direction, number> = {
  up: Math.PI,
  down: 0,
  left: -Math.PI / 2,
  right: Math.PI / 2,
};

export class Rabbit extends THREE.Group {
  private readonly body: THREE.Mesh;
  private readonly head: THREE.Mesh;
  private baseY = 0;
  private moving = false;

  constructor() {
    super();
    this.name = "rabbit";
    const fur = new THREE.MeshStandardMaterial({ color: 0xfffbf2, roughness: 0.78 });
    const innerEar = new THREE.MeshStandardMaterial({ color: 0xffaab8, roughness: 0.82 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x293229, roughness: 0.55 });
    const nose = new THREE.MeshStandardMaterial({ color: 0xf4848f, roughness: 0.55 });

    this.body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 16), fur);
    this.body.scale.set(0.9, 1.12, 0.82);
    this.body.position.y = 0.48;
    this.body.castShadow = true;
    this.add(this.body);

    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 20, 16), fur);
    this.head.position.set(0, 0.83, 0.04);
    this.head.castShadow = true;
    this.add(this.head);

    for (const x of [-0.11, 0.11]) {
      const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.28, 5, 10), fur);
      ear.position.set(x, 1.19, 0.01);
      ear.rotation.z = x < 0 ? -0.09 : 0.09;
      ear.castShadow = true;
      this.add(ear);
      const pink = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.19, 4, 8), innerEar);
      pink.position.set(x, 1.2, 0.066);
      pink.rotation.z = ear.rotation.z;
      this.add(pink);
    }

    for (const x of [-0.09, 0.09]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), dark);
      eye.position.set(x, 0.89, 0.225);
      this.add(eye);
    }
    const noseMesh = new THREE.Mesh(new THREE.SphereGeometry(0.034, 10, 8), nose);
    noseMesh.position.set(0, 0.81, 0.265);
    this.add(noseMesh);

    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), fur);
    tail.position.set(0, 0.5, -0.25);
    this.add(tail);
    for (const x of [-0.16, 0.16]) {
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), fur);
      foot.scale.set(1.15, 0.55, 1.5);
      foot.position.set(x, 0.17, 0.16);
      this.add(foot);
    }
  }

  face(direction: Direction): void {
    this.rotation.y = FACING_ROTATION[direction];
  }

  setMoving(moving: boolean): void {
    this.moving = moving;
    if (!moving) {
      this.position.y = this.baseY;
      this.rotation.z = 0;
    }
  }

  setGroundY(y: number): void {
    this.baseY = y;
    this.position.y = y;
  }

  updateIdle(elapsed: number): void {
    if (this.moving) return;
    this.position.y = this.baseY + Math.sin(elapsed * 2.7) * 0.018;
    this.head.rotation.x = Math.sin(elapsed * 1.8) * 0.018;
  }
}
