export type FeedbackTone = "neutral" | "success" | "try-again" | "hint";

export class FeedbackPanel {
  constructor(private readonly element: HTMLElement) {}

  show(message: string, tone: FeedbackTone = "neutral"): void {
    this.element.dataset.tone = tone;
    this.element.textContent = message;
    this.element.classList.remove("feedback-pop");
    requestAnimationFrame(() => this.element.classList.add("feedback-pop"));
  }
}
