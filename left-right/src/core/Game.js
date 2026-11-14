import { Stage } from './Stage.js';
import { AudioManager } from '../audio/AudioManager.js';
import { Progress } from '../gameplay/progress.js';
import { isCorrect, levels, makeRound, tutorialQuestion } from '../gameplay/questions.js';
import { View } from '../ui/View.js';

const menuObjects = [
  { id: 'ball', type: 'ball', label: 'Quả bóng', x: -2.2, z: .68 },
  { id: 'mimo', type: 'mimo', label: 'Mimo', x: .1, z: .2 },
  { id: 'gift', type: 'gift', label: 'Hộp quà', x: 2.3, z: .51 },
];

export class Game {
  constructor(canvas) {
    this.progress = new Progress();
    this.audio = new AudioManager({ enabled: this.progress.soundEnabled });
    this.view = new View({
      start: () => this.start(this.progress.unlockedLevel),
      level: (level) => this.start(level),
      collection: () => this.withAudio(() => this.view.collection(this.progress.stickers)),
      sound: () => this.toggleAudio(),
      home: () => this.withAudio(() => this.home()),
      replay: () => this.replay(),
      hint: () => this.hint(),
      choose: (id) => this.answer(id),
      next: () => this.start(this.level.id + 1),
      retry: () => this.start(this.level.id),
    });
    this.stage = new Stage(canvas, {
      choose: (id) => this.answer(id),
      layout: (positions) => this.view.layout(positions),
      fallback: () => this.syncFallback(),
    });
    this.view.updateSound(this.progress.soundEnabled);
    this.home(false);
  }

  withAudio(action) {
    this.audio.unlock();
    this.audio.play('click');
    action();
  }

  toggleAudio() {
    const enabled = this.audio.toggle();
    this.progress.setSoundEnabled(enabled);
    this.view.updateSound(enabled);
    if (enabled && this.active) this.speak(this.question.prompt);
  }

  home(focus = true) {
    this.clearPending();
    this.mode = 'menu';
    this.view.screen(this.mode);
    this.view.updateMenu(this.progress);
    this.setActive(false);
    this.entries = menuObjects;
    this.referenceId = null;
    this.stage.setScreen('menu', this.entries);
    this.syncFallback();
    if (focus) this.view.focus('game-title');
  }

  start(id) {
    if (!this.progress.isUnlocked(id)) return;
    this.withAudio(() => {
      this.clearPending();
      this.level = levels.find((level) => level.id === id);
      this.index = 0;
      this.round = makeRound(id);
      this.mode = this.progress.completedTutorial ? 'game' : 'tutorial';
      this.view.screen(this.mode);
      this.showQuestion();
      this.view.focus('level-title');
    });
  }

  showQuestion() {
    const tutorial = this.mode === 'tutorial';
    this.question = tutorial ? tutorialQuestion : this.round[this.index];
    this.entries = this.question.objects;
    this.referenceId = this.question.referenceId;
    this.view.progress(tutorial ? null : this.level, this.index, this.progress.stars);
    this.view.showQuestion(this.question, tutorial);
    this.stage.setScreen(this.mode, this.entries, this.referenceId, this.question.level);
    this.syncFallback();
    this.setActive(true);
    if (tutorial) {
      this.stage.setMood('wave');
      this.speak(`Chào bé, mình là Mimo! Cùng nhìn bên trái và bên phải trên màn hình nhé. ${this.question.prompt}`);
    } else {
      this.speak(this.question.prompt);
    }
  }

  syncFallback() {
    this.view.stageFallback(this.stage.available, this.entries, this.referenceId);
  }

  speak(text) {
    this.audio.speak(text);
  }

  replay() {
    if (!this.active) return;
    this.audio.unlock();
    this.view.audioStatus('');
    if (!this.audio.speak(this.question.prompt)) {
      this.view.highlightPrompt();
      this.view.audioStatus(this.progress.soundEnabled
        ? 'Hãy xem mũi tên và yêu cầu trên màn hình.'
        : 'Âm thanh đang tắt.');
    }
  }

  hint() {
    if (!this.active) return;
    this.withAudio(() => {
      this.view.setHint(!this.view.hinted);
      this.stage.setHint(this.view.hinted);
    });
  }

  answer(id) {
    if (!this.active || !this.question.objects.some((object) => object.id === id && object.selectable)) return;
    const keyboardFocus = this.view.isChoiceFocused();
    this.setActive(false);
    const correct = isCorrect(this.question, id);
    this.stage.react(id, correct);
    this.view.feedback(correct ? 'correct' : 'try', id);
    this.audio.play(correct ? 'correct' : 'wrong');
    if (!correct) {
      this.speak('Bé thử lại nhé!');
      this.pending = setTimeout(() => {
        this.view.clearFeedback();
        this.setActive(true);
        this.speak(this.question.prompt);
      }, 1100);
      return;
    }

    const tutorial = this.mode === 'tutorial';
    this.speak('Đúng rồi! Giỏi lắm!');
    if (tutorial) {
      this.progress.completeTutorial();
      this.view.progress(null, 1, this.progress.stars);
    } else {
      this.progress.recordAnswer(this.level.id, this.index + 1);
      if (this.index + 1 === this.round.length) this.progress.completeLevel(this.level.id);
      this.view.progress(this.level, this.index + 1, this.progress.stars, true);
    }

    this.pending = setTimeout(() => {
      if (tutorial) {
        this.mode = 'game';
        this.view.screen(this.mode);
        this.showQuestion();
        if (keyboardFocus) this.view.focusFirstChoice();
        else this.view.focus('level-title');
      } else if (this.index + 1 === this.round.length) {
        this.result();
      } else {
        this.index++;
        this.showQuestion();
        if (keyboardFocus) this.view.focusFirstChoice();
      }
    }, 1400);
  }

  result() {
    this.mode = 'result';
    this.view.screen(this.mode);
    this.view.result(this.level, this.round.length);
    this.view.focus('finish-title');
    this.entries = menuObjects;
    this.referenceId = null;
    this.stage.setScreen('menu', this.entries);
    this.stage.setMood('happy');
    this.syncFallback();
    this.audio.play('reward');
    this.speak(`Hoan hô! Bé nhận nhãn dán ${this.level.stickerName}!`);
  }

  setActive(active) {
    this.active = active;
    this.view.setActive(active);
    this.stage.setActive(active);
  }

  clearPending() {
    clearTimeout(this.pending);
    this.audio.cancelSpeech();
    this.view.audioStatus('');
  }

  dispose() {
    this.clearPending();
    this.audio.dispose();
    this.stage.dispose();
  }
}
