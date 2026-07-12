const shuffle = (items, rng = Math.random) => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(rng() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
};

export function createAnswerOptions(correct, optionCount = 3, rng = Math.random) {
  const candidates = [correct];
  const offsets = [-1, 1, -2, 2, -3, 3, -4, 4, -5, 5];
  for (const offset of offsets) {
    const value = correct + offset;
    if (value >= 0 && !candidates.includes(value)) candidates.push(value);
    if (candidates.length >= optionCount) break;
  }
  return shuffle(candidates.slice(0, optionCount), rng);
}

export class AnswerController {
  constructor(tray, options = {}) {
    this.tray = tray;
    this.onSelect = options.onSelect ?? (() => {});
    this.getDropTarget = options.getDropTarget ?? (() => null);
    this.cards = [];
    this.locked = true;
    this.drag = null;
  }

  clear() {
    this.tray.replaceChildren();
    this.cards = [];
    this.tray.setAttribute("aria-busy", "true");
  }

  render(values) {
    this.clear();
    this.tray.setAttribute("aria-busy", "false");
    values.forEach((value) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "answer-card";
      card.textContent = String(value);
      card.dataset.value = String(value);
      card.setAttribute("aria-label", `Chọn số ${value}`);
      card.draggable = true;
      card.addEventListener("click", () => {
        if (!this.locked && !card.dataset.wasDragged) this.onSelect(value, card);
        delete card.dataset.wasDragged;
      });
      card.addEventListener("keydown", (event) => {
        if ((event.key === "Enter" || event.key === " ") && !this.locked) {
          event.preventDefault();
          this.onSelect(value, card);
        }
      });
      card.addEventListener("pointerdown", (event) => this.startPointerDrag(event, card, value));
      card.addEventListener("dragstart", (event) => {
        if (this.locked) return event.preventDefault();
        event.dataTransfer.setData("text/plain", String(value));
        event.dataTransfer.effectAllowed = "move";
        card.classList.add("dragging");
      });
      card.addEventListener("dragend", () => card.classList.remove("dragging"));
      this.tray.append(card);
      this.cards.push(card);
    });
    this.setLocked(false);
  }

  bindDropTarget(target) {
    if (!target || target.dataset.dropBound === "true") return;
    target.dataset.dropBound = "true";
    target.addEventListener("dragover", (event) => {
      if (this.locked) return;
      event.preventDefault();
      target.classList.add("drop-ready");
    });
    target.addEventListener("dragleave", () => target.classList.remove("drop-ready"));
    target.addEventListener("drop", (event) => {
      event.preventDefault();
      target.classList.remove("drop-ready");
      if (this.locked) return;
      const value = Number(event.dataTransfer.getData("text/plain"));
      const card = this.cards.find((item) => Number(item.dataset.value) === value);
      if (Number.isFinite(value) && card) this.onSelect(value, card);
    });
  }

  startPointerDrag(event, card, value) {
    if (this.locked || event.pointerType === "mouse" && event.button !== 0) return;
    this.drag = { startX: event.clientX, startY: event.clientY, card, value, moved: false, ghost: null };
    card.setPointerCapture?.(event.pointerId);
    const move = (moveEvent) => this.movePointerDrag(moveEvent);
    const end = (endEvent) => {
      card.removeEventListener("pointermove", move);
      card.removeEventListener("pointerup", end);
      card.removeEventListener("pointercancel", end);
      this.endPointerDrag(endEvent);
    };
    card.addEventListener("pointermove", move);
    card.addEventListener("pointerup", end);
    card.addEventListener("pointercancel", end);
  }

  movePointerDrag(event) {
    if (!this.drag) return;
    const distance = Math.hypot(event.clientX - this.drag.startX, event.clientY - this.drag.startY);
    if (distance < 9 && !this.drag.moved) return;
    this.drag.moved = true;
    if (!this.drag.ghost) {
      this.drag.ghost = this.drag.card.cloneNode(true);
      this.drag.ghost.className = "answer-card drag-ghost";
      this.drag.ghost.setAttribute("aria-hidden", "true");
      document.body.append(this.drag.ghost);
      this.drag.card.classList.add("dragging");
    }
    this.drag.ghost.style.left = `${event.clientX}px`;
    this.drag.ghost.style.top = `${event.clientY}px`;
    const target = this.getDropTarget();
    const hit = document.elementFromPoint(event.clientX, event.clientY);
    target?.classList.toggle("drop-ready", Boolean(hit && (hit === target || target.contains(hit))));
  }

  endPointerDrag(event) {
    if (!this.drag) return;
    const { card, value, moved, ghost } = this.drag;
    const target = this.getDropTarget();
    ghost?.remove();
    card.classList.remove("dragging");
    target?.classList.remove("drop-ready");
    if (moved) {
      card.dataset.wasDragged = "true";
      const hit = document.elementFromPoint(event.clientX, event.clientY);
      if (target && hit && (hit === target || target.contains(hit))) this.onSelect(value, card);
      else this.shake(card);
    }
    this.drag = null;
  }

  setLocked(locked) {
    this.locked = locked;
    this.tray.setAttribute("aria-busy", String(locked));
    this.cards.forEach((card) => {
      card.disabled = locked;
      card.setAttribute("aria-disabled", String(locked));
    });
  }

  shake(card) {
    card?.classList.remove("shake");
    requestAnimationFrame(() => card?.classList.add("shake"));
    window.setTimeout(() => card?.classList.remove("shake"), 520);
  }

  highlightCorrect(correct) {
    this.cards.forEach((card) => card.classList.toggle("answer-card--hint", Number(card.dataset.value) === correct));
  }

  markCorrect(card) {
    card?.classList.add("answer-card--correct");
  }
}
