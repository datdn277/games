import { difficultyConfigs } from "../data/patternConfigs.js";

export class GameUI {
  constructor(root) {
    this.root = root;
    this.renderShell();
  }

  renderShell() {
    this.root.innerHTML = `
      <section class="game-shell">
        <header class="topbar">
          <div class="brand" aria-label="Đoàn Tàu Quy Luật">
            <span class="brand-train" aria-hidden="true">🚂</span>
            <div><h1>Đoàn Tàu Quy Luật</h1><p>Tìm nhóm lặp lại</p></div>
          </div>
          <div class="progress-pill" aria-label="Tiến trình">
            <span aria-hidden="true">⭐</span><strong id="star-total">0</strong>
            <span class="divider" aria-hidden="true"></span>
            <span>Màn</span><strong id="level-total">0</strong>
          </div>
        </header>

        <nav class="difficulty-tabs" aria-label="Chọn độ khó">
          ${Object.entries(difficultyConfigs).map(([key, value]) => `
            <button class="difficulty-button" data-difficulty="${key}" aria-pressed="${key === "easy"}">
              <span>${key === "easy" ? "🌱" : key === "medium" ? "🌼" : "🚀"}</span>${value.label}
            </button>`).join("")}
        </nav>

        <section class="mission" aria-labelledby="instruction">
          <div class="instruction-row">
            <span class="speaker-mascot" aria-hidden="true">🐻</span>
            <div>
              <p class="eyebrow">Nhiệm vụ của con</p>
              <h2 id="instruction">Hãy tìm toa tiếp theo!</h2>
            </div>
          </div>
          <div class="scene-wrap" id="scene-wrap">
            <canvas id="game-canvas" aria-label="Đoàn tàu có một toa đang bị thiếu"></canvas>
            <div class="pattern-ribbon" id="pattern-ribbon" aria-hidden="true"></div>
            <div class="scene-tip"><span aria-hidden="true">👆</span> Chạm hoặc kéo toa vào ô trống</div>
          </div>
        </section>

        <section class="answer-area" aria-labelledby="answer-title">
          <h2 id="answer-title"><span aria-hidden="true">✨</span> Chọn toa đúng</h2>
          <div class="answer-options" id="answer-options" role="list"></div>
        </section>

        <div class="feedback" id="feedback" role="status" aria-live="assertive">
          <span id="feedback-icon" aria-hidden="true">🔎</span>
          <span id="feedback-text">Quan sát xem nhóm nào đang lặp lại nhé!</span>
        </div>

        <footer class="controls">
          <button class="control-button" id="replay-button" aria-label="Nghe lại chuỗi"><span aria-hidden="true">🔊</span> Nghe lại</button>
          <button class="control-button hint-button" id="hint-button" aria-label="Xem gợi ý"><span aria-hidden="true">💡</span> Gợi ý <span id="hint-step">0/3</span></button>
          <button class="control-button" id="reset-button" aria-label="Chơi lại màn này"><span aria-hidden="true">↻</span> Chơi lại</button>
          <button class="icon-button" id="sound-button" aria-label="Tắt giọng đọc" aria-pressed="true"><span aria-hidden="true">♫</span></button>
        </footer>
      </section>
      <div class="reward-overlay" id="reward-overlay" hidden>
        <div class="reward-card" role="dialog" aria-modal="true" aria-label="Hoàn thành màn chơi">
          <div class="reward-rays" aria-hidden="true"></div>
          <p class="reward-kicker">Tuyệt vời!</p>
          <div class="earned-stars" id="earned-stars" aria-label="Số sao nhận được"></div>
          <h2>Đoàn tàu đã hoàn thành!</h2>
          <p id="reward-explanation"></p>
        </div>
      </div>
    `;
    this.canvas = this.root.querySelector("#game-canvas");
    this.sceneWrap = this.root.querySelector("#scene-wrap");
    this.options = this.root.querySelector("#answer-options");
    this.feedback = this.root.querySelector("#feedback");
    this.feedbackText = this.root.querySelector("#feedback-text");
    this.feedbackIcon = this.root.querySelector("#feedback-icon");
    this.reward = this.root.querySelector("#reward-overlay");
  }

  renderOptions(items) {
    this.options.innerHTML = items.map((item) => `
      <button class="answer-card" data-option-id="${item.id}" role="listitem" aria-label="Chọn ${item.label}">
        <span class="answer-visual ${item.kind}" style="--item-color:${item.color}" aria-hidden="true">
          ${item.kind === "color" ? `<span class="color-dot">${item.marker}</span>` : item.symbol}
        </span>
        <span class="answer-label">${item.label}</span>
        <span class="drag-handle" aria-hidden="true">⋮⋮</span>
      </button>`).join("");
  }

  setMessage(text, type = "neutral") {
    const icons = { neutral: "🔎", hint: "💡", correct: "🎉", wrong: "🌈" };
    this.feedback.className = `feedback ${type}`;
    this.feedbackIcon.textContent = icons[type] ?? icons.neutral;
    this.feedbackText.textContent = text;
  }

  setDifficulty(difficulty) {
    this.root.querySelectorAll("[data-difficulty]").forEach((button) => {
      const selected = button.dataset.difficulty === difficulty;
      button.setAttribute("aria-pressed", String(selected));
      button.classList.toggle("active", selected);
    });
  }

  setProgress({ stars, completedLevels }) {
    this.root.querySelector("#star-total").textContent = stars;
    this.root.querySelector("#level-total").textContent = completedLevels;
  }

  setHintStep(step) {
    this.root.querySelector("#hint-step").textContent = `${step}/3`;
  }

  setSound(enabled) {
    const button = this.root.querySelector("#sound-button");
    button.setAttribute("aria-pressed", String(enabled));
    button.setAttribute("aria-label", enabled ? "Tắt giọng đọc" : "Bật giọng đọc");
    button.querySelector("span").textContent = enabled ? "♫" : "×";
  }

  highlightAnswer(id) {
    this.options.querySelector(`[data-option-id="${id}"]`)?.classList.add("answer-hint");
  }

  setLocked(locked) {
    this.root.classList.toggle("interaction-locked", locked);
    this.options.querySelectorAll("button").forEach((button) => { button.disabled = locked; });
  }

  shakeOption(id) {
    const button = this.options.querySelector(`[data-option-id="${id}"]`);
    button?.classList.remove("shake");
    requestAnimationFrame(() => button?.classList.add("shake"));
  }

  animateSelection(id, targetPoint) {
    const source = this.options.querySelector(`[data-option-id="${id}"]`);
    if (!source || !targetPoint) return Promise.resolve();
    const rect = source.getBoundingClientRect();
    const ghost = source.cloneNode(true);
    ghost.className = "answer-card flying-card";
    Object.assign(ghost.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    document.body.appendChild(ghost);
    const deltaX = targetPoint.x - (rect.left + rect.width / 2);
    const deltaY = targetPoint.y - (rect.top + rect.height / 2);
    return ghost.animate(
      [{ transform: "translate(0,0) scale(1)" }, { transform: `translate(${deltaX}px,${deltaY}px) scale(.72) rotate(-3deg)` }],
      { duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 40 : 480, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" },
    ).finished.catch(() => {}).finally(() => ghost.remove());
  }

  showPatternGroups(level) {
    this.root.classList.add("show-groups");
    this.root.querySelector("#pattern-ribbon").textContent = `Nhóm lặp: ${level.patternTokens.join(" · ")}`;
  }

  clearPatternGroups() {
    this.root.classList.remove("show-groups");
  }

  showReward(stars, explanation) {
    this.root.querySelector("#earned-stars").innerHTML = [1, 2, 3].map((index) => `<span class="${index <= stars ? "earned" : ""}">★</span>`).join("");
    this.root.querySelector("#reward-explanation").textContent = explanation;
    this.reward.hidden = false;
  }

  hideReward() {
    this.reward.hidden = true;
  }
}
