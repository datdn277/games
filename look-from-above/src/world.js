import * as THREE from 'three';
import { createBlocks, CUBE_SIZE } from './blocks.js';
import { createBobo } from './bobo.js';
import { createCameraRig } from './camera.js';
import { createClassroom } from './classroom.js';

const MENU_BOUNDS = { minX: -1, maxX: 1, minZ: -1, maxZ: 1 };
const DEFAULT_BOUNDS = { ...MENU_BOUNDS };
const MENU_BOARD = [
  [-1, 0, -1, 'WHITE'], [0, 0, -1, 'DARK'], [1, 0, -1, 'WHITE'],
  [-1, 0, 0, 'DARK'], [0, 0, 0, 'WHITE'], [1, 0, 0, 'DARK'],
  [-1, 0, 1, 'WHITE'], [0, 0, 1, 'DARK'],
  [-1, 1, -1, 'DARK'], [0, 1, -1, 'WHITE'], [1, 1, -1, 'DARK'],
  [-1, 2, -1, 'WHITE'], [1, 2, -1, 'WHITE'], [0, 1, 0, 'DARK'],
].map(([x, y, z, paint], index) => ({ id: `intro-${index}`, x, y, z, topColor: paint, sideColor: paint }));

function boundsFor(cubes) {
  if (!cubes.length) return DEFAULT_BOUNDS;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const { x, z } of cubes) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }
  return { minX, maxX, minZ, maxZ };
}

function blockExtent(cubes) {
  if (!cubes.length) return null;
  const box = boundsFor(cubes);
  const maxY = cubes.reduce((top, { y }) => Math.max(top, y + .485 + CUBE_SIZE / 2), 0);
  return {
    minX: box.minX - CUBE_SIZE / 2, maxX: box.maxX + CUBE_SIZE / 2,
    minY: 0, maxY,
    minZ: box.minZ - CUBE_SIZE / 2, maxZ: box.maxZ + CUBE_SIZE / 2,
  };
}

function makeSparkles(scene, reducedMotion) {
  const star = new THREE.Shape();
  for (let point = 0; point < 10; point += 1) {
    const radius = point % 2 ? .46 : 1;
    const angle = Math.PI / 2 + point * Math.PI / 5;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (point === 0) star.moveTo(x, y);
    else star.lineTo(x, y);
  }
  star.closePath();
  const geometry = new THREE.ExtrudeGeometry(star, {
    depth: .16, steps: 1, bevelEnabled: true, bevelThickness: .052, bevelSize: .055, bevelSegments: 2,
  });
  const materials = [0xffd266, 0xffa8cb, 0xcbaaf8, 0x89e7b7].map((color) =>
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .25, roughness: .42 }));
  const bits = Array.from({ length: reducedMotion ? 4 : 12 }, (_, index) => {
    const sprite = new THREE.Mesh(geometry, materials[index % materials.length]);
    sprite.visible = false;
    scene.add(sprite);
    return sprite;
  });
  const origin = new THREE.Vector3();
  let startedAt = -5;
  return {
    trigger(time, x, y, z) {
      startedAt = time;
      origin.set(x, y, z);
    },
    clear() {
      startedAt = -5;
      for (const bit of bits) bit.visible = false;
    },
    update(time, camera) {
      for (let index = 0; index < bits.length; index += 1) {
        const bit = bits[index];
        const elapsed = time - startedAt - (reducedMotion ? 0 : index * .017);
        bit.visible = elapsed >= 0 && elapsed < (reducedMotion ? 1.12 : 1.30);
        if (!bit.visible) continue;
        const arc = index * 2.399;
        const distance = reducedMotion ? .63 + index * .31 : .41 + elapsed * (1.54 + index * .041);
        const lift = reducedMotion ? .16 : .31 + Math.sin(elapsed / 1.30 * Math.PI) * (1.23 + index * .042);
        bit.position.set(origin.x + Math.cos(arc) * distance, origin.y + lift, origin.z + Math.sin(arc) * distance);
        bit.quaternion.copy(camera.quaternion);
        bit.rotateZ(reducedMotion ? arc : arc + elapsed * (index % 2 ? -3 : 3));
        const size = reducedMotion ? .13 : Math.sin(Math.PI * elapsed / 1.30) * (.115 + index * .004);
        bit.scale.setScalar(Math.max(.001, size));
      }
    },
    dispose() {
      geometry.dispose();
      for (const material of materials) material.dispose();
    },
  };
}

export function createWorld(canvas, { reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdce9eb);

  scene.add(new THREE.HemisphereLight(0xfffffd, 0xb8a2b5, 1.55));
  const key = new THREE.DirectionalLight(0xffedca, 1.98);
  key.position.set(-3.6, 7.5, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xd7e9ff, .59);
  fill.position.set(5, 3.8, -1.8);
  scene.add(fill);
  const camera = new THREE.OrthographicCamera(-3, 3, 3, -3, .1, 86);
  const rig = createCameraRig(camera, { reducedMotion });
  const studio = createClassroom({ reducedMotion });
  const bobo = createBobo({ reducedMotion });
  const blocks = createBlocks();
  const sparkles = makeSparkles(scene, reducedMotion);
  scene.add(studio.group, blocks.group, bobo.group);

  const shadeGeometry = new THREE.CircleGeometry(1, 32);
  const shadeMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { opacity: { value: .22 } },
    vertexShader: 'varying vec2 point; void main() {point = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);}',
    fragmentShader: 'varying vec2 point; uniform float opacity; void main() {float fade = pow(max(0.0, 1.0 - length(point)), 1.48); gl_FragColor = vec4(0.34, 0.24, 0.21, fade * opacity);}',
  });
  const owlShadow = new THREE.Mesh(shadeGeometry, shadeMaterial);
  owlShadow.rotation.x = -Math.PI / 2;
  scene.add(owlShadow);
  const actor = { x: 0, z: 0, scale: 1 };
  let width = 0;
  let height = 0;
  let currentMode = '';
  let extent = null;
  let bounds = DEFAULT_BOUNDS;
  let paused = false;
  let disposed = false;
  let time = 0;
  let then = null;
  let raf;
  let mood = null;
  let dirty = true;

  function positionActor(elevation) {
    const animating = mood && time < mood.until;
    const flying = Boolean(animating && mood.kind === 'flying');
    const happy = Boolean(animating && mood.kind === 'happy');
    let bounce = 0;
    if (!reducedMotion && flying) bounce = .91 * Math.sin(Math.PI * Math.min(1, (time - mood.start) / .99));
    else if (!reducedMotion && happy) bounce = .16 * Math.abs(Math.sin((time - mood.start) * 8));
    bobo.group.position.set(actor.x, -.143 + bounce, actor.z);
    bobo.group.rotation.y = -.29;
    bobo.group.scale.setScalar(actor.scale);
    owlShadow.position.set(actor.x, -.143, actor.z);
    owlShadow.scale.set(1.02 * actor.scale, .68 * actor.scale, 1);
    shadeMaterial.uniforms.opacity.value = .24 / (1 + bounce);
    const expression = animating ? mood.kind
      : currentMode === 'menu' && time % 5.5 < 1.80 ? 'wave' : 'idle';
    bobo.animate(time, expression);
    studio.setTop(elevation);
  }

  function updateLayout() {
    const { minX, maxX, minZ, maxZ } = bounds;
    const menu = currentMode === 'menu';
    actor.x = maxX + (menu ? 1.58 : 1.05);
    actor.z = (minZ + maxZ) / 2 + (menu ? .68 : .25);
    actor.scale = menu ? 1.16 : .80;
    const pieces = [{
      minX: minX - .68, maxX: maxX + .68,
      minY: -.29, maxY: .01,
      minZ: minZ - .74, maxZ: maxZ + .96,
    }, {
      minX: actor.x - .63 * actor.scale, maxX: actor.x + .67 * actor.scale,
      minY: -.14, maxY: actor.scale * 2.08 - .14,
      minZ: actor.z - .44 * actor.scale, maxZ: actor.z + .54 * actor.scale,
    }];
    if (extent) pieces.push(extent);
    rig.setLayout(pieces, menu);
    positionActor(rig.elevation());
    dirty = true;
  }

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h || (w === width && h === height)) return;
    width = w;
    height = h;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, w < 680 ? 1.36 : 1.7));
    renderer.setSize(w, h, false);
    rig.resize(w, h);
    dirty = true;
    if (paused && !document.hidden) renderer.render(scene, camera);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  function setBoard(cubes, { bounds: nextBounds } = {}) {
    bounds = nextBounds ?? boundsFor(cubes);
    extent = blockExtent(cubes);
    blocks.setBoard(cubes, bounds);
    updateLayout();
  }

  function setMode(nextMode) {
    if (currentMode === nextMode) return;
    currentMode = nextMode;
    rig.cancelTransition();
    rig.resetZoom();
    rig.setView('isometric', { immediate: true });
    mood = null;
    sparkles.clear();
    blocks.group.rotation.y = 0;
    blocks.setGrid(true);
    blocks.setHighlights({});
    blocks.setXRay(false, null);
    studio.setMode(nextMode);
    setBoard(nextMode === 'menu' ? MENU_BOARD : [], { bounds: MENU_BOUNDS });
    resize();
  }

  function react(kind) {
    const motion = kind === 'fly' ? 'flying' : kind === 'think' ? 'thinking' : kind;
    mood = { kind: motion, start: time, until: time + (motion === 'flying' ? 1.00 : 2.06) };
    if (motion === 'happy') {
      const { minX, maxX, minZ, maxZ } = bounds;
      const peak = extent?.maxY || .25;
      const top = rig.elevation() > .9;
      sparkles.trigger(time, (minX + maxX) / 2, top ? peak + .12 : Math.max(.40, peak * .66), (minZ + maxZ) / 2);
    }
    dirty = true;
  }

  function tick(now) {
    const delta = then === null ? 0 : Math.min(.06, (now - then) / 1000);
    then = now;
    if (!paused && !document.hidden && width && height) {
      const movingCamera = rig.isTransitioning();
      time += delta;
      rig.step(delta);
      if (disposed) return;
      if (dirty || !reducedMotion || movingCamera || mood && time < mood.until) {
        positionActor(rig.elevation());
        if (currentMode === 'menu') blocks.group.rotation.y = reducedMotion ? 0 : Math.sin(time * .26) * .14;
        studio.update(time);
        sparkles.update(time, camera);
        renderer.render(scene, camera);
        dirty = false;
      }
    }
    raf = requestAnimationFrame(tick);
  }

  setMode('menu');
  raf = requestAnimationFrame(tick);

  return {
    setMode,
    setBoard,
    setView(mode, options) {
      dirty = true;
      return rig.setView(mode, options);
    },
    setElevation(ratio) {
      dirty = true;
      return rig.setElevation(ratio);
    },
    orbit(angle, vertical) {
      dirty = true;
      return rig.orbit(angle, vertical);
    },
    zoom(factor) { rig.zoom(factor); dirty = true; },
    getPose: rig.getPose,
    cancelTransition: rig.cancelTransition,
    hit(clientX, clientY) { return blocks.hit(clientX, clientY, canvas, camera); },
    setXRay(enabled, column = null) { blocks.setXRay(enabled, column); dirty = true; },
    setHighlights(options = {}) { blocks.setHighlights(options); dirty = true; },
    setGrid(enabled) { blocks.setGrid(enabled); dirty = true; },
    react,
    setPaused(value) { paused = Boolean(value); dirty = true; },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      rig.cancelTransition();
      blocks.dispose();
      studio.dispose();
      bobo.dispose();
      sparkles.dispose();
      shadeGeometry.dispose();
      shadeMaterial.dispose();
      renderer.dispose();
    },
  };
}
