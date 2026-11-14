import { Carrot } from "../entities/Carrot";
import { AnimationController, easeInOut } from "./AnimationController";

export class ItemAnimator {
  constructor(private readonly animation = new AnimationController()) {}

  async collect(carrot: Carrot): Promise<void> {
    const startY = carrot.position.y;
    await this.animation.run(420, (progress) => {
      const eased = easeInOut(progress);
      carrot.position.y = startY + Math.sin(progress * Math.PI) * 0.65 + eased * 0.3;
      carrot.rotation.y += 0.16;
      carrot.scale.setScalar(1 - eased * 0.72);
    });
    carrot.setCollected(true);
  }
}
