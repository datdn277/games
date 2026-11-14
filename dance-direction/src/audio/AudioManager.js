import { RhythmManager } from './RhythmManager.js';
import { SpeechManager } from './SpeechManager.js';
import { tracks } from './tracks.js';

const SILENCE = 0.0001;
const MUSIC_LEVEL = 0.66;
const VOICE_MUSIC_LEVEL = 0.24;
const EFFECT_LIFETIME = 0.25;

const effects = {
  click: [[79, 0, 0.07, 0.08]],
  correct: [[76, 0, 0.18, 0.14], [79, 0.09, 0.20, 0.12], [84, 0.18, 0.32, 0.12]],
  incorrect: [[69, 0, 0.16, 0.09], [72, 0.13, 0.27, 0.08]],
  star: [[84, 0, 0.22, 0.10], [88, 0.055, 0.23, 0.09], [91, 0.115, 0.32, 0.08]],
  complete: [[72, 0, 0.24, 0.12], [76, 0.12, 0.23, 0.12], [79, 0.24, 0.24, 0.11], [84, 0.40, 0.45, 0.13], [76, 0.40, 0.36, 0.065], [79, 0.40, 0.40, 0.065]],
  greeting: [[72, 0, 0.19, 0.10], [79, 0.13, 0.28, 0.09]],
};

const frequency = note => 440 * 2 ** ((note - 69) / 12);

export class AudioManager {
  constructor({ muted = false, environment = globalThis, clock = () => performance.now() / 1000 } = {}) {
    this.environment = environment;
    this.clock = clock;
    this.muted = muted;
    this.unlocked = false;
    this.unavailable = false;
    this.context = null;
    this.transition = null;
    this.pendingEffects = [];
    this.voices = new Map();
    this.rhythm = new RhythmManager(clock);
    this.contextClock = () => this.context.currentTime;
    this.scheduleMusic = this.scheduleMusic.bind(this);
    this.alignClock = this.alignClock.bind(this);
    this.speaking = false;
    this.speech = new SpeechManager(environment, speaking => {
      this.speaking = speaking;
      this.updateMusicLevel();
    });
  }

  get bpm() { return this.rhythm.bpm; }
  get beatDuration() { return this.rhythm.beatDuration; }
  get currentBeat() { return this.rhythm.currentBeat; }
  get currentBar() { return this.rhythm.currentBar; }
  get beatPhase() { return this.rhythm.beatPhase; }
  get beatPulse() { return this.rhythm.beatPulse; }
  get songProgress() { return this.rhythm.songProgress; }

  get wantsSound() {
    return this.unlocked && !this.muted && !this.rhythm.paused;
  }

  get audioReady() {
    return this.wantsSound && this.context?.state === 'running';
  }

  unlock() {
    this.unlocked = true;
    this.reconcileContext();
  }

  openContext() {
    const AudioContext = this.environment.AudioContext ?? this.environment.webkitAudioContext;
    if (!AudioContext) {
      this.unavailable = true;
      return;
    }

    try {
      this.context = new AudioContext({ latencyHint: 'interactive' });
      this.master = this.context.createGain();
      this.master.gain.value = 0.34;
      this.master.connect(this.context.destination);
      this.music = this.context.createGain();
      this.music.gain.value = this.speaking ? VOICE_MUSIC_LEVEL : MUSIC_LEVEL;
      this.music.connect(this.master);
      this.sfx = this.context.createGain();
      this.sfx.gain.value = 0.9;
      this.sfx.connect(this.master);
      this.noise = this.makeNoise();
      this.context.addEventListener?.('statechange', this.alignClock);
    } catch {
      this.context?.close().catch(() => {});
      this.context = null;
      this.unavailable = true;
    }
  }

  reconcileContext() {
    const wantsSound = this.wantsSound;
    if (wantsSound && !this.context && !this.unavailable) this.openContext();
    this.alignClock();

    const context = this.context;
    if (!context || this.transition?.running === wantsSound) return;
    if (!this.transition && wantsSound === (context.state === 'running')) return;

    const transition = { running: wantsSound };
    this.transition = transition;
    const done = () => {
      if (this.transition !== transition) return;
      this.transition = null;
      this.alignClock();
    };

    try {
      const change = wantsSound ? context.resume() : context.suspend();
      Promise.resolve(change).then(done, done);
    } catch {
      done();
    }
  }

  alignClock() {
    this.rhythm.useClock(this.audioReady ? this.contextClock : this.clock);
  }

  updateMusicLevel() {
    if (this.context) {
      const level = this.speaking ? VOICE_MUSIC_LEVEL : MUSIC_LEVEL;
      this.music.gain.setTargetAtTime(level, this.context.currentTime, 0.065);
    }
  }

  playTrack(index) {
    this.stopVoices('music');
    this.rhythm.start(tracks[index] ?? tracks[0]);
    this.update();
  }

  stopMusic() {
    this.rhythm.stop();
    this.stopVoices('music');
  }

  nextBeatDelay() {
    return this.rhythm.nextBeatDelay();
  }

  scheduleCue(callback, beatsAhead) {
    return this.rhythm.scheduleCue(callback, beatsAhead);
  }

  speak(text) {
    if (text && this.wantsSound) this.speech.speak(text);
  }

  cancelSpeech() {
    this.speech.cancel();
  }

  play(effect) {
    if (!this.wantsSound || !Object.hasOwn(effects, effect)) return;
    if (this.audioReady) {
      this.playEffect(effect);
    } else if (!this.unavailable) {
      this.pendingEffects.push({ effect, expires: this.clock() + EFFECT_LIFETIME });
    }
  }

  playEffect(effect) {
    const now = this.context.currentTime + 0.005;
    for (const [note, delay, duration, level] of effects[effect]) {
      this.tone(this.sfx, 'sine', frequency(note), now + delay, duration, level);
    }
  }

  update() {
    this.alignClock();
    this.rhythm.update(this.audioReady ? this.scheduleMusic : undefined);
    if (!this.pendingEffects.length) return;

    const now = this.clock();
    this.pendingEffects = this.pendingEffects.filter(event => event.expires >= now);
    if (!this.audioReady) return;
    for (const { effect } of this.pendingEffects) this.playEffect(effect);
    this.pendingEffects.length = 0;
  }

  setMuted(muted) {
    if (this.muted === muted) return;
    this.muted = muted;
    if (muted) {
      this.cancelSpeech();
      this.pendingEffects.length = 0;
      this.stopVoices();
    }
    this.reconcileContext();
  }

  pause() {
    if (this.rhythm.paused) return;
    this.rhythm.pause();
    this.speech.pause();
    this.pendingEffects.length = 0;
    this.stopVoices();
    this.reconcileContext();
  }

  resume() {
    if (!this.rhythm.paused) return;
    this.rhythm.resume();
    this.reconcileContext();
    this.speech.resume();
  }

  makeNoise() {
    const buffer = this.context.createBuffer(1, Math.ceil(this.context.sampleRate * 0.12), this.context.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 731;
    for (let i = 0; i < data.length; i += 1) {
      seed = (seed * 16807) % 2147483647;
      data[i] = (seed / 2147483647) * 2 - 1;
    }
    return buffer;
  }

  scheduleMusic(track, step, time, stepDuration) {
    const bar = Math.floor(step / 8) % track.melody.length;
    const cell = step % 8;
    const note = track.melody[bar][cell];
    const chord = track.harmony[bar];

    if (note) {
      this.tone(this.music, track.instrument, frequency(note), time, stepDuration * 0.94, 0.12);
      this.tone(this.music, 'sine', frequency(note + 12), time, stepDuration * 0.42, 0.019);
    }

    if (cell === 0 || cell === 4) {
      const bass = cell === 0 ? chord[0] : chord[0] + 7;
      this.tone(this.music, 'triangle', frequency(bass), time, stepDuration * 1.75, 0.095);
      this.tone(this.music, 'sine', 104, time, 0.16, 0.13, 46);
    }

    if (cell === 2 || cell === 6) {
      chord.slice(1).forEach((harmony, voice) => {
        this.tone(this.music, 'sine', frequency(harmony), time + voice * 0.016, stepDuration * 1.18, 0.046);
      });
      this.noiseHit(time, 0.095, 0.07, 1200);
    } else if (cell % 2) {
      this.noiseHit(time, 0.035, 0.023, 4000);
    }
  }

  tone(bus, waveform, pitch, time, duration, level, endPitch = pitch) {
    const source = this.context.createOscillator();
    source.type = waveform;
    source.frequency.setValueAtTime(pitch, time);
    if (endPitch !== pitch) source.frequency.exponentialRampToValueAtTime(endPitch, time + duration * 0.65);
    this.playVoice(source, bus, time, duration, level);
  }

  noiseHit(time, duration, level, tone) {
    const source = this.context.createBufferSource();
    source.buffer = this.noise;
    const filter = this.context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = tone;
    source.connect(filter);
    this.playVoice(source, this.music, time, duration, level, filter);
  }

  playVoice(source, bus, time, duration, level, input = source) {
    const envelope = this.context.createGain();
    envelope.gain.setValueAtTime(SILENCE, time);
    envelope.gain.exponentialRampToValueAtTime(level, time + Math.min(0.013, duration / 3));
    envelope.gain.exponentialRampToValueAtTime(SILENCE, time + duration);
    input.connect(envelope);
    envelope.connect(bus);
    this.voices.set(source, { envelope, bus });
    source.onended = () => {
      this.voices.delete(source);
      source.disconnect();
      if (input !== source) input.disconnect();
      envelope.disconnect();
    };
    source.start(time);
    source.stop(time + duration + 0.01);
  }

  stopVoices(channel) {
    if (!this.context) return;
    const now = this.context.currentTime;
    for (const [source, voice] of this.voices) {
      if (channel === 'music' && voice.bus !== this.music) continue;
      const gain = voice.envelope.gain;
      if (gain.cancelAndHoldAtTime) {
        gain.cancelAndHoldAtTime(now);
      } else {
        gain.cancelScheduledValues(now);
      }
      gain.setTargetAtTime(SILENCE, now, 0.006);
      source.stop(now + 0.022);
    }
  }

  dispose() {
    this.stopVoices();
    this.rhythm.stop();
    this.speech.dispose();
    if (!this.context) return;
    this.context.removeEventListener?.('statechange', this.alignClock);
    this.context.close().catch(() => {});
    this.context = null;
    this.transition = null;
    this.voices.clear();
  }
}
