export class AnimationController {
  private readonly reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  run(durationMs: number, update: (progress: number) => void): Promise<void> {
    if (this.reducedMotion) {
      update(1);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const start = performance.now();
      const frame = (now: number): void => {
        const progress = Math.min(1, (now - start) / durationMs);
        update(progress);
        if (progress < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
  }
}

export function easeInOut(progress: number): number {
  return progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
}
