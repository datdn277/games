import * as THREE from 'three';
import type { Direction, GridCell } from '../game/types';
import { DIRECTIONS } from '../game/types';
import { Board3D } from './objects/Board3D';
import { DirectionPicker3D } from './objects/DirectionPicker3D';

interface InputCallbacks {
  onCellSelected: (cell: GridCell) => void;
  onDirectionDropped: (cell: GridCell, direction: Direction) => void;
  onDirectionChoice: (direction: Direction) => void;
  onHover: (cell: GridCell | null) => void;
  onDirectionHover: (direction: Direction | null) => void;
}

export class InputController {
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private disabled = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: THREE.OrthographicCamera,
    private readonly board: Board3D,
    private readonly directionPicker: DirectionPicker3D,
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
    if (disabled) {
      this.callbacks.onHover(null);
      this.callbacks.onDirectionHover(null);
    }
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (this.disabled || event.pointerType === 'touch') return;
    const direction = this.pickDirection(event.clientX, event.clientY);
    this.callbacks.onDirectionHover(direction);
    this.callbacks.onHover(direction ? null : this.pickCell(event.clientX, event.clientY));
  };

  private readonly handlePointerLeave = (): void => {
    this.callbacks.onHover(null);
    this.callbacks.onDirectionHover(null);
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (this.disabled || event.button !== 0) return;
    const direction = this.pickDirection(event.clientX, event.clientY);
    if (direction) {
      this.callbacks.onDirectionChoice(direction);
      return;
    }
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
    if (!this.setRay(clientX, clientY)) return null;
    const hit = this.raycaster.intersectObjects(this.board.cellMeshes, false)[0];
    return hit ? this.board.getCellFromMesh(hit.object) : null;
  }

  private pickDirection(clientX: number, clientY: number): Direction | null {
    if (!this.directionPicker.group.visible || !this.setRay(clientX, clientY)) return null;
    const hit = this.raycaster.intersectObjects(this.directionPicker.choiceMeshes, false)[0];
    return hit ? this.directionPicker.getDirectionFromObject(hit.object) : null;
  }

  private setRay(clientX: number, clientY: number): boolean {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return true;
  }

  dispose(): void {
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerleave', this.handlePointerLeave);
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
    this.canvas.removeEventListener('dragover', this.handleDragOver);
    this.canvas.removeEventListener('drop', this.handleDrop);
  }
}
