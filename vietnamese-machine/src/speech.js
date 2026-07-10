export function createSpeechController(synth = globalThis.speechSynthesis) {
  let preferredVoice = null;

  function refreshVoice() {
    if (!synth?.getVoices) return;
    const voices = synth.getVoices();
    preferredVoice = voices.find((voice) => voice.lang?.toLowerCase().startsWith("vi")) ?? null;
  }

  refreshVoice();
  if (synth && "onvoiceschanged" in synth) {
    synth.onvoiceschanged = refreshVoice;
  }

  function speak(text, options = {}) {
    if (!synth || typeof globalThis.SpeechSynthesisUtterance === "undefined") return false;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "vi-VN";
    utterance.rate = options.rate ?? 0.82;
    utterance.pitch = options.pitch ?? 1.05;
    if (preferredVoice) utterance.voice = preferredVoice;
    synth.speak(utterance);
    return true;
  }

  function cancel() {
    synth?.cancel?.();
  }

  return { speak, cancel, refreshVoice };
}
