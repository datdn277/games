export type FeedbackTone = "neutral" | "success" | "blocked" | "hint";

export class FeedbackPanel {
  private readonly icon: HTMLElement;
  private readonly message: HTMLElement;

  constructor(private readonly root: HTMLElement) {
    root.innerHTML = `
      <span class="feedback-icon" aria-hidden="true" data-feedback-icon>🐰</span>
      <span data-feedback-message>Hãy giúp Thỏ nhặt cà rốt rồi trở về hang.</span>`;
    this.icon = this.required("[data-feedback-icon]");
    this.message = this.required("[data-feedback-message]");
  }

  show(message: string, tone: FeedbackTone = "neutral"): void {
    this.message.textContent = message;
    this.root.dataset.tone = tone;
    this.icon.textContent = tone === "blocked" ? "↩️" : tone === "hint" ? "👣" : tone === "success" ? "✨" : "🐰";
  }

  private required(selector: string): HTMLElement {
    const element = this.root.querySelector<HTMLElement>(selector);
    if (!element) throw new Error(`Missing feedback element: ${selector}`);
    return element;
  }
}
