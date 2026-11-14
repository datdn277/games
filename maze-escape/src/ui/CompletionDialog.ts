export class CompletionDialog {
  constructor(
    private readonly root: HTMLElement,
    private readonly onNext: () => void,
    private readonly onReplay: () => void,
    private readonly onMenu: () => void,
  ) {
    root.addEventListener("click", this.onClick);
  }

  show(stars: number, steps: number, optimal: number, hasNext: boolean): void {
    this.root.innerHTML = `<div class="modal-card completion-card" role="dialog" aria-modal="true" aria-labelledby="completion-title">
      <div class="celebration-rabbit" aria-hidden="true">🐰</div>
      <span class="eyebrow">Đã về đến hang!</span>
      <h2 id="completion-title">Tuyệt lắm!</h2>
      <div class="completion-stars" aria-label="Đạt ${stars} sao">${"★".repeat(stars)}${"☆".repeat(3 - stars)}</div>
      <p>Con đã giúp Thỏ nhặt đủ cà rốt và tìm được đường về nhà.</p>
      <div class="result-strip"><span>🐾 ${steps} bước</span><span>🎯 Gợi ý tốt nhất: ${optimal}</span></div>
      <div class="completion-actions">
        <button class="secondary-button" type="button" data-completion-menu>Chọn màn</button>
        <button class="secondary-button" type="button" data-completion-replay>Chơi lại</button>
        ${hasNext ? '<button class="primary-button" type="button" data-completion-next>Màn tiếp theo →</button>' : ""}
      </div>
    </div>`;
    this.root.hidden = false;
    this.root.querySelector<HTMLButtonElement>("[data-completion-next], [data-completion-replay]")?.focus();
  }

  hide(): void {
    this.root.hidden = true;
  }

  dispose(): void {
    this.root.removeEventListener("click", this.onClick);
  }

  private readonly onClick = (event: MouseEvent): void => {
    const target = event.target as Element | null;
    if (target?.closest("[data-completion-next]")) this.onNext();
    else if (target?.closest("[data-completion-replay]")) this.onReplay();
    else if (target?.closest("[data-completion-menu]")) this.onMenu();
  };
}
