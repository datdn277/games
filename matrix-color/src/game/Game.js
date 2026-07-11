import { COLOR_BY_ID } from "../data/colors.js";
import { DIFFICULTY_ORDER } from "../data/levels.js";
import { TwinGridScene } from "../render/TwinGridScene.js";
import { GameUI } from "../ui/GameUI.js";
import { AudioController } from "./AudioController.js";
import { GameState } from "./GameState.js";
import { InputController } from "./InputController.js";
import { LevelGenerator } from "./LevelGenerator.js";
import { ProgressStore } from "./ProgressStore.js";
import { calculateStars, gridSignature } from "./validation.js";

function remainingSentence(count) {
  if (count <= 0) return "";
  return `Con còn ${count} ô nữa.`;
}

export class Game {
  constructor(root) {
    this.root = root;
    this.generator = new LevelGenerator();
    this.audio = new AudioController();
    this.progressStore = new ProgressStore();
    this.progress = this.progressStore.load();
    this.soundEnabled = true;
    this.ui = new GameUI(root);
    this.scene = new TwinGridScene({ templateHost: this.ui.elements.templateHost, playerHost: this.ui.elements.playerHost });
    this.currentLevel = null;
    this.roundToken = 0;
  }

  init() {
    this.ui.bindActions({
      onReplay: () => this.audio.replay(),
      onHint: () => this.showHint(),
      onEraser: () => this.toggleEraser(),
      onReset: () => this.startLevel(this.state?.difficulty ?? "easy", { reuse: true }),
      onNext: () => this.startLevel(this.state?.difficulty ?? "easy"),
      onDifficultyChange: (difficulty) => this.startLevel(difficulty),
      onSoundChange: (enabled) => this.setSound(enabled)
    });
    this.input = new InputController({
      root: this.root,
      playerCanvas: this.scene.player.renderer.domElement,
      pickCell: (x, y) => this.scene.pickPlayerCell(x, y),
      onPaint: (cell, meta) => this.paintCell(cell, meta),
      onSelectColor: (colorId) => this.selectColor(colorId),
      onFocus: (cell) => this.scene.focusCell(cell.row, cell.column),
      onEraseShortcut: (cell) => this.eraseCell(cell)
    });
    this.input.bind();
    this.startLevel(this.progress.currentDifficulty || "easy");
  }

  startLevel(difficulty = "easy", { reuse = false } = {}) {
    this.roundToken += 1;
    const safeDifficulty = DIFFICULTY_ORDER.includes(difficulty) ? difficulty : "easy";
    if (!reuse || !this.currentLevel || this.currentLevel.difficulty !== safeDifficulty) {
      const previousSignature = this.currentLevel ? gridSignature(this.currentLevel) : null;
      this.currentLevel = this.generator.generate(safeDifficulty, previousSignature);
    }
    this.state = new GameState(structuredClone(this.currentLevel));
    this.state.soundEnabled = this.soundEnabled;
    this.audio.setEnabled(this.soundEnabled);
    this.progress = this.progressStore.save({ ...this.progress, currentDifficulty: safeDifficulty });
    this.scene.build(this.state);
    this.ui.renderRound(this.state, this.progress);
    this.input.configure(this.state.rows, this.state.columns);
    this.input.setEnabled(true);
    this.audio.speak("Hãy tô bảng bên phải giống bảng mẫu.");
  }

  selectColor(colorId) {
    if (!this.state || this.state.interactionLocked || !this.state.selectColor(colorId)) return;
    this.ui.setSelectedColor(colorId);
    const color = COLOR_BY_ID[colorId];
    this.ui.setStatus(`Con đang chọn màu ${color.label}.`, "selection");
    this.audio.speak(`Con đang chọn màu ${color.speechLabel}.`);
  }

  async paintCell(cell, { colorId } = {}) {
    if (!this.state || this.state.interactionLocked || this.state.completed) return;
    if (colorId) this.state.selectColor(colorId);
    const result = this.state.paintCell(cell.row, cell.column, colorId ?? this.state.selectedColor);
    if (result.status === "no-color") {
      this.ui.setStatus("Con hãy chọn một màu trước nhé!", "warning");
      this.audio.speak("Con hãy chọn một màu trước nhé.");
      return;
    }
    if (["ignored", "noop"].includes(result.status)) return;
    if (result.status === "erased") return this.#animateErase(result);

    this.scene.clearHints();
    this.ui.clearHints();
    this.#lock(true);
    const roundToken = this.roundToken;
    if (result.status === "wrong") {
      await this.scene.paintWrong(result);
      if (roundToken !== this.roundToken) return;
      this.ui.updateStats(this.state);
      const message = result.expected
        ? "Màu này chưa giống mẫu. Con hãy nhìn lại ô cùng vị trí bên trái nhé."
        : "Ô cùng vị trí trong bảng mẫu đang để trắng. Con thử một ô khác nhé.";
      this.ui.setStatus(message, "warning");
      this.audio.speak(message);
      this.#lock(false);
      return;
    }

    await this.scene.paintCorrect(result);
    if (roundToken !== this.roundToken) return;
    this.ui.updateStats(this.state);
    if (result.completed) {
      this.completeLevel();
      return;
    }
    const message = `Đúng rồi! ${remainingSentence(result.remaining)}`;
    this.ui.setStatus(message, "success");
    this.audio.speak(message);
    this.#lock(false);
  }

  async eraseCell(cell) {
    if (!this.state || this.state.interactionLocked || this.state.completed) return;
    const result = this.state.eraseCell(cell.row, cell.column);
    if (result.status !== "erased") return;
    await this.#animateErase(result);
  }

  async #animateErase(result) {
    this.#lock(true);
    const roundToken = this.roundToken;
    await this.scene.erase(result);
    if (roundToken !== this.roundToken) return;
    this.ui.updateStats(this.state);
    this.ui.setStatus("Đã tẩy màu. Con có thể chọn màu khác để tô lại.", "neutral");
    this.#lock(false);
  }

  toggleEraser() {
    if (!this.state || this.state.interactionLocked || this.state.completed) return;
    const enabled = this.state.toggleEraser();
    this.ui.setEraser(enabled);
    if (!enabled && this.state.selectedColor) this.ui.setSelectedColor(this.state.selectedColor);
    const message = enabled ? "Đã chọn tẩy màu. Chạm ô con muốn xóa." : "Đã tắt tẩy màu.";
    this.ui.setStatus(message, "selection");
    this.audio.speak(message);
  }

  showHint() {
    if (!this.state || this.state.interactionLocked || this.state.completed) return;
    const hint = this.state.nextHint();
    if (!hint) return;
    this.scene.showHint(hint);
    this.ui.showHint(hint);
    const color = COLOR_BY_ID[hint.colorId];
    const messages = {
      1: "Hãy nhìn ô đang sáng trong bảng mẫu.",
      2: "Hãy đi theo hàng và cột để tìm ô cùng vị trí ở bảng bên phải.",
      3: `Hãy chọn màu ${color.speechLabel}.`
    };
    this.ui.setStatus(messages[hint.step], "hint");
    this.audio.speak(messages[hint.step]);
  }

  completeLevel() {
    this.state.interactionLocked = true;
    this.input.setEnabled(false);
    const stars = calculateStars(this.state);
    this.progress = this.progressStore.recordCompletion(this.progress, this.state.difficulty, stars);
    this.ui.updateProgress(this.progress);
    this.ui.updateStats(this.state);
    this.ui.showCompletion(stars, this.state);
    this.ui.setStatus("Hai bảng đã giống nhau rồi. Con làm rất tốt!", "success");
    this.scene.celebrate();
    this.audio.speak("Hai bảng đã giống nhau rồi. Con làm rất tốt!");
  }

  setSound(enabled) {
    this.soundEnabled = enabled;
    if (this.state) this.state.soundEnabled = enabled;
    this.audio.setEnabled(enabled);
    if (enabled) this.audio.speak("Giọng đọc đã bật.");
  }

  #lock(locked) {
    this.state.interactionLocked = locked;
    this.input.setEnabled(!locked);
    this.ui.setInteractionLocked(locked);
  }
}
