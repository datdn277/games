import './ui/integration.css';
import { AudioManager } from './audio/AudioManager.js';
import { SpeechManager } from './audio/SpeechManager.js';
import { Game, STATE } from './gameplay/Game.js';
import { Direction } from './gameplay/Ordinal.js';
import { ANIMAL_IDS, ANIMAL_NAMES, LEVELS, QuestionType } from './gameplay/Questions.js';
import { StationWorld } from './world/StationWorld.js';
import { directionKey, NUMBERS, ORDINALS, questionText, SIDE } from './ui/copy.js';
import { promptFor, View } from './ui/View.js';

const $ = (id) => document.getElementById(id);
const on = (id, listener) => $(id).addEventListener('click', listener);
const game = new Game();
const audio = new AudioManager(game.progress.sound);
const speech = new SpeechManager(game.progress.sound);
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const view = new View({ onAnimal: (index) => handle(game.chooseAnimal(index)) });
let world;
let phaseTimer = 0;
let timerDeadline = 0;
let remaining = 0;
let feedback = null;
let notice = '';
let rememberedComparison = null;
let tutorialSeen = game.progress.completedLevels.includes(1);

world = new StationWorld(view.host, {
  onSelect: (index) => handle(game.chooseAnimal(index)),
  onLayout: () => view.placeAnimalMarkers(world),
  reduceMotion: motion.matches,
});
if (!world.available) view.unavailable();

function syncWorld() {
  const state = game.activeState;
  const showScene = game.state !== STATE.LEVEL_SELECT;
  world.setPaused(document.hidden || game.state === STATE.PAUSED || !showScene);
  const q = game.question;
  if (!q || state === STATE.LEVEL_COMPLETE) return;

  const isOrdinal = q.type === QuestionType.FIND_ANIMAL_BY_ORDINAL;
  const chooseSide = state === STATE.CHOOSE_DIRECTION || feedback?.kind === 'direction';
  const strong = game.support === 1 || game.hinted;
  const withDirection = game.confirmedDirection && game.support < 3
    || isOrdinal && game.support < 3 && chooseSide
    || game.hinted;
  const direction = isOrdinal && withDirection ? q.direction : null;
  let highlight = null;
  if (state === STATE.SELECT_ANSWER || (state === STATE.QUESTION_COMPLETE && q.type !== QuestionType.CHOOSE_FLAG)) {
    highlight = game.targetIndex;
  } else if (feedback?.correct && feedback.index != null && (feedback.kind !== 'direction' || strong)) {
    highlight = feedback.index;
  } else if (strong && (isOrdinal || game.hinted) && !chooseSide) {
    highlight = game.nextIndex;
  }

  world.setCue({
    highlight,
    direction,
    strength: direction ? (strong ? 2 : 1) : 0,
    guideAt: game.counted.at(-1) ?? (game.confirmedDirection && strong ? game.startIndex : null),
  });
  if (!world.available) {
    for (const id of ['start-flag', 'direction-arrow']) {
      $(id).hidden = !direction;
      if (direction) $(id).dataset.direction = directionKey(direction);
    }
  }
  view.markCue(highlight);
}

function render() {
  const phase = game.activeState;
  const screen = phase === STATE.MAIN_MENU ? 'menu'
    : phase === STATE.LEVEL_SELECT ? 'levels'
    : phase === STATE.LEVEL_COMPLETE ? 'result' : 'play';
  const switched = view.app.dataset.screen !== screen;
  view.app.dataset.screen = screen;
  view.app.dataset.phase = game.state;
  view.app.dataset.questionType = game.question?.type ?? '';
  view.sound(game.progress.sound);

  if (screen === 'play') {
    world.setMode('play');
    world.setAnimals(game.question.animals);
    view.play(game, { feedback, notice, world });
  } else {
    view.clearMarkers();
    world.setCue(null);
    world.setEnabled(false);
    $('start-flag').hidden = true;
    $('direction-arrow').hidden = true;
    if (screen === 'result') {
      world.setMode('result');
      view.result(game, rememberedComparison);
    } else {
      world.setMode('menu');
      world.setAnimals(ANIMAL_IDS);
      if (screen === 'levels' && switched) view.levels(game.progress);
    }
  }
  syncWorld();
  if (switched) {
    $({ menu: 'menu-title', levels: 'levels-title', play: 'question', result: 'result-title' }[screen])
      .focus({ preventScroll: true });
  }
}

function cancelFeedback() {
  clearTimeout(phaseTimer);
  phaseTimer = 0;
  remaining = 0;
  feedback = null;
  notice = '';
}

function queueFeedback(duration) {
  remaining = duration;
  if (document.hidden || game.state === STATE.PAUSED) return;
  timerDeadline = performance.now() + duration;
  phaseTimer = setTimeout(() => {
    phaseTimer = 0;
    remaining = 0;
    if (!game.finishFeedback()) return;
    feedback = null;
    if (game.comparison && !rememberedComparison) rememberedComparison = game.comparison;
    render();
    if ([STATE.CHOOSE_START, STATE.SELECT_ANSWER, STATE.QUESTION_COMPLETE].includes(game.state)) {
      speech.speak(promptFor(game)[1]);
    }
  }, duration);
}

function freezeFeedback() {
  if (!phaseTimer) return;
  remaining = Math.max(1, timerDeadline - performance.now());
  clearTimeout(phaseTimer);
  phaseTimer = 0;
}

function handle(action) {
  if (!action.accepted) return;

  const q = game.question;
  const side = SIDE[q.direction];
  const name = ANIMAL_NAMES[q.animals[action.index]];
  notice = '';
  let label;
  let text;
  if (!action.correct) {
    label = 'Mimo giúp bé thử lại';
    text = action.kind === 'direction' ? `Mình bắt đầu ở bên ${side}. Bé thử chọn lại nhé!`
      : game.nextIndex === game.startIndex && game.counted.length === 0
        ? `Mình bắt đầu ở đầu bên ${side}. Bé thử bạn ${ANIMAL_NAMES[q.animals[game.startIndex]]} nhé!`
        : action.kind === 'answer' ? `Bé tìm lại bạn đứng thứ ${ORDINALS[q.targetOrdinal]} nhé!`
          : 'Đếm lần lượt từng bạn nhé. Bé chạm bạn ngay cạnh theo hướng mũi tên!';
    notice = text;
    audio.play('retry');
    if (action.index != null) world.react(action.index, 'wrong');
  } else if (action.kind === 'count') {
    label = 'Bé đang đếm từng bạn';
    const number = NUMBERS[action.ordinal];
    text = `${action.ordinal} · Bạn ${name}${action.ordinal === q.targetOrdinal ? '. Mình đã tới số cần tìm!' : '!'}`;
    audio.play('count', action.ordinal);
    speech.speak(number + '.');
    world.react(action.index, 'count');
  } else if (action.kind === 'direction' && q.type !== QuestionType.CHOOSE_FLAG) {
    label = 'Đúng đầu hàng rồi';
    text = `Mình bắt đầu đếm từ bên ${side} nhé!`;
    audio.play('direction');
  } else {
    label = 'Bé được một sao';
    text = action.kind === 'direction' ? `Đúng rồi, đây là bên ${side}!` : `Đúng rồi, là bạn ${name}!`;
    audio.play('answer');
    if (action.index != null) world.react(action.index, 'correct');
  }
  if (!action.correct) speech.speak(text);
  feedback = { ...action, label, text };
  render();
  const delay = !action.correct ? 570 : action.kind === 'count'
    ? (action.ordinal === q.targetOrdinal ? 750 : 470)
    : action.kind === 'direction' && q.type !== QuestionType.CHOOSE_FLAG ? 500 : 850;
  queueFeedback(delay);
}

function beginQuestion() {
  if (!game.beginQuestion()) return;
  $('tutorial-dialog').close();
  render();
  const prompt = promptFor(game)[1];
  const intro = game.question.comparisonRound === 2
    ? 'Các bạn vẫn đứng nguyên chỗ. Bây giờ mình đếm từ bên phải. ' : '';
  speech.speak(intro + questionText(game.question) + (game.level === 1 ? '' : ' ' + prompt));
}

function startLevel(level, showIntro = true) {
  if (!game.startLevel(level)) return;
  $('pause-dialog').close();
  cancelFeedback();
  rememberedComparison = null;
  audio.play('direction');
  if (level === 1 && showIntro && !tutorialSeen && game.showTutorial()) {
    tutorialSeen = true;
    render();
    $('tutorial-dialog').showModal();
    speech.speak('Chào bé, mình là Mimo! Chọn đầu hàng rồi chạm từng bạn thú để đếm nhé!');
  } else {
    beginQuestion();
  }
}

function showMenu() {
  cancelFeedback();
  audio.stop();
  speech.stop();
  $('pause-dialog').close();
  game.showMenu();
  render();
}

function showLevels() {
  if (game.showLevels()) {
    audio.play('tap');
    render();
  }
}

function pause() {
  if (!game.pause()) return;
  freezeFeedback();
  speech.stop();
  audio.stop();
  $('pause-dialog').showModal();
  render();
}

function resume() {
  if (!game.resume()) return;
  $('pause-dialog').close();
  render();
  if (remaining) queueFeedback(remaining);
}

function toggleSound() {
  const sound = !game.progress.sound;
  game.setSound(sound);
  audio.setEnabled(sound);
  speech.setEnabled(sound);
  if (sound) {
    audio.play('tap');
    if (game.question && view.app.dataset.screen === 'play') speech.speak(promptFor(game)[1]);
  }
  view.sound(sound);
}

function hint() {
  if (!game.useHint()) return;
  const q = game.question;
  const state = game.state;
  let text;
  if (state === STATE.CHOOSE_DIRECTION) {
    text = `Bé thử nút bên ${SIDE[q.direction]}. Đó là đầu mình bắt đầu đếm!`;
  } else {
    const animal = ANIMAL_NAMES[q.animals[game.nextIndex]];
    text = state === STATE.SELECT_ANSWER ? `Bé chạm lại bạn ${animal} nhé!`
      : `Bé chạm bạn ${animal}${state === STATE.CHOOSE_START ? ` ở đầu bên ${SIDE[q.direction]}` : ' tiếp theo'} nhé!`;
    world.react(game.nextIndex, 'hint');
  }
  notice = text;
  audio.play('hint');
  speech.speak(text);
  render();
}

function advance() {
  if (!game.nextQuestion()) return;
  cancelFeedback();
  if (game.state === STATE.LEVEL_COMPLETE) {
    render();
    audio.play('departure');
    speech.speak('Tuyệt vời! Đoàn tàu Cầu Vồng khởi hành nào!');
  } else {
    audio.play('tap');
    beginQuestion();
    $('question').focus({ preventScroll: true });
  }
}

const firstLevelToPlay = () => (
  LEVELS.find(({ id }) => !game.progress.completedLevels.includes(id))?.id ?? game.progress.lastLevel
);
on('start', () => startLevel(firstLevelToPlay()));
on('choose-level', showLevels);
on('levels-back', showMenu);
$('level-list').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-level]');
  if (button) startLevel(Number(button.dataset.level));
});
on('choose-left', () => handle(game.chooseDirection(Direction.LEFT_TO_RIGHT)));
on('choose-right', () => handle(game.chooseDirection(Direction.RIGHT_TO_LEFT)));
on('menu-sound', toggleSound);
on('sound', toggleSound);
on('home', showMenu);
on('pause', pause);
on('resume', resume);
on('pause-replay', () => startLevel(game.level, false));
on('pause-home', showMenu);
on('tutorial-start', beginQuestion);
on('tutorial-close', beginQuestion);
on('hint', hint);
on('continue', advance);
on('replay', () => startLevel(game.level, false));
on('play-next', () => game.level < LEVELS.length ? startLevel(game.level + 1, false) : showLevels());
on('result-home', showMenu);
on('retry-speech', () => {
  if (!game.question) return;
  const current = feedback?.text ?? (notice || promptFor(game)[1]);
  if (!speech.speak(questionText(game.question) + (current ? ' ' + current : ''))) {
    audio.play('tap');
    view.speechFallback(!game.progress.sound);
  }
});
$('pause-dialog').addEventListener('cancel', (event) => { event.preventDefault(); resume(); });
$('tutorial-dialog').addEventListener('cancel', (event) => { event.preventDefault(); beginQuestion(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    freezeFeedback();
    speech.stop();
    audio.stop();
  } else if (remaining && game.state !== STATE.PAUSED) {
    queueFeedback(remaining);
  }
  syncWorld();
});
motion.addEventListener('change', (event) => world.setReducedMotion(event.matches));
window.addEventListener('pagehide', (event) => {
  if (event.persisted) return;
  cancelFeedback();
  audio.stop();
  speech.stop();
  world.destroy();
});

const catalog = $('catalog-link');
if (/\/animal-line-adventure\/static(?:\/|$)/.test(location.pathname)) {
  catalog.href = '../../index.html';
} else if (/\/animal-line-adventure\//.test(location.pathname)) {
  catalog.href = '../index.html';
} else {
  catalog.hidden = true;
}

game.boot();
render();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register(new URL('sw.js', document.baseURI))
    .catch(() => { /* The game still runs without offline browser caching. */ });
}
