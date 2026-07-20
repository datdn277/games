import * as THREE from 'three';

export class CameraController {
  readonly camera = new THREE.OrthographicCamera(-6, 6, 6, -6, 0.1, 80);
  private readonly baseViewSize = 11.2;

  constructor() {
    this.camera.name = 'IsometricOrthographicCamera';
    this.camera.position.set(10.5, 13.5, 10.5);
    this.camera.lookAt(0, 0, 0);
    this.camera.zoom = 1;
    this.camera.updateProjectionMatrix();
  }

  resize(width: number, height: number): void {
    const aspect = Math.max(0.1, width / Math.max(height, 1));
    let halfHeight = this.baseViewSize / 2;
    let halfWidth = halfHeight * aspect;

    if (aspect < 1) {
      halfWidth = this.baseViewSize / 2;
      halfHeight = halfWidth / aspect;
    }

    this.camera.left = -halfWidth;
    this.camera.right = halfWidth;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();
  }
}
