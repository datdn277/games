export class AudioController {
  private enabled: boolean;

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  speak(text: string): void {
    if (!this.enabled || !("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "vi-VN";
    utterance.rate = 0.88;
    utterance.pitch = 1.08;
    const voices = window.speechSynthesis.getVoices();
    const vietnameseVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith("vi"));
    if (vietnameseVoice) utterance.voice = vietnameseVoice;
    window.speechSynthesis.speak(utterance);
  }

  stop(): void {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }
}
