export function keyToGridAction(key) {
  return ({
    ArrowUp: { type: "move-focus", row: -1, column: 0 },
    ArrowDown: { type: "move-focus", row: 1, column: 0 },
    ArrowLeft: { type: "move-focus", row: 0, column: -1 },
    ArrowRight: { type: "move-focus", row: 0, column: 1 },
    Enter: { type: "paint" },
    " ": { type: "paint" },
    Backspace: { type: "erase" },
    Delete: { type: "erase" }
  })[key] ?? null;
}

export class InputController {
  constructor({ root, playerCanvas, pickCell, onPaint, onSelectColor, onFocus, onEraseShortcut }) {
    this.root = root;
    this.playerCanvas = playerCanvas;
    this.pickCell = pickCell;
    this.onPaint = onPaint;
    this.onSelectColor = onSelectColor;
    this.onFocus = onFocus;
    this.onEraseShortcut = onEraseShortcut;
    this.focusCell = { row: 0, column: 0 };
    this.rows = 1;
    this.columns = 1;
    this.enabled = true;
    this.abortController = new AbortController();
  }

  bind() {
    const signal = this.abortController.signal;
    let canvasStart = null;
    this.playerCanvas.addEventListener("pointerdown", (event) => {
      canvasStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
    }, { signal });
    this.playerCanvas.addEventListener("pointerup", (event) => {
      if (!this.enabled || !canvasStart || canvasStart.id !== event.pointerId) return;
      const distance = Math.hypot(event.clientX - canvasStart.x, event.clientY - canvasStart.y);
      canvasStart = null;
      if (distance > 10) return;
      const cell = this.pickCell(event.clientX, event.clientY);
      if (!cell) return;
      this.focusCell = cell;
      this.onFocus(cell);
      this.onPaint(cell, { source: event.pointerType || "pointer" });
    }, { signal });

    this.playerCanvas.addEventListener("keydown", (event) => {
      if (!this.enabled || event.repeat) return;
      const action = keyToGridAction(event.key);
      if (!action) return;
      event.preventDefault();
      if (action.type === "move-focus") {
        this.focusCell = {
          row: Math.min(this.rows - 1, Math.max(0, this.focusCell.row + action.row)),
          column: Math.min(this.columns - 1, Math.max(0, this.focusCell.column + action.column))
        };
        this.onFocus(this.focusCell);
      } else if (action.type === "paint") {
        this.onPaint(this.focusCell, { source: "keyboard" });
      } else if (action.type === "erase") {
        this.onEraseShortcut(this.focusCell);
      }
    }, { signal });
    this.playerCanvas.addEventListener("focus", () => this.onFocus(this.focusCell), { signal });

    this.root.addEventListener("pointerdown", (event) => {
      const swatch = event.target.closest("[data-color-id]");
      if (!swatch || !this.enabled) return;
      const colorId = swatch.dataset.colorId;
      this.onSelectColor(colorId);
      this.#startDrag(event, swatch, colorId);
    }, { signal });

    this.root.addEventListener("click", (event) => {
      const swatch = event.target.closest("[data-color-id]");
      if (swatch && event.detail === 0 && this.enabled) this.onSelectColor(swatch.dataset.colorId);
    }, { signal });
  }

  configure(rows, columns) {
    this.rows = rows;
    this.columns = columns;
    this.focusCell = { row: 0, column: 0 };
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }

  destroy() {
    this.abortController.abort();
  }

  #startDrag(event, swatch, colorId) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const start = { x: event.clientX, y: event.clientY };
    let moved = false;
    let ghost = null;
    swatch.setPointerCapture?.(event.pointerId);
    const move = (moveEvent) => {
      if (moveEvent.pointerId !== event.pointerId) return;
      if (!moved && Math.hypot(moveEvent.clientX - start.x, moveEvent.clientY - start.y) > 8) {
        moved = true;
        ghost = document.createElement("div");
        ghost.className = "paint-drag-ghost";
        ghost.style.setProperty("--drag-color", swatch.style.getPropertyValue("--swatch-color"));
        ghost.textContent = swatch.querySelector(".swatch-symbol")?.textContent ?? "●";
        document.body.appendChild(ghost);
        document.body.classList.add("is-dragging-color");
      }
      if (ghost) {
        ghost.style.left = `${moveEvent.clientX}px`;
        ghost.style.top = `${moveEvent.clientY}px`;
      }
    };
    const end = (endEvent) => {
      if (endEvent.pointerId !== event.pointerId) return;
      swatch.removeEventListener("pointermove", move);
      swatch.removeEventListener("pointerup", end);
      swatch.removeEventListener("pointercancel", end);
      ghost?.remove();
      document.body.classList.remove("is-dragging-color");
      if (!moved || !this.enabled) return;
      const cell = this.pickCell(endEvent.clientX, endEvent.clientY);
      if (cell) {
        this.focusCell = cell;
        this.onFocus(cell);
        this.onPaint(cell, { source: "drag", colorId });
      }
    };
    swatch.addEventListener("pointermove", move);
    swatch.addEventListener("pointerup", end);
    swatch.addEventListener("pointercancel", end);
  }
}
