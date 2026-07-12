export class GameUI {
  constructor(root = document) {
    this.root = root;
    this.pathContainer = root.querySelector("#arithmetic-path");
    this.sceneContainer = root.querySelector("#basket-scene");
    this.answerTray = root.querySelector("#answer-tray");
    this.answerQuestion = root.querySelector(".answer-heading h3");
    this.feedback = root.querySelector("#feedback");
    this.feedbackIcon = root.querySelector("#feedback-icon");
    this.feedbackTitle = root.querySelector("#feedback-title");
    this.feedbackMessage = root.querySelector("#feedback-message");
    this.operationChip = root.querySelector("#operation-chip");
    this.operationText = root.querySelector("#operation-text");
    this.stepBadge = root.querySelector("#step-badge");
    this.hintButton = root.querySelector("#hint-button");
    this.hintLevel = root.querySelector("#hint-level");
    this.replayButton = root.querySelector("#replay-button");
    this.resetButton = root.querySelector("#reset-button");
    this.voiceButton = root.querySelector("#voice-button");
    this.voiceIcon = root.querySelector("#voice-icon");
    this.voiceLabel = root.querySelector("#voice-label");
    this.totalStars = root.querySelector("#total-stars");
    this.modal = root.querySelector("#completion-modal");
    this.earnedStars = root.querySelector("#earned-stars");
    this.completionMessage = root.querySelector("#completion-message");
    this.nextButton = root.querySelector("#next-level-button");
    this.repeatButton = root.querySelector("#repeat-level-button");
    this.difficultyButtons = [...root.querySelectorAll(".difficulty-button")];
  }

  setFruitCount() {
    this.sceneContainer.setAttribute("aria-label", "Rổ trái cây với các quả táo để bé tự đếm");
  }

  setOperation(step) {
    const isAdd = step.operator === "+";
    this.operationChip.dataset.operator = step.operator;
    this.operationChip.querySelector(".operation-icon").textContent = isAdd ? "➕" : "➖";
    this.operationText.textContent = `${isAdd ? "Thêm" : "Lấy đi"} ${step.operand} quả`;
    this.answerQuestion.textContent = "Hãy quan sát rổ thay đổi nhé!";
  }

  setQuestion(step) {
    const isAdd = step.operator === "+";
    this.answerQuestion.textContent = isAdd ? "Bây giờ có bao nhiêu quả?" : "Còn lại bao nhiêu quả?";
  }

  setFeedback(type, title, message, icon) {
    this.feedback.className = `feedback feedback--${type}`;
    this.feedbackTitle.textContent = title;
    this.feedbackMessage.textContent = message;
    this.feedbackIcon.textContent = icon;
  }

  setStep(current, total) {
    this.stepBadge.textContent = current > total ? "Đã hoàn thành" : `Bước ${current} / ${total}`;
  }

  setVoice(enabled) {
    this.voiceButton.setAttribute("aria-pressed", String(enabled));
    this.voiceButton.setAttribute("aria-label", enabled ? "Tắt giọng đọc" : "Bật giọng đọc");
    this.voiceIcon.textContent = enabled ? "🎙️" : "🔇";
    this.voiceLabel.textContent = enabled ? "Giọng đọc" : "Đã tắt";
  }

  setDifficulty(difficulty) {
    this.difficultyButtons.forEach((button) => {
      const active = button.dataset.difficulty === difficulty;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  showCompletion(stars, message) {
    this.earnedStars.innerHTML = Array.from({ length: 3 }, (_, index) =>
      `<span class="star ${index < stars ? "earned" : ""}" aria-hidden="true">★</span>`,
    ).join("");
    this.earnedStars.setAttribute("aria-label", `Nhận được ${stars} trên 3 sao`);
    this.completionMessage.textContent = message;
    this.modal.hidden = false;
    requestAnimationFrame(() => this.modal.classList.add("visible"));
    this.nextButton.focus();
  }

  hideCompletion() {
    this.modal.classList.remove("visible");
    this.modal.hidden = true;
  }
}
