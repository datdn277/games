import { keyToDirection } from "./directions.js";

export class InputController {
  constructor({ root, onDirection }) {
    this.root = root;
    this.onDirection = onDirection;
    this.enabled = true;
    this.lastPointerTime = 0;
    this.abortController = new AbortController();
  }

  bind() {
    const signal = this.abortController.signal;
    this.root.querySelectorAll("[data-direction]").forEach((button) => {
      button.addEventListener("click", (event) => {
        if (!this.enabled) return;
        const now = performance.now();
        if (now - this.lastPointerTime < 80) return;
        this.lastPointerTime = now;
        this.onDirection(event.currentTarget.dataset.direction);
      }, { signal });
    });

    window.addEventListener("keydown", (event) => {
      const direction = keyToDirection(event.key);
      if (!direction || !this.enabled || event.repeat) return;
      event.preventDefault();
      this.onDirection(direction);
    }, { signal });
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    this.root.querySelectorAll("[data-direction]").forEach((button) => {
      button.disabled = !this.enabled;
    });
  }

  destroy() {
    this.abortController.abort();
  }
}
