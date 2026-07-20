import * as THREE from 'three';
import type { Direction, GridCell } from '../game/types';
import { DIRECTIONS } from '../game/types';
import { Board3D } from './objects/Board3D';

interface InputCallbacks {
  onCellSelected: (cell: GridCell) => void;
  onDirectionDropped: (cell: GridCell, direction: Direction) => void;
  onHover: (cell: GridCell | null) => void;
}

export class InputController {
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private disabled = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: THREE.OrthographicCamera,
    private readonly board: Board3D,
    private readonly callbacks: InputCallbacks,
  ) {
    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerleave', this.handlePointerLeave);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('dragover', this.handleDragOver);
    canvas.addEventListener('drop', this.handleDrop);
  }

  setDisabled(disabled: boolean): void {
    this.disabled = disabled;
    if (disabled) this.callbacks.onHover(null);
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (this.disabled || event.pointerType === 'touch') return;
    this.callbacks.onHover(this.pickCell(event.clientX, event.clientY));
  };

  private readonly handlePointerLeave = (): void => {
    this.callbacks.onHover(null);
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (this.disabled || event.button !== 0) return;
    const cell = this.pickCell(event.clientX, event.clientY);
    if (cell) this.callbacks.onCellSelected(cell);
  };

  private readonly handleDragOver = (event: DragEvent): void => {
    if (this.disabled) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  };

  private readonly handleDrop = (event: DragEvent): void => {
    if (this.disabled) return;
    event.preventDefault();
    const direction = event.dataTransfer?.getData('application/x-bear-direction');
    if (!DIRECTIONS.includes(direction as Direction)) return;
    const cell = this.pickCell(event.clientX, event.clientY);
    if (cell) this.callbacks.onDirectionDropped(cell, direction as Direction);
  };

  private pickCell(clientX: number, clientY: number): GridCell | null {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.board.cellMeshes, false)[0];
    return hit ? this.board.getCellFromMesh(hit.object) : null;
  }

  dispose(): void {
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerleave', this.handlePointerLeave);
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
    this.canvas.removeEventListener('dragover', this.handleDragOver);
    this.canvas.removeEventListener('drop', this.handleDrop);
  }
}
