export class InputController {
  constructor({ container, getItem, canInteract, canDropAt, onSelect, onInvalidDrop, onDropHover }) {
    this.container = container;
    this.getItem = getItem;
    this.canInteract = canInteract;
    this.canDropAt = canDropAt;
    this.onSelect = onSelect;
    this.onInvalidDrop = onInvalidDrop;
    this.onDropHover = onDropHover;
    this.abortController = null;
  }

  bind() {
    this.abortController?.abort();
    this.abortController = new AbortController();
    const { signal } = this.abortController;
    this.container.querySelectorAll("[data-option-id]").forEach((button) => {
      button.addEventListener("pointerdown", (event) => this.startPointer(event, button), { signal });
      button.addEventListener("keydown", (event) => {
        if ((event.key === "Enter" || event.key === " ") && this.canInteract()) {
          event.preventDefault();
          this.onSelect(this.getItem(button.dataset.optionId), { method: "keyboard" });
        }
      }, { signal });
    });
  }

  startPointer(event, button) {
    if (!this.canInteract()) return;
    event.preventDefault();
    button.setPointerCapture?.(event.pointerId);
    const start = { x: event.clientX, y: event.clientY };
    let dragging = false;
    let ghost = null;
    const move = (moveEvent) => {
      const distance = Math.hypot(moveEvent.clientX - start.x, moveEvent.clientY - start.y);
      if (!dragging && distance > 8) {
        dragging = true;
        ghost = button.cloneNode(true);
        ghost.className = "answer-card drag-ghost";
        document.body.appendChild(ghost);
        button.classList.add("drag-source");
      }
      if (dragging) {
        Object.assign(ghost.style, { left: `${moveEvent.clientX}px`, top: `${moveEvent.clientY}px` });
        this.onDropHover(this.canDropAt(moveEvent.clientX, moveEvent.clientY));
      }
    };
    const end = (endEvent) => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", end);
      button.classList.remove("drag-source");
      ghost?.remove();
      this.onDropHover(false);
      const item = this.getItem(button.dataset.optionId);
      if (!dragging) this.onSelect(item, { method: "tap" });
      else if (this.canDropAt(endEvent.clientX, endEvent.clientY)) this.onSelect(item, { method: "drag" });
      else this.onInvalidDrop(item);
    };
    document.addEventListener("pointermove", move, { passive: false });
    document.addEventListener("pointerup", end, { once: true });
  }
}
