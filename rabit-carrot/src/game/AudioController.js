export class AudioController {
  constructor(synth = globalThis.speechSynthesis ?? null, Utterance = globalThis.SpeechSynthesisUtterance ?? null) {
    this.synth = synth;
    this.Utterance = Utterance;
    this.enabled = true;
    this.lastText = "";
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) this.cancel();
  }

  cancel() {
    this.synth?.cancel?.();
  }

  speak(text, { remember = true, rate = 0.88, pitch = 1.08 } = {}) {
    if (remember) this.lastText = text;
    this.cancel();
    if (!this.enabled || !this.synth || !this.Utterance || !text) return false;
    const utterance = new this.Utterance(text);
    utterance.lang = "vi-VN";
    utterance.rate = rate;
    utterance.pitch = pitch;
    const vietnameseVoice = this.synth.getVoices?.().find((voice) => voice.lang?.toLowerCase().startsWith("vi"));
    if (vietnameseVoice) utterance.voice = vietnameseVoice;
    this.synth.speak(utterance);
    return true;
  }

  replay() {
    return this.lastText ? this.speak(this.lastText, { remember: false }) : false;
  }
}
