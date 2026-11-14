import * as THREE from "three";
import type { MazeView } from "../maze/MazeView";

export class GameLoop {
  private readonly clock = new THREE.Clock();

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.Camera,
    private readonly mazeView: MazeView,
  ) {}

  start(): void {
    this.clock.start();
    this.renderer.setAnimationLoop(() => {
      const elapsed = this.clock.getElapsedTime();
      this.mazeView.update(elapsed);
      this.renderer.render(this.scene, this.camera);
    });
  }

  stop(): void {
    this.renderer.setAnimationLoop(null);
    this.clock.stop();
  }
}
