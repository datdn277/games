import * as THREE from 'three';
import type { Direction, GridCell } from '../game/types';
import { AnimationController } from './AnimationController';
import { CameraController } from './CameraController';
import { GardenScene } from './GardenScene';
import { InputController } from './InputController';
import { ResizeController } from './ResizeController';

interface ThreeGameCallbacks {
  onCellSelected: (cell: GridCell) => void;
  onDirectionDropped: (cell: GridCell, direction: Direction) => void;
}

export class ThreeGameApp {
  readonly animationController = new AnimationController();
  readonly garden = new GardenScene();
  readonly renderer: THREE.WebGLRenderer;
  readonly cameraController = new CameraController();

  private readonly scene = new THREE.Scene();
  private readonly clock = new THREE.Clock();
  private readonly resizeController: ResizeController;
  private readonly inputController: InputController;
  private animationFrame = 0;
  private hidden = document.hidden;
  private disposed = false;

  static isWebGLAvailable(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch {
      return false;
    }
  }

  constructor(
    private readonly canvas: HTMLCanvasElement,
    container: HTMLElement,
    private readonly fallback: HTMLElement,
    callbacks: ThreeGameCallbacks,
  ) {
    if (!ThreeGameApp.isWebGLAvailable()) throw new Error('WEBGL_UNAVAILABLE');

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene.background = new THREE.Color(0xd8f1de);
    this.scene.fog = new THREE.Fog(0xd8f1de, 18, 35);

    this.addLights();
    this.scene.add(this.garden.group);
    this.resizeController = new ResizeController(container, this.renderer, this.cameraController);
    this.inputController = new InputController(
      canvas,
      this.cameraController.camera,
      this.garden.board,
      {
        ...callbacks,
        onHover: (cell) => this.garden.board.setHover(cell),
      },
    );

    canvas.addEventListener('webglcontextlost', this.handleContextLost);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.animate();
  }

  private addLights(): void {
    const hemisphere = new THREE.HemisphereLight(0xfffae9, 0x4a8063, 2.1);
    this.scene.add(hemisphere);
    const sun = new THREE.DirectionalLight(0xfff1c9, 3.2);
    sun.position.set(-7, 13, -6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -8;
    sun.shadow.camera.right = 8;
    sun.shadow.camera.top = 8;
    sun.shadow.camera.bottom = -8;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 30;
    sun.shadow.bias = -0.0004;
    this.scene.add(sun);
  }

  setInputDisabled(disabled: boolean): void {
    this.inputController.setDisabled(disabled);
  }

  getDiagnostics(): { calls: number; triangles: number; geometries: number; textures: number } {
    return {
      calls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
    };
  }

  private readonly animate = (): void => {
    if (this.disposed) return;
    this.animationFrame = requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.05);
    if (this.hidden) return;
    this.animationController.update(delta);
    this.garden.update(delta, this.animationController);
    this.renderer.render(this.scene, this.cameraController.camera);
  };

  private readonly handleVisibilityChange = (): void => {
    this.hidden = document.hidden;
    if (!this.hidden) this.clock.getDelta();
  };

  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault();
    this.hidden = true;
    this.fallback.textContent = 'Game 3D đang kết nối lại…';
    this.fallback.hidden = false;
  };

  private readonly handleContextRestored = (): void => {
    this.hidden = document.hidden;
    this.fallback.hidden = true;
    this.resizeController.resize();
  };

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.animationFrame);
    this.animationController.cancelAll();
    this.inputController.dispose();
    this.resizeController.dispose();
    this.garden.dispose();
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
