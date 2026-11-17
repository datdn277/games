const cues = {
  click: [[460, 505, 0, .1, .035]],
  select: [[580, 740, 0, .14, .055]],
  place: [[346, 240, 0, .18, .06]],
  flying: [[310, 610, 0, .33, .04], [490, 820, .18, .27, .038]],
  reveal: [[530, 580, 0, .13, .04], [784, 920, .12, .23, .045]],
  correct: [[622, 622, 0, .2, .075], [830, 830, .12, .26, .06], [1046, 1046, .26, .33, .05]],
  retry: [[420, 375, 0, .17, .045], [366, 346, .16, .2, .035]],
  level: [[523, 523, 0, .21, .065], [659, 659, .12, .26, .06], [784, 784, .25, .34, .055], [1047, 1047, .38, .42, .045]],
};

export function createAudio(initiallyEnabled) {
  const Audio = window.AudioContext ?? window.webkitAudioContext;
  const synth = window.speechSynthesis;
  const Utterance = window.SpeechSynthesisUtterance;
  let context;
  let master;
  let speech;
  let enabled = initiallyEnabled;
  let paused = false;
  let unlocked = false;
  synth?.getVoices();

  function stopSpeech() {
    if (!speech) return;
    speech = null;
    synth.cancel();
    if (synth.paused) synth.resume();
  }

  function resumeAudio() {
    if (!unlocked || !enabled || paused || !Audio) return;
    try {
      if (!context) {
        context = new Audio();
        master = context.createGain();
        master.connect(context.destination);
      }
      master.gain.value = .82;
      if (context.state === 'suspended') context.resume().catch(() => {});
    } catch {
      context = null;
    }
  }

  return {
    unlock() { unlocked = true; resumeAudio(); },
    setEnabled(value) {
      enabled = value;
      if (enabled) resumeAudio();
      else {
        stopSpeech();
        if (master) master.gain.value = 0;
      }
    },
    play(cue) {
      if (!enabled || paused || !context) return;
      const start = context.currentTime + .008;
      for (const [from, to, offset, duration, volume] of cues[cue] ?? []) {
        const time = start + offset;
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(from, time);
        oscillator.frequency.exponentialRampToValueAtTime(to, time + duration);
        envelope.gain.setValueAtTime(.0001, time);
        envelope.gain.exponentialRampToValueAtTime(volume, time + .025);
        envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
        oscillator.connect(envelope);
        envelope.connect(master);
        oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
        oscillator.start(time);
        oscillator.stop(time + duration);
      }
    },
    speak(text) {
      if (!enabled || !unlocked || paused || !text || !synth || !Utterance) return false;
      const voices = synth.getVoices().filter(({lang}) => /^vi(?:[-_]|$)/i.test(lang));
      const voice = voices.find(({localService}) => localService) ?? voices[0];
      if (!voice) return false;
      stopSpeech();
      const line = new Utterance(text);
      line.voice = voice;
      line.lang = voice.lang;
      line.rate = .91;
      line.pitch = 1.1;
      line.onend = line.onerror = () => { if (speech === line) speech = null; };
      speech = line;
      try {
        synth.speak(line);
        return true;
      } catch {
        speech = null;
        return false;
      }
    },
    stopSpeech,
    setPaused(value) {
      if (paused === value) return;
      paused = value;
      if (paused) {
        context?.suspend().catch(() => {});
        if (speech) synth.pause();
      } else {
        resumeAudio();
        if (speech && enabled) synth.resume();
      }
    },
    dispose() {
      stopSpeech();
      context?.close().catch(() => {});
    },
  };
}
