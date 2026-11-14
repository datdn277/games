import { CHALLENGE_BADGE, LEVELS, MODES, PHASES } from './game.js';
import { OPERATIONS } from './questions.js';

const ICONS = {
  play: '<path d="m9 5 12 7-12 7z" fill="currentColor" stroke-linejoin="round"/>',
  grid: '<rect x="4" y="4" width="6" height="6" rx="1.4"/><rect x="14" y="4" width="6" height="6" rx="1.4"/><rect x="4" y="14" width="6" height="6" rx="1.4"/><rect x="14" y="14" width="6" height="6" rx="1.4"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  back: '<path d="M20 12H5m6-6-6 6 6 6"/>',
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  speaker: '<path d="M11 5 6 9H3v6h3l5 4zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted: '<path d="M11 5 6 9H3v6h3l5 4zm5 4 6 6m0-6-6 6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4.3 2.7c-.9.4-1.3 1-1.3 1.8m0 3h.01"/>',
  line: '<path d="M3 17h18M5 17v-6m7 6V7m7 10v-6"/>',
  retry: '<path d="M5 9a8 8 0 1 1 .2 6M5 4v5h5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
};

function icon(name) {
  return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}

const NUMBER_WORDS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín', 'mười'];

function spokenEquation({ operation, startNumber, fingerCount }) {
  const count = NUMBER_WORDS[fingerCount];
  if (operation === OPERATIONS.COUNT) return `Cùng đếm ${count} ngón tay nhé!`;
  const sign = operation === OPERATIONS.SUBTRACTION ? 'trừ' : 'cộng';
  return `Bé ơi, chúng mình cùng tính ${NUMBER_WORDS[startNumber]} ${sign} ${count} nhé!`;
}

function lessonCopy(state) {
  const { question, phase, mode, assisted, fingerCountError, openFingers, nextFinger, countedSteps } = state;
  const guided = mode === 'guided' || assisted;
  const backwards = question.operation === OPERATIONS.SUBTRACTION;
  const countingOnly = question.operation === OPERATIONS.COUNT;
  const direction = backwards ? 'đếm lùi' : 'đếm tiếp';
  const start = question.startNumber;
  const count = question.fingerCount;
  switch (phase) {
    case PHASES.QUESTION_PRESENTED:
      return countingOnly
        ? ['Cùng đếm ngón tay', `Bé hãy đếm ${count} ngón tay với Mimo nhé!`, spokenEquation(question)]
        : ['Cùng tính với Mimo', backwards ? 'Dấu trừ nhắc bé đếm lùi.' : 'Dấu cộng nhắc bé đếm tiếp.', spokenEquation(question)];
    case PHASES.REMEMBER_NUMBER:
      return ['Ghi nhớ số đầu', `Bé giữ số ${start} trong đầu nhé!`];
    case PHASES.SHOW_FINGERS:
      if (guided) return ['Giơ ngón tay', `Bé giơ ${count} ngón tay cùng Mimo nhé!`];
      return [
        'Chọn số ngón tay',
        fingerCountError
          ? 'Bé xem lại số ngón cần giơ rồi thử lại nhé.'
          : countingOnly ? 'Bé chọn số ngón muốn giơ.' : 'Bé nhìn số đứng sau dấu phép tính.',
      ];
    case PHASES.READY_TO_COUNT:
      return [
        countingOnly ? 'Cùng đếm nào!' : backwards ? 'Cùng đếm lùi!' : 'Cùng đếm tiếp!',
        countingOnly ? 'Chạm một ngón để đếm một số.' : `Bắt đầu từ ${start}, mỗi ngón ${direction} một số.`,
      ];
    case PHASES.COUNTING:
      return [
        countingOnly ? 'Chạm từng ngón' : backwards ? 'Đếm lùi từng ngón' : 'Đếm tiếp từng ngón',
        nextFinger === null
          ? `Chạm một ngón chưa đếm. Đã đếm ${countedSteps}/${openFingers} ngón.`
          : `Chạm ngón có dấu ✦. Đã đếm ${countedSteps}/${openFingers} ngón.`,
      ];
    case PHASES.CHOOSE_ANSWER:
      return [countingOnly ? 'Có bao nhiêu ngón tay?' : 'Bé đếm đến số mấy?', 'Chọn đáp án của bé.'];
    case PHASES.INCORRECT_FEEDBACK:
      return ['Mình thử lại nhé!', 'Bé có thể chọn lại hoặc cùng Mimo đếm lại.'];
    case PHASES.CORRECT_FEEDBACK:
    case PHASES.QUESTION_COMPLETE:
      return ['Tuyệt lắm, bé đếm đúng rồi!', 'Bé vừa nhận được một ngôi sao.', `Giỏi lắm! Kết quả là ${NUMBER_WORDS[question.result]}.`];
    default:
      return ['', ''];
  }
}

function actionButton(action, label, symbol = 'arrow', variant = 'primary') {
  return `<button class="button ${variant}" data-action="${action}">
    ${label}<span class="button-icon">${icon(symbol)}</span></button>`;
}

function phaseControls(state) {
  const { phase, question, mode, assisted, countedFingers, openFingers, nextFinger, answers, chosenAnswer } = state;
  switch (phase) {
    case PHASES.QUESTION_PRESENTED:
      return actionButton('advance', question.operation === OPERATIONS.COUNT ? 'Giơ ngón tay' : 'Nhớ số đầu');
    case PHASES.REMEMBER_NUMBER:
      return actionButton('advance', 'Đã nhớ');
    case PHASES.SHOW_FINGERS: {
      if (mode === 'guided' || assisted) return actionButton('advance', 'Đã giơ ngón');
      const choices = Array.from({ length: 5 }, (_, index) => {
        const count = index + 1;
        return `<button class="choice-button" data-action="select-fingers" data-value="${count}"
          aria-label="Giơ ${count} ngón" aria-pressed="${count === openFingers}">${count}</button>`;
      }).join('');
      return `<div class="choices finger-choices" role="group" aria-label="Số ngón tay">${choices}</div>`
        + actionButton('advance', 'Xong', 'check');
    }
    case PHASES.READY_TO_COUNT:
      return actionButton('advance', 'Bắt đầu đếm');
    case PHASES.COUNTING:
      return `<div class="choices count-choices" role="group" aria-label="Đếm ngón tay">${countedFingers
        .slice(0, openFingers).map((value, index) => {
          const counted = value !== null;
          const waiting = nextFinger !== null && nextFinger !== index;
          const active = nextFinger === index;
          return `<button class="finger-button${active ? ' is-next' : ''}" data-action="tap" data-value="${index}"
            aria-label="Ngón ${index + 1}${counted ? `, đã đếm ${value}` : active ? ', đếm tiếp' : ''}"
            aria-disabled="${counted || waiting}"><span>${counted ? value : index + 1}</span>${counted ? icon('check') : active ? '<small>✦</small>' : ''}</button>`;
        }).join('')}</div>`;
    case PHASES.CHOOSE_ANSWER:
    case PHASES.INCORRECT_FEEDBACK:
      return `<div class="choices answer-choices" role="group" aria-label="Đáp án">${answers.map(value => `
        <button class="choice-button answer-button" data-action="answer" data-value="${value}"
          aria-pressed="${value === chosenAnswer}">${value}</button>`).join('')}</div>`
        + (phase === PHASES.INCORRECT_FEEDBACK ? actionButton('retry', 'Đếm lại', 'retry', 'secondary') : '');
    case PHASES.CORRECT_FEEDBACK:
    case PHASES.QUESTION_COMPLETE:
      return actionButton('advance', state.completedQuestions === state.questionCount ? 'Nhận phần thưởng' : 'Câu tiếp theo');
    default:
      return '';
  }
}

export function speechForState(state) {
  if (!state.question) return '';
  const [title, message, speech] = lessonCopy(state);
  return speech ?? `${title}. ${message}`;
}

export class GameUI {
  constructor() {
    const byId = id => document.getElementById(id);
    this.layout = document.querySelector('.layout');
    this.intro = byId('intro');
    this.levels = byId('level-select');
    this.frame = byId('scene-frame');
    this.question = byId('lesson-question');
    this.actions = byId('lesson-actions');
    this.result = byId('result');
    this.hud = byId('hud');
    this.navHome = document.querySelector('.nav-home');
    this.collectionLink = byId('collection-link');
    this.sound = byId('sound-button');
    this.stars = byId('star-counter');
    this.levelTitle = byId('level-title');
    this.equation = byId('equation');
    this.lessonLabel = byId('lesson-label');
    this.thought = byId('thought');
    this.title = byId('instruction-title');
    this.message = byId('instruction-text');
    this.controls = byId('phase-controls');
    this.replay = byId('replay-button');
    this.help = byId('help-button');
    this.line = byId('line-button');
    this.modePicker = byId('mode-picker');
    this.levelList = byId('level-list');
    this.unavailable = byId('scene-unavailable');
    this.sceneMessage = byId('scene-message');
    this.announcement = byId('announcement');

    this.navHome.innerHTML = icon('home');
    this.navHome.setAttribute('aria-label', 'Về menu của Mimo');
    for (const element of document.querySelectorAll('[data-icon]')) {
      element.innerHTML = icon(element.dataset.icon);
    }
    if (import.meta.env.DEV) {
      this.collectionLink.removeAttribute('href');
      this.collectionLink.querySelector('span:last-child').textContent = 'Bàn tay kỳ diệu';
    }
  }

  setSceneAvailable(available) {
    this.unavailable.hidden = available;
    this.sceneMessage.textContent = 'Lớp học 3D chưa mở được. Bé vẫn có thể chơi bằng các nút bên dưới.';
  }

  render(state, screen, mode) {
    const previousScreen = this.layout.dataset.screen;
    const canReturn = screen !== 'menu';
    const playing = screen === 'play';
    this.layout.dataset.screen = screen;
    this.intro.hidden = screen !== 'menu';
    this.levels.hidden = screen !== 'levels';
    this.frame.hidden = screen === 'levels';
    this.question.hidden = !playing;
    this.actions.hidden = !playing;
    this.result.hidden = screen !== 'result';
    this.hud.hidden = !playing;
    this.navHome.hidden = !canReturn;
    this.collectionLink.hidden = canReturn;
    this.sound.innerHTML = icon(state.soundEnabled ? 'speaker' : 'muted');
    this.sound.setAttribute('aria-pressed', state.soundEnabled);
    this.sound.setAttribute('aria-label', state.soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh');
    this.stars.setAttribute('aria-label', `${state.progress.stars} sao`);
    this.stars.querySelector('strong').textContent = state.progress.stars;

    if (screen === 'levels') this.renderLevels(state, mode);
    if (playing) this.renderLesson(state);
    if (screen === 'result') this.renderResult(state);

    if (previousScreen !== screen) {
      const heading = {
        menu: this.intro.querySelector('h1'),
        levels: this.levelTitle,
        play: this.equation,
        result: this.result.querySelector('h1'),
      }[screen];
      heading?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  renderLevels(state, selectedMode) {
    const activeMode = document.activeElement?.dataset.mode;
    this.modePicker.innerHTML = '<legend>Cách chơi</legend>' + MODES.map(mode => `
      <label class="mode-card">
        <input type="radio" name="mode" value="${mode.id}" data-mode="${mode.id}" ${mode.id === selectedMode ? 'checked' : ''}>
        <span class="mode-icon" aria-hidden="true">${mode.icon}</span>
        <strong>${mode.title}</strong>
        <span>${mode.description}</span>
      </label>`).join('');
    if (activeMode) this.modePicker.querySelector(`[data-mode="${activeMode}"]`)?.focus();
    this.levelList.innerHTML = LEVELS.map(level => {
      const completed = state.progress.completedLevels.includes(level.id);
      return `<button class="level-card level-${level.id}" data-action="start-level" data-value="${level.id}">
        <span class="level-icon" aria-hidden="true">${level.icon}</span>
        <span class="level-copy">
          <strong>${level.title}</strong><span>${level.description}</span>
          ${completed ? '<span class="completion">✓ Đã hoàn thành</span>' : ''}
        </span>
        <span class="level-arrow">${icon('arrow')}</span>
      </button>`;
    }).join('');
    const stickers = [...LEVELS.map(level => level.sticker), CHALLENGE_BADGE]
      .filter(sticker => state.progress.stickers.includes(sticker.id));
    if (stickers.length) {
      this.levelList.insertAdjacentHTML('beforeend', `<section class="sticker-box">
        <h2>Bộ sưu tập của bé</h2><ul>${stickers.map(sticker => `
        <li><span aria-hidden="true">${sticker.icon}</span> ${sticker.title}</li>`).join('')}</ul></section>`);
    }
  }

  renderLesson(state) {
    const { question, questionIndex, questionCount, completedQuestions, level, phase } = state;
    const progressLabel = `Câu ${questionIndex + 1} trên ${questionCount}`;
    this.hud.innerHTML = `<span>${progressLabel}</span><div class="progress-steps" aria-hidden="true">${Array.from(
      { length: questionCount }, (_, index) => `<i class="${index < completedQuestions ? 'filled' : index === questionIndex ? 'current' : ''}"></i>`
    ).join('')}</div>`;
    this.lessonLabel.textContent = `${level.icon}  ${level.title}`;
    const correct = phase === PHASES.CORRECT_FEEDBACK || phase === PHASES.QUESTION_COMPLETE;
    const countingOnly = question.operation === OPERATIONS.COUNT;
    const sign = question.operation === OPERATIONS.SUBTRACTION ? '−' : '+';
    const equation = countingOnly
      ? `<span>${question.fingerCount}</span> <small>ngón tay</small>`
      : `<span>${question.startNumber}</span><span class="sign">${sign}</span><span>${question.fingerCount}</span>
         <span class="sign">=</span><span class="equation-result ${correct ? 'correct' : ''}">${correct ? question.result : '?'}</span>`;
    if (this.equation.dataset.equation !== equation) {
      this.equation.dataset.equation = equation;
      this.equation.innerHTML = equation;
    }

    const guided = state.mode === 'guided' || state.assisted;
    this.thought.hidden = countingOnly || correct
      || phase === PHASES.QUESTION_PRESENTED || (!guided && phase !== PHASES.REMEMBER_NUMBER);
    this.thought.querySelector('strong').textContent = question.startNumber;
    if (phase === PHASES.REMEMBER_NUMBER && !this.thought.classList.contains('remember')) {
      this.thought.classList.add('remember');
    } else if (phase !== PHASES.REMEMBER_NUMBER) {
      this.thought.classList.remove('remember');
    }

    const [title, message] = lessonCopy(state);
    this.title.textContent = title;
    this.message.textContent = message;
    this.actions.dataset.feedback = correct ? 'correct' : phase === PHASES.INCORRECT_FEEDBACK ? 'try-again' : '';
    const controls = phaseControls(state);
    if (this.controls.dataset.content !== controls) {
      const active = this.controls.contains(document.activeElement) ? document.activeElement.dataset : null;
      const next = active?.action;
      const value = active?.value;
      this.controls.innerHTML = controls;
      this.controls.dataset.content = controls;
      if (next) {
        const same = this.controls.querySelector(`[data-action="${next}"]${value === undefined ? '' : `[data-value="${value}"]`}`);
        const focus = same?.getAttribute('aria-disabled') !== 'true' && same
          || this.controls.querySelector('button:not([aria-disabled="true"])');
        focus?.focus({ preventScroll: true });
      }
    }
    this.replay.setAttribute('aria-disabled', !state.soundEnabled);
    this.help.hidden = correct;
    this.line.setAttribute('aria-pressed', state.showNumberLine);
  }

  renderResult(state) {
    const next = LEVELS.find(level => level.id === state.level.id + 1);
    const rewards = [state.level.sticker, state.earnedChallengeBadge].filter(Boolean);
    this.result.innerHTML = `
      <div class="result-stars" aria-hidden="true">★ <b>★</b> ★</div>
      <h1 id="result-title" tabindex="-1">Bé làm được rồi!</h1>
      <p>Bé hoàn thành màn <strong>${state.level.title}</strong> và nhận ${state.earnedStars} sao.</p>
      <ul class="reward-list">${rewards.map(sticker => `
        <li><span aria-hidden="true">${sticker.icon}</span><strong>${sticker.title}</strong></li>`).join('')}</ul>
      <div class="result-actions">
        ${next ? actionButton('next-level', 'Màn tiếp theo') : actionButton('levels', 'Chọn màn chơi', 'grid')}
        ${actionButton('play-again', 'Chơi lại', 'retry', 'secondary')}
      </div>`;
  }

  announce(text) {
    this.announcement.textContent = text;
  }
}
