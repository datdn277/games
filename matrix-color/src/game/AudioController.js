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

  speak(text, { remember = true } = {}) {
    if (remember) this.lastText = text;
    this.cancel();
    if (!this.enabled || !text || !this.synth || !this.Utterance) return false;
    const utterance = new this.Utterance(text);
    utterance.lang = "vi-VN";
    utterance.rate = 0.9;
    utterance.pitch = 1.06;
    const voice = this.synth.getVoices?.().find((candidate) => candidate.lang?.toLowerCase().startsWith("vi"));
    if (voice) utterance.voice = voice;
    this.synth.speak(utterance);
    return true;
  }

  replay() {
    return this.lastText ? this.speak(this.lastText, { remember: false }) : false;
  }
}
