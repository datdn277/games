const NUMBER_WORDS = [
  "không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy",
  "tám", "chín", "mười", "mười một", "mười hai", "mười ba", "mười bốn", "mười lăm",
];

export const numberWord = (value) => NUMBER_WORDS[value] ?? String(value);

export function buildOperationInstruction(step) {
  if (step.operator === "+") {
    return `Bắt đầu với ${step.inputValue} quả. Ta thêm ${step.operand} quả vào rổ.`;
  }
  return `Bắt đầu với ${step.inputValue} quả. Ta lấy ${step.operand} quả trong rổ ra.`;
}

export function buildOperationQuestion(step) {
  return step.operator === "+"
    ? "Trong rổ lúc này có bao nhiêu quả?"
    : "Trong rổ lúc này còn bao nhiêu quả?";
}

export class AudioController {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.lastText = "";
    this.voice = null;
    this.currentSpeech = null;
    this.resolveVoice();
    window.speechSynthesis?.addEventListener?.("voiceschanged", () => this.resolveVoice());
  }

  resolveVoice() {
    const voices = window.speechSynthesis?.getVoices?.() ?? [];
    this.voice = voices.find((voice) => voice.lang.toLowerCase().startsWith("vi")) ?? null;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) this.cancel();
  }

  cancel() {
    window.speechSynthesis?.cancel?.();
    this.currentSpeech?.finish(false);
  }

  speak(text, options = {}) {
    this.lastText = text;
    if (!this.enabled || !("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      return Promise.resolve(false);
    }
    this.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "vi-VN";
    utterance.rate = options.rate ?? 0.82;
    utterance.pitch = options.pitch ?? 1.08;
    utterance.volume = 1;
    if (this.voice) utterance.voice = this.voice;

    return new Promise((resolve) => {
      let settled = false;
      const finish = (completed) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(watchdog);
        if (this.currentSpeech?.utterance === utterance) this.currentSpeech = null;
        resolve(completed);
      };
      const estimatedDuration = Math.min(30000, Math.max(5000, (text.length * 145) / utterance.rate));
      const watchdog = window.setTimeout(() => finish(false), estimatedDuration);
      utterance.onend = () => finish(true);
      utterance.onerror = () => finish(false);
      this.currentSpeech = { utterance, finish };
      window.speechSynthesis.speak(utterance);
    });
  }

  replay() {
    if (this.lastText) return this.speak(this.lastText);
    return Promise.resolve(false);
  }

  speakCount(count) {
    const words = Array.from({ length: count }, (_, index) => numberWord(index + 1));
    return this.speak(`${words.join(", ")}. Có ${count} quả trong rổ.`, { rate: 0.72 });
  }
}
