import type { Direction } from "../maze/MazeCell";
import { KeyboardController } from "./KeyboardController";
import { TouchController } from "./TouchController";

export class InputController {
  private readonly keyboard: KeyboardController;
  private readonly touch: TouchController;

  constructor(root: HTMLElement, onDirection: (direction: Direction) => void) {
    this.keyboard = new KeyboardController(onDirection);
    this.touch = new TouchController(root, onDirection);
  }

  dispose(): void {
    this.keyboard.dispose();
    this.touch.dispose();
  }
}
