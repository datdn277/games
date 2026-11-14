import * as THREE from "three";
import { CameraController } from "../animation/CameraController";
import { MazeView } from "../maze/MazeView";
import type { MazeLevel } from "../maze/MazeCell";
import { GameLoop } from "./GameLoop";

export class GardenScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-4, 4, 4, -4, 0.1, 60);
  readonly renderer: THREE.WebGLRenderer;
  readonly mazeView: MazeView;
  private readonly cameraController: CameraController;
  private readonly loop: GameLoop;
  private readonly resizeObserver: ResizeObserver;
  private level: MazeLevel | null = null;

  constructor(private readonly container: HTMLElement) {
    this.scene.background = new THREE.Color(0xdaf0bf);
    this.scene.fog = new THREE.Fog(0xdaf0bf, 13, 27);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.domElement.setAttribute("aria-label", "Mê cung khu vườn 3D");
    this.renderer.domElement.setAttribute("role", "img");
    this.container.appendChild(this.renderer.domElement);

    const hemisphere = new THREE.HemisphereLight(0xfff8df, 0x587344, 1.55);
    this.scene.add(hemisphere);
    const sunlight = new THREE.DirectionalLight(0xffedbd, 3.7);
    sunlight.position.set(-5, 10, 7);
    sunlight.castShadow = true;
    sunlight.shadow.bias = -0.00015;
    sunlight.shadow.normalBias = 0.025;
    sunlight.shadow.mapSize.set(1024, 1024);
    sunlight.shadow.camera.left = -7;
    sunlight.shadow.camera.right = 7;
    sunlight.shadow.camera.top = 7;
    sunlight.shadow.camera.bottom = -7;
    this.scene.add(sunlight);

    const softFill = new THREE.DirectionalLight(0xb9dcff, 0.72);
    softFill.position.set(5, 5, -4);
    this.scene.add(softFill);

    const gardenIsland = new THREE.Mesh(
      new THREE.CylinderGeometry(8.9, 9.2, 0.32, 64),
      new THREE.MeshStandardMaterial({ color: 0x78a85b, roughness: 0.96 }),
    );
    gardenIsland.position.y = -0.19;
    gardenIsland.receiveShadow = true;
    this.scene.add(gardenIsland);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(12, 64),
      new THREE.MeshStandardMaterial({ color: 0xa8d47d, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.addGardenDecorations();

    this.cameraController = new CameraController(this.camera);
    this.mazeView = new MazeView(this.scene);
    this.loop = new GameLoop(this.renderer, this.scene, this.camera, this.mazeView);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.renderer.domElement.addEventListener("webglcontextlost", this.onContextLost);
    this.renderer.domElement.addEventListener("webglcontextrestored", this.onContextRestored);
    this.resize();
    this.loop.start();
  }

  load(level: MazeLevel): void {
    this.level = level;
    this.mazeView.load(level);
    this.resize();
  }

  resize(): void {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(width, height, false);
    if (this.level) this.cameraController.fit(this.level.rows, this.level.cols, width, height);
    else this.cameraController.fit(5, 5, width, height);
  }

  dispose(): void {
    this.loop.stop();
    this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener("webglcontextlost", this.onContextLost);
    this.renderer.domElement.removeEventListener("webglcontextrestored", this.onContextRestored);
    this.mazeView.dispose();
    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private readonly onContextLost = (event: Event): void => {
    event.preventDefault();
    this.container.dataset.rendererState = "lost";
  };

  private readonly onContextRestored = (): void => {
    this.container.dataset.rendererState = "ready";
    if (this.level) this.load(this.level);
  };

  private addGardenDecorations(): void {
    const flowerColors = [0xffcf56, 0xff8ca2, 0x8bc5ff, 0xffffff];
    for (let index = 0; index < 24; index += 1) {
      const angle = (index / 24) * Math.PI * 2;
      const radius = 7.2 + (index % 3) * 0.55;
      const flower = new THREE.Group();
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.03, 0.34, 6),
        new THREE.MeshStandardMaterial({ color: 0x4e9444, roughness: 0.9 }),
      );
      stem.position.y = 0.17;
      flower.add(stem);
      const bloom = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 8, 6),
        new THREE.MeshStandardMaterial({ color: flowerColors[index % flowerColors.length], roughness: 0.75 }),
      );
      bloom.scale.y = 0.45;
      bloom.position.y = 0.38;
      flower.add(bloom);
      flower.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      this.scene.add(flower);
    }
  }
}
