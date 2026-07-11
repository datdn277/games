export class AnimationController {
  constructor() {
    this.reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }

  animate(duration, update, easing = (value) => 1 - (1 - value) ** 3) {
    const actualDuration = this.reducedMotion ? Math.min(duration, 40) : duration;
    return new Promise((resolve) => {
      const start = performance.now();
      const frame = (now) => {
        const progress = Math.min(1, (now - start) / actualDuration);
        update(easing(progress), progress);
        if (progress < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
  }

  async bounceCars(cars) {
    for (const car of cars) {
      const baseY = car.group.position.y;
      await this.animate(110, (value, raw) => {
        car.group.position.y = baseY + Math.sin(raw * Math.PI) * 0.3;
        car.group.scale.setScalar(1 + Math.sin(raw * Math.PI) * 0.05);
      });
      car.group.position.y = baseY;
      car.group.scale.setScalar(1);
    }
  }

  shake(object) {
    const baseX = object.position.x;
    return this.animate(380, (_, raw) => {
      object.position.x = baseX + Math.sin(raw * Math.PI * 8) * (1 - raw) * 0.16;
    }).then(() => { object.position.x = baseX; });
  }

  runTrain(train, distance = 30) {
    train.moving = true;
    const startX = train.group.position.x;
    const smokeTimer = setInterval(() => train.emitSmoke(), this.reducedMotion ? 500 : 150);
    return this.animate(1450, (value) => {
      train.group.position.x = startX + distance * value;
    }).finally(() => {
      clearInterval(smokeTimer);
      train.moving = false;
    });
  }
}
