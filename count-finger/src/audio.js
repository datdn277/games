const CUES = {
  click: [[72, 0, 0.08, 0.09]],
  tap: [[67, 0, 0.10, 0.12]],
  correct: [[72, 0, 0.17, 0.13], [76, 0.10, 0.20, 0.12], [79, 0.21, 0.34, 0.11]],
  wrong: [[64, 0, 0.17, 0.09], [62, 0.15, 0.25, 0.09]],
  reward: [[76, 0, 0.15, 0.10], [79, 0.11, 0.16, 0.10], [84, 0.22, 0.33, 0.09]],
  level: [
    [67, 0, 0.20, 0.10],
    [72, 0.13, 0.22, 0.12],
    [76, 0.27, 0.22, 0.12],
    [79, 0.41, 0.28, 0.11],
    [84, 0.56, 0.49, 0.10],
  ],
};

const COUNT_NOTES = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77];

// One phrase per chord. Each entry is one beat, with 0 as a rest.
const MUSIC = [
  { bass: 48, notes: [72, 0, 76, 74, 67, 0, 0, 0] },
  { bass: 45, notes: [69, 0, 72, 76, 74, 0, 72, 0] },
  { bass: 41, notes: [65, 0, 69, 72, 77, 0, 76, 0] },
  { bass: 43, notes: [74, 0, 67, 69, 71, 0, 0, 0] },
];
const BEAT = 0.48;
const PHRASE_BEATS = 8;
const LOOKAHEAD = 0.20;

export class AudioManager {
  #muted;
  #unlocked = false;
  #disposed = false;
  #context;
  #musicBus;
  #effectsBus;
  #musicTimer;
  #musicTime;
  #musicBeat = 0;
  #oscillators = new Set();
  #utterance;
  #document = globalThis.document;

  constructor({ muted = false } = {}) {
    this.#muted = Boolean(muted);
    this.#document?.addEventListener('visibilitychange', this.#syncPlayback);
    // Some browsers populate their voice list asynchronously on first access.
    globalThis.speechSynthesis?.getVoices();
  }

  unlock() {
    this.#unlocked = true;
    if (this.#context?.state !== 'running') this.#syncPlayback();
  }

  setMuted(muted) {
    this.#muted = Boolean(muted);
    this.#syncPlayback();
  }

  play(name, count) {
    if (!this.#canPlay() || !this.#context) return;
    const time = this.#context.currentTime + 0.01;
    if (name === 'count') {
      const note = COUNT_NOTES[count] ?? 72;
      this.#tone(note, time, 0.22, 0.13, this.#effectsBus, 'triangle');
      this.#tone(note + 12, time + 0.017, 0.12, 0.024, this.#effectsBus);
      return;
    }
    for (const [note, offset, length, amplitude] of CUES[name] ?? []) {
      this.#tone(note, time + offset, length, amplitude, this.#effectsBus);
    }
  }

  speak(text) {
    if (!this.#canPlay() || !text) return;
    const speech = globalThis.speechSynthesis;
    const Utterance = globalThis.SpeechSynthesisUtterance;
    if (!speech || !Utterance) return;
    const voice = speech.getVoices().find(({ lang, localService }) =>
      localService && /^vi(?:[-_]|$)/i.test(lang));
    if (!voice) return;

    this.stopSpeech();
    const utterance = new Utterance(String(text));
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = 0.88;
    utterance.pitch = 1.05;
    utterance.volume = 0.78;
    const release = () => {
      if (this.#utterance === utterance) this.#utterance = undefined;
    };
    utterance.onend = release;
    utterance.onerror = release;
    this.#utterance = utterance;
    speech.speak(utterance);
  }

  stopSpeech() {
    if (!this.#utterance) return;
    this.#utterance = undefined;
    globalThis.speechSynthesis?.cancel();
  }

  dispose() {
    this.#disposed = true;
    this.#document?.removeEventListener('visibilitychange', this.#syncPlayback);
    this.stopSpeech();
    this.#stopTones();
    this.#context?.close().catch(() => {});
  }

  #canPlay() {
    return this.#unlocked && !this.#muted && !this.#disposed && !this.#document?.hidden;
  }

  #syncPlayback = () => {
    if (!this.#canPlay()) {
      this.stopSpeech();
      this.#stopTones();
      if (this.#context?.state === 'running') this.#context.suspend().catch(() => {});
      return;
    }

    if (!this.#context) {
      const AudioContext = globalThis.AudioContext ?? globalThis.webkitAudioContext;
      if (!AudioContext) return;
      try {
        this.#context = new AudioContext();
      } catch {
        return;
      }
      this.#musicBus = this.#context.createGain();
      this.#musicBus.gain.value = 0.23;
      this.#musicBus.connect(this.#context.destination);
      this.#effectsBus = this.#context.createGain();
      this.#effectsBus.gain.value = 0.62;
      this.#effectsBus.connect(this.#context.destination);
    }

    this.#context.resume().then(() => {
      if (!this.#canPlay()) {
        if (this.#context.state === 'running') this.#context.suspend().catch(() => {});
        return;
      }
      if (this.#musicTimer !== undefined) return;
      this.#musicTime = this.#context.currentTime + BEAT;
      this.#musicTimer = globalThis.setInterval(this.#scheduleMusic, 100);
    }).catch(() => {});
  };

  #stopTones() {
    globalThis.clearInterval(this.#musicTimer);
    this.#musicTimer = undefined;
    for (const oscillator of this.#oscillators) oscillator.stop();
    this.#oscillators.clear();
  }

  #scheduleMusic = () => {
    const now = this.#context.currentTime;
    // Skip the elapsed interval if browser scheduling was throttled.
    if (this.#musicTime < now) this.#musicTime = now + 0.02;
    while (this.#musicTime < now + LOOKAHEAD) {
      const phrase = MUSIC[Math.floor(this.#musicBeat / PHRASE_BEATS) % MUSIC.length];
      const beat = this.#musicBeat % PHRASE_BEATS;
      if (beat % 4 === 0) this.#tone(phrase.bass, this.#musicTime, 0.60, 0.07, this.#musicBus);
      if (phrase.notes[beat]) {
        this.#tone(phrase.notes[beat], this.#musicTime, 0.48, 0.095, this.#musicBus);
      }
      this.#musicBeat += 1;
      this.#musicTime += BEAT;
    }
  };

  #tone(note, time, duration, amplitude, bus, type = 'sine') {
    const oscillator = this.#context.createOscillator();
    const envelope = this.#context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = 440 * 2 ** ((note - 69) / 12);
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(amplitude, time + 0.025);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(envelope);
    envelope.connect(bus);
    oscillator.onended = () => {
      this.#oscillators.delete(oscillator);
      oscillator.disconnect();
      envelope.disconnect();
    };
    this.#oscillators.add(oscillator);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.015);
  }
}
