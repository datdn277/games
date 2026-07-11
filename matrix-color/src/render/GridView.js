import * as THREE from "three";
import { COLOR_BY_ID } from "../data/colors.js";
import { GridCellView } from "./GridCellView.js";

const EASE_OUT_BACK = (value) => 1 + 2.3 * Math.pow(value - 1, 3) + 1.3 * Math.pow(value - 1, 2);

export class GridView {
  constructor(host, { interactive = false, ariaLabel = "Ma trận màu" } = {}) {
    this.host = host;
    this.interactive = interactive;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#f5f2fc");
    this.camera = new THREE.OrthographicCamera(-3, 3, 3, -3, 0.1, 30);
    this.camera.position.set(0, 8, 0.001);
    this.camera.up.set(0, 0, -1);
    this.camera.lookAt(0, 0, 0);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute("aria-label", ariaLabel);
    this.renderer.domElement.setAttribute("role", "application");
    if (interactive) this.renderer.domElement.tabIndex = 0;
    this.host.appendChild(this.renderer.domElement);
    this.renderer.domElement.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      this.host.classList.add("context-lost");
      this.host.setAttribute("data-context-message", "Đang khôi phục bảng màu…");
    });
    this.renderer.domElement.addEventListener("webglcontextrestored", () => {
      this.host.classList.remove("context-lost");
      this.renderer.resetState();
    });
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.cells = [];
    this.tweens = [];
    this.sparkles = [];
    this.#createLights();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
  }

  #createLights() {
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8d84a8, 2.2));
    const key = new THREE.DirectionalLight(0xfff8e6, 3.2);
    key.position.set(-3, 7, -4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -5;
    key.shadow.camera.right = 5;
    key.shadow.camera.top = 5;
    key.shadow.camera.bottom = -5;
    this.scene.add(key);
  }

  build(grid, { showAnswers = false } = {}) {
    this.#disposeBoard();
    this.tweens.forEach((tween) => tween.resolve());
    this.tweens = [];
    this.sparkles = [];
    this.board = new THREE.Group();
    this.scene.add(this.board);
    this.rows = grid.length;
    this.columns = grid[0].length;
    this.cells = [];
    this.pickMeshes = [];
    const spacing = 1.1;

    const backplate = new THREE.Mesh(
      new THREE.BoxGeometry(this.columns * spacing + 0.32, 0.13, this.rows * spacing + 0.32),
      new THREE.MeshStandardMaterial({ color: "#ded9ef", roughness: 0.86, emissive: "#7667d8", emissiveIntensity: 0 })
    );
    backplate.position.y = -0.09;
    backplate.receiveShadow = true;
    this.backplate = backplate;
    this.board.add(backplate);

    for (let row = 0; row < this.rows; row += 1) {
      const rowCells = [];
      for (let column = 0; column < this.columns; column += 1) {
        const cell = new GridCellView({
          row,
          column,
          position: new THREE.Vector3(
            (column - (this.columns - 1) / 2) * spacing,
            0,
            (row - (this.rows - 1) / 2) * spacing
          )
        });
        cell.setColor(showAnswers ? grid[row][column] : grid[row][column], { tick: false });
        this.board.add(cell.group);
        this.pickMeshes.push(cell.mesh);
        rowCells.push(cell);
      }
      this.cells.push(rowCells);
    }
    this.viewSize = Math.max(this.rows, this.columns) * 1.23 + 0.45;
    this.resize();
  }

  setGridColors(grid, { template = false } = {}) {
    grid.forEach((row, rowIndex) => row.forEach((colorId, columnIndex) => {
      this.cells[rowIndex]?.[columnIndex]?.setColor(colorId, { tick: !template && Boolean(colorId) });
    }));
  }

  pickCell(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.pickMeshes, false)[0];
    const cell = hit?.object?.userData?.cell;
    return cell ? { row: cell.row, column: cell.column } : null;
  }

  async animateCorrect(row, column, colorId) {
    const cell = this.cells[row]?.[column];
    if (!cell) return;
    const fromColor = cell.material.color.clone();
    const targetColor = new THREE.Color(COLOR_BY_ID[colorId].hex);
    cell.setColor(colorId, { tick: false });
    cell.material.color.copy(fromColor);
    cell.group.scale.setScalar(0.94);
    await this.tween(250, (progress) => {
      cell.material.color.lerpColors(fromColor, targetColor, progress);
      const scale = 0.94 + EASE_OUT_BACK(progress) * 0.06;
      cell.group.scale.setScalar(scale);
      cell.group.position.y = Math.sin(progress * Math.PI) * 0.12;
    });
    cell.group.scale.setScalar(1);
    cell.group.position.y = 0;
    cell.setTick(true);
    this.#spawnSparkles(cell.group.position, colorId, 6);
  }

  async animateWrong(row, column, attemptedColor, previousColor) {
    const cell = this.cells[row]?.[column];
    if (!cell) return;
    const baseX = cell.group.position.x;
    cell.setColor(attemptedColor, { tick: false });
    cell.setWarning(true);
    await this.tween(420, (progress) => {
      cell.group.position.x = baseX + Math.sin(progress * Math.PI * 8) * 0.09 * (1 - progress);
    });
    cell.group.position.x = baseX;
    cell.setWarning(false);
    cell.setColor(previousColor, { tick: Boolean(previousColor) });
  }

  async animateErase(row, column) {
    const cell = this.cells[row]?.[column];
    if (!cell) return;
    await this.tween(160, (progress) => cell.group.scale.setScalar(1 - Math.sin(progress * Math.PI) * 0.08));
    cell.setColor(null);
    cell.group.scale.setScalar(1);
  }

  clearHints() {
    this.cells.flat().forEach((cell) => cell.setHint("none"));
  }

  hintTarget(row, column) {
    this.clearHints();
    this.cells[row]?.[column]?.setHint("target");
  }

  hintLine(row, column) {
    this.clearHints();
    this.cells.flat().forEach((cell) => {
      if (cell.row === row || cell.column === column) cell.setHint("line");
    });
    this.cells[row]?.[column]?.setHint("target");
  }

  focusCell(row, column) {
    this.cells.flat().forEach((cell) => {
      if (cell.hintRing.material.color.getHexString() === "7468df") cell.setHint("none");
    });
    this.cells[row]?.[column]?.setHint("focus");
  }

  celebrate() {
    this.backplate.material.emissiveIntensity = 0;
    this.tween(900, (progress) => {
      this.backplate.material.emissiveIntensity = Math.sin(progress * Math.PI) * 0.55;
    });
    this.cells.flat().forEach((cell, index) => {
      this.tween(330, (progress) => {
        cell.group.position.y = Math.sin(progress * Math.PI) * 0.17;
        cell.group.scale.setScalar(1 + Math.sin(progress * Math.PI) * 0.055);
      }, index * 32).then(() => {
        cell.group.position.y = 0;
        cell.group.scale.setScalar(1);
      });
    });
    for (let index = 0; index < 16; index += 1) {
      const row = index % this.rows;
      const column = (index * 3) % this.columns;
      this.#spawnSparkles(this.cells[row][column].group.position, ["red", "blue", "yellow", "green"][index % 4], 1, index * 30);
    }
  }

  tween(duration, update, delay = 0) {
    return new Promise((resolve) => {
      this.tweens.push({ start: performance.now() + delay, duration, update, resolve });
    });
  }

  update(now) {
    this.tweens = this.tweens.filter((tween) => {
      if (now < tween.start) return true;
      const progress = Math.min(1, (now - tween.start) / tween.duration);
      tween.update(progress);
      if (progress >= 1) {
        tween.resolve();
        return false;
      }
      return true;
    });
    this.sparkles = this.sparkles.filter((sparkle) => {
      const progress = Math.min(1, (now - sparkle.start) / sparkle.duration);
      if (progress < 0) return true;
      sparkle.mesh.position.y = 0.2 + Math.sin(progress * Math.PI) * 0.65;
      sparkle.mesh.position.x = sparkle.origin.x + sparkle.velocity.x * progress;
      sparkle.mesh.position.z = sparkle.origin.z + sparkle.velocity.z * progress;
      sparkle.mesh.material.opacity = 1 - progress;
      if (progress >= 1) {
        this.board.remove(sparkle.mesh);
        return false;
      }
      return true;
    });
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(width, height, false);
    const aspect = width / height;
    const view = this.viewSize ?? 4;
    this.camera.left = -view * aspect / 2;
    this.camera.right = view * aspect / 2;
    this.camera.top = view / 2;
    this.camera.bottom = -view / 2;
    this.camera.updateProjectionMatrix();
  }

  destroy() {
    this.resizeObserver.disconnect();
    this.#disposeBoard();
    this.renderer.dispose();
    this.host.replaceChildren();
  }

  #spawnSparkles(position, colorId, count, delay = 0) {
    for (let index = 0; index < count; index += 1) {
      const mesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.045, 0),
        new THREE.MeshBasicMaterial({ color: COLOR_BY_ID[colorId]?.hex ?? "#ffd93d", transparent: true })
      );
      mesh.position.copy(position);
      mesh.position.y = 0.2;
      this.board.add(mesh);
      const angle = (index / Math.max(1, count)) * Math.PI * 2;
      this.sparkles.push({
        mesh,
        origin: position.clone(),
        velocity: new THREE.Vector3(Math.cos(angle) * 0.55, 0, Math.sin(angle) * 0.55),
        start: performance.now() + delay,
        duration: 520
      });
    }
  }

  #disposeBoard() {
    if (!this.board) return;
    this.scene.remove(this.board);
    this.board.traverse((object) => {
      object.geometry?.dispose?.();
      if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose?.());
      else object.material?.dispose?.();
    });
    this.board = null;
  }
}
