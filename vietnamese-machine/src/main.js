import { DIFFICULTIES, WORDS, getRoundOptions, getWordsForDifficulty, shuffle } from "./data.js";
import { buildVietnameseSyllable } from "./vietnamese.js";
import { createSpeechController } from "./speech.js";
import { createMachineScene } from "./three-scene.js";
import { toneIconMarkup } from "./tone-icons.js";
import {
  PART_TYPES,
  buildCompletionSpeech,
  buildErrorFeedback,
  buildSuccessFeedback,
  displayPartValue,
  getRequiredParts,
  getWrongParts
} from "./game-logic.js";

const gameState = {
  currentWord: null,
  selectedInitial: null,
  selectedRhyme: null,
  selectedTone: null,
  completed: false,
  attempts: 0,
  hintStep: 0,
  difficulty: "easy",
  round: 0,
  score: 0
};

document.querySelector("#app").innerHTML = `
  <header class="topbar">
    <a class="home-link" href="../index.html" aria-label="Về kho game">
      <span aria-hidden="true">←</span><span>Kho game</span>
    </a>
    <div class="brand-lockup">
      <span class="brand-mark" aria-hidden="true">Aa</span>
      <div>
        <h1>Máy Lắp Tiếng Việt</h1>
        <p>Lắp âm đầu, vần và thêm dấu khi tiếng có dấu</p>
      </div>
    </div>
    <div class="round-pill" aria-label="Tiến độ chơi">
      <span id="roundLabel">Lượt 1</span>
      <strong id="scoreLabel">0 đúng</strong>
    </div>
  </header>

  <main class="game-layout">
    <section class="prompt-panel" aria-labelledby="promptHeading">
      <div class="prompt-meta">
        <span id="levelBadge" class="level-badge">Dễ</span>
        <label class="difficulty-control" for="difficultySelect">
          <span>Độ khó</span>
          <select id="difficultySelect" aria-label="Chọn độ khó">
            ${Object.entries(DIFFICULTIES).map(([value, item]) => `<option value="${value}">${item.label}</option>`).join("")}
          </select>
        </label>
      </div>

      <div class="illustration" aria-hidden="true">
        <canvas id="machineCanvas"></canvas>
        <div id="wordImage" class="word-image">🪑</div>
      </div>

      <div class="prompt-copy">
        <p class="eyebrow">Tiếng cần lắp</p>
        <h2 id="promptHeading">Hãy ghép tiếng “bàn”</h2>
        <p id="promptHelp">Chạm một mảnh, hoặc kéo mảnh đó vào đúng khe.</p>
      </div>
    </section>

    <section class="workbench" aria-label="Bàn lắp tiếng Việt">
      <div class="equation" aria-label="Âm đầu cộng vần cộng dấu bằng tiếng hoàn chỉnh">
        ${slotMarkup("initial", "Âm đầu", "Xanh dương")}
        <span class="operator" aria-hidden="true">+</span>
        ${slotMarkup("rhyme", "Vần", "Màu cam")}
        <span class="operator" data-tone-ui aria-hidden="true">+</span>
        ${slotMarkup("tone", "Dấu", "Màu tím")}
        <span class="operator equals" aria-hidden="true">=</span>
        <div class="result-card" id="resultCard" aria-live="polite">
          <span>Tiếng hoàn chỉnh</span>
          <strong id="resultWord">…</strong>
        </div>
      </div>

      <div id="feedback" class="feedback info" role="status" aria-live="polite">
        <span class="feedback-icon" aria-hidden="true">i</span>
        <p>Chọn lần lượt một mảnh ở mỗi hàng nhé.</p>
      </div>

      <div class="parts-area">
        ${trayMarkup("initial", "1", "Chọn âm đầu")}
        ${trayMarkup("rhyme", "2", "Chọn vần")}
        ${trayMarkup("tone", "3", "Chọn dấu")}
      </div>

      <div class="guide-row">
        <label class="guide-toggle">
          <input id="detailedGuide" type="checkbox" />
          <span class="switch" aria-hidden="true"></span>
          <span><strong>Hướng dẫn chi tiết</strong><small>Gợi ý từng bước, không lộ hết đáp án</small></span>
        </label>
      </div>

      <div class="actions" aria-label="Các thao tác">
        <button id="listenButton" class="action secondary" type="button" aria-label="Nghe lại câu hỏi">
          <span aria-hidden="true">🔊</span> Nghe lại
        </button>
        <button id="hintButton" class="action hint" type="button" aria-label="Nhận một gợi ý">
          <span aria-hidden="true">💡</span> Gợi ý
        </button>
        <button id="checkButton" class="action primary" type="button" aria-label="Kiểm tra câu trả lời">
          Kiểm tra
        </button>
        <button id="nextButton" class="action next" type="button" aria-label="Chơi lượt tiếp theo" disabled>
          Chơi tiếp <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  </main>
`;

function slotMarkup(type, label, colorName) {
  return `<button class="slot slot-${type}" data-slot="${type}" type="button" aria-label="Khe ${label}, ${colorName}. Chạm để nghe mảnh đang chọn.">
    <span>${label}</span><strong data-slot-value>?</strong>
  </button>`;
}

function trayMarkup(type, number, title) {
  return `<section class="parts-tray tray-${type}" data-tray="${type}" aria-labelledby="${type}Title">
    <div class="tray-title"><span>${number}</span><h3 id="${type}Title">${title}</h3></div>
    <div class="tiles" data-tiles="${type}"></div>
  </section>`;
}

const elements = {
  difficulty: document.querySelector("#difficultySelect"),
  detailedGuide: document.querySelector("#detailedGuide"),
  wordImage: document.querySelector("#wordImage"),
  prompt: document.querySelector("#promptHeading"),
  promptHelp: document.querySelector("#promptHelp"),
  feedback: document.querySelector("#feedback"),
  equation: document.querySelector(".equation"),
  partsArea: document.querySelector(".parts-area"),
  resultCard: document.querySelector("#resultCard"),
  resultWord: document.querySelector("#resultWord"),
  levelBadge: document.querySelector("#levelBadge"),
  roundLabel: document.querySelector("#roundLabel"),
  scoreLabel: document.querySelector("#scoreLabel"),
  check: document.querySelector("#checkButton"),
  next: document.querySelector("#nextButton"),
  hint: document.querySelector("#hintButton"),
  listen: document.querySelector("#listenButton")
};

const speech = createSpeechController();
const machineScene = await createMachineScene(document.querySelector("#machineCanvas"));
let lastWord = null;
let suppressClickUntil = 0;

initGame();

function initGame() {
  elements.difficulty.addEventListener("change", () => {
    gameState.difficulty = elements.difficulty.value;
    createNewRound();
  });
  elements.detailedGuide.addEventListener("change", () => {
    gameState.hintStep = 0;
    clearHints();
    setFeedback("info", elements.detailedGuide.checked
      ? "Đã bật hướng dẫn chi tiết. Mỗi lần bấm Gợi ý, máy sẽ chỉ dẫn một bước."
      : "Đã tắt hướng dẫn chi tiết. Gợi ý sẽ tập trung vào phần con đang cần sửa.");
  });
  elements.listen.addEventListener("click", speakQuestion);
  elements.hint.addEventListener("click", runHintStep);
  elements.check.addEventListener("click", validateAnswer);
  elements.next.addEventListener("click", createNewRound);
  document.querySelectorAll(".slot").forEach((slot) => {
    slot.addEventListener("click", () => speakSelectedPart(slot.dataset.slot));
  });
  createNewRound();
}

function createNewRound() {
  speech.cancel();
  clearHints();
  clearSlotFeedback();
  const pool = getWordsForDifficulty(gameState.difficulty);
  const candidates = pool.filter((item) => item.word !== lastWord);
  const nextPool = candidates.length ? candidates : pool;
  const item = nextPool[Math.floor(Math.random() * nextPool.length)];
  lastWord = item.word;
  gameState.currentWord = item;
  gameState.selectedInitial = null;
  gameState.selectedRhyme = null;
  gameState.selectedTone = null;
  gameState.completed = false;
  gameState.attempts = 0;
  gameState.hintStep = 0;
  gameState.round += 1;

  elements.wordImage.textContent = item.image;
  elements.wordImage.setAttribute("aria-label", `Hình minh họa cho tiếng ${item.word}`);
  elements.prompt.textContent = `Hãy ghép tiếng “${item.word}”`;
  elements.promptHelp.textContent = "Chạm một mảnh, hoặc kéo mảnh đó vào đúng khe.";
  elements.levelBadge.textContent = DIFFICULTIES[item.level].label;
  elements.levelBadge.dataset.level = item.level;
  elements.roundLabel.textContent = `Lượt ${gameState.round}`;
  elements.scoreLabel.textContent = `${gameState.score} đúng`;
  elements.resultWord.textContent = "…";
  elements.resultCard.classList.remove("complete");
  elements.next.disabled = true;
  elements.check.disabled = false;

  applyRoundStructure(item);
  renderTiles();
  renderSlots();
  const requiredParts = getRequiredParts(item);
  machineScene.updateParts(requiredParts.map(() => null));
  setFeedback("info", `Con hãy tìm ${partCountWord(requiredParts.length)} mảnh để lắp thành tiếng “${item.word}”.`);
  window.setTimeout(speakQuestion, 180);
}

function renderTiles() {
  const requiredParts = getRequiredParts(gameState.currentWord);
  PART_TYPES.forEach((type) => {
    const container = document.querySelector(`[data-tiles="${type}"]`);
    if (!requiredParts.includes(type)) {
      container.replaceChildren();
      return;
    }
    const options = getRoundOptions(gameState.currentWord, type, gameState.difficulty);
    container.replaceChildren(...shuffle(options).map((value) => createTile(type, value)));
  });
}

function applyRoundStructure(item) {
  const hasTonePart = getRequiredParts(item).includes("tone");
  elements.equation.classList.toggle("two-parts", !hasTonePart);
  elements.partsArea.classList.toggle("two-parts", !hasTonePart);
  elements.equation.setAttribute("aria-label", hasTonePart
    ? "Âm đầu cộng vần cộng dấu bằng tiếng hoàn chỉnh"
    : "Âm đầu cộng vần bằng tiếng hoàn chỉnh");
  document.querySelector("[data-tone-ui]").hidden = !hasTonePart;
  document.querySelector('[data-slot="tone"]').hidden = !hasTonePart;
  document.querySelector('[data-tray="tone"]').hidden = !hasTonePart;
}

function createTile(type, value) {
  const tile = document.createElement("button");
  tile.type = "button";
  tile.className = `tile tile-${type}`;
  tile.dataset.type = type;
  tile.dataset.value = value;
  if (type === "tone") {
    tile.innerHTML = toneIconMarkup(value);
  } else {
    tile.textContent = displayPartValue(type, value);
  }
  const accessibleName = type === "tone"
    ? (value === "ngang" ? "không dấu" : `dấu ${value}`)
    : `${typeLabel(type)} ${value === "" ? "không có" : value}`;
  tile.setAttribute("aria-label", `${accessibleName}. Chạm để chọn hoặc kéo vào khe.`);
  tile.addEventListener("click", () => {
    if (Date.now() < suppressClickUntil || gameState.completed) return;
    placeTileIntoSlot(type, value, true);
  });
  addPointerDrag(tile);
  return tile;
}

function addPointerDrag(tile) {
  let drag = null;

  tile.addEventListener("pointerdown", (event) => {
    if (gameState.completed || (event.pointerType === "mouse" && event.button !== 0)) return;
    const rect = tile.getBoundingClientRect();
    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      clone: null,
      moved: false
    };
    tile.setPointerCapture(event.pointerId);
  });

  tile.addEventListener("pointermove", (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.moved && distance < 7) return;
    drag.moved = true;
    event.preventDefault();
    if (!drag.clone) {
      drag.clone = tile.cloneNode(true);
      drag.clone.classList.add("drag-clone");
      drag.clone.removeAttribute("id");
      document.body.append(drag.clone);
      tile.classList.add("drag-origin");
    }
    drag.clone.style.left = `${event.clientX - drag.offsetX}px`;
    drag.clone.style.top = `${event.clientY - drag.offsetY}px`;
  });

  const finishDrag = (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.moved) {
      suppressClickUntil = Date.now() + 300;
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-slot]");
      if (target?.dataset.slot === tile.dataset.type) {
        placeTileIntoSlot(tile.dataset.type, tile.dataset.value, true);
      } else {
        tile.classList.add("returning");
        window.setTimeout(() => tile.classList.remove("returning"), 360);
      }
    }
    drag.clone?.remove();
    tile.classList.remove("drag-origin");
    if (tile.hasPointerCapture(event.pointerId)) tile.releasePointerCapture(event.pointerId);
    drag = null;
  };

  tile.addEventListener("pointerup", finishDrag);
  tile.addEventListener("pointercancel", finishDrag);
}

function placeTileIntoSlot(type, value, shouldSpeak = false) {
  if (gameState.completed) return;
  const stateKey = selectedKey(type);
  gameState[stateKey] = value;
  document.querySelectorAll(`.tile-${type}`).forEach((tile) => {
    tile.classList.toggle("selected", tile.dataset.value === value);
    tile.setAttribute("aria-pressed", String(tile.dataset.value === value));
  });
  renderSlots();
  clearSlotFeedback();
  clearHints();
  updatePreview();
  if (shouldSpeak) speakPart(type, value);
}

function renderSlots() {
  PART_TYPES.forEach((type) => {
    const value = gameState[selectedKey(type)];
    const slot = document.querySelector(`[data-slot="${type}"]`);
    const valueElement = slot.querySelector("[data-slot-value]");
    if (type === "tone" && value !== null) {
      valueElement.innerHTML = toneIconMarkup(value);
    } else {
      valueElement.textContent = displayPartValue(type, value);
    }
    slot.classList.toggle("filled", value !== null);
  });
}

function updatePreview() {
  const item = gameState.currentWord;
  const requiredParts = getRequiredParts(item);
  const parts = requiredParts.map((type) => gameState[selectedKey(type)]);
  machineScene.updateParts(parts.map((part, index) => requiredParts[index] === "tone" && part !== null
    ? { tone: part }
    : displayPartValue(requiredParts[index], part)));
  if (parts.some((part) => part === null)) {
    elements.resultWord.textContent = "…";
    return;
  }
  elements.resultWord.textContent = buildVietnameseSyllable(
    gameState.selectedInitial,
    gameState.selectedRhyme,
    item.tone === "ngang" ? "ngang" : gameState.selectedTone
  );
  setFeedback("info", `Đã đủ ${partCountWord(requiredParts.length)} mảnh. Con bấm “Kiểm tra” nhé.`);
}

function validateAnswer() {
  if (gameState.completed) return;
  const requiredParts = getRequiredParts(gameState.currentWord);
  const missing = requiredParts.filter((type) => gameState[selectedKey(type)] === null);
  if (missing.length) {
    const names = missing.map(typeLabel).join(", ");
    setFeedback("warning", `Còn thiếu ${names}. Con chọn đủ ${partCountWord(requiredParts.length)} mảnh rồi kiểm tra nhé.`);
    missing.forEach((type) => document.querySelector(`[data-slot="${type}"]`).classList.add("needs-attention"));
    return;
  }

  gameState.attempts += 1;
  clearSlotFeedback();
  const item = gameState.currentWord;
  const wrong = getWrongParts({
    initial: gameState.selectedInitial,
    rhyme: gameState.selectedRhyme,
    tone: gameState.selectedTone
  }, item);

  if (!wrong.length) {
    gameState.completed = true;
    gameState.score += 1;
    elements.scoreLabel.textContent = `${gameState.score} đúng`;
    elements.resultWord.textContent = item.word;
    elements.resultCard.classList.add("complete");
    elements.next.disabled = false;
    elements.check.disabled = true;
    requiredParts.forEach((type) => document.querySelector(`[data-slot="${type}"]`).classList.add("correct"));
    setFeedback("success", buildSuccessFeedback(item));
    machineScene.celebrate();
    speech.speak(buildCompletionSpeech(item), { rate: 0.74 });
    return;
  }

  wrong.forEach((type) => document.querySelector(`[data-slot="${type}"]`).classList.add("incorrect"));
  machineScene.shake();
  setFeedback("error", buildErrorFeedback(wrong, item));
}

function runHintStep() {
  if (gameState.completed) {
    setFeedback("success", `Con đã lắp đúng tiếng “${gameState.currentWord.word}”. Bấm Chơi tiếp để nhận tiếng mới nhé.`);
    return;
  }
  clearHints();
  const item = gameState.currentWord;
  const requiredParts = getRequiredParts(item);
  if (!elements.detailedGuide.checked) {
    const type = requiredParts.find((part) => gameState[selectedKey(part)] !== item[part]);
    if (!type) {
      const message = `Đã đủ ${partCountWord(requiredParts.length)} mảnh. Con bấm “Kiểm tra” nhé.`;
      setFeedback("hint", message);
      speech.speak(message);
      return;
    }
    const value = item[type];
    highlightAnswer(type, value);
    const hints = {
      initial: item.initial ? `Nghe đầu tiếng “${item.word}”: con tìm âm ${item.initial}.` : `Tiếng “${item.word}” bắt đầu ngay bằng vần, hãy chọn mảnh không có âm đầu.`,
      rhyme: `Phần đứng sau âm đầu là vần ${item.rhyme}. Con tìm mảnh màu cam nhé.`,
      tone: `Nghe dấu của tiếng “${item.word}”: con cần dấu ${item.tone}.`
    };
    setFeedback("hint", hints[type]);
    speech.speak(hints[type]);
    return;
  }

  const base = buildVietnameseSyllable(item.initial, item.rhyme, "ngang");
  const steps = [
    { text: `Ta sẽ ghép tiếng “${item.word}”. Nhìn ${partCountWord(requiredParts.length)} khe từ trái sang phải nhé.` },
    { type: "initial", value: item.initial, text: item.initial ? `Trước tiên chọn âm đầu ${item.initial}.` : "Trước tiên chọn mảnh không có âm đầu." },
    { type: "rhyme", value: item.rhyme, text: `Tiếp theo chọn vần ${item.rhyme}. Ghép lại ta được ${base}.` }
  ];
  if (requiredParts.includes("tone")) {
    steps.push({ type: "tone", value: item.tone, text: `Cuối cùng thêm dấu ${item.tone}. ${base} - ${item.tone} - ${item.word}.` });
  }
  const step = steps[Math.min(gameState.hintStep, steps.length - 1)];
  if (step.type) highlightAnswer(step.type, step.value);
  setFeedback("hint", step.text);
  speech.speak(step.text, { rate: 0.78 });
  gameState.hintStep = Math.min(gameState.hintStep + 1, steps.length - 1);
}

function highlightAnswer(type, value) {
  document.querySelector(`[data-tray="${type}"]`)?.classList.add("hinted");
  document.querySelector(`[data-slot="${type}"]`)?.classList.add("hinted");
  document.querySelectorAll(`.tile-${type}`).forEach((tile) => {
    if (tile.dataset.value === value) tile.classList.add("hinted");
  });
}

function clearHints() {
  document.querySelectorAll(".hinted").forEach((element) => element.classList.remove("hinted"));
}

function clearSlotFeedback() {
  document.querySelectorAll(".slot").forEach((slot) => {
    slot.classList.remove("incorrect", "correct", "needs-attention");
  });
}

function setFeedback(kind, message) {
  elements.feedback.className = `feedback ${kind}`;
  elements.feedback.querySelector(".feedback-icon").textContent = ({
    info: "i", warning: "!", error: "!", success: "✓", hint: "?"
  })[kind] ?? "i";
  elements.feedback.querySelector("p").textContent = message;
}

function speakQuestion() {
  const item = gameState.currentWord;
  if (!item) return;
  speech.speak(`Con hãy ghép tiếng ${item.word}.`, { rate: 0.78 });
}

function speakSelectedPart(type) {
  const value = gameState[selectedKey(type)];
  if (value === null) {
    speech.speak(`Khe ${typeLabel(type)} đang trống.`);
    return;
  }
  speakPart(type, value);
}

function speakPart(type, value) {
  if (type === "initial") {
    const spoken = value === "" ? "không có âm đầu" : `âm ${value}`;
    speech.speak(spoken);
  } else if (type === "rhyme") {
    speech.speak(`vần ${value}`);
  } else {
    speech.speak(value === "ngang" ? "không dấu" : `dấu ${value}`);
  }
}

function selectedKey(type) {
  return `selected${type[0].toUpperCase()}${type.slice(1)}`;
}

function typeLabel(type) {
  return ({ initial: "âm đầu", rhyme: "vần", tone: "dấu" })[type];
}

function partCountWord(count) {
  return count === 2 ? "hai" : "ba";
}

window.addEventListener("beforeunload", () => {
  speech.cancel();
  machineScene.dispose();
});

// Hữu ích cho kiểm thử thủ công trong DevTools mà không làm rò logic vào UI.
window.__VIETNAMESE_MACHINE__ = { gameState, WORDS, createNewRound, validateAnswer, placeTileIntoSlot };
