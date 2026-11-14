import * as THREE from 'three';
import { Camera } from './Camera.js';
import { createToyRoom } from '../world/ToyRoom.js';
import { addLighting } from '../world/Lighting.js';
import { Mimo } from '../characters/Mimo.js';
import { createToy, disposeToyAssets } from '../objects/ToyFactory.js';

const ease = (t) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;

function makeStar() {
  const outline = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const angle = Math.PI / 2 + i * Math.PI / 5;
    const radius = i % 2 ? .1 : .22;
    outline[i ? 'lineTo' : 'moveTo'](Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  outline.closePath();
  return new THREE.ExtrudeGeometry(outline, {
    depth: .05, steps: 1, bevelEnabled: true, bevelSegments: 2, bevelSize: .025, bevelThickness: .018,
  });
}

export class Stage {
  constructor(canvas, { choose, layout, fallback }) {
    this.canvas = canvas;
    this.choose = choose;
    this.onLayout = layout;
    this.onFallback = fallback;
    this.mode = 'menu';
    this.entries = [];
    this.nodes = new Map();
    this.width = 1;
    this.height = 1;
    this.active = false;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
    this.abort = new AbortController();
    const { signal } = this.abort;

    try {
      const compact = matchMedia('(pointer: coarse)').matches;
      const low = (navigator.deviceMemory && navigator.deviceMemory <= 4) || navigator.hardwareConcurrency <= 4;
      this.renderer = new THREE.WebGLRenderer({
        canvas, antialias: !low, alpha: false, powerPreference: 'default',
      });
      this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, low ? 1 : compact ? 1.35 : 1.65));
      this.renderer.toneMapping = THREE.NeutralToneMapping;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color('#a9dfcc');
      this.camera = new Camera();
      this.room = createToyRoom();
      this.scene.add(this.room);
      addLighting(this.scene, Boolean(low || compact));
      this.mimo = new Mimo();
      this.scene.add(this.mimo.group);
      this.toys = new THREE.Group();
      this.scene.add(this.toys);
      this.raycaster = new THREE.Raycaster();
      this.pointer = new THREE.Vector2();
      this.point = new THREE.Vector3();
      this.podiumGeometry = new THREE.CylinderGeometry(.82, .88, .15, 40);
      this.rimGeometry = new THREE.CylinderGeometry(.83, .84, .032, 40);
      this.hitGeometry = new THREE.BoxGeometry(1.72, 1.65, 1.72);
      this.podiumMaterial = new THREE.MeshStandardMaterial({ color: '#fff4df', roughness: .65 });
      this.referenceMaterial = new THREE.MeshStandardMaterial({ color: '#dfc8fd', roughness: .57 });
      this.hintMaterial = new THREE.MeshStandardMaterial({ color: '#ffdf8e', roughness: .58, emissive: '#e08a2a', emissiveIntensity: .16 });
      this.correctMaterial = new THREE.MeshStandardMaterial({ color: '#ffe082', roughness: .5, emissive: '#ffac38', emissiveIntensity: .32 });
      this.rimMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .7 });
      this.hitMaterial = new THREE.MeshBasicMaterial({ visible: false });
      this.starGeometry = makeStar();
      this.starMaterial = new THREE.MeshStandardMaterial({ color: '#ffca50', emissive: '#b87713', emissiveIntensity: .28, roughness: .53 });
      this.stars = Array.from({ length: 9 }, () => {
        const mesh = new THREE.Mesh(this.starGeometry, this.starMaterial);
        mesh.visible = false;
        this.scene.add(mesh);
        return mesh;
      });

      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(canvas);
      canvas.addEventListener('pointerdown', (event) => {
        if (event.isPrimary && event.button === 0) this.down = { id: event.pointerId, x: event.clientX, y: event.clientY };
      }, { signal });
      canvas.addEventListener('pointercancel', () => { this.down = null; }, { signal });
      canvas.addEventListener('pointerup', (event) => this.pick(event), { signal });
      canvas.addEventListener('webglcontextlost', (event) => {
        event.preventDefault();
        this.available = false;
        this.stop();
        this.onFallback();
      }, { signal });
      canvas.addEventListener('webglcontextrestored', () => {
        this.available = true;
        this.resize();
        this.onFallback();
        this.start();
      }, { signal });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.stop();
        else this.start();
      }, { signal });
      this.available = true;
    } catch {
      this.available = false;
    }
  }

  setScreen(mode, entries, referenceId, level) {
    this.mode = mode;
    this.entries = entries;
    this.referenceId = referenceId;
    this.hinted = false;
    this.effect = null;
    this.started = performance.now();
    this.setMood(mode === 'menu' ? 'wave' : 'thinking');
    if (!this.scene) return;
    this.room.userData.setMarketMode(level === 3);
    this.toys.clear();
    this.nodes.clear();
    for (const star of this.stars) star.visible = false;
    const menu = mode === 'menu';
    const bear = entries.find(({ type }) => type === 'mimo');
    this.mimo.group.position.set(bear?.x ?? (entries.length === 5 ? 3.07 : 4.65), bear ? (menu ? 0 : .19) : 0, bear?.z ?? -2.35);
    this.mimo.group.scale.setScalar(menu ? 1.36 : bear ? 1.03 : .67);
    for (const entry of entries) {
      const group = new THREE.Group();
      group.position.set(entry.x, .025, entry.z ?? .32);
      this.toys.add(group);

      const isReference = entry.id === referenceId;
      const stand = new THREE.Mesh(this.podiumGeometry, isReference ? this.referenceMaterial : this.podiumMaterial);
      stand.position.y = .075;
      stand.scale.setScalar(menu ? 1.13 : 1);
      stand.castShadow = stand.receiveShadow = true;
      const rim = new THREE.Mesh(this.rimGeometry, this.rimMaterial);
      rim.position.y = .137;
      rim.scale.setScalar(menu ? 1.13 : 1);
      if (!menu || entry.type !== 'mimo') group.add(stand, rim);

      const model = entry.type === 'mimo' ? null : createToy(entry.type);
      if (model) {
        model.userData.choiceId = entry.id;
        model.position.y = .16;
        model.scale.setScalar(menu ? 1.12 : 1);
        group.add(model);
      }

      const hit = entry.selectable ? new THREE.Mesh(this.hitGeometry, this.hitMaterial) : null;
      if (hit) {
        hit.userData.choiceId = entry.id;
        hit.position.y = .84;
        group.add(hit);
      }
      this.nodes.set(entry.id, { entry, group, model, stand, hit, isReference });
    }
    this.resize();
    this.start();
  }

  setMood(mood) {
    this.mood = mood;
    this.moodStart = performance.now();
  }

  setActive(active) {
    this.active = active;
    this.canvas.classList.toggle('choosing', active);
  }

  setHint(hinted) {
    this.hinted = hinted;
  }

  react(id, correct) {
    this.effect = { id, correct, start: performance.now() };
    this.setMood(correct ? 'happy' : 'encourage');
  }

  pick(event) {
    const down = this.down;
    this.down = null;
    if (!this.available || !this.active || down?.id !== event.pointerId ||
        Math.hypot(down.x - event.clientX, down.y - event.clientY) > 20) return;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(2 * (event.clientX - rect.left) / rect.width - 1, 1 - 2 * (event.clientY - rect.top) / rect.height);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const exact = this.raycaster.intersectObjects(this.selectableModels, true)[0];
    if (exact) {
      let object = exact.object;
      while (!object.userData.choiceId) object = object.parent;
      this.choose(object.userData.choiceId);
      return;
    }
    const hit = this.raycaster.intersectObjects(this.hitTargets, false)[0];
    if (hit) this.choose(hit.object.userData.choiceId);
  }

  resize() {
    if (!this.available) return;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (!width || !height) return;
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height, false);
    const selectable = [...this.nodes.values()].filter(({ hit }) => hit);
    this.hitTargets = selectable.map(({ hit }) => hit);
    this.selectableModels = selectable.map(({ model }) => model).filter(Boolean);
    this.updateCamera(performance.now());
    this.start();
  }

  project(x, y, z) {
    this.point.set(x, y, z).project(this.camera);
    return { x: (this.point.x + 1) * 50, y: (1 - this.point.y) * 50 };
  }

  updateCamera(now) {
    const opening = this.reduced.matches ? 1 : ease((now - this.started) / 670);
    const zoom = (this.mode === 'menu' ? 1.04 : 1) - .05 * (1 - opening);
    this.camera.frame(this.width, this.height, this.mode, zoom, this.entries.length);
    const positions = new Map();
    for (const { entry } of this.nodes.values()) {
      const z = entry.z ?? .32;
      positions.set(entry.id, {
        target: this.project(entry.x, .77, z + .18),
        foot: this.project(entry.x, .04, z + .83),
        hand: this.project(entry.x + .42, .38, z + .48),
        head: this.project(entry.x, entry.type === 'mimo' ? (this.mode === 'menu' ? 3.62 : 2.95) : 1.87, z),
      });
    }
    this.onLayout(positions);
  }

  start() {
    if (!this.available || document.hidden || this.frame) return;
    this.frame = requestAnimationFrame((now) => this.render(now));
  }

  stop() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  render(now) {
    this.frame = 0;
    if (!this.available) return;
    if (now - this.started < 720 || this.camera.zoom !== (this.mode === 'menu' ? 1.04 : 1)) this.updateCamera(now);
    const elapsed = (now - this.started) / 1000;
    const effectAge = this.effect ? (now - this.effect.start) / 1000 : Infinity;
    const reduce = this.reduced.matches;
    const moodAge = (now - this.moodStart) / 1000;
    const mood = this.mood === 'wave' && moodAge > 2.2 ? 'idle' : this.mood;
    this.mimo.animate(now / 1000, mood, moodAge, reduce);
    let index = 0;
    for (const node of this.nodes.values()) {
      const { entry, group, model, stand, isReference } = node;
      const selected = this.effect?.id === entry.id;
      const correct = selected && this.effect.correct;
      const wrong = selected && !correct && effectAge < .46;
      stand.material = correct ? this.correctMaterial : isReference && this.hinted ? this.hintMaterial : isReference ? this.referenceMaterial : this.podiumMaterial;
      if (model) {
        const arrival = reduce ? 1 : ease((elapsed - index * .06) / .52);
        const hop = correct && !reduce ? Math.sin(Math.PI * Math.min(effectAge / .62, 1)) : 0;
        const scale = (this.mode === 'menu' ? 1.12 : 1) * (.2 + .8 * arrival) * (1 + .12 * hop);
        model.scale.setScalar(scale);
        model.position.y = .16 + .35 * hop;
        model.rotation.z = wrong && !reduce ? Math.sin(effectAge * 46) * .15 * (1 - effectAge / .46) : 0;
      }
      group.updateMatrixWorld();
      index++;
    }
    this.animateStars(effectAge, reduce);
    this.renderer.render(this.scene, this.camera);
    this.start();
  }

  animateStars(age, reduce) {
    const node = this.nodes.get(this.effect?.id);
    const visible = node && this.effect.correct && age < 1.05;
    this.stars.forEach((star, index) => {
      star.visible = Boolean(visible);
      if (!visible) return;
      const t = reduce ? .52 : age;
      const direction = index / this.stars.length * Math.PI * 2;
      const spread = .2 + t * 1.23;
      star.position.set(
        node.entry.x + Math.cos(direction) * spread,
        .96 + t * 1.67 + Math.sin(direction) * spread * .72,
        (node.entry.z ?? .32) + .63,
      );
      star.rotation.z = direction + t * 2;
      star.scale.setScalar((1 - t * .56) * (.62 + (index % 3) * .24));
    });
  }

  dispose() {
    this.stop();
    this.abort.abort();
    this.resizeObserver?.disconnect();
    if (!this.scene) return;
    this.toys.clear();
    disposeToyAssets();
    this.room.userData.disposeMarketMaterials();
    const assets = new Set([
      this.podiumGeometry, this.rimGeometry, this.hitGeometry, this.podiumMaterial, this.referenceMaterial,
      this.hintMaterial, this.correctMaterial, this.rimMaterial, this.hitMaterial, this.starGeometry, this.starMaterial,
    ]);
    this.scene.traverse((node) => {
      if (node.shadow) node.shadow.dispose();
      if (node.geometry) assets.add(node.geometry);
      const materials = node.material ? [node.material].flat() : [];
      for (const material of materials) {
        for (const value of Object.values(material)) if (value?.isTexture) assets.add(value);
        assets.add(material);
      }
    });
    for (const asset of assets) asset.dispose();
    this.renderer.dispose();
  }
}
