import * as THREE from "three";
import { AnimationController, easeInOutCubic } from "./AnimationController.js";
import { Fruit } from "./Fruit.js";

const MAX_PER_ROW = 5;

export function calculateFruitLayout(count) {
  if (!Number.isInteger(count) || count < 0) throw new Error("Số quả phải là số nguyên không âm.");
  const positions = [];
  const rows = Math.ceil(count / MAX_PER_ROW);
  for (let row = 0; row < rows; row += 1) {
    const rowStart = row * MAX_PER_ROW;
    const rowLength = Math.min(MAX_PER_ROW, count - rowStart);
    for (let column = 0; column < rowLength; column += 1) {
      positions.push({
        x: (column - (rowLength - 1) / 2) * 1.42,
        y: -0.2 + row * 1.22,
        z: 0.35 - row * 0.1,
      });
    }
  }
  return positions;
}

export class BasketScene {
  constructor(container, options = {}) {
    this.container = container;
    this.onCountChange = options.onCountChange ?? (() => {});
    this.animations = new AnimationController(options.animationSpeed ?? 1);
    this.fruits = [];
    this.fallbackCount = 0;
    this.fallback = false;
    this.running = true;
    this.init();
  }

  init() {
    try {
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0xfff5d8);
      this.camera = new THREE.OrthographicCamera(-6.4, 6.4, 4.3, -4.3, 0.1, 100);
      this.camera.position.set(0, 5.3, 13.5);
      this.camera.lookAt(0, 0.4, 0);

      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.domElement.setAttribute("aria-hidden", "true");
      this.container.replaceChildren(this.renderer.domElement);

      this.scene.add(new THREE.HemisphereLight(0xfff5dc, 0x9d6c48, 2.2));
      const keyLight = new THREE.DirectionalLight(0xffffff, 3.1);
      keyLight.position.set(-4, 8, 7);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      this.scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0xffc98f, 1.5);
      fillLight.position.set(6, 3, 4);
      this.scene.add(fillLight);

      this.fruitGroup = new THREE.Group();
      this.fruitGroup.position.z = 0.8;
      this.scene.add(this.createBasket(), this.fruitGroup);

      const floor = new THREE.Mesh(
        new THREE.CircleGeometry(6.2, 48),
        new THREE.MeshStandardMaterial({ color: 0xf4d9a6, roughness: 1 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, -2.5, -0.2);
      floor.receiveShadow = true;
      this.scene.add(floor);

      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.container);
      this.renderer.domElement.addEventListener("webglcontextlost", (event) => {
        event.preventDefault();
        this.running = false;
        this.container.classList.add("context-lost");
      });
      this.renderer.domElement.addEventListener("webglcontextrestored", () => {
        this.running = true;
        this.container.classList.remove("context-lost");
      });
      this.resize();
      this.renderer.setAnimationLoop(() => {
        if (this.running) this.renderer.render(this.scene, this.camera);
      });
    } catch (error) {
      console.warn("WebGL không khả dụng, chuyển sang chế độ hiển thị đơn giản.", error);
      this.enableFallback();
    }
  }

  createBasket() {
    const group = new THREE.Group();
    group.name = "basket";
    const wicker = new THREE.MeshStandardMaterial({ color: 0xc9823d, roughness: 0.82 });
    const darkWicker = new THREE.MeshStandardMaterial({ color: 0x8f4f25, roughness: 0.88 });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 3.7, 2.25, 32, 1, false), wicker);
    body.scale.z = 0.36;
    body.position.set(0, -1.45, -0.25);
    body.receiveShadow = true;
    body.castShadow = true;
    group.add(body);

    for (let index = -3; index <= 3; index += 1) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.05, 0.18), darkWicker);
      slat.position.set(index * 1.02, -1.42, 1.13);
      slat.rotation.z = index * 0.025;
      group.add(slat);
    }
    for (let row = 0; row < 3; row += 1) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(7.75 - row * 0.18, 0.13, 0.22), darkWicker);
      band.position.set(0, -2.08 + row * 0.58, 1.2);
      group.add(band);
    }

    const rim = new THREE.Mesh(new THREE.TorusGeometry(4.25, 0.18, 10, 48), darkWicker);
    rim.scale.y = 0.34;
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, -0.38, 0.25);
    group.add(rim);

    const handle = new THREE.Mesh(new THREE.TorusGeometry(3.95, 0.16, 12, 48, Math.PI), darkWicker);
    handle.rotation.z = Math.PI;
    handle.position.set(0, -0.25, -0.55);
    group.add(handle);
    return group;
  }

  enableFallback() {
    this.fallback = true;
    this.container.classList.add("basket-scene--fallback");
    this.fallbackElement = document.createElement("div");
    this.fallbackElement.className = "fruit-fallback";
    this.container.replaceChildren(this.fallbackElement);
  }

  resize() {
    if (this.fallback || !this.renderer) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const base = 5.2;
    const aspect = width / height;
    this.camera.left = -base * aspect;
    this.camera.right = base * aspect;
    this.camera.top = base;
    this.camera.bottom = -base;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  updateFallback(count) {
    this.fallbackCount = count;
    if (!this.fallbackElement) return;
    this.fallbackElement.innerHTML = `${Array.from({ length: count }, (_, index) => `<span style="--i:${index}">🍎</span>`).join("")}<div class="fallback-basket">🧺</div>`;
  }

  clearFruits() {
    this.fruits.forEach((fruit) => {
      this.fruitGroup?.remove(fruit.group);
      fruit.dispose();
    });
    this.fruits = [];
  }

  setFruitCount(count, announce = true) {
    if (this.fallback) {
      this.updateFallback(count);
      if (announce) this.onCountChange(count);
      return;
    }
    this.clearFruits();
    const positions = calculateFruitLayout(count);
    positions.forEach((position) => {
      const fruit = new Fruit();
      fruit.group.position.set(position.x, position.y, position.z);
      this.fruitGroup.add(fruit.group);
      this.fruits.push(fruit);
    });
    if (announce) this.onCountChange(count);
  }

  async animateInitial(count) {
    if (this.fallback) {
      this.updateFallback(0);
      for (let index = 1; index <= count; index += 1) {
        this.updateFallback(index);
        this.onCountChange(index);
        await this.animations.sleep(180, true);
      }
      return;
    }

    this.clearFruits();
    const positions = calculateFruitLayout(count);
    for (let index = 0; index < positions.length; index += 1) {
      const position = positions[index];
      const fruit = new Fruit();
      fruit.group.position.set(position.x, position.y + 0.4, position.z);
      fruit.group.scale.setScalar(0.01);
      this.fruitGroup.add(fruit.group);
      this.fruits.push(fruit);
      await this.animations.tween(190, (progress) => {
        const bounce = 1 + Math.sin(progress * Math.PI) * 0.16;
        fruit.group.scale.setScalar(0.84 * progress * bounce);
        fruit.group.position.y = position.y + (1 - progress) * 0.4;
      }, { essential: true });
      fruit.group.scale.setScalar(0.84);
      this.onCountChange(index + 1);
    }
  }

  repositionFruits(count = this.getFruitCount()) {
    if (this.fallback) return;
    const positions = calculateFruitLayout(count);
    this.fruits.forEach((fruit, index) => {
      const position = positions[index];
      if (position) fruit.group.position.set(position.x, position.y, position.z);
    });
  }

  async animateAddFruit(amount, options = {}) {
    const delay = options.slow ? 520 : 380;
    const travelDuration = options.slow ? 920 : 760;
    if (this.fallback) {
      for (let index = 0; index < amount; index += 1) {
        this.updateFallback(this.fallbackCount + 1);
        this.onCountChange(this.fallbackCount);
        await this.animations.sleep(travelDuration + delay, true);
      }
      return;
    }

    const startCount = this.fruits.length;
    const finalCount = startCount + amount;
    const finalPositions = calculateFruitLayout(finalCount);
    this.fruits.forEach((fruit, index) => {
      const target = finalPositions[index];
      fruit.group.position.set(target.x, target.y, target.z);
    });

    for (let index = 0; index < amount; index += 1) {
      const target = finalPositions[startCount + index];
      const fruit = new Fruit();
      const start = { x: 5.6, y: 2.8 - index * 0.22, z: 1.7 };
      fruit.group.position.set(start.x, start.y, start.z);
      fruit.group.scale.setScalar(0.7);
      fruit.setHighlight(true);
      this.fruitGroup.add(fruit.group);
      this.fruits.push(fruit);
      await this.animations.tween(travelDuration, (progress) => {
        fruit.group.position.set(
          THREE.MathUtils.lerp(start.x, target.x, progress),
          THREE.MathUtils.lerp(start.y, target.y, progress) + Math.sin(progress * Math.PI) * 1.15,
          THREE.MathUtils.lerp(start.z, target.z, progress),
        );
        fruit.group.rotation.z = progress * Math.PI * 2;
      }, { easing: easeInOutCubic, essential: true });
      fruit.group.position.set(target.x, target.y, target.z);
      fruit.group.rotation.z = 0;
      fruit.setHighlight(false);
      this.onCountChange(this.fruits.length);
      await this.animations.sleep(delay, true);
    }
  }

  async animateRemoveFruit(amount, options = {}) {
    const delay = options.slow ? 520 : 380;
    const travelDuration = options.slow ? 920 : 760;
    if (this.fallback) {
      for (let index = 0; index < amount; index += 1) {
        this.updateFallback(Math.max(0, this.fallbackCount - 1));
        this.onCountChange(this.fallbackCount);
        await this.animations.sleep(travelDuration + delay, true);
      }
      return;
    }

    for (let index = 0; index < amount; index += 1) {
      const fruit = this.fruits.at(-1);
      if (!fruit) break;
      const start = fruit.group.position.clone();
      fruit.setHighlight(true);
      await this.animations.sleep(options.slow ? 480 : 340, true);
      await this.animations.tween(travelDuration, (progress) => {
        fruit.group.position.set(
          THREE.MathUtils.lerp(start.x, -5.8, progress),
          THREE.MathUtils.lerp(start.y, 3.2, progress) + Math.sin(progress * Math.PI) * 0.75,
          THREE.MathUtils.lerp(start.z, 2, progress),
        );
        fruit.group.rotation.z = -progress * Math.PI * 2;
        fruit.group.scale.setScalar(0.84 * (1 - progress * 0.42));
      }, { easing: easeInOutCubic, essential: true });
      this.fruits.pop();
      this.fruitGroup.remove(fruit.group);
      fruit.dispose();
      this.repositionFruits();
      this.onCountChange(this.fruits.length);
      await this.animations.sleep(delay, true);
    }
  }

  async replayStep(step) {
    this.setFruitCount(step.inputValue);
    await this.animations.sleep(260, true);
    if (step.operator === "+") await this.animateAddFruit(step.operand, { slow: true });
    else await this.animateRemoveFruit(step.operand, { slow: true });
  }

  async countFruit() {
    const count = this.getFruitCount();
    if (this.fallback) {
      const nodes = [...this.fallbackElement.querySelectorAll("span")];
      for (let index = 0; index < nodes.length; index += 1) {
        nodes[index].classList.add("counting");
        this.onCountHighlight?.(index + 1);
        await this.animations.sleep(330, true);
        nodes[index].classList.remove("counting");
      }
      return count;
    }
    for (let index = 0; index < this.fruits.length; index += 1) {
      const fruit = this.fruits[index];
      fruit.setHighlight(true);
      const baseY = fruit.group.position.y;
      await this.animations.tween(260, (progress) => {
        fruit.group.position.y = baseY + Math.sin(progress * Math.PI) * 0.34;
        fruit.group.scale.setScalar(0.84 + Math.sin(progress * Math.PI) * 0.12);
      }, { essential: true });
      fruit.group.position.y = baseY;
      fruit.group.scale.setScalar(0.84);
      fruit.setHighlight(false);
      this.onCountHighlight?.(index + 1);
    }
    return count;
  }

  async bounceAll() {
    if (this.fallback) {
      this.fallbackElement.classList.add("celebrate-fruit");
      await this.animations.sleep(650);
      this.fallbackElement.classList.remove("celebrate-fruit");
      return;
    }
    const starts = this.fruits.map((fruit) => fruit.group.position.y);
    await this.animations.tween(620, (progress) => {
      this.fruits.forEach((fruit, index) => {
        fruit.group.position.y = starts[index] + Math.abs(Math.sin(progress * Math.PI * 2)) * 0.42;
      });
    });
    this.fruits.forEach((fruit, index) => {
      fruit.group.position.y = starts[index];
    });
  }

  getFruitCount() {
    return this.fallback ? this.fallbackCount : this.fruits.length;
  }
}
