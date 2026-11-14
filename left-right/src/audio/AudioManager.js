const feedback = {
  click: [[72, 0, 0.10]],
  correct: [[72, 0, 0.22], [76, 0.10, 0.22], [79, 0.20, 0.32]],
  wrong: [[69, 0, 0.20], [65, 0.13, 0.29]],
  reward: [[72, 0, 0.25], [76, 0.12, 0.25], [79, 0.24, 0.30], [84, 0.38, 0.48]],
};

const melody = [
  72, null, 76, 79, 76, null, 74, null,
  72, null, 69, 72, 76, null, 72, null,
  77, null, 76, 72, 74, null, 72, null,
  71, null, 74, 76, 74, null, 67, null,
];
const chords = [[48, 55], [45, 52], [41, 48], [43, 50]];
const stepSeconds = 0.36;

function tone(context, output, midi, start, duration, volume, wave = 'sine') {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = wave;
  oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(volume, start + 0.018);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(envelope);
  envelope.connect(output);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export class AudioManager {
  constructor({ enabled = true } = {}) {
    this.enabled = enabled;
    this.speech = globalThis.speechSynthesis;
    this.speech?.getVoices();
    this.onVisibilityChange = () => {
      if (globalThis.document.hidden) {
        this.stopMusic();
        this.cancelSpeech();
      } else {
        this.startMusic();
      }
    };
    globalThis.document?.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  get vietnameseVoice() {
    const voices = this.speech?.getVoices().filter(({ lang }) => /^vi(?:[-_]|$)/i.test(lang)) ?? [];
    return voices.find(({ localService }) => localService) ?? voices[0];
  }

  get hasVietnameseVoice() {
    return Boolean(this.vietnameseVoice && globalThis.SpeechSynthesisUtterance);
  }

  unlock() {
    const AudioContext = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!this.enabled || !AudioContext) return Promise.resolve(false);

    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.music = this.context.createGain();
        this.master.gain.value = 0.58;
        this.music.gain.value = 1;
        this.master.connect(this.context.destination);
        this.music.connect(this.master);
      }
      return this.context.resume().then(() => {
        this.startMusic();
        return true;
      }).catch(() => false);
    } catch {
      return Promise.resolve(false);
    }
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (this.master) {
      this.master.gain.setTargetAtTime(this.enabled ? 0.58 : 0, this.context.currentTime, 0.025);
    }
    if (this.enabled) {
      void this.unlock();
    } else {
      this.stopMusic();
      this.cancelSpeech();
    }
    return this.enabled;
  }

  toggle() {
    return this.setEnabled(!this.enabled);
  }

  play(kind) {
    if (!this.enabled || !this.context || this.context.state === 'closed' || !feedback[kind]) return;
    const start = this.context.currentTime + 0.012;
    for (const [note, offset, duration] of feedback[kind]) {
      tone(this.context, this.master, note, start + offset, duration, 0.13, 'triangle');
    }
  }

  speak(text) {
    this.cancelSpeech();
    const voice = this.vietnameseVoice;
    if (!this.enabled || !text || !voice || !globalThis.SpeechSynthesisUtterance) return false;
    try {
      const utterance = new globalThis.SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = 0.88;
      utterance.pitch = 1.05;
      const finish = () => {
        if (this.utterance !== utterance) return;
        this.utterance = null;
        this.duckMusic(false);
      };
      utterance.onend = finish;
      utterance.onerror = finish;
      this.utterance = utterance;
      this.duckMusic(true);
      this.speech.speak(utterance);
      return true;
    } catch {
      this.utterance = null;
      this.duckMusic(false);
      return false;
    }
  }

  cancelSpeech() {
    if (!this.utterance) return;
    this.utterance = null;
    this.speech.cancel();
    this.duckMusic(false);
  }

  duckMusic(quiet) {
    this.music?.gain.setTargetAtTime(quiet ? 0.23 : 1, this.context.currentTime, 0.08);
  }

  startMusic() {
    if (!this.enabled || this.timer || this.context?.state !== 'running' || globalThis.document?.hidden) return;

    this.nextStep = this.context.currentTime + 0.15;
    this.musicStep = 0;
    this.duckMusic(Boolean(this.utterance));
    const schedule = () => {
      const now = this.context.currentTime;
      if (this.nextStep < now) this.nextStep = now + 0.02;
      while (this.nextStep < now + 0.16) {
        const step = this.musicStep;
        const note = melody[step];
        if (note !== null) {
          tone(this.context, this.music, note, this.nextStep, 0.29, 0.046);
        }
        if (step % 8 === 0) {
          const [bass, upper] = chords[step / 8];
          tone(this.context, this.music, bass, this.nextStep, 0.68, 0.054);
          tone(this.context, this.music, upper, this.nextStep + 0.04, 0.56, 0.037);
        }
        this.nextStep += stepSeconds;
        this.musicStep = (step + 1) % melody.length;
      }
    };
    this.timer = globalThis.setInterval(schedule, 80);
    schedule();
  }

  stopMusic() {
    globalThis.clearInterval(this.timer);
    this.timer = undefined;
    this.duckMusic(true);
  }

  dispose() {
    this.stopMusic();
    this.cancelSpeech();
    globalThis.document?.removeEventListener('visibilitychange', this.onVisibilityChange);
    if (this.context && this.context.state !== 'closed') void this.context.close().catch(() => {});
  }
}
