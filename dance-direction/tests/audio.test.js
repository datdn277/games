import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioManager } from '../src/audio/AudioManager.js';
import { RhythmManager } from '../src/audio/RhythmManager.js';
import { tracks } from '../src/audio/tracks.js';

const approximately = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.0001, `${actual} ≈ ${expected}`);

test('rhythm schedules a note ahead of the audible beat and runs visual cues on the beat', () => {
  let time = 10;
  const rhythm = new RhythmManager(() => time);
  rhythm.start(tracks[0]);

  const notes = [];
  const cues = [];
  const update = () => rhythm.update((track, step, time) => notes.push({ track, step, time }));
  rhythm.scheduleCue(() => cues.push(0));
  const cancel = rhythm.scheduleCue(() => cues.push(1), 1);
  cancel();
  rhythm.scheduleCue(() => cues.push(2), 2);

  update();
  assert.deepEqual(notes.map(note => note.step), [0]);
  approximately(notes[0].time, 10.075);
  assert.deepEqual(cues, []);

  time = 10.076;
  update();
  assert.deepEqual(cues, [0]);
  assert.equal(rhythm.currentBeat, 0);
  assert.ok(rhythm.beatPulse > 0.97);

  time = 11.326;
  update();
  assert.deepEqual(cues, [0, 2]);
  assert.equal(rhythm.currentBeat, 2);
  assert.deepEqual(notes.map(note => note.step), [0, 4]);
});

test('rhythm preserves playhead and cues through a pause and clock change', () => {
  let frameClock = 100;
  let audioClock = 3;
  const rhythm = new RhythmManager(() => frameClock);
  rhythm.start(tracks[0]);
  frameClock += 0.2;
  rhythm.useClock(() => audioClock);
  approximately(rhythm.position, 0.125);

  let calls = 0;
  rhythm.scheduleCue(() => calls++);
  rhythm.pause();
  audioClock += 50;
  rhythm.update();
  assert.equal(calls, 0);
  approximately(rhythm.nextBeatDelay(), 0.5);

  rhythm.resume();
  approximately(rhythm.position, 0.125);
  audioClock += 0.501;
  rhythm.update();
  assert.equal(calls, 1);
  assert.equal(rhythm.currentBeat, 1);
  assert.equal(rhythm.currentBar, 0);
});

class FakeAudioContext {
  static instances = [];

  constructor() {
    this.state = 'suspended';
    this.currentTime = 9;
    this.sampleRate = 100;
    this.destination = {};
    this.changes = [];
    this.started = [];
    FakeAudioContext.instances.push(this);
  }

  createGain() {
    return {
      connect() {},
      disconnect() {},
      gain: {
        setValueAtTime() {},
        exponentialRampToValueAtTime() {},
        cancelAndHoldAtTime() {},
        setTargetAtTime() {},
      },
    };
  }

  createBuffer() {
    return { getChannelData: () => new Float32Array(12) };
  }

  createOscillator() {
    return {
      connect() {},
      disconnect() {},
      frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      start: at => this.started.push(at),
      stop() {},
    };
  }

  async resume() {
    this.changes.push('resume');
    this.state = 'running';
  }

  async suspend() {
    this.changes.push('suspend');
    this.state = 'suspended';
  }

  async close() {
    this.state = 'closed';
  }
}

test('audio is gesture-gated and reuses a single context through rapid pause and mute changes', async () => {
  FakeAudioContext.instances.length = 0;
  const audio = new AudioManager({ muted: true, environment: { AudioContext: FakeAudioContext }, clock: () => 8 });
  audio.pause();
  audio.unlock();
  audio.resume();
  assert.equal(FakeAudioContext.instances.length, 0);

  audio.setMuted(false);
  const [context] = FakeAudioContext.instances;
  audio.pause();
  audio.resume();
  audio.setMuted(true);
  await Promise.resolve();
  assert.equal(context.state, 'suspended');
  assert.deepEqual(context.changes, ['resume', 'suspend', 'resume', 'suspend']);

  audio.setMuted(false);
  await Promise.resolve();
  assert.equal(context.state, 'running');
  assert.equal(FakeAudioContext.instances.length, 1);
  audio.dispose();
  assert.equal(context.state, 'closed');
});

test('music and effects schedule audible voices against the Web Audio clock', () => {
  const audio = new AudioManager({ environment: { AudioContext: FakeAudioContext }, clock: () => 3 });
  audio.unlock();
  const context = FakeAudioContext.instances.at(-1);
  audio.playTrack(0);
  assert.equal(context.started.length, 4);
  context.started.forEach(time => approximately(time, 9.075));
  audio.play('correct');
  assert.equal(context.started.length, 7);
  approximately(context.started[4], 9.005);
  approximately(context.started[6], 9.185);

  const [firstVoice] = audio.voices.keys();
  firstVoice.onended();
  assert.equal(audio.voices.size, 6);
  audio.dispose();
  assert.equal(audio.voices.size, 0);
});

test('muted and unsupported Web Audio still keep visual cues synchronized', () => {
  let time = 5;
  const audio = new AudioManager({ muted: true, environment: {}, clock: () => time });
  audio.playTrack(1);
  audio.unlock();
  audio.setMuted(false);
  let played = false;
  audio.scheduleCue(() => { played = true; });
  time += 0.1;
  audio.update();
  assert.ok(played);
  approximately(audio.beatDuration, 60 / 104);
});

test('speech uses a local Vietnamese voice and cancels while muted', () => {
  const spoken = [];
  class Utterance {
    constructor(text) { this.text = text; }
  }

  const remoteVoice = { lang: 'vi-VN', localService: false };
  const localVoice = { lang: 'vi-VN', localService: true };
  const speechSynthesis = {
    speak: utterance => spoken.push(utterance),
    cancel: () => spoken.push('canceled'),
    getVoices: () => [remoteVoice, localVoice],
  };
  const audio = new AudioManager({ environment: { speechSynthesis, SpeechSynthesisUtterance: Utterance } });
  audio.speak('Bên trái!');
  assert.equal(spoken.length, 0);

  audio.unlock();
  audio.speak('Bên phải!');
  assert.equal(spoken[0].text, 'Bên phải!');
  assert.equal(spoken[0].voice, localVoice);
  audio.setMuted(true);
  assert.equal(spoken[1], 'canceled');
  audio.speak('Bên trái!');
  assert.equal(spoken.length, 2);
});
