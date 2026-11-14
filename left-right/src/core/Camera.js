import { OrthographicCamera } from 'three';

export class Camera extends OrthographicCamera {
  frame(width, height, mode, zoom, count) {
    const aspect = width / height;
    const menu = mode === 'menu';
    const minimumWidth = menu ? 8.5 : count <= 3 ? 7.7 : count === 4 ? 9.7 : 10.35;
    const vertical = Math.max(menu ? 5.05 : 4.9, minimumWidth / aspect);
    this.left = -vertical * aspect / 2;
    this.right = -this.left;
    this.top = vertical / 2;
    this.bottom = -this.top;
    this.zoom = zoom;
    this.near = .1;
    this.far = 80;
    const targetY = menu ? 1.36 : 1.24;
    this.position.set(0, targetY + 8.2, 27.72);
    this.lookAt(0, targetY, -.72);
    this.updateProjectionMatrix();
    this.updateMatrixWorld();
  }
}
