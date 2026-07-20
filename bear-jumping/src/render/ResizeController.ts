import * as THREE from 'three';
import { CameraController } from './CameraController';

export class ResizeController {
  private readonly observer: ResizeObserver;

  constructor(
    private readonly container: HTMLElement,
    private readonly renderer: THREE.WebGLRenderer,
    private readonly cameraController: CameraController,
  ) {
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
    this.resize();
  }

  resize(): void {
    const width = Math.max(1, Math.floor(this.container.clientWidth));
    const height = Math.max(1, Math.floor(this.container.clientHeight));
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
    this.cameraController.resize(width, height);
  }

  dispose(): void {
    this.observer.disconnect();
  }
}
