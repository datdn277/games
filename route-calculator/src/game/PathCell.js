export class PathCell {
  constructor({ id, type, label, value = null, stepIndex = null }) {
    this.id = id;
    this.type = type;
    this.label = label;
    this.value = value;
    this.stepIndex = stepIndex;
    this.state = "locked";
    this.element = null;
  }

  render() {
    const element = document.createElement("div");
    element.id = this.id;
    element.className = `path-cell path-cell--${this.type} ${this.state}`;
    element.dataset.cellType = this.type;
    if (this.stepIndex !== null) element.dataset.stepIndex = String(this.stepIndex);
    element.setAttribute("aria-label", this.ariaLabel());
    element.innerHTML = this.content();
    this.element = element;
    return element;
  }

  content() {
    if (this.type === "start") {
      return `<span class="cell-mini">Bắt đầu</span><strong>${this.value}</strong><span class="cell-status" aria-hidden="true">🚩</span>`;
    }
    if (this.type === "operation") {
      const verb = this.label.startsWith("+") ? "Thêm" : "Bớt";
      return `<span class="cell-mini">${verb}</span><strong>${this.label}</strong><span class="cell-status" aria-hidden="true"></span>`;
    }
    if (this.type === "answer") {
      return `<span class="cell-mini">Kết quả</span><strong>${this.value ?? "?"}</strong><span class="cell-status" aria-hidden="true"></span>`;
    }
    return `<span class="cell-mini">Đích đến</span><strong aria-hidden="true">🏁</strong><span class="cell-status" aria-hidden="true"></span>`;
  }

  ariaLabel() {
    if (this.type === "start") return `Bắt đầu với ${this.value}`;
    if (this.type === "operation") return this.label.startsWith("+") ? `Thêm ${this.label.slice(1)}` : `Bớt ${this.label.slice(1)}`;
    if (this.type === "answer") return this.value === null ? "Ô kết quả trống" : `Kết quả ${this.value}`;
    return "Điểm hoàn thành";
  }

  setState(state, value = this.value) {
    this.state = state;
    this.value = value;
    if (!this.element) return;
    this.element.className = `path-cell path-cell--${this.type} ${state}`;
    this.element.setAttribute("aria-label", this.ariaLabel());
    const strong = this.element.querySelector("strong");
    if (strong && this.type === "answer") strong.textContent = this.value ?? "?";
    const status = this.element.querySelector(".cell-status");
    if (status) {
      status.textContent = state === "correct" || state === "completed" ? "✓" : state === "incorrect" ? "↻" : "";
    }
  }
}
