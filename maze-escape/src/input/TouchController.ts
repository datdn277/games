import type { Direction } from "../maze/MazeCell";

export class TouchController {
  private readonly onPointerDown = (event: PointerEvent): void => {
    const button = (event.target as Element | null)?.closest<HTMLButtonElement>("[data-direction]");
    if (!button || button.disabled) return;
    event.preventDefault();
    button.dataset.pressed = "true";
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    const button = (event.target as Element | null)?.closest<HTMLButtonElement>("[data-direction]");
    if (!button || button.disabled) return;
    event.preventDefault();
    delete button.dataset.pressed;
    const direction = button.dataset.direction as Direction | undefined;
    if (direction) this.onDirection(direction);
  };

  private readonly onPointerCancel = (): void => {
    this.root.querySelectorAll<HTMLElement>("[data-pressed]").forEach((button) => delete button.dataset.pressed);
  };

  constructor(
    private readonly root: HTMLElement,
    private readonly onDirection: (direction: Direction) => void,
  ) {
    root.addEventListener("pointerdown", this.onPointerDown);
    root.addEventListener("pointerup", this.onPointerUp);
    root.addEventListener("pointercancel", this.onPointerCancel);
    root.addEventListener("pointerleave", this.onPointerCancel);
  }

  dispose(): void {
    this.root.removeEventListener("pointerdown", this.onPointerDown);
    this.root.removeEventListener("pointerup", this.onPointerUp);
    this.root.removeEventListener("pointercancel", this.onPointerCancel);
    this.root.removeEventListener("pointerleave", this.onPointerCancel);
  }
}
