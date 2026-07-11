import * as THREE from "three";
import { DIRECTIONS } from "./directions.js";

const COLORS = {
  grass: 0xa9df7c,
  grassAlt: 0xbbe890,
  tileSide: 0x7fbd63,
  soil: 0x8d5a3c,
  cream: 0xfff8e8,
  orange: 0xf38b32,
  green: 0x4a9e4a,
  blue: 0x69bfe8,
  stone: 0x8d99a4,
  dark: 0x3c3134,
  pink: 0xf6a8ae,
  hint: 0xffca3a
};

export class GardenScene {
  constructor(host) {
    this.host = host;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xe9f8df);
    this.camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
    this.camera.position.set(0, 9, 8.2);
    this.camera.lookAt(0, 0, 0);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    this.host.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();
    this.tweens = [];
    this.carrotGroups = new Map();
    this.obstacleGroups = new Map();
    this.particles = [];
    this.reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    this.#createLights();
    this.#bindResize();
    this.#animate();
  }

  #createLights() {
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x6b8e4e, 2.2));
    const sun = new THREE.DirectionalLight(0xfff4d6, 3.4);
    sun.position.set(-5, 10, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -8;
    sun.shadow.camera.right = 8;
    sun.shadow.camera.top = 8;
    sun.shadow.camera.bottom = -8;
    this.scene.add(sun);
  }

  build(level) {
    if (this.world) this.scene.remove(this.world);
    this.world = new THREE.Group();
    this.scene.add(this.world);
    this.level = level;
    this.rows = level.rows;
    this.columns = level.columns;
    this.cellSize = 1.48;
    this.carrotGroups.clear();
    this.obstacleGroups.clear();
    this.hintGroup = null;

    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(this.columns * this.cellSize + 1.3, 0.28, this.rows * this.cellSize + 1.3),
      new THREE.MeshStandardMaterial({ color: 0x76b95d, roughness: 0.95 })
    );
    floor.position.y = -0.24;
    floor.receiveShadow = true;
    this.world.add(floor);

    for (let row = 0; row < this.rows; row += 1) {
      for (let column = 0; column < this.columns; column += 1) {
        const tile = new THREE.Mesh(
          new THREE.BoxGeometry(1.3, 0.18, 1.3),
          new THREE.MeshStandardMaterial({
            color: (row + column) % 2 ? COLORS.grassAlt : COLORS.grass,
            roughness: 0.82
          })
        );
        tile.position.copy(this.cellPosition({ row, column }, 0));
        tile.receiveShadow = true;
        tile.castShadow = true;
        this.world.add(tile);
      }
    }

    this.homeGroup = this.#createHome();
    this.homeGroup.position.copy(this.cellPosition(level.home, 0.17));
    this.world.add(this.homeGroup);

    level.carrots.forEach((carrot, index) => {
      const group = this.#createCarrot();
      group.position.copy(this.cellPosition(carrot, 0.62));
      group.userData.floatOffset = index * 1.7;
      this.carrotGroups.set(carrot.id, group);
      this.world.add(group);
    });

    level.obstacles.forEach((obstacle) => {
      const group = this.#createObstacle(obstacle.type);
      group.position.copy(this.cellPosition(obstacle, 0.15));
      this.obstacleGroups.set(obstacle.id, group);
      this.world.add(group);
    });

    this.rabbit = this.#createRabbit();
    this.rabbit.position.copy(this.cellPosition(level.player, 0.42));
    this.setRabbitDirection(level.player.direction);
    this.world.add(this.rabbit);
    this.#fitCamera();
    this.resize();
  }

  cellPosition(cell, y = 0) {
    return new THREE.Vector3(
      (cell.column - (this.columns - 1) / 2) * this.cellSize,
      y,
      (cell.row - (this.rows - 1) / 2) * this.cellSize
    );
  }

  setRabbitDirection(direction) {
    if (!this.rabbit) return;
    const rotations = { down: 0, up: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 };
    this.rabbit.rotation.y = rotations[direction] ?? 0;
  }

  async animateMove(from, to, direction) {
    this.clearHint();
    this.setRabbitDirection(direction);
    const start = this.cellPosition(from, 0.42);
    const end = this.cellPosition(to, 0.42);
    this.#spawnStepRing(start);
    await this.#tween(this.reducedMotion ? 80 : 380, (progress) => {
      const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      this.rabbit.position.lerpVectors(start, end, eased);
      this.rabbit.position.y = 0.42 + Math.sin(progress * Math.PI) * 0.36;
      this.rabbit.rotation.z = Math.sin(progress * Math.PI * 2) * 0.035;
    });
    this.rabbit.position.copy(end);
    this.rabbit.rotation.z = 0;
    this.#spawnStepRing(end);
  }

  async animateBlocked(direction, obstacle = null) {
    this.clearHint();
    this.setRabbitDirection(direction);
    const baseX = this.rabbit.position.x;
    const target = obstacle ? this.obstacleGroups.get(obstacle.id) : null;
    const baseTargetX = target?.position.x ?? 0;
    await this.#tween(this.reducedMotion ? 80 : 300, (progress) => {
      const strength = (1 - progress) * Math.sin(progress * Math.PI * 7) * 0.12;
      this.rabbit.position.x = baseX + strength;
      if (target) target.position.x = baseTargetX - strength * 0.45;
    });
    this.rabbit.position.x = baseX;
    if (target) target.position.x = baseTargetX;
  }

  async collectCarrot(carrot) {
    const group = this.carrotGroups.get(carrot.id);
    if (!group) return;
    group.userData.collecting = true;
    const startY = group.position.y;
    await this.#tween(this.reducedMotion ? 80 : 430, (progress) => {
      group.position.y = startY + progress * 1.25;
      group.rotation.y += 0.25;
      const scale = Math.max(0.01, 1 - progress);
      group.scale.setScalar(scale);
    });
    group.visible = false;
    group.userData.collecting = false;
  }

  unlockHome() {
    if (!this.homeGroup) return;
    this.homeGroup.userData.unlocked = true;
    this.homeGroup.userData.glow.material.opacity = 0.62;
    this.homeGroup.userData.ring.material.emissiveIntensity = 1.6;
  }

  showHint(from, to, target) {
    this.clearHint();
    const origin = this.cellPosition(from, 0.78);
    const destination = this.cellPosition(to, 0.78);
    const vector = destination.clone().sub(origin);
    const distance = vector.length();
    const arrow = new THREE.ArrowHelper(vector.normalize(), origin, distance * 0.72, COLORS.hint, 0.34, 0.25);
    const playerRing = this.#createHighlightRing(0x6dcbf1, 0.57);
    playerRing.position.copy(this.cellPosition(from, 0.2));
    const targetRing = this.#createHighlightRing(COLORS.hint, 0.64);
    targetRing.position.copy(this.cellPosition(target, 0.22));
    this.hintGroup = new THREE.Group();
    this.hintGroup.add(arrow, playerRing, targetRing);
    this.world.add(this.hintGroup);
  }

  clearHint() {
    if (!this.hintGroup || !this.world) return;
    this.world.remove(this.hintGroup);
    this.hintGroup = null;
  }

  celebrate() {
    const baseY = this.rabbit.position.y;
    this.#tween(this.reducedMotion ? 120 : 850, (progress) => {
      this.rabbit.position.y = baseY + Math.abs(Math.sin(progress * Math.PI * 3)) * 0.58 * (1 - progress * 0.25);
      this.rabbit.rotation.y += 0.065;
    }).then(() => { this.rabbit.position.y = baseY; });
    for (let index = 0; index < 18; index += 1) this.#spawnParticle(index);
  }

  resize() {
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(width, height, false);
    const aspect = width / height;
    const view = this.camera.userData.viewSize ?? 6;
    this.camera.left = -view * aspect / 2;
    this.camera.right = view * aspect / 2;
    this.camera.top = view / 2;
    this.camera.bottom = -view / 2;
    this.camera.updateProjectionMatrix();
  }

  destroy() {
    cancelAnimationFrame(this.frameId);
    this.resizeObserver?.disconnect();
    this.renderer.dispose();
    this.host.replaceChildren();
  }

  #fitCamera() {
    this.camera.userData.viewSize = Math.max(this.rows * 1.62 + 1.5, 6.4);
  }

  #bindResize() {
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.host);
  }

  #createRabbit() {
    const group = new THREE.Group();
    const cream = new THREE.MeshStandardMaterial({ color: COLORS.cream, roughness: 0.65 });
    const pink = new THREE.MeshStandardMaterial({ color: COLORS.pink, roughness: 0.7 });
    const dark = new THREE.MeshStandardMaterial({ color: COLORS.dark, roughness: 0.6 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 18), cream);
    body.scale.set(0.88, 1.1, 0.8);
    body.position.y = 0.27;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 24, 18), cream);
    head.position.set(0, 0.63, 0.12);
    group.add(body, head);

    [-0.12, 0.12].forEach((x) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.09, 18, 14), cream);
      ear.scale.set(0.75, 2.35, 0.65);
      ear.position.set(x, 0.98, 0.08);
      ear.rotation.z = x * 1.1;
      const inner = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), pink);
      inner.scale.set(0.55, 2.1, 0.38);
      inner.position.set(x, 0.99, 0.15);
      inner.rotation.z = x * 1.1;
      group.add(ear, inner);
    });
    [-0.1, 0.1].forEach((x) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), dark);
      eye.position.set(x, 0.68, 0.365);
      group.add(eye);
    });
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), pink);
    nose.position.set(0, 0.59, 0.405);
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), cream);
    tail.position.set(0, 0.3, -0.3);
    group.add(nose, tail);
    group.traverse((object) => { if (object.isMesh) object.castShadow = true; });
    return group;
  }

  #createCarrot() {
    const group = new THREE.Group();
    group.rotation.z = -0.22;
    const root = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.56, 18),
      new THREE.MeshStandardMaterial({ color: COLORS.orange, roughness: 0.7 })
    );
    root.rotation.z = Math.PI;
    root.position.y = -0.12;
    group.add(root);
    [-0.1, 0, 0.1].forEach((x, index) => {
      const leaf = new THREE.Mesh(
        new THREE.ConeGeometry(0.07, 0.32, 10),
        new THREE.MeshStandardMaterial({ color: COLORS.green, roughness: 0.75 })
      );
      leaf.position.set(x, 0.23, 0);
      leaf.rotation.z = (index - 1) * 0.38;
      group.add(leaf);
    });
    group.traverse((object) => { if (object.isMesh) object.castShadow = true; });
    return group;
  }

  #createObstacle(type) {
    const group = new THREE.Group();
    if (type === "tree") {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.19, 0.56, 12), new THREE.MeshStandardMaterial({ color: 0x8d603e }));
      trunk.position.y = 0.28;
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 14), new THREE.MeshStandardMaterial({ color: 0x4f9e54, roughness: 0.85 }));
      crown.position.y = 0.78;
      crown.scale.set(1, 0.9, 1);
      group.add(trunk, crown);
    } else if (type === "water") {
      const water = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.59, 0.08, 28), new THREE.MeshStandardMaterial({ color: COLORS.blue, roughness: 0.25, metalness: 0.05 }));
      water.position.y = 0.04;
      water.scale.z = 0.72;
      group.add(water);
    } else {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 1), new THREE.MeshStandardMaterial({ color: COLORS.stone, roughness: 0.95 }));
      rock.position.y = 0.35;
      rock.scale.set(1.12, 0.78, 0.92);
      rock.rotation.set(0.15, 0.4, -0.1);
      group.add(rock);
    }
    group.traverse((object) => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; } });
    return group;
  }

  #createHome() {
    const group = new THREE.Group();
    const mound = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: COLORS.soil, roughness: 0.95 }));
    mound.scale.set(1.1, 0.75, 0.72);
    mound.position.y = 0.02;
    mound.rotation.x = -Math.PI / 2;
    const entrance = new THREE.Mesh(new THREE.CircleGeometry(0.31, 28), new THREE.MeshStandardMaterial({ color: 0x342825, roughness: 1 }));
    entrance.position.set(0, 0.31, 0.4);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.075, 12, 28, Math.PI), new THREE.MeshStandardMaterial({ color: 0xc68a55, emissive: 0xffb83e, emissiveIntensity: 0 }));
    ring.position.set(0, 0.31, 0.42);
    ring.rotation.z = Math.PI;
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.58, 32), new THREE.MeshBasicMaterial({ color: 0xffd45c, transparent: true, opacity: 0, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.04;
    group.add(glow, mound, entrance, ring);
    group.userData = { unlocked: false, glow, ring };
    group.traverse((object) => { if (object.isMesh) object.castShadow = true; });
    return group;
  }

  #createHighlightRing(color, radius) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.055, 10, 36),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.88, depthTest: false })
    );
    ring.rotation.x = Math.PI / 2;
    return ring;
  }

  #spawnStepRing(position) {
    const ring = this.#createHighlightRing(0xffffff, 0.2);
    ring.position.set(position.x, 0.2, position.z);
    this.world.add(ring);
    this.#tween(this.reducedMotion ? 70 : 330, (progress) => {
      ring.scale.setScalar(1 + progress * 2.2);
      ring.material.opacity = 0.7 * (1 - progress);
    }).then(() => this.world?.remove(ring));
  }

  #spawnParticle(index) {
    const material = new THREE.MeshBasicMaterial({ color: [0xffca3a, 0xff8a66, 0x6cc7ed, 0x9bd96b][index % 4] });
    const particle = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), material);
    particle.position.copy(this.rabbit.position);
    const angle = (index / 18) * Math.PI * 2;
    const distance = 0.8 + (index % 4) * 0.17;
    this.world.add(particle);
    this.#tween(this.reducedMotion ? 100 : 900, (progress) => {
      particle.position.x = this.rabbit.position.x + Math.cos(angle) * distance * progress;
      particle.position.z = this.rabbit.position.z + Math.sin(angle) * distance * progress;
      particle.position.y = 0.7 + Math.sin(progress * Math.PI) * 1.3;
      material.opacity = 1 - progress;
      material.transparent = true;
    }).then(() => this.world?.remove(particle));
  }

  #tween(duration, update) {
    return new Promise((resolve) => {
      this.tweens.push({ start: performance.now(), duration, update, resolve });
    });
  }

  #animate = () => {
    this.frameId = requestAnimationFrame(this.#animate);
    const now = performance.now();
    this.tweens = this.tweens.filter((tween) => {
      const progress = Math.min(1, (now - tween.start) / tween.duration);
      tween.update(progress);
      if (progress >= 1) {
        tween.resolve();
        return false;
      }
      return true;
    });

    const elapsed = this.clock.getElapsedTime();
    this.carrotGroups.forEach((carrot) => {
      if (!carrot.visible || carrot.userData.collecting) return;
      carrot.rotation.y += 0.012;
      carrot.position.y = 0.62 + Math.sin(elapsed * 2.2 + carrot.userData.floatOffset) * 0.07;
    });
    if (this.homeGroup?.userData.unlocked) {
      const pulse = 0.5 + Math.sin(elapsed * 3) * 0.14;
      this.homeGroup.userData.glow.material.opacity = pulse;
    }
    if (this.hintGroup) this.hintGroup.children.slice(-2).forEach((ring) => { ring.scale.setScalar(1 + Math.sin(elapsed * 4) * 0.08); });
    this.renderer.render(this.scene, this.camera);
  };
}
