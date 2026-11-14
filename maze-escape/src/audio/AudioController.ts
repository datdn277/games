export class AudioController {
  private lastMessage = "";

  constructor(private enabled: boolean) {}

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  speak(message: string): void {
    this.lastMessage = message;
    if (!this.enabled || !("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "vi-VN";
    utterance.rate = 0.9;
    utterance.pitch = 1.08;
    const vietnameseVoice = window.speechSynthesis
      .getVoices()
      .find((voice) => voice.lang.toLowerCase().startsWith("vi"));
    if (vietnameseVoice) utterance.voice = vietnameseVoice;
    window.speechSynthesis.speak(utterance);
  }

  replay(): void {
    if (this.lastMessage) this.speak(this.lastMessage);
  }

  dispose(): void {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }
}
