import * as THREE from "three";
import { PatternEngine } from "./PatternEngine.js";
import { LevelGenerator } from "./LevelGenerator.js";
import { GameState, calculateStars } from "./GameState.js";
import { ProgressStorage } from "./ProgressStorage.js";
import { AudioController } from "./AudioController.js";
import { HintController } from "./HintController.js";
import { AnimationController } from "./AnimationController.js";
import { InputController } from "./InputController.js";
import { GameUI } from "./GameUI.js";
import { Train } from "./Train.js";

const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

export class Game {
  constructor(root) {
    this.root = root;
    this.ui = new GameUI(root);
    this.engine = new PatternEngine();
    this.generator = new LevelGenerator({ engine: this.engine });
    this.storage = new ProgressStorage();
    this.progress = this.storage.load();
    this.state = new GameState({
      completedLevels: this.progress.completedLevels,
      stars: this.progress.stars,
      soundEnabled: this.progress.soundEnabled,
    });
    this.audio = new AudioController({ enabled: this.progress.soundEnabled });
    this.animations = new AnimationController();
    this.hints = new HintController({
      engine: this.engine,
      audio: this.audio,
      onMessage: (message, type) => this.ui.setMessage(message, type),
      onGroup: () => {
        this.train.highlightGroups(this.state.data.currentLevel.groups);
        this.ui.showPatternGroups(this.state.data.currentLevel);
      },
      onHighlightAnswer: (id) => this.ui.highlightAnswer(id),
    });
  }

  init() {
    this.createScene();
    this.bindUI();
    this.ui.setProgress(this.state.data);
    this.ui.setSound(this.state.data.soundEnabled);
    this.createNewLevel();
    this.renderer.setAnimationLoop((time) => this.render(time));
  }

  createScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#bfe9ff");
    this.scene.fog = new THREE.Fog("#bfe9ff", 28, 65);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
    this.camera.position.set(0, 4.2, 15);
    this.camera.lookAt(0, 0.95, 0);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.ui.canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene.add(new THREE.HemisphereLight("#fff8dd", "#78b269", 2.1));
    const sun = new THREE.DirectionalLight("#fff2cf", 2.7);
    sun.position.set(-7, 12, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -22;
    sun.shadow.camera.right = 22;
    sun.shadow.camera.top = 10;
    sun.shadow.camera.bottom = -5;
    this.scene.add(sun);
    this.buildEnvironment();
    this.train = new Train(this.scene);
    this.renderer.domElement.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      this.ui.setMessage("Hình ảnh đang nghỉ một chút. Con chờ nhé!", "neutral");
    });
    this.renderer.domElement.addEventListener("webglcontextrestored", () => this.createNewLevel());
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.ui.sceneWrap);
    this.resize();
  }

  buildEnvironment() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 30),
      new THREE.MeshStandardMaterial({ color: "#a8dc82", roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.65;
    ground.receiveShadow = true;
    this.scene.add(ground);
    const railMaterial = new THREE.MeshStandardMaterial({ color: "#70564b", roughness: 0.8 });
    [-0.42, 0.42].forEach((z) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(80, 0.12, 0.12), railMaterial);
      rail.position.set(0, -0.42, z);
      rail.receiveShadow = true;
      this.scene.add(rail);
    });
    for (let x = -38; x < 39; x += 1.15) {
      const sleeper = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 1.25), railMaterial);
      sleeper.position.set(x, -0.5, 0);
      this.scene.add(sleeper);
    }
    const cloudMaterial = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.75 });
    [-11, -3, 7, 14].forEach((x, index) => {
      const cloud = new THREE.Group();
      [0, 0.65, 1.25].forEach((offset, part) => {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.7 + part * 0.12, 16, 10), cloudMaterial);
        puff.position.set(offset, Math.sin(part) * 0.25, 0);
        cloud.add(puff);
      });
      cloud.position.set(x, 5.5 + index % 2, -9 - index);
      this.scene.add(cloud);
    });
  }

  bindUI() {
    this.root.querySelectorAll("[data-difficulty]").forEach((button) => {
      button.addEventListener("click", () => {
        if (this.state.data.interactionLocked) return;
        this.state.set({ difficulty: button.dataset.difficulty });
        this.createNewLevel();
      });
    });
    this.root.querySelector("#hint-button").addEventListener("click", () => this.showHint());
    this.root.querySelector("#replay-button").addEventListener("click", () => this.readSequence());
    this.root.querySelector("#reset-button").addEventListener("click", () => this.resetLevel());
    this.root.querySelector("#sound-button").addEventListener("click", () => this.toggleSound());
  }

  createNewLevel() {
    const level = this.generator.generate(this.state.data.difficulty);
    this.state.startLevel(level);
    this.ui.hideReward();
    this.ui.clearPatternGroups();
    this.ui.setDifficulty(level.difficulty);
    this.ui.setHintStep(0);
    this.ui.setMessage("Quan sát xem nhóm nào đang lặp lại nhé!", "neutral");
    this.ui.renderOptions(level.answerOptions);
    const width = this.train.build(level);
    this.fitCamera(width);
    if (level.difficulty === "easy") {
      this.train.highlightGroups(level.groups);
      this.ui.showPatternGroups(level);
    }
    this.bindInputs();
    this.ui.setLocked(false);
    wait(280).then(() => this.audio.speak("Hãy tìm toa tiếp theo."));
  }

  bindInputs() {
    const level = this.state.data.currentLevel;
    this.input = new InputController({
      container: this.ui.options,
      getItem: (id) => level.answerOptions.find((item) => item.id === id),
      canInteract: () => !this.state.data.interactionLocked,
      canDropAt: (x, y) => this.isNearMissing(x, y),
      onSelect: (item) => this.handleOptionSelect(item),
      onInvalidDrop: () => this.ui.setMessage("Hãy thả toa vào ô có dấu hỏi nhé!", "hint"),
      onDropHover: (active) => this.train.setDropGlow(active),
    });
    this.input.bind();
  }

  async handleOptionSelect(item) {
    if (!item || this.state.data.interactionLocked) return false;
    const level = this.state.data.currentLevel;
    this.state.set({ selectedOption: item.id, interactionLocked: true });
    this.ui.setLocked(true);
    const correct = this.engine.validateAnswer(item, level.correctItem);
    if (correct) await this.handleCorrect(item);
    else await this.handleWrong(item);
    return correct;
  }

  async handleCorrect(item) {
    const level = this.state.data.currentLevel;
    await this.ui.animateSelection(item.id, this.getMissingScreenPoint());
    this.train.fillMissing(item);
    const description = this.engine.describePattern(level.patternType, level.itemsByToken);
    const previous = level.fullSequence[level.missingIndex - 1];
    const explanation = `Đúng rồi! Mẫu ${description.short} đang lặp lại. Sau ${previous.speechLabel} là ${item.speechLabel}.`;
    this.ui.setMessage(explanation, "correct");
    this.audio.speak(explanation);
    this.audio.whistle();
    this.train.highlightGroups(level.groups);
    this.ui.showPatternGroups(level);
    await this.animations.bounceCars(this.train.cars);
    const earned = calculateStars(this.state.data);
    const learnedPatterns = [...new Set([...this.progress.learnedPatterns, level.patternType])];
    this.progress = {
      ...this.progress,
      completedLevels: this.progress.completedLevels + 1,
      stars: this.progress.stars + earned,
      learnedPatterns,
      soundEnabled: this.state.data.soundEnabled,
    };
    this.storage.save(this.progress);
    this.state.set({ completed: true, completedLevels: this.progress.completedLevels, stars: this.progress.stars });
    this.ui.setProgress(this.state.data);
    await this.animations.runTrain(this.train);
    this.ui.showReward(earned, description.sentence);
    this.audio.speak("Đoàn tàu đã hoàn thành.");
    await wait(this.animations.reducedMotion ? 250 : 1050);
    this.createNewLevel();
  }

  async handleWrong(item) {
    const mistakes = this.state.data.mistakes + 1;
    this.state.set({ mistakes });
    this.ui.shakeOption(item.id);
    await this.animations.shake(this.train.cars[this.state.data.currentLevel.missingIndex].group);
    const message = mistakes === 1
      ? "Chưa đúng. Con hãy nhìn hai toa đầu tiên và xem mẫu lặp lại thế nào."
      : "Mình thử lại nhé! Hãy nhìn từng nhóm toa từ trái sang phải.";
    this.ui.setMessage(message, "wrong");
    this.audio.speak(message);
    if (mistakes >= 2 && this.state.data.hintStep < 2) this.showHint();
    this.state.set({ selectedOption: null, interactionLocked: false });
    this.ui.setLocked(false);
  }

  showHint() {
    if (this.state.data.interactionLocked) return;
    const level = this.state.data.currentLevel;
    const step = this.hints.show(level, this.state.data.hintStep);
    this.state.set({ hintStep: step, hintsUsed: this.state.data.hintsUsed + 1 });
    this.ui.setHintStep(step);
  }

  readSequence() {
    if (this.state.data.interactionLocked) return;
    const level = this.state.data.currentLevel;
    const text = `${level.visibleSequence.map((item) => item?.speechLabel ?? "ô trống").join(", ")}. Tiếp theo là gì?`;
    this.audio.speak(text);
    this.ui.setMessage("Cùng đọc từ trái sang phải nhé!", "hint");
  }

  resetLevel() {
    if (this.state.data.interactionLocked) return;
    const current = this.state.data.currentLevel;
    this.state.startLevel(current);
    this.ui.clearPatternGroups();
    this.ui.setHintStep(0);
    this.ui.setMessage("Bắt đầu lại nhé. Nhìn từ toa đầu tiên nào!", "neutral");
    this.ui.renderOptions(current.answerOptions);
    const width = this.train.build(current);
    this.fitCamera(width);
    if (current.difficulty === "easy") {
      this.train.highlightGroups(current.groups);
      this.ui.showPatternGroups(current);
    }
    this.bindInputs();
  }

  toggleSound() {
    const enabled = !this.state.data.soundEnabled;
    this.state.set({ soundEnabled: enabled });
    this.audio.setEnabled(enabled);
    this.ui.setSound(enabled);
    this.progress.soundEnabled = enabled;
    this.storage.save(this.progress);
    if (enabled) this.audio.speak("Đã bật giọng đọc.");
  }

  getMissingScreenPoint() {
    const vector = this.train.getMissingWorldPosition();
    vector.project(this.camera);
    const rect = this.renderer.domElement.getBoundingClientRect();
    return {
      x: rect.left + (vector.x * 0.5 + 0.5) * rect.width,
      y: rect.top + (-vector.y * 0.5 + 0.5) * rect.height,
    };
  }

  isNearMissing(x, y) {
    const target = this.getMissingScreenPoint();
    const rect = this.renderer.domElement.getBoundingClientRect();
    const radius = Math.max(58, Math.min(100, rect.width / 8));
    return Math.hypot(x - target.x, y - target.y) <= radius;
  }

  fitCamera(trainWidth) {
    const aspect = this.camera.aspect || 1;
    const verticalFov = THREE.MathUtils.degToRad(this.camera.fov);
    const neededZ = trainWidth / (2 * Math.tan(verticalFov / 2) * aspect) + 1.4;
    this.camera.position.z = Math.max(9.2, neededZ);
    this.camera.position.y = Math.max(3.6, this.camera.position.z * 0.23);
    this.camera.lookAt(0, 0.95, 0);
    this.camera.updateProjectionMatrix();
  }

  resize() {
    const { width, height } = this.ui.sceneWrap.getBoundingClientRect();
    if (!width || !height) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    if (this.state.data.currentLevel && this.train.width) this.fitCamera(this.train.width);
  }

  render(time) {
    this.train.tick(time);
    this.renderer.render(this.scene, this.camera);
  }
}

export default Game;
