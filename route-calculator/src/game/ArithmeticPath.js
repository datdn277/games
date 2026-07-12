import { PathCell } from "./PathCell.js";

const GRID_COLUMNS = 5;

export class ArithmeticPath {
  constructor(container) {
    this.container = container;
    this.cells = [];
    this.svg = null;
    this.resizeObserver = new ResizeObserver(() => this.drawConnections());
    this.resizeObserver.observe(container);
  }

  render(level) {
    this.container.replaceChildren();
    this.cells = [
      new PathCell({ id: "path-start", type: "start", label: String(level.startValue), value: level.startValue }),
    ];

    level.steps.forEach((step, index) => {
      this.cells.push(
        new PathCell({
          id: `path-operation-${index}`,
          type: "operation",
          label: `${step.operator}${step.operand}`,
          stepIndex: index,
        }),
        new PathCell({
          id: `path-answer-${index}`,
          type: "answer",
          label: "?",
          stepIndex: index,
        }),
      );
    });
    this.cells.push(new PathCell({ id: "path-finish", type: "finish", label: "Đích" }));

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("path-connectors");
    svg.setAttribute("aria-hidden", "true");
    this.svg = svg;
    this.container.append(svg);

    this.cells.forEach((cell, index) => {
      const element = cell.render();
      const row = Math.floor(index / GRID_COLUMNS) + 1;
      const position = index % GRID_COLUMNS;
      const column = row % 2 === 1 ? position + 1 : GRID_COLUMNS - position;
      element.style.gridRow = String(row);
      element.style.gridColumn = String(column);
      this.container.append(element);
    });

    this.setActiveStep(-1);
    requestAnimationFrame(() => this.drawConnections());
  }

  drawConnections() {
    if (!this.svg || !this.cells.every((cell) => cell.element)) return;
    const box = this.container.getBoundingClientRect();
    this.svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
    this.svg.replaceChildren();

    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
    marker.setAttribute("id", "path-arrow");
    marker.setAttribute("viewBox", "0 0 10 10");
    marker.setAttribute("refX", "8");
    marker.setAttribute("refY", "5");
    marker.setAttribute("markerWidth", "6");
    marker.setAttribute("markerHeight", "6");
    marker.setAttribute("orient", "auto-start-reverse");
    const arrow = document.createElementNS("http://www.w3.org/2000/svg", "path");
    arrow.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
    arrow.setAttribute("fill", "context-stroke");
    marker.append(arrow);
    defs.append(marker);
    this.svg.append(defs);

    this.cells.slice(0, -1).forEach((cell, index) => {
      const next = this.cells[index + 1];
      const from = cell.element.getBoundingClientRect();
      const to = next.element.getBoundingClientRect();
      const x1 = from.left - box.left + from.width / 2;
      const y1 = from.top - box.top + from.height / 2;
      const x2 = to.left - box.left + to.width / 2;
      const y2 = to.top - box.top + to.height / 2;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const bend = Math.max(14, Math.abs(y2 - y1) * 0.45);
      const d = Math.abs(y2 - y1) < 8
        ? `M ${x1} ${y1} L ${x2} ${y2}`
        : `M ${x1} ${y1} C ${x1} ${y1 + bend}, ${x2} ${y2 - bend}, ${x2} ${y2}`;
      path.setAttribute("d", d);
      path.setAttribute("class", `path-line ${cell.state === "completed" || cell.state === "correct" ? "completed" : ""}`);
      path.setAttribute("marker-end", "url(#path-arrow)");
      path.setAttribute("data-from-index", String(index));
      this.svg.append(path);
    });
  }

  setActiveStep(stepIndex) {
    this.cells.forEach((cell) => {
      if (cell.type === "start") {
        cell.setState(stepIndex < 0 ? "active" : "completed");
      } else if (cell.type === "operation" || cell.type === "answer") {
        if (cell.stepIndex < stepIndex) cell.setState("completed", cell.value);
        else if (cell.stepIndex === stepIndex) cell.setState("active", cell.value);
        else cell.setState("locked", cell.value);
      } else {
        cell.setState("locked");
      }
    });
    this.drawConnections();
  }

  markAnswer(stepIndex, value, state = "correct") {
    const answer = this.getAnswerCell(stepIndex);
    answer?.setState(state, value);
    const operation = this.cells.find((cell) => cell.type === "operation" && cell.stepIndex === stepIndex);
    operation?.setState(state === "correct" ? "completed" : "active");
    this.drawConnections();
  }

  markComplete() {
    this.cells.forEach((cell) => cell.setState("completed", cell.value));
    this.drawConnections();
  }

  flashCurrent(stepIndex) {
    this.cells
      .filter((cell) => cell.stepIndex === stepIndex || (stepIndex === 0 && cell.type === "start"))
      .forEach((cell) => {
        cell.element?.classList.remove("hint-pulse");
        requestAnimationFrame(() => cell.element?.classList.add("hint-pulse"));
      });
  }

  getAnswerCell(stepIndex) {
    return this.cells.find((cell) => cell.type === "answer" && cell.stepIndex === stepIndex);
  }

  getActiveAnswerElement(stepIndex) {
    return this.getAnswerCell(stepIndex)?.element ?? null;
  }
}
