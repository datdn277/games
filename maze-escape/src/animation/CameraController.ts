import * as THREE from "three";

export class CameraController {
  constructor(private readonly camera: THREE.OrthographicCamera) {
    camera.position.set(0, 8.15, 7.85);
    camera.lookAt(0, 0.18, 0);
  }

  fit(rows: number, cols: number, width: number, height: number): void {
    const aspect = Math.max(0.4, width / Math.max(1, height));
    const boardHeight = rows * 1.08 + 2.25;
    const boardWidth = cols * 1.04 + 1.9;
    const verticalSize = Math.max(boardHeight, boardWidth / aspect);
    this.camera.left = (-verticalSize * aspect) / 2;
    this.camera.right = (verticalSize * aspect) / 2;
    this.camera.top = verticalSize / 2;
    this.camera.bottom = -verticalSize / 2;
    this.camera.near = 0.1;
    this.camera.far = 60;
    this.camera.updateProjectionMatrix();
  }
}
