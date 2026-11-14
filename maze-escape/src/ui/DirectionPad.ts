import type { Direction } from "../maze/MazeCell";

const BUTTONS: Array<{ direction: Direction; icon: string; label: string; className: string }> = [
  { direction: "up", icon: "↑", label: "Đi lên", className: "dpad-up" },
  { direction: "left", icon: "←", label: "Đi sang trái", className: "dpad-left" },
  { direction: "down", icon: "↓", label: "Đi xuống", className: "dpad-down" },
  { direction: "right", icon: "→", label: "Đi sang phải", className: "dpad-right" },
];

export class DirectionPad {
  constructor(private readonly root: HTMLElement) {
    root.innerHTML = BUTTONS.map(
      ({ direction, icon, label, className }) =>
        `<button class="dpad-button ${className}" type="button" data-direction="${direction}" aria-label="${label}"><span aria-hidden="true">${icon}</span></button>`,
    ).join("");
  }

  setDisabled(disabled: boolean): void {
    this.root.querySelectorAll<HTMLButtonElement>("[data-direction]").forEach((button) => {
      button.disabled = disabled;
      button.setAttribute("aria-disabled", String(disabled));
    });
  }
}
