import type { Direction } from "../maze/MazeCell";

const KEY_DIRECTIONS: Readonly<Record<string, Direction>> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};

export class KeyboardController {
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const direction = KEY_DIRECTIONS[event.key];
    if (!direction || event.repeat) return;
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
    event.preventDefault();
    this.onDirection(direction);
  };

  constructor(private readonly onDirection: (direction: Direction) => void) {
    window.addEventListener("keydown", this.onKeyDown, { passive: false });
  }

  dispose(): void {
    window.removeEventListener("keydown", this.onKeyDown);
  }
}
