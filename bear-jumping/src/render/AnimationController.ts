export type EasingFunction = (value: number) => number;

interface ActiveAnimation {
  elapsed: number;
  duration: number;
  easing: EasingFunction;
  update: (progress: number) => void;
  resolve: (completed: boolean) => void;
}

export const easeInOutSine: EasingFunction = (value) => -(Math.cos(Math.PI * value) - 1) / 2;
export const smoothstep: EasingFunction = (value) => value * value * (3 - 2 * value);

export class AnimationController {
  private readonly active: ActiveAnimation[] = [];

  play(
    durationSeconds: number,
    update: (progress: number) => void,
    easing: EasingFunction = smoothstep,
  ): Promise<boolean> {
    if (durationSeconds <= 0) {
      update(1);
      return Promise.resolve(true);
    }

    return new Promise<boolean>((resolve) => {
      update(0);
      this.active.push({
        elapsed: 0,
        duration: durationSeconds,
        easing,
        update,
        resolve,
      });
    });
  }

  update(delta: number): void {
    for (let index = this.active.length - 1; index >= 0; index -= 1) {
      const animation = this.active[index];
      if (!animation) continue;

      animation.elapsed = Math.min(animation.elapsed + delta, animation.duration);
      const rawProgress = animation.elapsed / animation.duration;
      animation.update(animation.easing(rawProgress));

      if (rawProgress >= 1) {
        this.active.splice(index, 1);
        animation.resolve(true);
      }
    }
  }

  cancelAll(): void {
    for (const animation of this.active) animation.resolve(false);
    this.active.length = 0;
  }

  get isAnimating(): boolean {
    return this.active.length > 0;
  }
}
