export class SpeechManager {
  constructor(enabled) {
    this.enabled = enabled;
    this.synth = window.speechSynthesis;
    this.current = null;
  }

  get voice() {
    return this.synth?.getVoices().find((voice) => /^vi(?:[-_]|$)/i.test(voice.lang) && voice.localService);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.stop();
  }

  speak(text) {
    if (!this.enabled || !text?.trim() || !window.SpeechSynthesisUtterance) return false;
    const voice = this.voice;
    if (!voice) return false;
    this.stop();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = .86;
    utterance.pitch = 1.12;
    this.current = utterance;
    const clear = () => { if (this.current === utterance) this.current = null; };
    utterance.addEventListener('end', clear);
    utterance.addEventListener('error', clear);
    try {
      this.synth.speak(utterance);
      return true;
    } catch {
      clear();
      return false;
    }
  }

  stop() {
    if (!this.current) return;
    this.synth?.cancel();
    this.current = null;
  }
}
