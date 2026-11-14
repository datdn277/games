import * as THREE from 'three';
import { makeFestival, FestivalLights } from './Festival.js';
import { noteGeometry, shadowTexture, shapes, starGeometry } from './geometry.js';
import { makeMimo } from './Mimo.js';
import { MimoAnimator } from './MimoAnimator.js';
import { StarParticles } from './StarParticles.js';

const cameraTarget = new THREE.Vector3(0, 1.57, 0);

export class Stage {
  constructor(element, { reducedMotion = false, onContextLost, onContextRestored } = {}) {
    this.element = element;
    this.reducedMotion = reducedMotion;
    this.mode = 'menu';
    this.rotation = -0.16;
    this.lost = false;
    this.frame = 0;
    this.needsRender = true;
    this.width = 1;
    this.height = 1;
    this.framing = null;
    this.quality = (navigator.hardwareConcurrency || 8) <= 4 ? 0 : 1;
    this.sampleTime = 0;
    this.sampleCount = 0;
    this.sampleSlowFrames = 0;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 60);
    this.camera.position.set(0, 6.19, 12);
    this.camera.lookAt(cameraTarget);

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: this.quality > 0,
      powerPreference: this.quality > 0 ? 'high-performance' : 'low-power',
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.11;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;

    const canvas = this.renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.display = 'block';
    this.handleContextLost = (event) => {
      event.preventDefault();
      this.lost = true;
      onContextLost?.();
    };
    this.handleContextRestored = () => {
      this.lost = false;
      this.resize();
      this.renderer.shadowMap.needsUpdate = true;
      onContextRestored?.();
    };
    canvas.addEventListener('webglcontextlost', this.handleContextLost);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
    element.appendChild(canvas);
    this.addLights();

    const star = starGeometry();
    const note = noteGeometry();
    const shadow = shadowTexture();
    const primitives = shapes();
    const environment = makeFestival(this.scene, shadow, star, note, primitives);
    this.mimo = makeMimo(environment.festival, star, primitives);
    this.mimo.root.rotation.y = this.rotation;
    this.animator = new MimoAnimator(this.mimo, reducedMotion);
    this.lights = new FestivalLights(environment, reducedMotion);
    this.particles = new StarParticles(environment.festival, star, reducedMotion);
    this.animator.play('waveLeft', { duration: 2.1 });

    this.resize = this.resize.bind(this);
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(element);
    this.resize();
    this.update(0, 0);
    this.render();
  }

  addLights() {
    this.scene.add(new THREE.HemisphereLight(0xfff9fc, 0xafa0e5, 1.79));
    this.keyLight = new THREE.DirectionalLight(0xfff2db, 2.24);
    this.keyLight.position.set(-4.4, 7.5, 6);
    this.keyLight.shadow.camera.left = -3.5;
    this.keyLight.shadow.camera.right = 3.5;
    this.keyLight.shadow.camera.top = 3.6;
    this.keyLight.shadow.camera.bottom = -3.6;
    this.keyLight.shadow.camera.far = 19;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.bias = -0.00045;
    this.keyLight.shadow.normalBias = 0.028;
    this.scene.add(this.keyLight);

    const fill = new THREE.DirectionalLight(0xffecfa, 1.23);
    fill.position.set(4, 3, -3);
    this.scene.add(fill);
    const bounce = new THREE.DirectionalLight(0xe1ecff, 0.46);
    bounce.position.set(3.5, 2.82, 6.5);
    this.scene.add(bounce);
  }

  resize() {
    const { clientWidth, clientHeight } = this.element;
    this.width = Math.max(clientWidth, 1);
    this.height = Math.max(clientHeight, 1);
    const maxRatio = this.quality ? (this.width * this.height > 1700000 ? 1.25 : 1.65) : 1;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxRatio));
    this.renderer.setSize(this.width, this.height);
    this.renderer.shadowMap.enabled = this.quality > 0;
    this.keyLight.castShadow = this.quality > 0;
    this.renderer.shadowMap.needsUpdate = true;
    this.frameCamera(1);
    this.needsRender = true;
  }

  frameCamera(amount) {
    const aspect = this.width / this.height;
    const wide = (this.width >= 760 && aspect >= 1.2) || (this.width >= 560 && this.height <= 500 && aspect > 1.2);
    let aimX;
    let aimY;
    let span;
    if (this.mode === 'play') {
      aimX = 0.5;
      aimY = this.height < 475 && wide ? 0.58 : 0.54;
      span = Math.max(wide ? 6.35 : 7.45, 5.95 / aspect);
    } else if (wide) {
      aimX = 0.702;
      aimY = this.mode === 'celebration' ? 0.5 : 0.525;
      span = Math.max(7.9, 13.45 / aspect);
    } else {
      aimX = 0.5;
      aimY = this.mode === 'celebration' ? 0.43 : this.width >= 600 ? 0.54 : 0.52;
      span = Math.max(8.25, 5.9 / aspect);
    }
    if (!this.framing) {
      this.framing = { x: aimX, y: aimY, span };
    }
    this.framing.x = THREE.MathUtils.lerp(this.framing.x, aimX, amount);
    this.framing.y = THREE.MathUtils.lerp(this.framing.y, aimY, amount);
    this.framing.span = THREE.MathUtils.lerp(this.framing.span, span, amount);
    const halfHeight = this.framing.span / 2;
    const halfWidth = halfHeight * aspect;
    const translateX = (2 * this.framing.x - 1) * halfWidth;
    const translateY = (2 * this.framing.y - 1) * halfHeight;
    this.camera.left = -halfWidth - translateX;
    this.camera.right = halfWidth - translateX;
    this.camera.bottom = -halfHeight + translateY;
    this.camera.top = halfHeight + translateY;
    this.camera.updateProjectionMatrix();
  }

  setMode(mode) {
    if (this.mode === mode) return;
    this.mode = mode;
    this.setPrompt(null);
    this.particles.clear();
    if (mode === 'celebration') {
      this.play('happy', { hold: true });
      this.particles.burst(this.mimo.root.position, true);
    } else if (mode === 'menu') {
      this.play('waveLeft', { duration: 1.65 });
    } else {
      this.play('idle');
    }
  }

  play(animation, options) {
    this.animator.play(animation, options);
  }

  setPrompt(direction) {
    this.lights.setPrompt(direction);
  }

  setTheme(theme) {
    this.lights.setTheme(theme);
  }

  setReducedMotion(reducedMotion) {
    this.reducedMotion = reducedMotion;
    this.animator.reducedMotion = reducedMotion;
    this.lights.reducedMotion = reducedMotion;
    this.particles.reducedMotion = reducedMotion;
    this.particles.clear();
  }

  burst() {
    this.particles.burst(this.mimo.root.position, this.mode === 'celebration');
  }

  samplePerformance(delta) {
    if (!delta || delta > 0.2 || this.quality === 0) return;
    this.sampleTime += delta;
    this.sampleCount += 1;
    if (delta >= 0.03) this.sampleSlowFrames += 1;
    if (this.sampleTime < 3.8) return;
    if (this.sampleSlowFrames > 12 && this.sampleSlowFrames / this.sampleCount > 0.55) {
      this.quality = 0;
      this.resize();
    }
    this.sampleTime = 0;
    this.sampleCount = 0;
    this.sampleSlowFrames = 0;
  }

  update(delta, beatPulse) {
    if (this.lost) return;
    this.needsRender = true;
    this.samplePerformance(delta);
    const timestep = Math.min(delta, 0.075);
    const ease = this.reducedMotion ? 1 : 1 - Math.exp(-timestep * 13);
    const desiredRotation = this.mode === 'play' ? Math.PI : -0.16;
    this.rotation = THREE.MathUtils.lerp(this.rotation, desiredRotation, ease);
    this.mimo.root.rotation.y = this.rotation;
    this.frameCamera(ease);
    this.animator.update(timestep, beatPulse);
    this.lights.update(timestep, beatPulse, this.mimo.root);
    this.particles.update(timestep);
  }

  render() {
    if (this.lost || !this.needsRender) return;
    this.needsRender = false;
    this.frame += 1;
    if (this.quality > 0 && this.frame % 2 === 0) this.renderer.shadowMap.needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.observer.disconnect();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
    const resources = new Set();
    this.scene.traverse((object) => {
      if (object.geometry) resources.add(object.geometry);
      if (object.material) {
        for (const material of [].concat(object.material)) {
          resources.add(material);
          if (material.map) resources.add(material.map);
        }
      }
      if (object.shadow?.map) resources.add(object.shadow.map);
    });
    for (const resource of resources) resource.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    canvas.remove();
  }
}
