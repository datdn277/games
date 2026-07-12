export class HintController {
  constructor(actions) {
    this.actions = actions;
  }

  async show(level, context) {
    const hintLevel = ((level - 1) % 4) + 1;
    if (hintLevel === 1) {
      this.actions.flashPath(context.stepIndex);
      this.actions.feedback(
        "Nhìn vào phép tính",
        `Ta đang có ${context.step.inputValue} quả và cần ${context.step.operator === "+" ? "thêm" : "lấy đi"} ${context.step.operand} quả.`,
        "💡",
      );
      this.actions.speak(
        `Ta đang có ${context.step.inputValue} quả và cần ${context.step.operator === "+" ? "thêm" : "lấy đi"} ${context.step.operand} quả.`,
      );
    } else if (hintLevel === 2) {
      this.actions.feedback("Xem lại thật chậm", "Theo dõi từng quả thay đổi trong rổ nhé.", "👀");
      await this.actions.replayAnimation(context.step);
    } else if (hintLevel === 3) {
      this.actions.feedback("Cùng đếm từng quả", "Mỗi quả sẽ sáng lên lần lượt.", "☝️");
      await this.actions.countAll();
    } else {
      this.actions.feedback("Tìm số vừa đếm", `Con hãy tìm thẻ số ${context.step.result}.`, "✨");
      this.actions.highlightAnswer(context.step.result);
      this.actions.speak(`Có ${context.step.result} quả trong rổ. Con hãy tìm số ${context.step.result}.`);
    }
    return hintLevel;
  }
}
