const initialSupport = { 1: 1, 2: 1, 3: 2, 4: 2, 5: 2 };

export class AdaptiveLearning {
  #streak = 0;

  constructor(level) {
    this.support = initialSupport[level];
  }

  supportFor(question, attempt) {
    const support = Math.min(this.support, question.support ?? 3);
    return this.needsPractice(attempt) ? Math.max(1, support - 1) : support;
  }

  needsPractice(attempt) {
    return attempt.wrongDirection + attempt.wrongCount + attempt.wrongAnswer >= 2 ||
      attempt.hints >= 1;
  }

  observe(attempt) {
    if (this.needsPractice(attempt)) {
      this.#streak = 0;
      this.support = Math.max(1, this.support - 1);
      return true;
    }

    if (attempt.wrongDirection + attempt.wrongCount + attempt.wrongAnswer > 0) {
      this.#streak = 0;
      return false;
    }

    this.#streak += 1;
    if (this.#streak === 2) {
      this.#streak = 0;
      this.support = Math.min(3, this.support + 1);
    }
    return false;
  }
}
