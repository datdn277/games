type OscillatorKind = OscillatorType;

interface ToneOptions {
  frequency: number;
  duration: number;
  delay?: number;
  volume?: number;
  type?: OscillatorKind;
  endFrequency?: number;
}

/** Small, original UI/game sounds synthesized with Web Audio. */
export class AudioController {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled) this.playSelect();
  }

  playSelect(): void {
    this.playTone({ frequency: 520, endFrequency: 660, duration: 0.09, volume: 0.055 });
  }

  playPlace(): void {
    this.playTone({ frequency: 430, endFrequency: 620, duration: 0.12, volume: 0.06, type: 'triangle' });
  }

  playStep(): void {
    this.playTone({ frequency: 180, duration: 0.07, volume: 0.035, type: 'sine' });
    this.playTone({ frequency: 235, duration: 0.065, delay: 0.12, volume: 0.03, type: 'sine' });
  }

  playError(): void {
    this.playTone({ frequency: 210, endFrequency: 150, duration: 0.18, volume: 0.055, type: 'sawtooth' });
  }

  playNewLevel(): void {
    this.playTone({ frequency: 360, endFrequency: 480, duration: 0.1, volume: 0.045, type: 'triangle' });
    this.playTone({ frequency: 540, duration: 0.12, delay: 0.1, volume: 0.045, type: 'triangle' });
  }

  playSuccess(): void {
    [523, 659, 784, 1047].forEach((frequency, index) => {
      this.playTone({
        frequency,
        duration: index === 3 ? 0.28 : 0.14,
        delay: index * 0.11,
        volume: 0.045,
        type: 'triangle',
      });
    });
  }

  private playTone(options: ToneOptions): void {
    if (!this.enabled) return;
    const context = this.getContext();
    const master = this.master;
    if (!context || !master) return;
    if (context.state === 'suspended') void context.resume().catch(() => undefined);

    const start = context.currentTime + (options.delay ?? 0);
    const end = start + options.duration;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = options.type ?? 'sine';
    oscillator.frequency.setValueAtTime(options.frequency, start);
    if (options.endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(options.endFrequency, end);
    }
    const volume = options.volume ?? 0.04;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.025, options.duration * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(gain).connect(master);
    oscillator.start(start);
    oscillator.stop(end + 0.02);
  }

  private getContext(): AudioContext | null {
    if (this.context) return this.context;
    try {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.72;
      this.master.connect(this.context.destination);
      return this.context;
    } catch {
      this.enabled = false;
      return null;
    }
  }

  dispose(): void {
    if (this.context) void this.context.close().catch(() => undefined);
    this.context = null;
    this.master = null;
  }
}
