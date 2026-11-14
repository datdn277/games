import * as THREE from 'three';
import { createClassroom } from './scene/classroom.js';
import { createHand } from './scene/hand.js';
import { createMimo } from './scene/mimo.js';
import { createMilestone, createNumberLine } from './scene/lessons.js';
import { block, contactTexture, plastic, softContact, starGeometry } from './scene/shapes.js';

const DEFAULT_STATE = {
  screen: 'menu',
  raised: 0,
  counts: {},
  next: null,
  interactive: false,
  lineValue: 0,
  showLine: true,
  direction: 1,
  level: 1,
  progress: 0,
  questionId: null,
};

function makeDecorations(scene, starShape) {
  const palette = ['#ffd071', '#a4e6d1', '#ffabce', '#bda7fb'].map((color) => plastic(color, 0.47));
  const glints = [
    [-1.91, 4.52, -0.53, 0.34, 0, -0.24],
    [1.59, 5.20, -1.43, 0.23, 0, 0.31],
    [2.28, 3.77, -0.73, 0.31, 2, 0.30],
    [2.78, 4.58, -1.44, 0.18, 1, -0.25],
    [-2.91, 3.24, -0.68, 0.24, 3, 0.31],
    [-1.18, 5.48, -2.10, 0.12, 2, 0.19],
  ].map(([x, y, z, scale, color, angle]) => {
    const mesh = new THREE.Mesh(starShape, palette[color]);
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(scale);
    mesh.rotation.z = angle;
    scene.add(mesh);
    return { mesh, y, angle };
  });
  const plus = new THREE.Group();
  block(plus, palette[1], 0.54, 0.155, 0.14, 0.065, 0, 0, 0);
  block(plus, palette[1], 0.155, 0.54, 0.14, 0.065, 0, 0, 0);
  plus.position.set(-2.73, 4.05, -1.33);
  plus.rotation.z = -0.23;
  plus.rotation.y = -0.25;
  scene.add(plus);
  const minus = block(scene, palette[3], 0.55, 0.17, 0.14, 0.063, 2.32, 2.81, -1.06);
  minus.rotation.z = 0.24;

  function animate(time, state, reducedMotion) {
    const presentation = state.screen !== 'play';
    for (const [index, { mesh, y, angle }] of glints.entries()) {
      mesh.visible = presentation || index === 4;
      const wobble = reducedMotion ? 0 : Math.sin(time * 1.9 + index * 2);
      mesh.position.y = y + 0.10 * wobble;
      mesh.rotation.z = angle + 0.14 * wobble;
      mesh.rotation.y = 0.24 * wobble;
    }
    plus.visible = presentation;
    minus.visible = presentation;
  }

  return { animate };
}

function makeCelebration(scene, starShape) {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);
  const colors = ['#ffd35c', '#ffe99e', '#f899c5', '#95ebce', '#c2a6fe'].map((color) => plastic(color, 0.45));
  const pieces = Array.from({ length: 18 }, (_, index) => {
    const mesh = new THREE.Mesh(starShape, colors[index % colors.length]);
    group.add(mesh);
    return mesh;
  });

  function animate(age, response, reducedMotion) {
    const success = response === 'correct' || response === 'complete';
    const duration = reducedMotion ? 0.95 : 1.27;
    group.visible = success && age < duration;
    if (!group.visible) return;
    for (const [index, mesh] of pieces.entries()) {
      const angle = index * 2.4;
      const spread = 0.91 + (index % 4) * 0.38;
      const distance = reducedMotion ? spread : spread * (0.25 + Math.sqrt(age) * 1.56);
      const fadingScale = Math.pow(Math.max(0, 1 - age / duration), 0.55);
      const nominalScale = 0.11 + (index % 3) * 0.052;
      mesh.position.set(Math.cos(angle) * distance, 3.08 + Math.sin(angle) * distance * 0.67, 0.95 + index * 0.014);
      mesh.rotation.set(0, age * 3.6 + angle, angle + age * 2.1);
      mesh.scale.setScalar(nominalScale * (reducedMotion ? 1 : fadingScale));
    }
  }

  return { animate };
}

function lightScene(scene) {
  scene.add(new THREE.HemisphereLight('#fff6ff', '#d4b0b9', 2.10));
  const daylight = new THREE.DirectionalLight('#ffebd2', 2.32);
  daylight.position.set(-4.7, 8.3, 6.3);
  scene.add(daylight);
  const fill = new THREE.DirectionalLight('#c1eaff', 0.73);
  fill.position.set(5.0, 4.0, -2.1);
  scene.add(fill);
}

export class SceneManager {
  constructor(canvas, { onFingerTap = () => {}, onAvailabilityChange = () => {} } = {}) {
    this.canvas = canvas;
    this.state = { ...DEFAULT_STATE };
    this.onFingerTap = onFingerTap;
    this.onAvailabilityChange = onAvailabilityChange;
    this.available = false;
    this.time = 0;
    this.lastFrame = null;
    this.lastResponse = '';
    this.responseTime = -100;
    this.stepTime = -100;
    this.motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.resolutionLimit = window.matchMedia('(pointer: coarse)').matches ? 1.5 : 1.85;
    this.frameRequest = null;
    this.pointerStart = null;
    this.pointer = new THREE.Vector2();
    this.world = new THREE.Vector3();
    this.ray = new THREE.Raycaster();
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.cancelPointer = this.cancelPointer.bind(this);
    this.handleLost = this.handleLost.bind(this);
    this.handleRestored = this.handleRestored.bind(this);
    this.handleVisibility = this.handleVisibility.bind(this);
    this.resize = this.resize.bind(this);
    this.frame = this.frame.bind(this);

    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
    } catch {
      queueMicrotask(() => this.onAvailabilityChange(false));
      return;
    }

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.04;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#e9e3ff');
    this.camera = new THREE.OrthographicCamera(-5, 5, 3, -3, 0.1, 50);
    this.scene.add(createClassroom());
    lightScene(this.scene);
    const star = starGeometry();
    const starMaterial = plastic('#ffd46f', 0.42);
    this.hand = createHand(star);
    this.mimo = createMimo(star);
    this.numberLine = createNumberLine(star, starMaterial);
    this.milestone = createMilestone(star, starMaterial);
    this.celebration = makeCelebration(this.scene, star);
    this.decorations = makeDecorations(this.scene, star);
    this.scene.add(this.hand.group, this.mimo.group, this.numberLine.group, this.milestone.group);

    const contact = contactTexture();
    this.handShadow = softContact(2.42, 1.88, 0.34, contact);
    this.handShadow.position.set(0, 0.246, -0.10);
    this.bearShadow = softContact(2.38, 1.55, 0.31, contact);
    this.bearShadow.position.y = -0.336;
    this.milestoneShadow = softContact(2.85, 1.73, 0.25, contact);
    this.milestoneShadow.position.y = -0.335;
    this.scene.add(this.handShadow, this.bearShadow, this.milestoneShadow);

    this.available = true;
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('pointercancel', this.cancelPointer);
    canvas.addEventListener('webglcontextlost', this.handleLost);
    canvas.addEventListener('webglcontextrestored', this.handleRestored);
    document.addEventListener('visibilitychange', this.handleVisibility);
    window.addEventListener('resize', this.resize);
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(canvas);
    this.resize();
    this.start();
    queueMicrotask(() => this.onAvailabilityChange(this.available));
  }

  update(changes) {
    const old = this.state;
    this.state = { ...this.state, ...changes };
    const { counts, screen, questionId } = this.state;
    if (screen !== old.screen || questionId !== old.questionId || Object.keys(counts).length < Object.keys(old.counts).length) {
      this.numberLine?.reset();
      this.lastResponse = '';
    }
    if (this.hand && changes.counts) {
      for (const finger of this.hand.digits) {
        if (Object.hasOwn(counts, finger.id) && !Object.hasOwn(old.counts, finger.id)) {
          finger.tapTime = this.time;
          if (this.state.direction < 0) this.stepTime = this.time;
        }
      }
    }
    if (screen !== old.screen) {
      this.resize();
      if (screen === 'levels') this.stop();
      else this.start();
    }
  }

  react(response) {
    this.lastResponse = response;
    this.responseTime = this.time;
  }

  getFingerTarget(id) {
    const finger = this.hand?.digits[id];
    if (!finger) return null;
    const box = this.canvas.getBoundingClientRect();
    finger.tip.getWorldPosition(this.world);
    this.world.project(this.camera);
    return {
      x: box.left + (this.world.x + 1) * box.width / 2,
      y: box.top + (1 - this.world.y) * box.height / 2,
    };
  }

  handlePointerDown(event) {
    if (this.state.interactive && event.isPrimary && event.button === 0) {
      this.pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
    }
  }

  handlePointerUp(event) {
    const start = this.pointerStart;
    this.cancelPointer();
    if (!this.available || !this.state.interactive || start?.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 18) return;
    const box = this.canvas.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - box.left) / box.width) * 2 - 1,
      -((event.clientY - box.top) / box.height) * 2 + 1,
    );
    this.ray.setFromCamera(this.pointer, this.camera);
    const raised = this.hand.digits.filter(({ id }) => id < this.state.raised);
    const badges = raised.filter((finger) => finger.badge.visible).map((finger) => finger.badge);
    const hit = this.ray.intersectObjects(badges)[0]
      ?? this.ray.intersectObjects(this.hand.digits.flatMap((finger) => finger.surfaces))[0]
      ?? this.ray.intersectObjects(raised.map((finger) => finger.hitArea))[0];
    const id = hit?.object.userData.fingerId ?? this.nearFinger(raised, event);
    if (id !== undefined && id < this.state.raised && !Object.hasOwn(this.state.counts, id)) this.onFingerTap(id);
  }

  nearFinger(fingers, event) {
    let closestDistance = event.pointerType === 'touch' ? 25 : 18;
    let closest;
    for (const finger of fingers) {
      const position = this.getFingerTarget(finger.id);
      const distance = Math.hypot(position.x - event.clientX, position.y - event.clientY);
      if (distance > closestDistance) continue;
      closestDistance = distance;
      closest = finger.id;
    }
    return closest;
  }

  cancelPointer() {
    this.pointerStart = null;
  }

  handleLost(event) {
    event.preventDefault();
    this.available = false;
    this.cancelPointer();
    this.stop();
    this.onAvailabilityChange(false);
  }

  handleRestored() {
    this.available = true;
    this.resize();
    this.start();
    this.onAvailabilityChange(true);
  }

  handleVisibility() {
    if (document.hidden) this.stop();
    else this.start();
  }

  resize() {
    if (!this.available) return;
    const { width, height } = this.canvas.getBoundingClientRect();
    if (width < 1 || height < 1) return;
    const ratio = width / height;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.resolutionLimit, Math.sqrt(1300000 / (width * height))));
    this.renderer.setSize(width, height, false);
    const presentation = this.state.screen !== 'play';
    const [vertical, horizontal] = presentation ? [6.40, 7.25] : [6.20, 7.52];
    const frameHeight = Math.max(vertical, horizontal / ratio);
    const frameWidth = frameHeight * ratio;
    this.camera.left = -frameWidth / 2;
    this.camera.right = frameWidth / 2;
    this.camera.top = frameHeight / 2;
    this.camera.bottom = -frameHeight / 2;
    this.camera.position.set(0, 6.75, 23);
    this.camera.lookAt(0, presentation ? 2.49 : 2.19, 0);
    this.camera.updateProjectionMatrix();

    const compact = frameWidth < 8.35;
    this.numberLine.group.scale.x = compact ? 0.86 : 1;
    this.mimo.group.position.set(compact ? -2.46 : -2.78, -0.34, 0.46);
    this.mimo.group.scale.setScalar(presentation ? (compact ? 1.06 : 1.17) : (compact ? 0.89 : 1.0));
    this.bearShadow.position.x = this.mimo.group.position.x;
    this.bearShadow.position.z = this.mimo.group.position.z;
    this.milestone.group.position.set(compact ? 2.46 : 2.95, -0.32, -0.03);
    this.milestone.group.scale.setScalar(compact ? 0.69 : 0.88);
    this.milestoneShadow.position.x = this.milestone.group.position.x;
  }

  start() {
    if (this.available && this.frameRequest === null && !document.hidden && this.state.screen !== 'levels') {
      this.lastFrame = null;
      this.frameRequest = requestAnimationFrame(this.frame);
    }
  }

  stop() {
    if (this.frameRequest !== null) cancelAnimationFrame(this.frameRequest);
    this.frameRequest = null;
  }

  frame(timestamp) {
    this.frameRequest = requestAnimationFrame(this.frame);
    const delta = this.lastFrame === null ? 0.045 : Math.min((timestamp - this.lastFrame) / 1000, 0.08);
    this.lastFrame = timestamp;
    this.time += delta;
    const { state, time, lastResponse, responseTime } = this;
    const reduce = this.motion.matches;
    const age = time - responseTime;
    this.hand.animate(time, delta, state, reduce);
    this.mimo.animate(time, state.screen !== 'play', lastResponse, age, reduce, time - this.stepTime);
    this.numberLine.animate(time, state, reduce);
    this.milestone.animate(time, state, reduce);
    this.milestoneShadow.visible = state.screen !== 'play' || state.level > 1;
    this.celebration.animate(age, lastResponse, reduce);
    this.decorations.animate(time, state, reduce);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.stop();
    if (!this.renderer) return;
    this.available = false;
    this.resizeObserver.disconnect();
    const { canvas } = this;
    canvas.removeEventListener('pointerdown', this.handlePointerDown);
    canvas.removeEventListener('pointerup', this.handlePointerUp);
    canvas.removeEventListener('pointercancel', this.cancelPointer);
    canvas.removeEventListener('webglcontextlost', this.handleLost);
    canvas.removeEventListener('webglcontextrestored', this.handleRestored);
    document.removeEventListener('visibilitychange', this.handleVisibility);
    window.removeEventListener('resize', this.resize);

    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    this.scene.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) materials.add(object.material);
    });
    for (const material of materials) {
      if (material.map) textures.add(material.map);
      material.dispose();
    }
    this.hand.dispose();
    this.numberLine.dispose();
    for (const texture of textures) texture.dispose();
    for (const geometry of geometries) geometry.dispose();
    this.renderer.dispose();
  }
}
