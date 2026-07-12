import { difficultyConfigs, getDifficultyConfig } from "../data/difficultyConfigs.js";
import { AnswerController, createAnswerOptions } from "./AnswerController.js";
import { ArithmeticPath } from "./ArithmeticPath.js";
import {
  AudioController,
  buildOperationInstruction,
  buildOperationQuestion,
  numberWord,
} from "./AudioController.js";
import { BasketScene } from "./BasketScene.js";
import { GameState, calculateStars } from "./GameState.js";
import { GameUI } from "./GameUI.js";
import { HintController } from "./HintController.js";
import { generateArithmeticPath, levelSignature } from "./LevelGenerator.js";
import { ProgressStorage } from "./ProgressStorage.js";

export class Game {
  constructor(root = document) {
    this.ui = new GameUI(root);
    this.storage = new ProgressStorage();
    this.progress = this.storage.load();
    this.state = new GameState({
      difficulty: this.progress.difficulty,
      voiceEnabled: this.progress.voiceEnabled,
      animationSpeed: this.progress.animationSpeed,
    });
    this.audio = new AudioController(this.state.voiceEnabled);
    this.path = new ArithmeticPath(this.ui.pathContainer);
    this.scene = new BasketScene(this.ui.sceneContainer, {
      animationSpeed: this.state.animationSpeed,
      onCountChange: (count) => this.ui.setFruitCount(count),
    });
    this.scene.onCountHighlight = (count) => this.ui.setFruitCount(count);
    this.answers = new AnswerController(this.ui.answerTray, {
      onSelect: (value, card) => this.handleAnswerSelect(value, card),
      getDropTarget: () => this.path.getActiveAnswerElement(this.state.currentStepIndex),
    });
    this.hints = new HintController({
      flashPath: (index) => this.path.flashCurrent(index),
      feedback: (title, message, icon) => this.ui.setFeedback("hint", title, message, icon),
      speak: (text) => this.audio.speak(text),
      replayAnimation: (step) => this.replayStepAnimation(step),
      countAll: () => this.countAllFruit(),
      highlightAnswer: (correct) => this.answers.highlightCorrect(correct),
    });
    this.runToken = 0;
    this.previousSignature = "";
    this.mistakesThisStep = 0;
    this.currentPrompt = "";
  }

  init() {
    this.bindEvents();
    this.ui.setDifficulty(this.state.difficulty);
    this.ui.setVoice(this.state.voiceEnabled);
    this.ui.totalStars.textContent = String(this.progress.totalStars ?? 0);
    this.createNewLevel();

    window.__FRUIT_GAME_DEBUG__ = {
      getState: () => ({ ...this.state }),
      getFruitCount: () => this.scene.getFruitCount(),
      getLevel: () => this.state.level,
      setFruitCount: (count) => this.scene.setFruitCount(count),
      selectAnswer: (value) => this.handleAnswerSelect(value, this.answers.cards.find((card) => Number(card.dataset.value) === value)),
      showHint: () => this.showHint(),
    };
  }

  bindEvents() {
    this.ui.difficultyButtons.forEach((button) => {
      button.addEventListener("click", () => this.changeDifficulty(button.dataset.difficulty));
    });
    this.ui.replayButton.addEventListener("click", () => this.replayCurrentPrompt());
    this.ui.hintButton.addEventListener("click", () => this.showHint());
    this.ui.resetButton.addEventListener("click", () => this.resetLevel());
    this.ui.voiceButton.addEventListener("click", () => this.toggleVoice());
    this.ui.nextButton.addEventListener("click", () => {
      this.ui.hideCompletion();
      this.createNewLevel();
    });
    this.ui.repeatButton.addEventListener("click", () => {
      this.ui.hideCompletion();
      this.resetLevel();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !this.ui.modal.hidden) this.ui.hideCompletion();
    });
  }

  async createNewLevel() {
    const config = getDifficultyConfig(this.state.difficulty);
    const level = generateArithmeticPath(config, {
      difficulty: this.state.difficulty,
      previousSignature: this.previousSignature,
    });
    this.previousSignature = levelSignature(level);
    await this.loadLevel(level);
  }

  async loadLevel(level) {
    const token = ++this.runToken;
    this.audio.cancel();
    this.currentPrompt = "";
    this.ui.hideCompletion();
    this.state.startLevel(level);
    this.mistakesThisStep = 0;
    this.path.render(level);
    this.answers.clear();
    this.ui.setStep(1, level.steps.length);
    this.ui.hintLevel.textContent = "1/4";
    this.setInteractionLocked(true);
    this.ui.operationChip.dataset.operator = "start";
    this.ui.operationChip.querySelector(".operation-icon").textContent = "🚩";
    this.ui.operationText.textContent = `Bắt đầu với ${level.startValue} quả`;
    this.ui.answerQuestion.textContent = "Hãy quan sát rổ nhé!";
    this.ui.setFeedback("info", "Bắt đầu từ đây", `Cùng nhìn ${level.startValue} quả xuất hiện trong rổ.`, "🧺");
    await Promise.all([
      this.audio.speak(`Bắt đầu với ${level.startValue} quả táo.`),
      this.scene.animateInitial(level.startValue),
    ]);
    await this.scene.animations.sleep(520, true);
    if (token !== this.runToken) return;
    await this.startCurrentStep(token);
  }

  async startCurrentStep(token = this.runToken) {
    const step = this.state.currentStep;
    if (!step || token !== this.runToken) return;
    this.mistakesThisStep = 0;
    this.path.setActiveStep(this.state.currentStepIndex);
    this.ui.hintLevel.textContent = "1/4";
    const dropTarget = this.path.getActiveAnswerElement(this.state.currentStepIndex);
    this.answers.bindDropTarget(dropTarget);
    this.ui.setStep(this.state.currentStepIndex + 1, this.state.level.steps.length);
    this.ui.setOperation(step);
    this.answers.clear();
    this.setInteractionLocked(true);

    const verb = step.operator === "+" ? "thêm vào" : "lấy ra";
    const actionTitle = step.operator === "+" ? `Thêm ${step.operand} quả` : `Lấy đi ${step.operand} quả`;
    const instruction = buildOperationInstruction(step);
    const question = buildOperationQuestion(step);
    this.currentPrompt = `${instruction} ${question}`;
    this.ui.setFeedback(
      "action",
      actionTitle,
      `Đang có ${step.inputValue} quả. Nghe hướng dẫn rồi nhìn từng quả ${verb}.`,
      step.operator === "+" ? "➕" : "➖",
    );
    await this.audio.speak(instruction, { rate: 0.76 });
    if (token !== this.runToken) return;

    this.ui.setFeedback(
      "action",
      actionTitle,
      `Hãy nhìn thật kỹ ${step.operand} quả được ${verb} từng quả một.`,
      step.operator === "+" ? "👀" : "☝️",
    );

    if (step.operator === "+") await this.scene.animateAddFruit(step.operand);
    else await this.scene.animateRemoveFruit(step.operand);
    if (token !== this.runToken) return;

    this.ui.setQuestion(step);
    this.ui.setFeedback(
      "question",
      step.operator === "+" ? "Bây giờ có bao nhiêu quả?" : "Còn lại bao nhiêu quả?",
      "Con hãy đếm trong rổ rồi chọn một thẻ số.",
      "🤔",
    );
    await this.audio.speak(question, { rate: 0.78 });
    if (token !== this.runToken) return;
    const config = getDifficultyConfig(this.state.difficulty);
    const options = createAnswerOptions(step.result, config.answerOptionCount);
    this.answers.render(options);
    this.answers.bindDropTarget(dropTarget);
    this.setInteractionLocked(false);
  }

  setInteractionLocked(locked) {
    this.state.interactionLocked = locked;
    this.answers.setLocked(locked);
    this.ui.hintButton.disabled = locked || this.state.completed;
    this.ui.replayButton.disabled = locked || this.state.completed;
  }

  async handleAnswerSelect(value, card) {
    if (this.state.interactionLocked || this.state.completed) return;
    const step = this.state.currentStep;
    if (!step) return;
    this.state.selectedAnswer = value;

    if (value === step.result) await this.showCorrectFeedback(card, step);
    else await this.showWrongFeedback(card, step);
  }

  async showCorrectFeedback(card, step) {
    const token = this.runToken;
    this.setInteractionLocked(true);
    this.answers.markCorrect(card);
    this.path.markAnswer(this.state.currentStepIndex, step.result, "correct");
    const sentence = step.operator === "+"
      ? `${step.inputValue} thêm ${step.operand} bằng ${step.result}.`
      : `${step.inputValue} bớt ${step.operand} còn ${step.result}.`;
    this.ui.setFeedback("correct", "Đúng rồi!", `${sentence} Trong rổ có ${step.result} quả.`, "✓");
    await Promise.all([
      this.audio.speak(`Đúng rồi! ${sentence} Trong rổ có ${step.result} quả.`),
      this.scene.bounceAll(),
    ]);
    await this.scene.animations.sleep(320);
    if (token !== this.runToken) return;

    this.state.completeCurrentStep();
    if (this.state.completed) {
      await this.completeLevel();
    } else {
      this.ui.setFeedback(
        "info",
        `${step.result} trở thành số bắt đầu mới`,
        "Kết quả này sẽ được dùng cho bước tiếp theo.",
        "➡️",
      );
      await this.audio.speak(`${step.result} sẽ được dùng cho bước tiếp theo.`);
      await this.scene.animations.sleep(320, true);
      if (token === this.runToken) await this.startCurrentStep(token);
    }
  }

  async showWrongFeedback(card, step) {
    const token = this.runToken;
    this.setInteractionLocked(true);
    this.state.mistakes += 1;
    this.mistakesThisStep += 1;
    this.answers.shake(card);
    this.path.markAnswer(this.state.currentStepIndex, null, "incorrect");

    if (this.mistakesThisStep === 1) {
      this.ui.setFeedback("wrong", "Mình đếm lại nhé", "Chưa đúng. Mỗi quả sẽ sáng lên để con dễ đếm hơn.", "↻");
      this.audio.speak("Chưa đúng. Con hãy đếm lại các quả trong rổ nhé.");
    } else {
      this.ui.setFeedback("wrong", `Trong rổ có ${step.result} quả`, `Hãy đếm cùng cô rồi tìm thẻ số ${step.result}.`, "☝️");
      this.audio.speak(`Có ${step.result} quả trong rổ. Con hãy tìm số ${step.result}.`);
      this.answers.highlightCorrect(step.result);
    }

    await this.scene.countFruit();
    if (token !== this.runToken) return;
    this.path.markAnswer(this.state.currentStepIndex, null, "active");
    this.setInteractionLocked(false);
  }

  async showHint() {
    if (this.state.interactionLocked || this.state.completed || !this.state.currentStep) return;
    const token = this.runToken;
    this.setInteractionLocked(true);
    this.state.hintsUsed += 1;
    this.state.hintStep = (this.state.hintStep % 4) + 1;
    this.ui.hintLevel.textContent = `${Math.min(4, this.state.hintStep + 1)}/4`;
    await this.hints.show(this.state.hintStep, {
      step: this.state.currentStep,
      stepIndex: this.state.currentStepIndex,
    });
    if (token === this.runToken) this.setInteractionLocked(false);
  }

  async replayStepAnimation(step) {
    const phrase = step.operator === "+"
      ? `${step.inputValue}. Thêm từng quả: ${Array.from({ length: step.operand }, (_, index) => step.inputValue + index + 1).join(", ")}.`
      : `${step.inputValue}. Lấy bớt từng quả: ${Array.from({ length: step.operand }, (_, index) => step.inputValue - index - 1).join(", ")}.`;
    this.audio.speak(phrase, { rate: 0.7 });
    await this.scene.replayStep(step);
  }

  replayCurrentPrompt() {
    return this.currentPrompt ? this.audio.speak(this.currentPrompt, { rate: 0.78 }) : this.audio.replay();
  }

  async countAllFruit() {
    const count = this.scene.getFruitCount();
    this.audio.speak(`${Array.from({ length: count }, (_, index) => numberWord(index + 1)).join(", ")}.`, { rate: 0.7 });
    await this.scene.countFruit();
    this.ui.setFeedback("hint", `Có tất cả ${count} quả`, `Con hãy tìm thẻ số ${count}.`, "🍎");
  }

  async completeLevel() {
    this.setInteractionLocked(true);
    this.path.markComplete();
    this.ui.setStep(this.state.level.steps.length + 1, this.state.level.steps.length);
    this.ui.setFeedback("correct", "Đã đến đích!", "Con đã dùng từng kết quả để đi hết đường tính.", "🏁");
    await this.scene.bounceAll();
    const stars = calculateStars(this.state);
    this.storage.recordCompletion(this.progress, this.state.difficulty, stars);
    this.ui.totalStars.textContent = String(this.progress.totalStars);
    this.audio.speak(`Con đã hoàn thành đường tính rồi. Con nhận được ${stars} sao.`);
    const message = stars === 3
      ? "Tuyệt vời! Con quan sát rất kỹ và không cần gợi ý."
      : "Mỗi kết quả đã trở thành số bắt đầu của bước tiếp theo.";
    this.ui.showCompletion(stars, message);
  }

  async resetLevel() {
    if (!this.state.level) return;
    await this.loadLevel(this.state.level);
  }

  async changeDifficulty(difficulty) {
    if (!difficultyConfigs[difficulty] || difficulty === this.state.difficulty && !this.state.completed) return;
    this.state.difficulty = difficulty;
    this.progress.difficulty = difficulty;
    this.storage.save(this.progress);
    this.ui.setDifficulty(difficulty);
    await this.createNewLevel();
  }

  toggleVoice() {
    this.state.voiceEnabled = !this.state.voiceEnabled;
    this.progress.voiceEnabled = this.state.voiceEnabled;
    this.storage.save(this.progress);
    this.audio.setEnabled(this.state.voiceEnabled);
    this.ui.setVoice(this.state.voiceEnabled);
    if (this.state.voiceEnabled) this.audio.speak("Đã bật giọng đọc tiếng Việt.");
  }
}
