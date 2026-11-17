const CUES = {
  tap: [[610, 545, 0, 0.12, 0.08]],
  jump: [[295, 700, 0, 0.21, 0.12, 'triangle']],
  land: [[340, 195, 0, 0.16, 0.09]],
  wrong: [[440, 425, 0, 0.16, 0.052], [392, 370, 0.13, 0.25, 0.045]],
  correct: [[524, 524, 0, 0.2, 0.08], [659, 659, 0.12, 0.22, 0.075], [784, 784, 0.24, 0.36, 0.067]],
  reward: [
    [659, 659, 0, 0.24, 0.063], [784, 784, 0.12, 0.26, 0.06],
    [1047, 1047, 0.24, 0.46, 0.055], [1319, 1319, 0.36, 0.52, 0.04],
  ],
};

const MUSIC = [
  [48, [72, 0, 76, 79, 74, 0, 76, 0]],
  [45, [72, 0, 69, 72, 76, 0, 74, 0]],
  [41, [69, 0, 72, 76, 77, 0, 76, 0]],
  [43, [74, 0, 79, 76, 74, 0, 67, 0]],
];
const BEAT_SECONDS = 0.51;
const LOOKAHEAD_SECONDS = 0.18;
const midiFrequency = (note) => 440 * 2 ** ((note - 69) / 12);

export function createAudio(enabledInitially = true) {
  const synth = globalThis.speechSynthesis;
  const Utterance = globalThis.SpeechSynthesisUtterance;
  const AudioContext = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  const sources = new Set();
  let enabled = Boolean(enabledInitially);
  let paused = false;
  let unlocked = false;
  let disposed = false;
  let context;
  let musicBus;
  let musicTimer;
  let nextBeatAt = 0;
  let beat = 0;
  let splash;
  let utterance;

  // Some browsers load the speech voice list on first access.
  synth?.getVoices();

  function canPlay() {
    return enabled && unlocked && !paused && !disposed;
  }

  function playSource(source, start, duration, amplitude, destination, filter) {
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(amplitude, start + 0.014);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter ?? envelope);
    filter?.connect(envelope);
    envelope.connect(destination);
    sources.add(source);
    source.onended = () => {
      sources.delete(source);
      source.disconnect();
      filter?.disconnect();
      envelope.disconnect();
    };
    source.start(start);
    source.stop(start + duration);
  }

  function tone(from, to, start, duration, amplitude, type = 'sine', destination = context.destination) {
    const oscillator = context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(to, start + duration);
    playSource(oscillator, start, duration, amplitude, destination);
  }

  function playSplash(start) {
    if (!splash) {
      splash = context.createBuffer(1, Math.ceil(context.sampleRate * 0.20), context.sampleRate);
      const samples = splash.getChannelData(0);
      for (let index = 0; index < samples.length; index++) {
        samples[index] = Math.random() * 2 - 1;
      }
    }
    const source = context.createBufferSource();
    source.buffer = splash;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, start);
    filter.frequency.exponentialRampToValueAtTime(580, start + 0.16);
    filter.Q.value = 0.65;
    playSource(source, start, 0.17, 0.115, context.destination, filter);
  }

  function scheduleMusic() {
    if (!canPlay() || context.state !== 'running') return;
    const now = context.currentTime;
    if (nextBeatAt < now) nextBeatAt = now + 0.03;
    while (nextBeatAt < now + LOOKAHEAD_SECONDS) {
      const [bass, melody] = MUSIC[Math.floor(beat / 8)];
      const note = melody[beat % 8];
      if (beat % 4 === 0) {
        const frequency = midiFrequency(bass);
        tone(frequency, frequency, nextBeatAt, 1.1, 0.043, 'sine', musicBus);
      }
      if (note) {
        const frequency = midiFrequency(note);
        tone(frequency, frequency, nextBeatAt, 0.63, 0.035, 'sine', musicBus);
      }
      beat = (beat + 1) % (MUSIC.length * 8);
      nextBeatAt += BEAT_SECONDS;
    }
  }

  function stopMusicTimer() {
    clearInterval(musicTimer);
    musicTimer = undefined;
  }

  function startPlayback() {
    if (!canPlay() || !AudioContext) return;
    if (!context) {
      try {
        context = new AudioContext();
        musicBus = context.createGain();
        musicBus.connect(context.destination);
      } catch {
        return;
      }
    }
    context.resume().then(() => {
      if (!canPlay() || musicTimer !== undefined) return;
      nextBeatAt = Math.max(nextBeatAt, context.currentTime + 0.24);
      musicTimer = setInterval(scheduleMusic, 85);
    }).catch(() => {});
  }

  function stopSources() {
    for (const source of sources) source.stop();
  }

  function duckMusic(active) {
    if (context && musicBus) {
      musicBus.gain.setTargetAtTime(active ? 0.38 : 1, context.currentTime, 0.05);
    }
  }

  function stopSpeech() {
    if (!utterance) return;
    utterance = undefined;
    synth.cancel();
    if (synth.paused) synth.resume();
    duckMusic(false);
  }

  return {
    unlock() {
      unlocked = true;
      if (context?.state !== 'running') startPlayback();
    },

    setEnabled(value) {
      enabled = Boolean(value);
      if (enabled) {
        startPlayback();
      } else {
        stopSpeech();
        stopMusicTimer();
        stopSources();
        context?.suspend().catch(() => {});
      }
    },

    play(cue) {
      if (!canPlay() || !context) return;
      const start = context.currentTime + 0.005;
      for (const [from, to, offset, duration, amplitude, type] of CUES[cue] ?? []) {
        tone(from, to, start + offset, duration, amplitude, type);
      }
      if (cue === 'land') playSplash(start);
    },

    speak(text) {
      if (!canPlay() || !text?.trim() || !synth || !Utterance) return false;
      const voices = synth.getVoices().filter(({ lang }) => /^vi(?:[-_]|$)/i.test(lang));
      const voice = voices.find(({ localService }) => localService) ?? voices[0];
      if (!voice) return false;

      stopSpeech();
      const message = new Utterance(text);
      message.voice = voice;
      message.lang = voice.lang;
      message.rate = 0.88;
      message.pitch = 1.12;
      message.volume = 0.85;
      const release = () => {
        if (utterance !== message) return;
        utterance = undefined;
        duckMusic(false);
      };
      message.onend = release;
      message.onerror = release;
      utterance = message;
      duckMusic(true);
      try {
        synth.speak(message);
        return true;
      } catch {
        release();
        return false;
      }
    },

    setPaused(value) {
      if (disposed || paused === Boolean(value)) return;
      paused = Boolean(value);
      if (paused) {
        stopMusicTimer();
        context?.suspend().catch(() => {});
        if (utterance) synth.pause();
      } else if (enabled) {
        startPlayback();
        if (utterance) synth.resume();
      }
    },

    stopSpeech,

    dispose() {
      if (disposed) return;
      disposed = true;
      stopSpeech();
      stopMusicTimer();
      stopSources();
      context?.close().catch(() => {});
    },
  };
}
