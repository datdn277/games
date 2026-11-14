import * as THREE from "three";
import { Rabbit } from "../entities/Rabbit";
import type { Direction } from "../maze/MazeCell";
import { AnimationController, easeInOut } from "./AnimationController";

export class RabbitAnimator {
  constructor(private readonly animation = new AnimationController()) {}

  async move(rabbit: Rabbit, target: THREE.Vector3, direction: Direction): Promise<void> {
    rabbit.face(direction);
    rabbit.setMoving(true);
    const start = rabbit.position.clone();
    await this.animation.run(380, (progress) => {
      const eased = easeInOut(progress);
      rabbit.position.lerpVectors(start, target, eased);
      rabbit.position.y = start.y + Math.sin(progress * Math.PI) * 0.28;
      rabbit.rotation.z = Math.sin(progress * Math.PI * 2) * 0.035;
    });
    rabbit.position.copy(target);
    rabbit.setGroundY(target.y);
    rabbit.setMoving(false);
  }

  async blocked(rabbit: Rabbit, direction: Direction, wall: THREE.Object3D | null): Promise<void> {
    rabbit.face(direction);
    rabbit.setMoving(true);
    const startRotation = rabbit.rotation.z;
    const wallStart = wall?.position.clone();
    await this.animation.run(330, (progress) => {
      rabbit.rotation.z = startRotation + Math.sin(progress * Math.PI * 4) * 0.1 * (1 - progress);
      if (wall && wallStart) wall.position.x = wallStart.x + Math.sin(progress * Math.PI * 6) * 0.035 * (1 - progress);
    });
    rabbit.rotation.z = startRotation;
    if (wall && wallStart) wall.position.copy(wallStart);
    rabbit.setMoving(false);
  }

  async celebrate(rabbit: Rabbit): Promise<void> {
    rabbit.setMoving(true);
    const baseY = rabbit.position.y;
    await this.animation.run(900, (progress) => {
      rabbit.position.y = baseY + Math.abs(Math.sin(progress * Math.PI * 3)) * 0.34;
      rabbit.rotation.y += 0.06;
    });
    rabbit.position.y = baseY;
    rabbit.setGroundY(baseY);
    rabbit.setMoving(false);
  }
}
