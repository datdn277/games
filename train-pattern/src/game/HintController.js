export class HintController {
  constructor({ engine, audio, onMessage, onGroup, onHighlightAnswer }) {
    this.engine = engine;
    this.audio = audio;
    this.onMessage = onMessage;
    this.onGroup = onGroup;
    this.onHighlightAnswer = onHighlightAnswer;
  }

  show(level, currentStep = 0) {
    const step = Math.min(currentStep + 1, 3);
    const sequenceText = level.visibleSequence
      .map((item) => item?.speechLabel ?? "ô trống")
      .join(", ");
    const description = this.engine.describePattern(level.patternType, level.itemsByToken);

    if (step === 1) {
      const message = `${sequenceText}. Tiếp theo là gì?`;
      this.onMessage("Cùng đọc lại từng toa nhé!", "hint");
      this.audio.speak(message);
    } else if (step === 2) {
      this.onGroup(level.groups);
      this.onMessage(description.sentence, "hint");
      this.audio.speak(description.sentence);
    } else {
      this.onGroup(level.groups);
      this.onHighlightAnswer(level.correctAnswer);
      this.onMessage("Toa phù hợp đang tỏa sáng. Con hãy tự chọn nhé!", "hint");
      this.audio.speak("Hãy nhìn toa đang tỏa sáng và chọn nhé.");
    }
    return step;
  }
}
