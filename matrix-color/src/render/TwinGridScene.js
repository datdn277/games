import { GridView } from "./GridView.js";

export class TwinGridScene {
  constructor({ templateHost, playerHost }) {
    this.template = new GridView(templateHost, { ariaLabel: "Bảng mẫu" });
    this.player = new GridView(playerHost, { interactive: true, ariaLabel: "Bảng của bé. Dùng phím mũi tên để chọn ô và Enter để tô." });
    this.reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    this.animate = this.animate.bind(this);
    this.frameId = requestAnimationFrame(this.animate);
  }

  build(state) {
    this.template.build(state.templateGrid, { showAnswers: true });
    this.player.build(state.playerGrid);
  }

  paintCorrect(result) {
    if (this.reducedMotion) {
      this.player.cells[result.row][result.column].setColor(result.colorId, { tick: true });
      return Promise.resolve();
    }
    return this.player.animateCorrect(result.row, result.column, result.colorId);
  }

  paintWrong(result) {
    if (this.reducedMotion) return this.player.animateWrong(result.row, result.column, result.attempted, result.previous);
    return this.player.animateWrong(result.row, result.column, result.attempted, result.previous);
  }

  erase(result) {
    return this.player.animateErase(result.row, result.column);
  }

  clearHints() {
    this.template.clearHints();
    this.player.clearHints();
  }

  showHint(hint) {
    this.clearHints();
    if (hint.step === 1) this.template.hintTarget(hint.row, hint.column);
    if (hint.step === 2) {
      this.template.hintLine(hint.row, hint.column);
      this.player.hintLine(hint.row, hint.column);
    }
    if (hint.step === 3) {
      this.template.hintTarget(hint.row, hint.column);
      this.player.hintTarget(hint.row, hint.column);
    }
  }

  pickPlayerCell(clientX, clientY) {
    return this.player.pickCell(clientX, clientY);
  }

  focusCell(row, column) {
    this.player.focusCell(row, column);
  }

  celebrate() {
    this.template.celebrate();
    this.player.celebrate();
  }

  animate(now) {
    this.template.update(now);
    this.player.update(now);
    this.frameId = requestAnimationFrame(this.animate);
  }

  destroy() {
    cancelAnimationFrame(this.frameId);
    this.template.destroy();
    this.player.destroy();
  }
}
