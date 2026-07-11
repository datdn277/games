export class AudioController {
  constructor({ enabled = true } = {}) {
    this.enabled = enabled;
    this.context = null;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  speak(text, { rate = 0.88, pitch = 1.08 } = {}) {
    if (!this.enabled || !("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "vi-VN";
    utterance.rate = rate;
    utterance.pitch = pitch;
    const vietnameseVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang?.toLowerCase().startsWith("vi"));
    if (vietnameseVoice) utterance.voice = vietnameseVoice;
    window.speechSynthesis.speak(utterance);
  }

  whistle() {
    if (!this.enabled) return;
    try {
      this.context ??= new (window.AudioContext || window.webkitAudioContext)();
      const now = this.context.currentTime;
      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
      gain.connect(this.context.destination);
      [660, 880].forEach((frequency, index) => {
        const oscillator = this.context.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, now + index * 0.05);
        oscillator.connect(gain);
        oscillator.start(now + index * 0.05);
        oscillator.stop(now + 0.44);
      });
    } catch {
      // Web Audio không khả dụng không làm gián đoạn gameplay.
    }
  }
}
