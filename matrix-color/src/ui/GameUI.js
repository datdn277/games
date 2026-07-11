import { COLOR_BY_ID } from "../data/colors.js";
import { DIFFICULTY_CONFIGS, GRID_SIZE_OPTIONS, MAX_GRID_SIZE, MIN_GRID_SIZE } from "../data/levels.js";

export class GameUI {
  constructor(root) {
    this.root = root;
    root.innerHTML = this.#template();
    this.elements = {
      templateHost: root.querySelector("#template-grid"),
      playerHost: root.querySelector("#player-grid"),
      palette: root.querySelector("#color-palette"),
      status: root.querySelector("#game-status"),
      remaining: root.querySelector("#remaining-count"),
      mistakes: root.querySelector("#mistake-count"),
      difficulty: root.querySelector("#difficulty-select"),
      gridSize: root.querySelector("#grid-size-select"),
      gridSizeInput: root.querySelector("#grid-size-input"),
      gridSizeControl: root.querySelector("#custom-size-control"),
      gridSizeMirror: root.querySelector("#grid-size-mirror"),
      replay: root.querySelector("#replay-button"),
      hint: root.querySelector("#hint-button"),
      eraser: root.querySelector("#eraser-button"),
      reset: root.querySelector("#reset-button"),
      sound: root.querySelector("#sound-toggle"),
      completion: root.querySelector("#completion-dialog"),
      completionStars: root.querySelector("#completion-stars"),
      completionText: root.querySelector("#completion-text"),
      next: root.querySelector("#next-button"),
      totalStars: root.querySelector("#total-stars"),
      completedLevels: root.querySelector("#completed-levels"),
      paletteInstruction: root.querySelector("#palette-instruction")
    };
  }

  bindActions(actions) {
    this.elements.replay.addEventListener("click", actions.onReplay);
    this.elements.hint.addEventListener("click", actions.onHint);
    this.elements.eraser.addEventListener("click", actions.onEraser);
    this.elements.reset.addEventListener("click", actions.onReset);
    this.elements.next.addEventListener("click", actions.onNext);
    this.elements.difficulty.addEventListener("change", (event) => actions.onDifficultyChange(event.target.value));
    this.elements.gridSize.addEventListener("change", (event) => {
      const custom = event.target.value === "custom";
      this.elements.gridSizeControl.hidden = !custom;
      if (custom) {
        this.elements.gridSizeInput.focus();
        actions.onGridSizeChange(this.elements.gridSizeInput.value);
      } else {
        actions.onGridSizeChange("auto");
      }
    });
    this.elements.gridSizeInput.addEventListener("input", (event) => {
      this.elements.gridSizeMirror.textContent = event.target.value || "?";
    });
    this.elements.gridSizeInput.addEventListener("change", (event) => actions.onGridSizeChange(event.target.value));
    this.elements.gridSizeInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      actions.onGridSizeChange(event.currentTarget.value);
    });
    this.elements.sound.addEventListener("change", (event) => actions.onSoundChange(event.target.checked));
  }

  renderRound(state, progress) {
    this.elements.difficulty.value = state.difficulty;
    const customSize = state.sizeMode !== "auto";
    this.elements.gridSize.value = customSize ? "custom" : "auto";
    this.elements.gridSizeControl.hidden = !customSize;
    if (customSize) this.elements.gridSizeInput.value = state.sizeMode;
    this.elements.gridSizeMirror.textContent = customSize ? state.sizeMode : this.elements.gridSizeInput.value;
    this.elements.sound.checked = state.soundEnabled;
    this.elements.completion.hidden = true;
    this.elements.paletteInstruction.textContent = state.autoSelectColor
      ? "Màu đã chọn sẵn, con chỉ cần tìm đúng ô."
      : "Chọn hoặc kéo màu vào đúng ô.";
    this.renderPalette(state.levelColors);
    this.setSelectedColor(state.selectedColor);
    this.setEraser(false);
    this.updateStats(state);
    this.updateProgress(progress);
    this.clearHints();
    this.setStatus("Hãy tô bảng của bé giống bảng mẫu.", "neutral");
  }

  renderPalette(colorIds) {
    this.elements.palette.innerHTML = colorIds.map((colorId) => {
      const color = COLOR_BY_ID[colorId];
      return `<button class="color-swatch" type="button" data-color-id="${color.id}" style="--swatch-color:${color.hex}" aria-label="Chọn màu ${color.label}" aria-pressed="false"><span class="swatch-check" aria-hidden="true">✓</span><span class="swatch-color" aria-hidden="true"><span class="swatch-symbol">${color.symbol}</span></span><span class="swatch-label">${color.label}</span></button>`;
    }).join("");
  }

  setSelectedColor(colorId) {
    this.elements.palette.querySelectorAll("[data-color-id]").forEach((swatch) => {
      const selected = swatch.dataset.colorId === colorId;
      swatch.classList.toggle("is-selected", selected);
      swatch.setAttribute("aria-pressed", String(selected));
    });
    if (colorId) this.setEraser(false);
  }

  setEraser(enabled) {
    this.elements.eraser.classList.toggle("is-active", enabled);
    this.elements.eraser.setAttribute("aria-pressed", String(enabled));
    this.root.classList.toggle("eraser-active", enabled);
    if (enabled) {
      this.elements.palette.querySelectorAll(".is-selected").forEach((element) => {
        element.classList.remove("is-selected");
        element.setAttribute("aria-pressed", "false");
      });
    }
  }

  setStatus(message, tone = "neutral") {
    this.elements.status.textContent = message;
    this.elements.status.dataset.tone = tone;
  }

  updateStats(state) {
    this.elements.remaining.textContent = String(state.remainingCount);
    this.elements.mistakes.textContent = String(state.mistakes);
  }

  updateProgress(progress) {
    this.elements.totalStars.textContent = String(progress.totalStars);
    this.elements.completedLevels.textContent = String(progress.completedLevels);
  }

  showHint(hint) {
    this.clearHints();
    if (hint.step === 3) {
      const swatch = this.elements.palette.querySelector(`[data-color-id="${hint.colorId}"]`);
      swatch?.classList.add("is-hinted");
    }
  }

  clearHints() {
    this.elements.palette.querySelectorAll(".is-hinted").forEach((element) => element.classList.remove("is-hinted"));
  }

  setInteractionLocked(locked) {
    this.root.classList.toggle("interaction-locked", locked);
    this.elements.palette.querySelectorAll("button").forEach((button) => { button.disabled = locked; });
  }

  showCompletion(stars, state) {
    this.elements.completionStars.innerHTML = Array.from({ length: 3 }, (_, index) => `<span class="${index < stars ? "earned" : ""}" aria-hidden="true">★</span>`).join("");
    this.elements.completionStars.setAttribute("aria-label", `${stars} sao`);
    this.elements.completionText.textContent = state.mistakes === 0 && state.hintsUsed === 0
      ? "Con quan sát thật chính xác!"
      : "Con làm rất tốt!";
    this.elements.completion.hidden = false;
  }

  #template() {
    const options = Object.entries(DIFFICULTY_CONFIGS).map(([id, config]) => `<option value="${id}">${config.label} · ${config.shortLabel}</option>`).join("");
    const sizeOptions = GRID_SIZE_OPTIONS.map((option) => `<option value="${option.id}">${option.label}</option>`).join("");
    return `
      <main class="game-shell">
        <header class="topbar">
          <a class="home-link" href="../index.html" aria-label="Trở về trang chủ"><span aria-hidden="true">‹</span> Trang chủ</a>
          <div class="title-group"><span class="eyebrow">Quan sát · Đối chiếu · Tô màu</span><h1>Ô Màu Song Sinh</h1></div>
          <div class="mode-pickers" aria-label="Chế độ chơi">
            <label class="difficulty-picker"><span class="mode-label">Mức</span><select id="difficulty-select" aria-label="Chọn mức độ">${options}</select></label>
            <label class="size-picker"><span class="mode-label">Kích thước</span><select id="grid-size-select" aria-label="Chọn cách đặt kích thước ma trận">${sizeOptions}</select><span class="custom-size-control" id="custom-size-control" hidden><input id="grid-size-input" type="number" min="${MIN_GRID_SIZE}" max="${MAX_GRID_SIZE}" step="1" value="3" inputmode="numeric" aria-label="Nhập số hàng và số cột, từ ${MIN_GRID_SIZE} đến ${MAX_GRID_SIZE}"><span aria-hidden="true">× <output id="grid-size-mirror">3</output></span></span></label>
          </div>
        </header>

        <section class="status-strip" aria-label="Nhiệm vụ và tiến độ">
          <div><span class="status-dot" aria-hidden="true"></span><p id="game-status" role="status" aria-live="polite">Đang chuẩn bị hai bảng…</p></div>
          <div class="round-stats">
            <span><strong id="remaining-count">0</strong><small>Ô còn lại</small></span>
            <span><strong id="mistake-count">0</strong><small>Lần nhìn lại</small></span>
            <span><strong><i aria-hidden="true">★</i> <b id="total-stars">0</b></strong><small>Tổng sao</small></span>
            <span class="completed-stat"><strong id="completed-levels">0</strong><small>Màn xong</small></span>
          </div>
        </section>

        <section class="twin-stage" aria-label="Hai ma trận màu">
          <article class="grid-panel template-panel">
            <div class="grid-label"><span class="label-number">1</span><div><h2>Bảng mẫu</h2><p>Con hãy nhìn kỹ</p></div><span class="eye-mark" aria-hidden="true">◉</span></div>
            <div id="template-grid" class="grid-canvas" aria-label="Bảng mẫu"></div>
          </article>
          <div class="copy-arrow" aria-hidden="true"><span>→</span><small>Cùng vị trí</small></div>
          <article class="grid-panel player-panel">
            <div class="grid-label"><span class="label-number">2</span><div><h2>Bảng của bé</h2><p>Con tô ở đây</p></div><span class="pencil-mark" aria-hidden="true">✎</span></div>
            <div id="player-grid" class="grid-canvas player-canvas" aria-label="Bảng của bé"></div>
          </article>

          <div id="completion-dialog" class="completion-dialog" role="dialog" aria-modal="false" aria-labelledby="completion-title" hidden>
            <div id="completion-stars" class="completion-stars" aria-label="Ba sao"></div>
            <h2 id="completion-title">Hai bảng giống nhau rồi!</h2>
            <p id="completion-text">Con làm rất tốt!</p>
            <button id="next-button" class="next-button" type="button">Màn tiếp theo <span aria-hidden="true">→</span></button>
          </div>
        </section>

        <section class="paint-dock" aria-label="Khay màu và công cụ">
          <div class="palette-heading"><div><span class="eyebrow">Khay màu</span><h2>Chọn màu để tô</h2></div><p id="palette-instruction">Chọn hoặc kéo màu vào đúng ô.</p></div>
          <div id="color-palette" class="color-palette" aria-label="Các màu trong màn"></div>
          <div class="tool-row">
            <button id="replay-button" class="tool-button" type="button" aria-label="Nghe lại"><span aria-hidden="true">♪</span>Nghe lại</button>
            <button id="hint-button" class="tool-button" type="button" aria-label="Gợi ý từng bước"><span aria-hidden="true">✦</span>Gợi ý</button>
            <button id="eraser-button" class="tool-button" type="button" aria-label="Bật hoặc tắt tẩy màu" aria-pressed="false"><span aria-hidden="true">▱</span>Tẩy màu</button>
            <button id="reset-button" class="tool-button" type="button" aria-label="Chơi lại màn"><span aria-hidden="true">↻</span>Chơi lại</button>
            <label class="voice-toggle"><span><strong>Giọng đọc</strong><small>Tiếng Việt</small></span><input id="sound-toggle" type="checkbox" checked><i aria-hidden="true"></i></label>
          </div>
        </section>
      </main>`;
  }
}
