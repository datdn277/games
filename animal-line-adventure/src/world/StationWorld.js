import * as THREE from 'three';
import { makeAnimal, poseAnimal } from './animals.js';
import { makeCues, makeFootMark, makeStars, poseFootMark } from './cues.js';
import { makeStation, PLATFORM_TOP, skyBackdrop } from './scenery.js';
import { createSculptor } from './sculpt.js';
import { animateTrain, makeTrain } from './train.js';

const ANIMAL_Z = 1.45;
const ANIMAL_TYPES = ['cat', 'bear', 'rabbit', 'frog', 'panda', 'fox'];
const RIGHT_TO_LEFT = 'RIGHT_TO_LEFT';
const MIMO_MENU_X = -5.18;
const HEAD_TOP = { cat: 2.32, bear: 2.15, rabbit: 2.64, frog: 2.0, panda: 2.15, fox: 2.38 };

export class StationWorld {
  constructor(element, { onSelect, onLayout, reduceMotion = false } = {}) {
    this.element = element;
    this.onSelect = onSelect;
    this.onLayout = onLayout;
    this.reduced = reduceMotion;
    this.available = false;

    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
    } catch {
      return;
    }

    this.available = true;
    this.mode = 'menu';
    this.enabled = false;
    this.paused = false;
    this.seconds = 0;
    this.frameId = null;
    this.lastTime = null;
    this.resultStart = null;
    this.line = [];
    this.hovered = null;
    this.lastTap = null;
    this.cue = null;
    this.pointer = null;
    this.width = 1;
    this.height = 1;
    this.kit = createSculptor();
    this.scene = new THREE.Scene();
    this.scene.background = skyBackdrop(this.kit);
    this.scene.fog = new THREE.Fog(0xcbeadc, 21, 55);
    this.camera = new THREE.OrthographicCamera(-6, 6, 3, -3, 0.1, 100);
    this.ray = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.scratch = new THREE.Vector3();
    this.addLighting();
    makeStation(this.kit, this.scene);
    this.train = makeTrain(this.kit, this.scene);
    this.actors = new Map(ANIMAL_TYPES.map((type, index) => {
      const animal = makeAnimal(this.kit, type);
      animal.type = type;
      animal.mark = makeFootMark(this.kit, animal.root, index);
      return [type, animal];
    }));
    this.mimo = makeAnimal(this.kit, 'mimo');
    this.mimo.root.scale.setScalar(0.68);
    this.mimo.root.position.set(MIMO_MENU_X, -0.28, 4.39);
    this.mimoDest = MIMO_MENU_X;
    this.scene.add(this.mimo.root);
    this.cues = makeCues(this.kit, this.scene);
    this.stars = makeStars(this.kit, this.scene);

    this.proxyGeometry = this.kit.own(new THREE.BoxGeometry(1, 1, 1));
    this.proxyMaterial = this.kit.own(new THREE.MeshBasicMaterial());
    this.proxies = [];
    const canvas = this.renderer.domElement;
    canvas.className = 'station-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, {
      display: 'block', width: '100%', height: '100%', touchAction: 'pan-y',
    });
    this.element.append(canvas);
    this.listeners = new AbortController();
    this.bindInput(canvas, this.listeners.signal);
    document.addEventListener('visibilitychange', () => this.schedule(), { signal: this.listeners.signal });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.element);
    this.resize();
    this.schedule();
  }

  addLighting() {
    const sky = new THREE.HemisphereLight(0xfff7ef, 0xafbda6, 1.98);
    const key = new THREE.DirectionalLight(0xfff1d9, 1.85);
    key.position.set(-4.8, 6.7, 5);
    const rim = new THREE.DirectionalLight(0xd0f3ff, 1.24);
    rim.position.set(4, 6, -5);
    this.scene.add(sky, key, rim);
  }

  get spacing() {
    return this.line.length > 4 || this.mode === 'menu' ? 1.76 : 2.17;
  }

  resize() {
    if (!this.available) return;
    const { clientWidth, clientHeight } = this.element;
    if (!clientWidth || !clientHeight) return;
    this.width = clientWidth;
    this.height = clientHeight;
    const ratio = this.width / this.height;
    const baseWidth = Math.max(9.4, (this.line.length - 1) * this.spacing + 2.79);
    const minHeight = this.mode === 'menu' ? 7.32 : 5.35;
    const worldWidth = Math.max(baseWidth, ratio * minHeight);
    const worldHeight = worldWidth / ratio;
    const focus = this.mode === 'menu' ? 1.80 : 1.54;
    this.camera.left = -worldWidth / 2;
    this.camera.right = worldWidth / 2;
    this.camera.top = worldHeight / 2;
    this.camera.bottom = -worldHeight / 2;
    this.camera.position.set(0, focus + 3.12, 19);
    this.camera.lookAt(0, focus, 0);
    this.camera.updateMatrixWorld(true);
    this.camera.updateProjectionMatrix();
    const resolution = Math.min(window.devicePixelRatio || 1, this.width < 700 ? 1.45 : 1.7);
    this.renderer.setPixelRatio(resolution);
    this.renderer.setSize(this.width, this.height, false);
    if (this.paused) this.renderer.render(this.scene, this.camera);
    this.onLayout?.();
  }

  setAnimals(types) {
    if (!this.available || (types.length === this.line.length &&
      types.every((type, index) => type === this.line[index].type))) return;
    for (const animal of this.line) animal.root.removeFromParent();
    this.line = types.map(type => this.actors.get(type));
    this.proxies = this.line.map((animal, index) => {
      const x = (index - (this.line.length - 1) / 2) * this.spacing;
      animal.root.position.set(x, PLATFORM_TOP, ANIMAL_Z);
      animal.reaction = { type: '', start: -10 };
      this.scene.add(animal.root);
      const proxy = new THREE.Mesh(this.proxyGeometry, this.proxyMaterial);
      proxy.position.set(x, PLATFORM_TOP + 1.14, ANIMAL_Z);
      proxy.scale.set(this.spacing * 0.95, 2.57, 0.78);
      proxy.updateMatrixWorld(true);
      proxy.userData.animalIndex = index;
      return proxy;
    });
    this.hovered = null;
    this.lastTap = null;
    this.mimoDest = (this.line[0]?.root.position.x ?? MIMO_MENU_X) - 0.55;
    if (this.mode === 'menu') this.mimoDest = MIMO_MENU_X;
    this.resize();
  }

  setMode(mode) {
    if (!this.available || mode === this.mode) return;
    this.mode = mode;
    this.resultStart = mode === 'result' ? this.seconds : null;
    if (mode === 'result') {
      this.stars.emit(this.seconds, 0, 2.35, ANIMAL_Z + 0.5, 12);
    } else {
      this.stars.clear();
    }
    this.hovered = null;
    this.pointer = null;
    this.lastTap = null;
    this.setCue(null);
    if (mode === 'menu') this.mimoDest = MIMO_MENU_X;
    this.resize();
  }

  setEnabled(enabled) {
    if (!this.available) return;
    this.enabled = enabled;
    if (!enabled) {
      this.hovered = null;
      this.pointer = null;
      this.renderer.domElement.style.cursor = '';
    }
  }

  setCue(cue) {
    if (!this.available) return;
    const oldDirection = this.cue?.direction;
    this.cue = cue;
    const direction = cue?.direction;
    const strength = cue?.strength ?? 0;
    const { flag, arrow, arrowMaterial, borderMaterial } = this.cues;
    const side = direction === RIGHT_TO_LEFT ? 1 : -1;
    const guideTarget = this.line[cue?.guideAt]?.root.position.x;
    flag.visible = Boolean(direction && strength > 0);
    arrow.visible = flag.visible;
    if (!flag.visible) {
      if (guideTarget !== undefined) this.mimoDest = guideTarget + side * 0.24;
      return;
    }
    const endpoint = this.line[side < 0 ? 0 : this.line.length - 1]?.root.position.x ?? 0;
    this.flagDest = endpoint + side * 0.81;
    if (direction !== oldDirection) {
      if (!this.flagPlaced) flag.position.x = this.flagDest;
      this.flagPlaced = true;
      this.mimoDest = endpoint + side * 0.22;
      this.arrowChangedAt = this.seconds;
    }
    if (guideTarget !== undefined) this.mimoDest = guideTarget + side * 0.24;
    this.arrowSign = -side;
    this.arrowScale = strength >= 2 ? 1 : 0.56;
    arrowMaterial.opacity = strength >= 2 ? 1 : 0.80;
    borderMaterial.opacity = strength >= 2 ? 0.92 : 0.63;
    this.cues.cloth.scale.x = -side;
  }

  react(index, type) {
    if (!this.available) return;
    const animal = this.line[index];
    if (!animal) return;
    animal.reaction = { type, start: this.seconds };
    if (type === 'count' || type === 'correct') {
      this.mimoDest = animal.root.position.x - (this.arrowSign ?? 1) * 0.24;
      this.mimo.reaction = { type, start: this.seconds };
    }
    if (type === 'correct') {
      this.stars.emit(this.seconds, animal.root.position.x, PLATFORM_TOP + 1.7, ANIMAL_Z + 0.44, 12);
    }
  }

  getAnimalAnchor(index) {
    const animal = this.line?.[index];
    if (!animal) return null;
    const height = HEAD_TOP[animal.type] + 0.13;
    const anchor = this.project(animal.root.position.x, PLATFORM_TOP + height, ANIMAL_Z);
    return { x: anchor.x, y: anchor.y - 19 };
  }

  getAnimalHitAnchor(index) {
    const animal = this.line?.[index];
    if (!animal) return null;
    return this.project(animal.root.position.x, PLATFORM_TOP + 1.28, ANIMAL_Z + 0.26);
  }

  project(x, y, z) {
    const point = this.scratch.set(x, y, z).project(this.camera);
    return { x: (point.x + 1) * 0.5 * this.width, y: (1 - point.y) * 0.5 * this.height };
  }

  bindInput(canvas, signal) {
    const pick = event => {
      if (!this.enabled || this.mode !== 'play' || this.paused) return null;
      const box = canvas.getBoundingClientRect();
      this.ndc.set((event.clientX - box.left) / box.width * 2 - 1,
        1 - (event.clientY - box.top) / box.height * 2);
      this.ray.setFromCamera(this.ndc, this.camera);
      return this.ray.intersectObjects(this.proxies, false)[0]?.object.userData.animalIndex ?? null;
    };
    canvas.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0 || !this.enabled || this.paused) return;
      this.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, index: pick(event) };
    }, { signal });
    canvas.addEventListener('pointerup', event => {
      const pointer = this.pointer;
      if (!pointer || pointer.id !== event.pointerId) return;
      this.pointer = null;
      const index = pick(event);
      if (index === null || pointer.index !== index ||
        Math.hypot(pointer.x - event.clientX, pointer.y - event.clientY) > 21) return;
      if (this.lastTap?.index === index && event.timeStamp - this.lastTap.at < 320) return;
      this.lastTap = { index, at: event.timeStamp };
      this.onSelect?.(index);
    }, { signal });
    canvas.addEventListener('pointercancel', () => { this.pointer = null; }, { signal });
    canvas.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse') return;
      this.hovered = pick(event);
      canvas.style.cursor = this.hovered === null ? '' : 'pointer';
    }, { signal });
    canvas.addEventListener('pointerleave', () => {
      this.hovered = null;
      canvas.style.cursor = '';
    }, { signal });
  }

  setPaused(paused) {
    if (!this.available) return;
    this.paused = paused;
    this.schedule();
  }

  setReducedMotion(reduced) {
    if (this.available) this.reduced = reduced;
  }

  schedule() {
    if (this.paused || document.hidden) {
      if (this.frameId !== null) cancelAnimationFrame(this.frameId);
      this.frameId = null;
      this.lastTime = null;
      return;
    }
    if (this.frameId === null) this.frameId = requestAnimationFrame(this.tick);
  }

  tick = now => {
    const dt = this.lastTime === null ? 0 : Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.seconds += dt;
    this.frameId = null;
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
    this.schedule();
  };

  update(dt) {
    const time = this.seconds;
    const resultAge = this.resultStart === null ? -1 : time - this.resultStart;
    const result = resultAge >= 0;
    const wave = result || this.mode === 'menu';
    const reduced = this.reduced;
    const ease = reduced ? 1 : 1 - Math.exp(-dt * 7);
    this.mimo.root.position.x += (this.mimoDest - this.mimo.root.position.x) * ease;
    this.mimo.root.rotation.y = reduced ? 0 : (this.mimoDest - this.mimo.root.position.x) * 0.08;
    poseAnimal(this.mimo, time, { reduced, wave });

    const { flag, cloth, arrow } = this.cues;
    if (flag.visible) {
      flag.position.x += (this.flagDest - flag.position.x) * ease;
      cloth.rotation.y = reduced ? 0 : Math.sin(time * 3.6) * 0.20;
      const age = time - this.arrowChangedAt;
      const reveal = reduced ? 1 : Math.min(1, 0.24 + 2.35 * age);
      arrow.scale.set(this.arrowScale * this.arrowSign * reveal, this.arrowScale * reveal, 1);
    }

    this.line.forEach((animal, index) => {
      poseAnimal(animal, time, { reduced, wave: result });
      const highlighted = this.cue?.highlight === index || this.hovered === index;
      const since = animal.reaction.type ? time - animal.reaction.start : -1;
      poseFootMark(animal.mark, time, highlighted, since, reduced);
    });
    animateTrain(this.train, time, resultAge, reduced, this.mode === 'menu');
    this.stars.animate(time, reduced);
  }

  destroy() {
    if (!this.available) return;
    this.paused = true;
    this.schedule();
    this.available = false;
    this.listeners.abort();
    this.resizeObserver.disconnect();
    this.kit.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
