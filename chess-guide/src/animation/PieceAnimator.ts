import type { Group, Vector3 } from "three";
import type { PieceType } from "../game/GameState";

const easeInOut = (value: number) =>
  value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;

export class PieceAnimator {
  async move(
    piece: Group,
    from: Vector3,
    to: Vector3,
    type: PieceType,
    distance: number,
    reducedMotion: boolean,
  ): Promise<void> {
    if (reducedMotion) {
      piece.position.copy(to);
      return;
    }
    const duration = type === "knight" ? 760 : Math.min(950, 300 + distance * 125);
    const startTime = performance.now();
    const baseScale = piece.scale.clone();
    await new Promise<void>((resolve) => {
      const frame = (now: number) => {
        const raw = Math.min(1, (now - startTime) / duration);
        const t = easeInOut(raw);
        piece.position.lerpVectors(from, to, t);
        if (type === "knight") {
          piece.position.y = from.y + Math.sin(Math.PI * t) * 1.25;
          const crouch = raw < 0.14 ? 1 - raw * 0.8 : 1;
          piece.scale.set(baseScale.x * (2 - crouch), baseScale.y * crouch, baseScale.z * (2 - crouch));
          piece.rotation.z = Math.sin(Math.PI * t) * -0.12;
        } else if (type === "bishop") {
          piece.rotation.y = Math.sin(Math.PI * t) * 0.2;
        }
        if (raw < 1) requestAnimationFrame(frame);
        else {
          piece.position.copy(to);
          piece.scale.copy(baseScale);
          piece.rotation.set(0, 0, 0);
          resolve();
        }
      };
      requestAnimationFrame(frame);
    });
  }

  async celebrate(piece: Group, reducedMotion: boolean): Promise<void> {
    if (reducedMotion) return;
    const start = performance.now();
    await new Promise<void>((resolve) => {
      const frame = (now: number) => {
        const t = Math.min(1, (now - start) / 650);
        piece.position.y += Math.sin(t * Math.PI * 4) * 0.006;
        piece.rotation.y = Math.sin(t * Math.PI) * Math.PI * 0.8;
        if (t < 1) requestAnimationFrame(frame);
        else {
          piece.rotation.y = 0;
          resolve();
        }
      };
      requestAnimationFrame(frame);
    });
  }
}
