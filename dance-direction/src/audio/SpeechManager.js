function vietnameseVoice(voices) {
  return voices.find(voice => /^vi(?:[-_]|$)/i.test(voice.lang) && voice.localService === true);
}

export class SpeechManager {
  constructor(environment, onSpeaking) {
    this.synthesis = environment.speechSynthesis;
    this.Utterance = environment.SpeechSynthesisUtterance;
    this.onSpeaking = onSpeaking;
    this.text = '';
    this.utterance = null;
    this.paused = false;
    this.onVoicesChanged = () => this.playPending();
    this.synthesis?.addEventListener?.('voiceschanged', this.onVoicesChanged);
  }

  speak(text) {
    this.cancel();
    this.text = text;
    this.playPending();
  }

  playPending() {
    if (!this.text || this.paused || this.utterance || !this.Utterance || !this.synthesis) return;
    const voice = vietnameseVoice(this.synthesis.getVoices());
    if (!voice) return;

    const utterance = new this.Utterance(this.text);
    utterance.lang = 'vi-VN';
    utterance.voice = voice;
    utterance.rate = 0.9;
    utterance.pitch = 1.12;
    utterance.volume = 0.72;
    utterance.onend = utterance.onerror = () => {
      if (this.utterance !== utterance) return;
      this.utterance = null;
      this.text = '';
      this.onSpeaking(false);
    };
    this.utterance = utterance;
    this.onSpeaking(true);

    try {
      this.synthesis.speak(utterance);
    } catch {
      utterance.onerror();
    }
  }

  stopUtterance() {
    if (!this.utterance) return;
    this.utterance = null;
    this.synthesis.cancel();
    this.onSpeaking(false);
  }

  cancel() {
    this.text = '';
    this.stopUtterance();
  }

  pause() {
    this.paused = true;
    this.stopUtterance();
  }

  resume() {
    this.paused = false;
    this.playPending();
  }

  dispose() {
    this.cancel();
    this.synthesis?.removeEventListener?.('voiceschanged', this.onVoicesChanged);
  }
}
