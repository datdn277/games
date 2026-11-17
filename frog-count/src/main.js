import '@fontsource-variable/nunito';
import './styles.css';
import { createAudio } from './audio.js';
import { COMPARE, DIRECTION, Game, LEVELS, PHASE, SUPPORT } from './gameplay.js';
import { icon } from './icons.js';
import { createPond } from './world.js';

const PROGRESS_KEY = 'frog-count:progress:v1';
const SOUND_KEY = 'frog-count:sound';
const LEFT = DIRECTION.LEFT_TO_RIGHT;
const RIGHT = DIRECTION.RIGHT_TO_LEFT;
const spokenNumbers = ['', 'Một', 'Hai', 'Ba', 'Bốn', 'Năm', 'Sáu', 'Bảy'];
const tutorials = {
  1: 'Chọn bờ cho Froggy. Sau đó, hãy tìm chiếc lá ngoài cùng ở bờ đó.',
  2: 'Chọn bờ trái, rồi chạm từng lá sen để đếm cùng Froggy.',
  3: 'Bắt đầu ở bờ trái và chạm từng lá cho đến khi đếm đủ.',
  4: 'Bắt đầu ở bờ phải và đếm từng lá về phía bên trái.',
  5: 'Nghe xem Froggy cần bắt đầu ở bờ nào, rồi tự đếm từng lá nhé!',
  compare: 'Hãy tìm lá thứ tư từ cả hai bờ trên cùng một hàng lá sen.',
};

function readStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Play remains available when browser storage is disabled.
  }
}

const elements = Object.fromEntries(
  [...document.querySelectorAll('[id]')].map((element) => [element.id, element]),
);
const app = elements.app;
const game = new Game(readStorage(PROGRESS_KEY));
let soundEnabled = readStorage(SOUND_KEY) !== false;
const audio = createAudio(soundEnabled);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let pond = null;

function showSceneFallback() {
  elements['pond-fallback'].hidden = false;
  elements['pond-frame'].classList.add('no-3d');
}

try {
  pond = createPond(elements.pond, { reducedMotion });
} catch {
  showSceneFallback();
}

let version = 0;
let movingToStart = false;
let startingDirection = null;
let jumpingPad = null;
let hoveredPad = null;
let lastMistake = null;
let phaseBeforePause = null;
let delay = null;
let padControls = [];
let frame = 0;
let previousTime = 0;
let visibleScreen = '';

for (const element of document.querySelectorAll('[data-icon]')) {
  element.innerHTML = icon(element.dataset.icon);
}
elements['collection-link'].hidden = !import.meta.env.PROD ||
  !/\/frog-count\/static(?:\/|$)/.test(location.pathname);

const side = (direction) => direction === LEFT ? 'trái' : 'phải';

function questionText() {
  const { kind, direction, targetOrdinal } = game.question;
  if (kind === 'bank') return `Đưa Froggy về bờ ${side(direction)}!`;
  if (kind === 'edge') return `Tìm lá sen ngoài cùng bên ${side(direction)}!`;
  return `Tìm lá sen thứ ${targetOrdinal} từ bên ${side(direction)}!`;
}

function speakQuestion() {
  const spoken = questionText().replace(/thứ (\d)/, (_match, number) =>
    `thứ ${number === '1' ? 'nhất' : spokenNumbers[number].toLowerCase()}`);
  audio.speak(spoken);
}

function announce(message) {
  elements.announcement.textContent = message;
}

function saveProgress() {
  writeStorage(PROGRESS_KEY, game.progress);
}

function setPauseEffects() {
  const paused = document.hidden || game.phase === PHASE.PAUSED;
  audio.setPaused(paused);
  pond?.setPaused(paused || visibleScreen === 'levels');
}

function openScreen(name) {
  if (visibleScreen === name) return;
  visibleScreen = name;
  for (const screen of ['menu', 'levels', 'game']) {
    elements[screen].hidden = screen !== name;
  }

  if (name !== 'levels') {
    elements[`${name}-scene`].prepend(elements['pond-frame']);
    pond?.setMode(name);
  }
  elements['pad-layer'].hidden = name !== 'game';
  elements.stats.hidden = name !== 'game';
  elements.pause.hidden = name !== 'game';
  setPauseEffects();
}

function renderHeader() {
  elements.sound.innerHTML = icon(soundEnabled ? 'volume' : 'mute');
  elements.sound.setAttribute('aria-pressed', String(soundEnabled));
  elements.sound.setAttribute('aria-label', soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh');
  elements.sound.title = elements.sound.getAttribute('aria-label');
  elements['star-count'].innerHTML = `${icon('star')} ${game.progress.stars}`;
  elements['star-count'].setAttribute('aria-label', `${game.progress.stars} sao`);
  elements.completed.textContent = `${game.progress.completed} câu đã xong`;
  const paused = game.phase === PHASE.PAUSED;
  elements.pause.innerHTML = icon(paused ? 'play' : 'pause');
  elements.pause.setAttribute('aria-label', paused ? 'Tiếp tục chơi' : 'Tạm dừng');
  elements.pause.title = elements.pause.getAttribute('aria-label');
}

function renderLevels() {
  elements['level-grid'].innerHTML = [...LEVELS, COMPARE].map((level) => {
    const compare = level.id === COMPARE.id;
    const finished = game.progress.levels[level.id].finished;
    return `<button type="button" class="level-option${compare ? ' compare' : ''}" data-action="level" data-level="${level.id}">
      <span class="level-number" aria-hidden="true">${compare ? '↔' : level.id}</span>
      <span><strong>${level.title}</strong><small>${level.description}</small></span>
      ${icon(finished ? 'check' : 'arrow-right')}
    </button>`;
  }).join('');
}

function makePadControls(count) {
  if (padControls.length === count) return;
  padControls = Array.from({ length: count }, (_, index) => {
    const control = document.createElement('button');
    control.type = 'button';
    control.className = 'pad-control';
    control.dataset.action = 'pad';
    control.dataset.index = String(index);
    const badge = document.createElement('span');
    badge.className = 'pad-badge';
    badge.setAttribute('aria-hidden', 'true');
    control.append(badge);
    return control;
  });
  elements['pad-layer'].replaceChildren(...padControls);
}

function renderPads() {
  const comparison = game.phase === PHASE.LEVEL_COMPLETE ? game.comparison : null;
  const phase = game.phase === PHASE.PAUSED ? phaseBeforePause : game.phase;
  const acceptsInput = game.phase === PHASE.READY_TO_JUMP && !movingToStart;
  const states = padControls.map((control, index) => {
    const ordinal = game.counted.indexOf(index) + 1;
    const correct = phase === PHASE.QUESTION_COMPLETE && game.feedback?.index === index;
    const compareSide = comparison?.leftIndex === index ? 'left' : comparison?.rightIndex === index ? 'right' : '';
    const wrong = phase === PHASE.INCORRECT_FEEDBACK && game.feedback?.index === index;
    const next = game.nextPadIndex === index && acceptsInput && (game.showHint || lastMistake === 'wrong-pad');
    let state = 'IDLE';
    if (correct || compareSide) state = 'CORRECT';
    else if (wrong) state = 'INCORRECT';
    else if (jumpingPad === index) state = 'SELECTED';
    else if (ordinal) state = 'COUNTED';
    else if (next) state = 'NEXT_TO_COUNT';
    else if (hoveredPad === index && acceptsInput) state = 'HOVERED';

    control.dataset.state = state;
    control.dataset.compare = compareSide;
    control.tabIndex = acceptsInput ? 0 : -1;
    control.setAttribute('aria-disabled', String(!acceptsInput));
    control.setAttribute('aria-label', comparison
      ? `Lá L${index + 1}${compareSide ? `, lá thứ tư tính từ bên ${compareSide === 'left' ? 'trái' : 'phải'}` : ''}`
      : `Lá ${index + 1} tính theo vị trí từ trái${ordinal ? `, đã đếm đến số ${ordinal}` : ''}`);
    const badge = control.firstElementChild;
    const label = comparison ? `L${index + 1}` : game.question.kind === 'ordinal' && ordinal;
    badge.hidden = !label;
    if (label) badge.textContent = label;
    return state;
  });
  pond?.setPadStates(states);
  const guidedMarker = game.support !== SUPPORT.INDEPENDENT || game.showHint ||
    lastMistake === 'wrong-pad' || game.level.id === COMPARE.id;
  pond?.setDirectionMarker(Boolean(startingDirection && guidedMarker && !comparison));
}

function placePadControls() {
  const container = elements['pad-layer'];
  const { clientWidth: width, clientHeight: height } = container;
  if (!width || !height) return;
  const rects = padControls.map((_, index) => pond?.projectPad(index) ?? {
      x: width * (index + 1.5) / (padControls.length + 2),
      y: height * .61,
      width: width / (padControls.length + 2) - 2,
      height: Math.max(44, height * .15),
  });
  padControls.forEach((control, index) => {
    const rect = rects[index];
    const neighbor = rects[index > 0 ? index - 1 : 1];
    const spacing = Math.abs(rect.x - neighbor.x);
    const properties = {
      '--pad-x': rect.x,
      '--pad-y': rect.y,
      '--pad-w': Math.max(24, Math.min(spacing - 2, Math.max(44, rect.width))),
      '--pad-h': Math.max(44, rect.height),
      '--pad-badge-lift': rect.width * .93 + 4,
    };
    for (const [name, pixels] of Object.entries(properties)) {
      const value = `${Math.round(pixels)}px`;
      if (control.style.getPropertyValue(name) !== value) control.style.setProperty(name, value);
    }
  });
}

function actionButton(action, label, variant, glyph) {
  return `<button class="button ${variant}" type="button" data-action="${action}">${glyph ? icon(glyph) : ''}${label}</button>`;
}

function statusLine(message, controls = '') {
  return `<p class="status-line">${message}</p>${controls}`;
}

function renderInstructions() {
  const question = game.question;
  const phase = game.phase;
  if (phase === PHASE.PAUSED) return statusLine('Froggy đang nghỉ một chút.', actionButton('pause', 'Tiếp tục', 'primary', 'play'));
  if (phase === PHASE.TUTORIAL) return statusLine(tutorials[game.level.id], actionButton('tutorial', 'Bắt đầu nào', 'primary', 'play'));
  if (movingToStart) return statusLine(`Froggy đang đến bờ ${side(startingDirection)}…`);
  if (phase === PHASE.LEVEL_COMPLETE) {
    const comparison = game.comparison;
    const message = comparison
      ? 'Các lá sen vẫn ở nguyên chỗ. Bé đã bắt đầu đếm từ hai bờ khác nhau!'
      : `Giỏi lắm! Bé đã hoàn thành <strong>${game.level.title}</strong>.`;
    const legend = comparison
      ? `<div class="compare-key"><span>Thứ 4 từ trái · L${comparison.leftIndex + 1}</span><span>Thứ 4 từ phải · L${comparison.rightIndex + 1}</span></div>`
      : '';
    return statusLine(message, `${legend}<div class="action-group">
      ${actionButton('next-level', game.level.id === COMPARE.id ? 'Chọn cấp độ' : 'Chơi tiếp', 'primary', 'arrow-right')}
      ${actionButton('replay-level', 'Chơi lại', 'secondary', 'reset')}
      ${actionButton('home', 'Về trang chủ', 'secondary')}
    </div>`);
  }
  if (phase === PHASE.QUESTION_COMPLETE) {
    return statusLine(resultText(), `<div class="action-group">
      ${actionButton('next', game.roundIndex + 1 === game.roundCount ? 'Xem kết quả' : 'Chơi tiếp', 'primary', 'arrow-right')}
      ${actionButton('reset', 'Chơi lại', 'secondary', 'reset')}
      ${actionButton('home', 'Về trang chủ', 'secondary')}
    </div>`);
  }
  if (phase === PHASE.SELECT_DIRECTION || (phase === PHASE.INCORRECT_FEEDBACK && lastMistake === 'wrong-direction')) {
    const bankAction = question.kind === 'bank';
    const message = lastMistake === 'wrong-direction'
      ? `Thử lại nhé! Bé hãy chọn bờ ${side(question.direction)}.`
      : bankAction ? 'Bé hãy chọn bờ cho Froggy.' : 'Bé sẽ bắt đầu ở bờ nào?';
    const directionButton = (direction) => {
      const hint = (game.showHint || lastMistake) && direction === question.direction;
      return `<button class="button secondary" type="button" data-action="direction" data-direction="${direction}"${hint ? ' data-hint' : ''}${phase === PHASE.INCORRECT_FEEDBACK ? ' aria-disabled="true"' : ''}>
        ${icon(direction === LEFT ? 'arrow-left' : 'arrow-right')} Bên ${side(direction)}
      </button>`;
    };
    return statusLine(message, `<div class="directions">${directionButton(LEFT)}${directionButton(RIGHT)}</div>`);
  }
  if (lastMistake === 'wrong-pad') return statusLine('Thử chạm vào lá sen được viền sáng nhé!');
  if (phase === PHASE.JUMPING) return statusLine('Froggy đang nhảy…');
  if (question.kind === 'edge') return statusLine('Chạm chiếc lá ngoài cùng ở bờ đã chọn.');
  const count = game.counted.length;
  if (count === 0) return statusLine(`Chạm lá sen đầu tiên từ bờ ${side(question.direction)} để đếm <strong>1</strong>.`);
  return statusLine(`Đã đếm ${count} / ${question.targetOrdinal} · Chạm lá sen tiếp theo.`);
}

function resultText() {
  const { kind, direction, targetOrdinal } = game.question;
  if (kind === 'bank') return `Giỏi lắm! Froggy đã đến bờ ${side(direction)}.`;
  if (kind === 'edge') return `Giỏi lắm! Đây là lá sen ngoài cùng bên ${side(direction)}.`;
  return `Giỏi lắm! Đây là lá sen thứ ${targetOrdinal} từ bên ${side(direction)}!`;
}

function renderGame() {
  const question = game.question;
  const presenting = game.phase !== PHASE.LEVEL_COMPLETE;
  const ordinalTile = elements['ordinal-tile'];
  if (presenting && question.kind === 'ordinal') ordinalTile.textContent = question.targetOrdinal;
  else ordinalTile.innerHTML = icon(presenting ? 'leaf' : 'star');
  elements['question-level'].textContent = game.level.id === COMPARE.id
    ? game.level.title : `Cấp ${game.level.id} · ${game.level.title}`;
  elements['question-title'].textContent = presenting ? questionText()
    : game.comparison ? 'Cùng nhìn lại hai bờ!' : 'Hoàn thành cấp độ!';

  const roundProgress = elements['round-progress'];
  roundProgress.hidden = !presenting;
  roundProgress.setAttribute('aria-label', `Câu ${game.roundIndex + 1} trên ${game.roundCount}`);
  roundProgress.innerHTML = Array.from({ length: game.roundCount }, (_, index) => {
    const done = index < game.roundIndex ||
      (index === game.roundIndex && game.phase === PHASE.QUESTION_COMPLETE && !movingToStart);
    return `<span aria-hidden="true" data-state="${done ? 'done' : index === game.roundIndex ? 'current' : 'waiting'}">${done ? icon('check') : ''}</span>`;
  }).join('');

  const directionFocus = document.activeElement?.dataset.direction;
  elements.instructions.innerHTML = renderInstructions();
  if (directionFocus) {
    elements.instructions.querySelector(`[data-direction="${directionFocus}"]`)?.focus({ preventScroll: true });
  }
  elements['game-tools'].hidden = ![
    PHASE.SELECT_DIRECTION, PHASE.READY_TO_JUMP, PHASE.JUMPING,
    PHASE.COUNTING_FEEDBACK, PHASE.INCORRECT_FEEDBACK,
  ].includes(game.phase);
  elements['game-tools'].querySelector('[data-action="hint"]').disabled =
    movingToStart || ![PHASE.SELECT_DIRECTION, PHASE.READY_TO_JUMP].includes(game.phase);
  renderPads();
}

function render() {
  if (game.phase === PHASE.MAIN_MENU) {
    openScreen('menu');
  } else if (game.phase === PHASE.LEVEL_SELECT) {
    openScreen('levels');
    renderLevels();
  } else {
    openScreen('game');
    renderGame();
  }
  renderHeader();
}

function focusAction(action) {
  elements.instructions.querySelector(`[data-action="${action}"]`)?.focus({ preventScroll: true });
}

function clearRoundEffects() {
  version += 1;
  movingToStart = false;
  startingDirection = null;
  jumpingPad = null;
  hoveredPad = null;
  lastMistake = null;
  phaseBeforePause = null;
  delay = null;
  audio.stopSpeech();
}

function loadRound() {
  clearRoundEffects();
  openScreen('game');
  const count = game.question.lilyPadCount;
  pond?.setRound(count);
  pond?.setStart(null, false);
  makePadControls(count);
  setPauseEffects();
}

function startLevel(id, greeting = false) {
  if (!game.startLevel(id)) return;
  loadRound();
  render();
  focusAction('tutorial');
  audio.speak(`${greeting ? 'Chào bé! Mình là Froggy! ' : ''}${tutorials[id]}`);
}

function beginQuestion() {
  if (!game.beginDirection()) return;
  render();
  elements['question-title'].focus({ preventScroll: true });
  announce(questionText());
  speakQuestion();
}

function openMenu() {
  const fromMenu = game.phase === PHASE.MAIN_MENU;
  clearRoundEffects();
  game.openMenu();
  render();
  setPauseEffects();
  if (!fromMenu) elements['game-title'].focus({ preventScroll: true });
}

function openLevels() {
  clearRoundEffects();
  game.openLevelSelect();
  render();
  audio.setPaused(document.hidden);
  elements['levels-title'].focus({ preventScroll: true });
}

function playFeedback(event) {
  lastMistake = event.kind;
  saveProgress();
  audio.play('wrong');
  pond?.react('think');
  const message = event.kind === 'wrong-direction'
    ? `Thử lại nhé! Bé hãy chọn bờ ${side(game.question.direction)}.`
    : 'Thử chạm vào lá sen được viền sáng nhé!';
  announce(message);
  audio.speak(message);
  delay = { remaining: 470, callback: () => { game.continueFeedback(); render(); } };
  render();
}

function finishQuestion(index, ordinal) {
  if (index !== undefined) pond?.celebrate(index);
  else pond?.react('encourage');
  saveProgress();
  audio.play('reward');
  const message = resultText();
  audio.speak(`${ordinal ? `${spokenNumbers[ordinal]}! ` : ''}${message.replace(/thứ 1\b/, 'thứ nhất')}`);
  announce(message);
  render();
  focusAction('next');
}

function chooseDirection(direction) {
  const result = game.chooseDirection(direction);
  if (!result) return;
  if (result.kind === 'wrong-direction') {
    playFeedback(result);
    return;
  }
  lastMistake = null;
  movingToStart = true;
  startingDirection = direction;
  const currentVersion = version;
  const showMarker = game.support !== SUPPORT.INDEPENDENT || game.level.id === COMPARE.id;
  audio.play('tap');
  const ready = () => {
    if (currentVersion !== version) return;
    movingToStart = false;
    if (result.kind === 'complete') {
      finishQuestion();
    } else {
      render();
      const message = game.question.kind === 'edge'
        ? 'Chạm chiếc lá ngoài cùng ở bờ đã chọn.'
        : `Bắt đầu đếm từ bờ ${side(direction)}. Chạm lá đầu tiên nhé!`;
      announce(message);
      if (game.support === SUPPORT.GUIDED) audio.speak(message);
      elements['question-title'].focus({ preventScroll: true });
    }
  };
  render();
  if (pond) pond.setStart(direction, showMarker, ready);
  else ready();
}

function selectPad(index) {
  if (movingToStart) return;
  const result = game.tapPad(index);
  if (!result) return;
  if (result.kind === 'wrong-pad') {
    playFeedback(result);
    return;
  }
  lastMistake = null;
  jumpingPad = index;
  audio.play('tap');
  audio.play('jump');
  render();
  const land = () => {
    const landing = game.land(result.token);
    if (!landing) return;
    jumpingPad = null;
    audio.play('land');
    if (landing.kind === 'complete') {
      finishQuestion(index, game.question.kind === 'ordinal' ? landing.ordinal : null);
      return;
    }
    audio.speak(`${spokenNumbers[landing.ordinal]}!`);
    announce(`Đã đếm ${landing.ordinal}. Chạm lá tiếp theo.`);
    delay = { remaining: 235, callback: () => { game.continueFeedback(); render(); } };
    render();
  };
  if (pond) pond.jumpTo(index, land);
  else delay = { remaining: 330, callback: land };
}

function hint() {
  if (movingToStart || !game.useHint()) return;
  saveProgress();
  pond?.react('encourage');
  audio.play('correct');
  const message = game.phase === PHASE.SELECT_DIRECTION
    ? `Chọn bờ ${side(game.question.direction)} nhé!` : 'Hãy chạm lá sen được viền sáng.';
  audio.speak(message);
  announce(message);
  render();
  if (game.phase === PHASE.SELECT_DIRECTION) {
    elements.instructions.querySelector('[data-hint]')?.focus({ preventScroll: true });
  }
}

function reset() {
  if (!game.resetRound()) return;
  loadRound();
  beginQuestion();
}

function next() {
  const isCompare = game.level.id === COMPARE.id;
  if (!game.nextRound()) return;
  if (game.phase === PHASE.LEVEL_COMPLETE) {
    audio.play('correct');
    const message = isCompare
      ? 'Các lá sen vẫn ở nguyên chỗ. Bé đã bắt đầu đếm từ hai bờ khác nhau!'
      : `Giỏi lắm! Bé đã hoàn thành ${game.level.title}.`;
    audio.speak(message);
    announce(message);
    saveProgress();
    render();
    elements['question-title'].focus({ preventScroll: true });
  } else {
    loadRound();
    beginQuestion();
    if (isCompare) audio.speak(`Bây giờ mình thử đếm từ đầu bên kia nhé! ${questionText()}`);
  }
}

function togglePause() {
  if (game.phase === PHASE.PAUSED) {
    if (!game.resume()) return;
    phaseBeforePause = null;
  } else {
    const current = game.phase;
    if (!game.pause()) return;
    phaseBeforePause = current;
  }
  setPauseEffects();
  render();
  if (game.phase === PHASE.PAUSED) focusAction('pause');
  else elements.pause.focus({ preventScroll: true });
}

const actions = {
  home: openMenu,
  start: () => startLevel(LEVELS.find(({ id }) => !game.progress.levels[id].finished)?.id ?? 1, true),
  levels: openLevels,
  level: ({ level }) => startLevel(level === COMPARE.id ? level : Number(level)),
  tutorial: () => { if (game.presentQuestion()) beginQuestion(); },
  direction: ({ direction }) => chooseDirection(direction),
  pad: ({ index }) => selectPad(Number(index)),
  listen: () => {
    speakQuestion();
    announce(questionText());
  },
  hint,
  reset,
  next,
  'next-level': () => game.level.id === COMPARE.id ? openLevels()
    : startLevel(game.level.id === LEVELS.length ? COMPARE.id : game.level.id + 1),
  'replay-level': () => startLevel(game.level.id),
  pause: togglePause,
  sound: () => {
    soundEnabled = !soundEnabled;
    audio.setEnabled(soundEnabled);
    writeStorage(SOUND_KEY, soundEnabled);
    renderHeader();
    if (soundEnabled) audio.play('tap');
  },
};

function click(event) {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return;
  audio.unlock();
  actions[button.dataset.action]?.(button.dataset);
}

function padHover(event) {
  if (visibleScreen !== 'game' || event.pointerType === 'touch') return;
  const control = event.target.closest('.pad-control');
  if (!control) return;
  hoveredPad = event.type === 'pointerover' ? Number(control.dataset.index) : null;
  renderPads();
}

function tick(now) {
  const elapsed = Math.min(now - previousTime, 80);
  previousTime = now;
  if (!document.hidden && game.phase !== PHASE.PAUSED && delay) {
    delay.remaining -= elapsed;
    if (delay.remaining <= 0) {
      const { callback } = delay;
      delay = null;
      callback();
    }
  }
  if (visibleScreen === 'game') placePadControls();
  frame = requestAnimationFrame(tick);
}

function onContextLost() {
  pond?.dispose();
  pond = null;
  showSceneFallback();
  if (game.phase === PHASE.JUMPING || movingToStart || phaseBeforePause === PHASE.JUMPING) {
    reset();
  }
}

function dispose(event) {
  if (event.persisted) return;
  app.removeEventListener('click', click);
  app.removeEventListener('pointerover', padHover);
  app.removeEventListener('pointerout', padHover);
  document.removeEventListener('visibilitychange', setPauseEffects);
  elements.pond.removeEventListener('webglcontextlost', onContextLost);
  cancelAnimationFrame(frame);
  pond?.dispose();
  audio.dispose();
}

app.addEventListener('click', click);
app.addEventListener('pointerover', padHover);
app.addEventListener('pointerout', padHover);
document.addEventListener('visibilitychange', setPauseEffects);
elements.pond.addEventListener('webglcontextlost', onContextLost);
window.addEventListener('pagehide', dispose);
render();
frame = requestAnimationFrame(tick);
