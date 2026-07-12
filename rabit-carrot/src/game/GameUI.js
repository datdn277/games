import { DIRECTIONS } from "./directions.js";

export class GameUI {
  constructor(root) {
    this.root = root;
    this.root.innerHTML = this.#template();
    this.elements = {
      canvasHost: root.querySelector("#garden-canvas"),
      status: root.querySelector("#game-status"),
      counter: root.querySelector("#carrot-counter"),
      progress: root.querySelector("#carrot-progress"),
      levelSelect: root.querySelector("#level-select"),
      gridSizeSelect: root.querySelector("#grid-size-select"),
      autoLevel: root.querySelector("#auto-level"),
      guideToggle: root.querySelector("#guide-toggle"),
      soundToggle: root.querySelector("#sound-toggle"),
      replay: root.querySelector("#replay-button"),
      hint: root.querySelector("#hint-button"),
      reset: root.querySelector("#reset-button"),
      next: root.querySelector("#next-button"),
      dialog: root.querySelector("#complete-dialog"),
      completeTitle: root.querySelector("#complete-title"),
      guideNote: root.querySelector("#guide-note")
    };
  }

  bindActions(actions) {
    this.elements.replay.addEventListener("click", actions.onReplay);
    this.elements.hint.addEventListener("click", actions.onHint);
    this.elements.reset.addEventListener("click", actions.onReset);
    this.elements.next.addEventListener("click", actions.onNext);
    this.elements.levelSelect.addEventListener("change", (event) => actions.onLevelChange(Number(event.target.value)));
    this.elements.gridSizeSelect.addEventListener("change", (event) => {
      actions.onGridSizeChange(event.target.value === "auto" ? null : Number(event.target.value));
    });
    this.elements.guideToggle.addEventListener("change", (event) => actions.onGuideChange(event.target.checked));
    this.elements.soundToggle.addEventListener("change", (event) => actions.onSoundChange(event.target.checked));
  }

  renderRound(state, { gridSizeOverride = null } = {}) {
    this.elements.levelSelect.value = String(state.level);
    this.elements.gridSizeSelect.value = gridSizeOverride ? String(gridSizeOverride) : "auto";
    this.elements.guideToggle.checked = state.guideEnabled;
    this.elements.soundToggle.checked = state.soundEnabled;
    this.elements.dialog.hidden = true;
    this.clearHint();
    this.updateCounter(state.collectedCount, state.totalCarrots);
    this.setStatus("Hãy giúp Thỏ nhặt cà rốt!", "neutral");
  }

  updateCounter(collected, total) {
    this.elements.counter.textContent = `${collected}/${total}`;
    this.elements.progress.style.setProperty("--progress", `${total ? (collected / total) * 100 : 0}%`);
    this.elements.progress.setAttribute("aria-valuenow", String(collected));
    this.elements.progress.setAttribute("aria-valuemax", String(total));
  }

  setStatus(message, tone = "neutral") {
    this.elements.status.textContent = message;
    this.elements.status.dataset.tone = tone;
  }

  showHint(direction, message) {
    this.clearHint();
    const button = this.root.querySelector(`[data-direction="${direction}"]`);
    button?.classList.add("is-hinted");
    this.elements.guideNote.hidden = false;
    this.elements.guideNote.textContent = message;
    this.setStatus(message, "hint");
  }

  clearHint() {
    this.root.querySelectorAll(".is-hinted").forEach((element) => element.classList.remove("is-hinted"));
    this.elements.guideNote.hidden = true;
  }

  setControlsEnabled(enabled) {
    this.root.querySelectorAll("[data-direction]").forEach((button) => { button.disabled = !enabled; });
    this.elements.hint.disabled = !enabled;
  }

  showComplete(level, moves) {
    this.elements.completeTitle.textContent = `Thỏ đã về hang sau ${moves} bước!`;
    this.elements.dialog.hidden = false;
    this.setStatus(`Hoàn thành màn ${level}!`, "success");
  }

  hideComplete() {
    this.elements.dialog.hidden = true;
  }

  get autoLevelEnabled() {
    return this.elements.autoLevel.checked;
  }

  #template() {
    const directionButton = (name, className) => {
      const direction = DIRECTIONS[name];
      return `<button class="direction-button ${className}" type="button" data-direction="${name}" aria-label="${direction.speech}"><span class="direction-arrow" aria-hidden="true">${direction.arrow}</span><span>${direction.label}</span></button>`;
    };
    return `
      <main class="game-shell">
        <header class="topbar">
          <a class="home-link" href="../index.html" aria-label="Trở về trang chủ"><span aria-hidden="true">‹</span> Trang chủ</a>
          <div class="title-group">
            <span class="title-kicker">Học bốn hướng cùng</span>
            <h1>Thỏ Con Tìm Cà Rốt</h1>
          </div>
          <div class="game-options">
            <label class="level-picker">Màn
            <select id="level-select" aria-label="Chọn độ khó">
              <option value="1">1 · Làm quen</option>
              <option value="2">2 · Đi xa hơn</option>
              <option value="3">3 · Đi vòng</option>
              <option value="4">4 · Thử thách</option>
            </select>
            </label>
            <label class="level-picker">Lưới
              <select id="grid-size-select" aria-label="Chọn kích thước lưới ma trận">
                <option value="auto">Theo màn</option>
                <option value="3">3 × 3</option>
                <option value="4">4 × 4</option>
                <option value="5">5 × 5</option>
                <option value="6">6 × 6</option>
              </select>
            </label>
          </div>
        </header>

        <section class="play-layout" aria-label="Khu vực chơi">
          <div class="board-card">
            <div class="scene-heading">
              <div>
                <p class="mini-label">Khu vườn</p>
                <p id="game-status" class="game-status" role="status" aria-live="polite">Đang chuẩn bị khu vườn…</p>
              </div>
              <div class="carrot-score" aria-label="Số cà rốt đã nhặt">
                <span class="carrot-symbol" aria-hidden="true"></span>
                <span><strong id="carrot-counter">0/1</strong><small>Cà rốt</small></span>
              </div>
            </div>
            <div id="carrot-progress" class="carrot-progress" role="progressbar" aria-label="Tiến độ nhặt cà rốt" aria-valuemin="0" aria-valuenow="0" aria-valuemax="1"><span></span></div>
            <div id="garden-canvas" class="garden-canvas" aria-label="Khu vườn 3D"></div>
            <div id="guide-note" class="guide-note" hidden></div>
            <div id="complete-dialog" class="complete-dialog" role="dialog" aria-modal="false" aria-labelledby="complete-title" hidden>
              <div class="complete-badge" aria-hidden="true">★</div>
              <h2>Giỏi lắm!</h2>
              <p id="complete-title">Thỏ đã về hang!</p>
              <button id="next-button" class="primary-button" type="button">Màn tiếp theo <span aria-hidden="true">→</span></button>
            </div>
          </div>

          <aside class="control-card" aria-label="Bảng điều khiển">
            <div class="control-heading">
              <p class="mini-label">Bấm một hướng</p>
              <h2>Mỗi lần đi một ô</h2>
            </div>
            <div class="d-pad" aria-label="Bốn nút điều hướng">
              ${directionButton("up", "direction-up")}
              ${directionButton("left", "direction-left")}
              <div class="d-pad-center" aria-hidden="true"><span></span></div>
              ${directionButton("right", "direction-right")}
              ${directionButton("down", "direction-down")}
            </div>

            <div class="tool-row">
              <button id="replay-button" class="tool-button" type="button" aria-label="Nghe lại hướng dẫn"><span aria-hidden="true">♪</span> Nghe lại</button>
              <button id="hint-button" class="tool-button" type="button" aria-label="Gợi ý bước tiếp theo"><span aria-hidden="true">✦</span> Gợi ý</button>
              <button id="reset-button" class="tool-button" type="button" aria-label="Chơi lại màn hiện tại"><span aria-hidden="true">↻</span> Chơi lại</button>
            </div>

            <div class="settings-panel">
              <label class="switch-row"><span><strong>Hướng dẫn</strong><small>Chỉ một bước tiếp theo</small></span><input id="guide-toggle" type="checkbox" /><i aria-hidden="true"></i></label>
              <label class="switch-row"><span><strong>Giọng đọc</strong><small>Tiếng Việt</small></span><input id="sound-toggle" type="checkbox" checked /><i aria-hidden="true"></i></label>
              <label class="switch-row"><span><strong>Tự tăng màn</strong><small>Sau khi hoàn thành</small></span><input id="auto-level" type="checkbox" checked /><i aria-hidden="true"></i></label>
            </div>
            <p class="keyboard-note"><span aria-hidden="true">⌨</span> Có thể dùng các phím mũi tên trên bàn phím.</p>
          </aside>
        </section>
      </main>`;
  }
}
