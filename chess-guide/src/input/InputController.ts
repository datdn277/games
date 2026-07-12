import { Camera, Raycaster, Vector2, WebGLRenderer } from "three";
import type { ChessBoard } from "../chess/ChessBoard";
import type { Position } from "../game/GameState";
import { TouchController } from "./TouchController";

export class InputController {
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly touch = new TouchController();
  private enabled = true;

  constructor(
    private readonly renderer: WebGLRenderer,
    private readonly camera: Camera,
    private readonly board: ChessBoard,
    private readonly onSelect: (position: Position) => void,
  ) {
    const canvas = renderer.domElement;
    canvas.addEventListener("pointerdown", (event) => this.touch.begin(event));
    canvas.addEventListener("pointerup", (event) => {
      if (!this.enabled || !this.touch.isTap(event)) return;
      this.pick(event.clientX, event.clientY);
    });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  private pick(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.board.getInteractiveMeshes(), false)[0];
    const position = hit?.object.userData.boardPosition as Position | undefined;
    if (position) this.onSelect(position);
  }
}
