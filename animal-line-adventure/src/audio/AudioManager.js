const melodies = {
  tap: [523],
  direction: [523, 659],
  answer: [523, 659, 784, 1047],
  retry: [392, 440],
  hint: [587, 784],
  departure: [392, 523, 659, 784, 1047],
};
const counting = [523, 587, 659, 698, 784, 880, 988];

export class AudioManager {
  constructor(enabled) {
    this.enabled = enabled;
    this.context = null;
    this.notes = new Set();
  }

  unlock() {
    if (!this.enabled) return;
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      this.context ??= new Context();
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
    } catch { /* Sound is optional. */ }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.stop();
  }

  stop() {
    for (const note of this.notes) {
      try { note.stop(); } catch { /* The note already finished. */ }
    }
  }

  play(kind, ordinal) {
    if (!this.enabled) return;
    this.unlock();
    if (!this.context) return;
    const tones = kind === 'count'
      ? [counting[(ordinal ?? 1) - 1] ?? counting[0]]
      : melodies[kind] ?? melodies.tap;
    const context = this.context;
    const at = context.currentTime;
    tones.forEach((frequency, i) => {
      const oscillator = context.createOscillator();
      const volume = context.createGain();
      const start = at + i * .105;
      const duration = kind === 'departure' ? .30 : .22;
      oscillator.type = kind === 'departure' ? 'triangle' : 'sine';
      oscillator.frequency.value = frequency;
      volume.gain.setValueAtTime(.001, start);
      volume.gain.exponentialRampToValueAtTime(kind === 'count' ? .09 : .075, start + .026);
      volume.gain.exponentialRampToValueAtTime(.001, start + duration);
      oscillator.connect(volume);
      volume.connect(context.destination);
      this.notes.add(oscillator);
      oscillator.onended = () => {
        this.notes.delete(oscillator);
        oscillator.disconnect();
        volume.disconnect();
      };
      oscillator.start(start);
      oscillator.stop(start + duration);
    });
  }
}
