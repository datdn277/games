import { icon } from './icons.js';

const levelIcons = ['hand', 'steps', 'note', 'rainbow'];
const catalogLink = import.meta.env.DEV ? '' : '../../index.html';
const brandContent = `<span class="brand-mark">${icon('note')}</span><span><strong>Mimo</strong><small>DANCE PARTY</small></span>`;

function iconButton(action, image, text, className = '') {
  return `<button type="button" class="icon-button ${className}" data-action="${action}" aria-label="${text}" title="${text}">${icon(image)}</button>`;
}

function soundButton() {
  return iconButton('toggleMute', 'volume', 'Tắt âm thanh', 'sound-button');
}

function actionButton(action, name, image, variant = 'primary') {
  return `<button type="button" class="action ${variant}" data-action="${action}"><span class="action-icon">${icon(image)}</span><span>${name}</span></button>`;
}

function stars(count) {
  return Array.from({ length: 3 }, (_, index) => icon('star', index < count ? 'earned' : 'unearned')).join('');
}

const menu = `
  <header class="topbar">
    ${catalogLink ? `<a class="wordmark" href="${catalogLink}" aria-label="Mimo Dance Party · Về kho trò chơi">${brandContent}</a>` : `<span class="wordmark">${brandContent}</span>`}
    <div class="top-actions">
      ${iconButton('tutorial', 'help', 'Cách chơi')}
      ${soundButton()}
    </div>
  </header>
  <section class="hero" aria-labelledby="game-title">
    <div class="festival">${icon('sparkle')} Lễ hội vũ điệu cầu vồng</div>
    <h1 id="game-title"><span>Vũ điệu</span><strong>Trái – Phải</strong></h1>
    <p class="hero-invite">Nhảy cùng Mimo!</p>
    <p class="hero-instructions">Nghe nhạc, nhìn Mimo và chọn hướng nhé!</p>
    <div class="hero-actions">
      ${actionButton('start', 'Bắt đầu', 'play')}
      ${actionButton('levels', 'Chọn màn', 'grid', 'secondary')}
    </div>
  </section>
  <div class="menu-footer">
    <div class="keyboard-hint" aria-hidden="true"><kbd>←</kbd><kbd>→</kbd><span>Chơi bằng phím mũi tên</span></div>
    <div class="star-collection">${icon('star')} <span>Sao của bé</span> <strong data-total-stars>0 / 12</strong></div>
  </div>`;

function levelsTemplate(levels, progress) {
  const list = levels.map(level => {
    const locked = level.id > progress.unlockedLevel;
    const count = progress.bestStars[level.id] ?? 0;
    const badge = progress.stickers.includes(level.sticker.id) ? level.sticker.icon : '';
    return `<button type="button" class="level-tile" data-action="start" data-value="${level.id}" ${locked ? 'disabled' : ''}>
      <span class="level-symbol theme-${level.id}">${icon(levelIcons[level.id - 1])}</span>
      <span class="level-description">
        <span class="level-number">Màn ${level.id}</span>
        <strong>${level.title}</strong>
      </span>
      <span class="level-status" aria-label="${locked ? 'Chưa mở khóa' : count + ' trên 3 sao'}">
        ${locked ? icon('lock') : `<span class="tile-stars">${stars(count)}</span>${badge ? `<span class="tile-sticker" title="${level.sticker.name}">${badge}</span>` : ''}`}
      </span>
    </button>`;
  }).join('');
  return `<header class="topbar"><div class="top-actions">${iconButton('home', 'left', 'Về menu')}</div><div class="top-actions">${soundButton()}</div></header>
    <section class="level-panel" aria-labelledby="levels-title">
      <h1 id="levels-title">Chọn màn chơi</h1>
      <p>Chọn một điệu nhảy cùng Mimo!</p>
      <div class="level-list">${list}</div>
    </section>`;
}

const tutorial = `
  <div class="scrim">
    <section class="modal-panel tutorial-panel" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      ${soundButton()}
      <div class="modal-emblem">${icon('note')}</div>
      <h1 id="tutorial-title">Cùng tập nhảy!</h1>
      <div class="tutorial-steps">
        <div><span class="tip-icon theme-1">${icon('eye')}</span><strong>Nhìn Mimo</strong></div>
        <div><span class="tip-icon theme-2">${icon('volume')}</span><strong>Nghe hướng dẫn</strong></div>
        <div><span class="tip-icon theme-3">${icon('left')}${icon('right')}</span><strong>Chọn hướng</strong></div>
      </div>
      <p>Nhìn từ phía sau để tay trái của Mimo ở cùng phía tay trái của bé.</p>
      ${actionButton('dismissTutorial', 'Sẵn sàng!', 'play')}
    </section>
  </div>`;

const game = `
  <header class="topbar game-bar">
    <div class="top-actions">
      ${iconButton('home', 'home', 'Về menu')}
      ${iconButton('pause', 'pause', 'Tạm dừng')}
    </div>
    <div class="round-progress" role="group" aria-label="Tiến độ bài nhảy">
      <span data-level-name></span>
      <div class="round-dots"></div>
    </div>
    <div class="top-actions">
      <div class="game-stars" aria-label="Sao trong màn">${icon('star')} <strong data-live-stars>0</strong></div>
      ${soundButton()}
    </div>
  </header>
  <section class="cue-panel" aria-label="Hướng dẫn động tác" data-tone="">
    <span class="cue-symbol">${icon('eye')}</span>
    <div class="cue-copy"><span data-cue-phase></span><strong data-cue-text></strong></div>
    ${iconButton('repeat', 'volume', 'Nghe và xem lại', 'repeat-button')}
  </section>
  <div class="sequence" hidden aria-label="Tiến độ chuỗi động tác"></div>
  <div class="direction-cue" aria-hidden="true" hidden></div>
  <div class="controls-wrap">
    <div class="controls">
      <button class="direction-button left" type="button" data-action="answer" data-value="left"><span class="direction-symbol">${icon('left')}</span><span>Trái</span></button>
      <button class="direction-button right" type="button" data-action="answer" data-value="right"><span>Phải</span><span class="direction-symbol">${icon('right')}</span></button>
    </div>
  </div>
  <div class="scrim pause-overlay" hidden>
    <section class="modal-panel pause-panel" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      ${soundButton()}
      <div class="modal-emblem">${icon('pause')}</div>
      <h1 id="pause-title">Tạm dừng</h1>
      ${actionButton('resume', 'Nhảy tiếp', 'play')}
      ${actionButton('home', 'Về trang chủ', 'home', 'secondary')}
    </section>
  </div>`;

function resultTemplate(result) {
  return `<header class="topbar"><div class="top-actions">${iconButton('home', 'home', 'Về menu')}</div><div class="top-actions">${soundButton()}</div></header>
    <section class="result-panel" aria-labelledby="result-title">
      <div class="result-stars" aria-label="${result.stars} trên 3 sao">${stars(result.stars)}</div>
      <h1 id="result-title">Bé giỏi quá!</h1>
      <p>Bé chọn đúng hướng ở <strong>${result.correct}/${result.total}</strong> nhiệm vụ.</p>
      <div class="reward">
        <span class="sticker-icon" aria-hidden="true">${result.sticker.icon}</span>
        <span><small>Nhãn dán của bé</small><strong>${result.sticker.name}</strong></span>
      </div>
      <div class="result-actions">
      ${result.nextLevel ? actionButton('next', 'Chơi tiếp', 'play') : actionButton('next', 'Chọn màn', 'grid')}
        ${actionButton('retry', 'Chơi lại', 'replay', 'secondary')}
      </div>
    </section>`;
}

const gameStates = new Set(['INTRO', 'DEMONSTRATING', 'AWAITING_INPUT', 'CORRECT_FEEDBACK', 'INCORRECT_FEEDBACK', 'PAUSED']);

const screenFor = state => gameStates.has(state) ? 'game' : ({
  BOOT: 'boot',
  MAIN_MENU: 'menu',
  LEVEL_SELECT: 'levels',
  TUTORIAL: 'tutorial',
  LEVEL_COMPLETE: 'result',
})[state];

export class PartyView {
  constructor(root, announcer, levels) {
    this.root = root;
    this.announcer = announcer;
    this.levels = levels;
    this.screen = '';
    this.lastSnapshot = null;
  }

  render(snapshot, { focus = false } = {}) {
    const { state, progress } = snapshot;
    const screen = screenFor(state);
    const previousState = this.lastSnapshot?.state;
    const changed = screen !== this.screen;
    this.lastSnapshot = snapshot;
    if (changed) {
      this.screen = screen;
      document.body.dataset.screen = screen;
      this.root.innerHTML = {
        boot: '<div class="loading">Mimo đang chuẩn bị sân khấu…</div>',
        menu,
        levels: screen === 'levels' ? levelsTemplate(this.levels, progress) : '',
        tutorial,
        game,
        result: screen === 'result' ? resultTemplate(snapshot.result) : '',
      }[screen];
    }
    if (screen === 'menu') {
      this.root.querySelector('[data-total-stars]').textContent = progress.totalStars + ' / ' + this.levels.length * 3;
    }
    this.updateSound(progress.muted);
    if (screen === 'game') this.updateGame(snapshot);
    if (focus && changed) this.primaryButton()?.focus({ preventScroll: true });
    if (state === 'PAUSED' && previousState !== state) {
      this.root.querySelector('[data-action="resume"]')?.focus({ preventScroll: true });
    } else if (previousState === 'PAUSED' && screen === 'game') {
      this.root.querySelector('[data-action="pause"]')?.focus({ preventScroll: true });
    }
  }

  primaryButton() {
    return this.root.querySelector('.pause-overlay:not([hidden]) .primary, .hero-actions .primary, .level-tile:not(:disabled), .modal-panel .primary, .result-actions .primary');
  }

  updateSound(muted) {
    for (const sound of this.root.querySelectorAll('.sound-button')) {
      if (sound.dataset.muted === String(muted)) continue;
      const label = muted ? 'Bật âm thanh' : 'Tắt âm thanh';
      sound.dataset.muted = muted;
      sound.title = label;
      sound.setAttribute('aria-label', label);
      sound.innerHTML = icon(muted ? 'muted' : 'volume');
    }
  }

  updateGame(s) {
    if (!s.level) return;
    const paused = s.state === 'PAUSED';
    const state = paused ? s.pausedFrom : s.state;
    const memory = (s.round?.moves.length ?? 0) > 1;
    const waiting = state === 'AWAITING_INPUT' && !paused;
    const correct = state === 'CORRECT_FEEDBACK';
    const incorrect = state === 'INCORRECT_FEEDBACK';
    const reply = correct || incorrect;
    const done = s.roundIndex + Number(correct && s.feedback?.roundComplete);
    this.root.querySelector('[data-level-name]').textContent = s.level.title;
    this.root.querySelector('[data-live-stars]').textContent = s.stars;
    const bar = this.root.querySelector('.round-dots');
    const dotKey = [s.roundCount, done, s.roundIndex].join('/');
    if (bar.dataset.key !== dotKey) {
      bar.dataset.key = dotKey;
      bar.setAttribute('aria-label', 'Nhiệm vụ ' + (s.roundIndex + 1) + ' trên ' + s.roundCount);
      bar.innerHTML = Array.from({ length: s.roundCount }, (_, index) => `<span class="round-dot ${index < done ? 'done' : index === s.roundIndex ? 'current' : ''}">${index < done ? icon('check') : ''}</span>`).join('');
    }

    const message = this.gameMessage(s, state, memory);
    const panel = this.root.querySelector('.cue-panel');
    if (panel.dataset.message !== message[1] || panel.dataset.tone !== message[2]) {
      panel.dataset.message = message[1];
      panel.dataset.tone = message[2];
      panel.querySelector('.cue-symbol').innerHTML = icon(message[3]);
      panel.querySelector('[data-cue-phase]').textContent = message[0];
      panel.querySelector('[data-cue-text]').textContent = message[1];
      this.announce(message[1]);
    }
    panel.querySelector('button').disabled = !waiting;
    this.root.querySelector('.pause-overlay').hidden = !paused;
    this.root.querySelector('.game-bar').inert = paused;
    panel.inert = paused;
    for (const button of this.root.querySelectorAll('.direction-button')) {
      const selected = reply && s.answer === button.dataset.value;
      button.disabled = !waiting;
      button.dataset.feedback = selected ? (correct ? 'correct' : 'retry') : '';
    }

    const sequence = this.root.querySelector('.sequence');
    sequence.hidden = !memory || state === 'INTRO' || s.phase === 'interlude';
    if (!sequence.hidden) {
      const demo = state === 'DEMONSTRATING';
      sequence.dataset.demo = demo;
      const count = s.round.moves.length;
      const current = demo ? s.demonstratedIndex : s.stepIndex;
      const key = [count, current, demo, correct, s.feedback?.roundComplete, s.cue?.id].join('/');
      if (sequence.dataset.key !== key) {
        sequence.dataset.key = key;
        sequence.setAttribute('aria-label', 'Bước ' + Math.min(current + 1, count) + ' trên ' + count);
        sequence.innerHTML = s.round.moves.map((move, index) => {
          const done = !demo && (index < current || correct && index === current);
          const active = index === current && !done;
          return `<span class="sequence-dot ${done ? 'done' : ''} ${active ? 'current' : ''}" aria-hidden="true">${done ? icon('check') : demo && active ? icon(move.direction) : ''}</span>`;
        }).join('');
      }
    }

    const arrow = this.root.querySelector('.direction-cue');
    const showArrow = !!s.cue && (state === 'DEMONSTRATING' && s.phase === 'cue' || waiting && !memory);
    arrow.hidden = !showArrow;
    if (showArrow && arrow.dataset.direction !== s.cue.direction) {
      arrow.dataset.direction = s.cue.direction;
      arrow.innerHTML = icon(s.cue.direction);
    }
  }

  gameMessage(s, state, memory) {
    if (state === 'INTRO') return ['Bắt đầu!', 'Mimo chuẩn bị làm mẫu', 'watch', 'note'];
    if (state === 'CORRECT_FEEDBACK') return ['Hay lắm!', 'Bé chọn đúng hướng rồi!', 'correct', 'check'];
    if (state === 'INCORRECT_FEEDBACK') return ['Thử lại nhé', 'Mình đổi hướng nào!', 'retry', 'replay'];
    if (state === 'DEMONSTRATING' && s.phase === 'interlude') return ['Theo nhịp nhạc', 'Cùng nhảy với Mimo!', 'watch', 'note'];
    if (state === 'DEMONSTRATING') return ['Nhìn Mimo', s.cue?.prompt ?? 'Quan sát động tác nhé!', 'watch', 'eye'];
    if (memory) return ['Đến lượt bé', 'Chọn các hướng vừa xem!', 'choose', 'note'];
    return ['Đến lượt bé', s.cue?.prompt ?? 'Bé chọn hướng nào?', 'choose', s.cue?.direction ?? 'left'];
  }

  announce(message) {
    if (this.announcer.textContent !== message) this.announcer.textContent = message;
  }

  showContextMessage(message, retry = false) {
    this.root.innerHTML = `<div class="scrim"><section class="modal-panel context-panel" role="status">
      <div class="modal-emblem">${icon('rainbow')}</div><h1>Sân khấu của Mimo</h1>
      <p></p>${retry ? '<button class="action primary" data-action="reload" type="button">Thử lại</button>' : ''}
      ${catalogLink ? `<a href="${catalogLink}" class="action secondary">Về kho trò chơi</a>` : ''}
    </section></div>`;
    this.root.querySelector('p').textContent = message;
    this.screen = '';
  }
}
