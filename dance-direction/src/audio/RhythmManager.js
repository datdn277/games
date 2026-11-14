const LOOK_AHEAD = 0.13;
const START_LEAD = 0.075;
const LATE_TOLERANCE = 0.045;
const STEPS_PER_BEAT = 2;
const BEATS_PER_BAR = 4;

export class RhythmManager {
  constructor(clock = () => performance.now() / 1000) {
    this.clock = clock;
    this.track = null;
    this.paused = false;
    this.origin = 0;
    this.pausedPosition = 0;
    this.nextStep = 0;
    this.cues = [];
  }

  get bpm() { return this.track?.bpm ?? 100; }

  get beatDuration() { return 60 / this.bpm; }

  get position() {
    if (!this.track) return 0;
    return this.paused ? this.pausedPosition : this.clock() - this.origin;
  }

  get currentBeat() {
    return Math.floor(Math.max(0, this.position) / this.beatDuration);
  }

  get currentBar() {
    return Math.floor(this.currentBeat / BEATS_PER_BAR);
  }

  get beatPhase() {
    return Math.max(0, this.position) / this.beatDuration % 1;
  }

  get beatPulse() {
    if (!this.track || this.position < 0) return 0;
    return (1 - this.beatPhase) ** 3;
  }

  get songProgress() {
    if (!this.track) return 0;
    const loopBeats = this.track.melody.length * BEATS_PER_BAR;
    return Math.max(0, this.position) / this.beatDuration % loopBeats / loopBeats;
  }

  useClock(clock) {
    if (clock === this.clock) return;
    const position = this.position;
    this.clock = clock;
    this.origin = clock() - position;
    this.realign();
  }

  start(track) {
    this.track = track;
    this.origin = this.clock() + START_LEAD;
    this.pausedPosition = -START_LEAD;
    this.nextStep = 0;
    this.cues.length = 0;
  }

  stop() {
    this.track = null;
    this.cues.length = 0;
  }

  pause() {
    if (this.paused) return;
    this.pausedPosition = this.position;
    this.paused = true;
  }

  resume() {
    if (!this.paused) return;
    this.origin = this.clock() - this.pausedPosition;
    this.paused = false;
    this.realign();
  }

  realign() {
    const stepDuration = this.beatDuration / STEPS_PER_BEAT;
    this.nextStep = Math.max(0, Math.ceil((this.position - LATE_TOLERANCE) / stepDuration));
  }

  nextBeatDelay() {
    if (!this.track) return 0;
    const position = this.position;
    const nextBeat = Math.max(0, Math.ceil((position - 0.0001) / this.beatDuration));
    return Math.max(0, nextBeat * this.beatDuration - position);
  }

  scheduleCue(callback, beatsAhead = 0) {
    if (!this.track) return () => {};
    const position = this.position;
    const beat = Math.max(0, Math.ceil((position - 0.0001) / this.beatDuration));
    const cue = { position: (beat + Math.max(0, beatsAhead)) * this.beatDuration, callback, canceled: false };
    this.cues.push(cue);
    this.cues.sort((first, second) => first.position - second.position);
    return () => { cue.canceled = true; };
  }

  update(scheduleAudio) {
    if (!this.track || this.paused) return;

    const position = this.position;
    if (scheduleAudio) {
      const stepDuration = this.beatDuration / STEPS_PER_BEAT;
      const firstAudibleStep = Math.ceil((position - LATE_TOLERANCE) / stepDuration);
      this.nextStep = Math.max(this.nextStep, firstAudibleStep);

      while (this.nextStep * stepDuration <= position + LOOK_AHEAD) {
        const time = this.origin + this.nextStep * stepDuration;
        scheduleAudio(this.track, this.nextStep, Math.max(this.clock(), time), stepDuration);
        this.nextStep += 1;
      }
    }

    while (this.cues[0]?.position <= position) {
      const cue = this.cues.shift();
      if (!cue.canceled) cue.callback();
      if (!this.track || this.paused) break;
    }
  }
}
