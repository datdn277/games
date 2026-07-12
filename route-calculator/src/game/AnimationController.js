export class AnimationController {
  constructor(speed = 1) {
    this.speed = speed;
    this.reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }

  setSpeed(speed) {
    this.speed = Math.max(0.5, Math.min(2, Number(speed) || 1));
  }

  duration(milliseconds, essential = false) {
    const reducedFactor = this.reducedMotion ? (essential ? 0.35 : 0.08) : 1;
    return (milliseconds * reducedFactor) / this.speed;
  }

  sleep(milliseconds, essential = false) {
    return new Promise((resolve) => window.setTimeout(resolve, this.duration(milliseconds, essential)));
  }

  tween(milliseconds, update, options = {}) {
    const { easing = easeOutCubic, essential = false } = options;
    const duration = Math.max(1, this.duration(milliseconds, essential));
    return new Promise((resolve) => {
      const startedAt = performance.now();
      const frame = (now) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        update(easing(progress), progress);
        if (progress < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
  }
}

export const easeOutCubic = (value) => 1 - (1 - value) ** 3;
export const easeInOutCubic = (value) =>
  value < 0.5 ? 4 * value ** 3 : 1 - ((-2 * value + 2) ** 3) / 2;
