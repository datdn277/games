import { levels } from '../gameplay/questions.js';
import { icon } from './icons.js';

const levelGlyphs = ['left', 'search', 'basket'];
const toyIcons = {
  mimo: '🐻', ball: '⚽', car: '🚗', gift: '🎁', teddy: '🧸',
  blocks: '🧩', plane: '✈️', doll: '🪆', apple: '🍎', backpack: '🎒',
  pencilCase: '✏️', milk: '🥛', bread: '🥖', banana: '🍌',
};

export class View {
  constructor(actions) {
    this.actions = actions;
    this.nodes = {};
    for (const id of [
      'main', 'brand', 'catalog-link', 'sound', 'game-title', 'start', 'choose-level',
      'stage-label', 'stage-mimo', 'stage-cues', 'stage-fallback',
      'game-home', 'level-title', 'mission-counter', 'mission-dots', 'star-value',
      'question-tag', 'prompt', 'replay', 'hint', 'audio-status', 'journey', 'journey-title',
      'collection', 'level-grid', 'finish', 'finish-sticker', 'finish-title', 'finish-message',
      'finish-stars', 'next-level', 'retry-level', 'finish-home', 'collection-dialog',
      'close-collection', 'sticker-grid',
    ]) this.nodes[id] = document.getElementById(id);
    this.intro = document.querySelector('.intro');
    this.gamebar = document.querySelector('.gamebar');
    this.card = document.querySelector('.question-card');
    this.starCounter = document.querySelector('.star-counter');
    this.starCounter.insertAdjacentHTML('afterbegin', icon('star'));
    document.querySelector('.brand-mark').innerHTML = icon('sparkle');

    const buttons = [
      ['start', 'play', 'Bắt đầu', actions.start],
      ['choose-level', 'grid', 'Chọn màn', () => this.showLevels()],
      ['collection', 'sticker', 'Nhãn dán', actions.collection],
      ['sound', 'volume', '', actions.sound],
      ['game-home', 'home', '', actions.home],
      ['replay', 'volume', '', actions.replay],
      ['hint', 'bulb', '', actions.hint],
      ['next-level', 'right', 'Màn tiếp theo', actions.next],
      ['retry-level', 'replay', 'Chơi lại', actions.retry],
      ['finish-home', 'home', 'Về menu', actions.home],
      ['close-collection', 'close', '', () => this.nodes['collection-dialog'].close()],
    ];
    for (const [id, symbol, label, run] of buttons) {
      this.nodes[id].innerHTML = label ? `${icon(symbol)}<span>${label}</span>` : icon(symbol);
      this.nodes[id].addEventListener('click', run);
    }
    this.nodes.brand.addEventListener('click', (event) => {
      event.preventDefault();
      actions.home();
    });
    this.nodes['collection-dialog'].addEventListener('click', (event) => {
      if (event.target === this.nodes['collection-dialog']) this.nodes['collection-dialog'].close();
    });
  }

  screen(mode) {
    this.mode = mode;
    const playing = mode === 'game' || mode === 'tutorial';
    this.nodes.main.className = `shell ${playing ? 'playing' : mode === 'result' ? 'finished' : ''}`;
    this.intro.hidden = this.nodes.journey.hidden = mode !== 'menu';
    this.gamebar.hidden = this.card.hidden = !playing;
    this.nodes.finish.hidden = mode !== 'result';
    this.nodes['stage-mimo'].hidden = mode !== 'menu';
    this.nodes['stage-label'].textContent = playing ? 'Phòng đồ chơi' : mode === 'result' ? 'Cùng Mimo ăn mừng!' : 'Phòng đồ chơi';
    this.nodes['stage-cues'].replaceChildren();
    this.cues = [];
    this.question = null;
    this.feedbackKind = '';
    this.hinted = false;
  }

  focus(id) {
    this.nodes[id].focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  updateMenu(progress) {
    this.nodes['level-grid'].innerHTML = levels.map((level) => {
      const unlocked = progress.isUnlocked(level.id);
      const best = progress.best(level.id);
      const state = best ? `${best}/${level.missionCount} sao` : unlocked ? `${level.missionCount} nhiệm vụ` : 'Chưa mở khóa';
      return `<button type="button" class="level-card level-tone-${level.id}" data-level="${level.id}" ${unlocked ? '' : 'disabled'}>
        <span class="level-glyph">${icon(levelGlyphs[level.id - 1])}</span>
        <span class="level-text"><strong>${level.title}</strong><small>${state}</small></span>
        <span class="level-end">${icon(unlocked ? 'chevron' : 'lock')}</span>
      </button>`;
    }).join('');
    for (const button of this.nodes['level-grid'].querySelectorAll('button:not(:disabled)')) {
      button.addEventListener('click', () => this.actions.level(Number(button.dataset.level)));
    }
  }

  isChoiceFocused() {
    return document.activeElement.matches('.toy-cue:focus-visible, button.fallback-toy:focus-visible');
  }

  focusFirstChoice() {
    const row = this.three ? this.nodes['stage-cues'] : this.nodes['stage-fallback'];
    row.querySelector('button')?.focus({ preventScroll: true });
  }

  showLevels() {
    this.nodes['journey-title'].focus({ preventScroll: true });
    this.nodes.journey.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }

  updateSound(enabled) {
    this.nodes.sound.innerHTML = icon(enabled ? 'volume' : 'mute');
    this.nodes.sound.setAttribute('aria-pressed', enabled);
    this.nodes.sound.title = enabled ? 'Tắt âm thanh' : 'Bật âm thanh';
  }

  audioStatus(text = '') {
    this.nodes['audio-status'].textContent = text;
  }

  progress(level, completed, stars, addStar = false) {
    this.nodes['level-title'].textContent = level?.title ?? 'Chơi thử cùng Mimo';
    const total = level?.missionCount ?? 1;
    this.nodes['mission-counter'].textContent = level ? `${completed}/${total}` : '';
    this.nodes['mission-counter'].setAttribute('aria-label', `Đã hoàn thành ${completed} trên ${total} nhiệm vụ`);
    this.nodes['mission-dots'].innerHTML = Array.from({ length: total }, (_, index) =>
      `<i class="${index < completed ? 'done' : index === completed ? 'current' : ''}"></i>`,
    ).join('');
    this.nodes['star-value'].textContent = stars;
    this.starCounter.setAttribute('aria-label', `${stars} ngôi sao`);
    this.starCounter.classList.remove('bump');
    if (addStar) {
      void this.starCounter.offsetWidth;
      this.starCounter.classList.add('bump');
    }
  }

  showQuestion(question, isTutorial) {
    this.question = question;
    this.isTutorial = isTutorial;
    this.feedbackKind = '';
    this.hinted = false;
    this.nodes['stage-label'].textContent = question.level === 3 ? 'Siêu thị của Mimo' : 'Phòng đồ chơi';
    this.clearFeedback();
    this.buildCues();
  }

  clearFeedback() {
    const question = this.question;
    this.feedbackKind = '';
    this.card.dataset.tone = '';
    const direction = question.direction === 'LEFT' ? 'left' : 'right';
    const directionChip = `<span class="direction-chip">${icon(direction)} ${question.rule === 'adjacent' ? 'ngay bên ' : ''}${question.directionLabel}</span>`;
    const targetChip = question.rule === 'named'
      ? `<span class="target-chip"><span aria-hidden="true">${question.targetIcon}</span> ${question.targetLabel}</span>`
      : '';
    this.nodes['question-tag'].innerHTML = `${this.isTutorial ? 'Chạm vào đồ chơi' : 'Mimo nhờ bé'} ${directionChip}${targetChip}`;
    const prompt = this.nodes.prompt;
    prompt.textContent = question.prompt;
    this.highlightPrompt();
  }

  highlightPrompt() {
    const prompt = this.nodes.prompt;
    prompt.classList.remove('question-enter');
    void prompt.offsetWidth;
    prompt.classList.add('question-enter');
  }

  feedback(kind, id) {
    this.feedbackKind = kind;
    this.card.dataset.tone = kind;
    if (kind === 'correct') {
      this.nodes['question-tag'].innerHTML = `${icon('star')} Đúng rồi!`;
      this.nodes.prompt.textContent = 'Giỏi lắm!';
    } else {
      this.nodes.prompt.textContent = 'Gần đúng rồi! Bé thử lại nhé.';
    }
    const button = Array.from(this.nodes['stage-fallback'].querySelectorAll('button')).find((entry) => entry.dataset.object === id);
    if (button) {
      button.classList.remove('wrong');
      void button.offsetWidth;
      button.classList.add(kind === 'correct' ? 'correct' : 'wrong');
    }
  }

  setHint(enabled) {
    this.hinted = enabled;
    this.nodes.hint.setAttribute('aria-pressed', enabled);
    this.buildCues();
    this.nodes['stage-fallback'].querySelector('.fallback-message')?.replaceChildren(
      enabled ? `${this.question.referenceIcon}  ${this.question.directionIcon}  Bên ${this.question.directionLabel}` : 'Chế độ hình minh họa',
    );
  }

  setActive(active) {
    this.active = active;
    for (const node of [...this.cues, ...this.nodes['stage-fallback'].querySelectorAll('button')]) {
      if (node.tagName === 'BUTTON') {
        node.setAttribute('aria-disabled', !active);
        node.tabIndex = active ? 0 : -1;
      }
    }
    this.nodes.hint.disabled = !active;
    this.nodes.replay.disabled = !active;
  }

  buildCues() {
    if (!this.question) return;
    const q = this.question;
    this.cues = q.objects.map((entry) => {
      const cue = document.createElement(entry.selectable ? 'button' : 'span');
      cue.dataset.object = entry.id;
      cue.dataset.type = entry.type;
      if (entry.selectable) {
        cue.type = 'button';
        cue.className = 'toy-cue';
        cue.innerHTML = '<span aria-hidden="true"></span>';
        cue.setAttribute('aria-label', `Chọn ${entry.label}`);
        cue.addEventListener('click', () => this.actions.choose(entry.id));
      } else {
        cue.className = 'reference-cue';
        cue.innerHTML = `${icon('sparkle')} ${entry.label}`;
      }
      return cue;
    });
    if (this.isTutorial && !this.feedbackKind) {
      this.cues.push(this.marker('tutorial-hand', q.targetId, '👆'));
    } else if (this.hinted) {
      this.cues.push(this.marker('hint-arrow', q.referenceId, icon(q.direction === 'LEFT' ? 'left' : 'right')));
    }
    this.nodes['stage-cues'].replaceChildren(...this.cues);
    this.nodes['stage-cues'].hidden = !this.three;
    this.setActive(this.active);
    if (this.positions) this.layout(this.positions);
  }

  marker(className, object, contents) {
    const marker = document.createElement('span');
    marker.className = className;
    marker.dataset.object = object;
    marker.setAttribute('aria-hidden', 'true');
    marker.innerHTML = contents;
    return marker;
  }

  layout(positions) {
    this.positions = positions;
    for (const cue of this.cues) {
      const point = positions.get(cue.dataset.object);
      if (!point) continue;
      const spot = cue.classList.contains('tutorial-hand') ? point.hand : cue.classList.contains('hint-arrow') ? point.head : point.foot;
      cue.style.left = `${spot.x}%`;
      cue.style.top = `${spot.y}%`;
      cue.dataset.x = point.target.x;
      cue.dataset.y = point.target.y;
    }
    if (this.mode === 'menu') {
      const mimo = positions.get('mimo')?.head;
      if (mimo) {
        this.nodes['stage-mimo'].style.left = `${mimo.x}%`;
        this.nodes['stage-mimo'].style.top = `${Math.max(11, mimo.y)}%`;
      }
    }
  }

  stageFallback(available, entries, referenceId) {
    this.three = available;
    this.nodes['stage-cues'].hidden = !available;
    this.nodes['stage-fallback'].hidden = available;
    this.nodes['stage-mimo'].hidden = !available || this.mode !== 'menu';
    if (available) return;
    const row = document.createElement('div');
    row.className = 'fallback-row';
    for (const entry of [...entries].sort((a, b) => a.x - b.x)) {
      const toy = document.createElement(entry.selectable ? 'button' : 'div');
      toy.className = `fallback-toy${entry.id === referenceId ? ' reference' : ''}`;
      toy.innerHTML = `<span class="emoji" aria-hidden="true">${toyIcons[entry.type]}</span><span>${entry.label}</span>`;
      toy.dataset.object = entry.id;
      if (entry.selectable) {
        toy.type = 'button';
        toy.setAttribute('aria-label', `Chọn ${entry.label}`);
        toy.addEventListener('click', () => this.actions.choose(entry.id));
      }
      row.append(toy);
    }
    const message = document.createElement('p');
    message.className = 'fallback-message';
    message.textContent = 'Chế độ hình minh họa';
    this.nodes['stage-fallback'].replaceChildren(row, message);
    if (this.isTutorial && this.question) {
      row.querySelector(`[data-object="${this.question.targetId}"]`)?.classList.add('tutorial-choice');
    }
    this.setActive(this.active);
  }

  result(level, stars) {
    this.nodes['finish-sticker'].textContent = level.sticker;
    this.nodes['finish-message'].textContent = `Bé đã hoàn thành ${stars} nhiệm vụ và nhận nhãn dán ${level.stickerName}!`;
    this.nodes['finish-stars'].innerHTML = icon('star').repeat(stars);
    this.nodes['finish-stars'].setAttribute('aria-label', `${stars} ngôi sao`);
    this.nodes['next-level'].hidden = level.id >= levels.length;
  }

  collection(earned) {
    this.nodes['sticker-grid'].innerHTML = levels.map((level) => {
      const won = earned.some(({ id }) => id === level.id);
      return `<div class="sticker-item${won ? '' : ' locked'}">
        <span class="sticker-symbol" aria-hidden="true">${won ? level.sticker : icon('lock')}</span>
        ${level.stickerName}${won ? '<small>Đã nhận</small>' : '<small>Chưa mở khóa</small>'}
      </div>`;
    }).join('');
    this.nodes['collection-dialog'].showModal();
  }
}
