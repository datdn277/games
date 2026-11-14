import './style.css';
import { AudioManager } from './audio.js';
import { GameEngine, LEVELS, PHASES } from './game.js';
import { OPERATIONS } from './questions.js';
import { SceneManager } from './scene.js';
import { GameUI, speechForState } from './ui.js';

const ui = new GameUI();
let screen = 'menu';
let selectedMode = 'guided';
let scene;
const game = new GameEngine({ onChange: render });
const audio = new AudioManager({ muted: !game.state.soundEnabled });
const listeners = new AbortController();

function render(state, previous) {
  if (state.phase === PHASES.LEVEL_COMPLETE) screen = 'result';
  ui.render(state, screen, selectedMode);
  const counts = Object.fromEntries(state.countedFingers
    .flatMap((value, index) => value === null ? [] : [[index, value]]));
  scene?.update({
    screen,
    raised: state.openFingers,
    counts,
    next: state.nextFinger,
    interactive: state.phase === PHASES.COUNTING,
    lineValue: state.currentValue,
    showLine: state.showNumberLine && state.phase !== PHASES.QUESTION_PRESENTED,
    direction: state.question?.operation === OPERATIONS.SUBTRACTION ? -1 : 1,
    level: state.level?.id ?? 1,
    questionId: state.question?.id,
    progress: state.completedQuestions / (state.questionCount || 1),
  });

  if (!previous) return;
  if (state.soundEnabled !== previous.soundEnabled) audio.setMuted(!state.soundEnabled);
  if (state.countedSteps > previous.countedSteps) {
    audio.play('count', state.currentValue);
    const text = state.phase === PHASES.CHOOSE_ANSWER
      ? `${state.currentValue}. ${state.question.operation === OPERATIONS.COUNT ? 'Có bao nhiêu ngón tay?' : 'Bé đếm đến số mấy?'}`
      : String(state.currentValue);
    audio.speak(text);
    ui.announce(`Đếm được ${state.currentValue}. ${state.countedSteps} trên ${state.openFingers} ngón.`);
    return;
  }

  if (state.phase === PHASES.CORRECT_FEEDBACK && state.phase !== previous.phase) {
    scene?.react('correct');
    audio.play('correct');
    ui.announce('Đúng rồi! Bé nhận được một sao.');
  } else if (state.phase === PHASES.INCORRECT_FEEDBACK && state.chosenAnswer !== previous.chosenAnswer) {
    scene?.react('incorrect');
    audio.play('wrong');
    ui.announce('Mình thử lại nhé!');
  } else if (state.phase === PHASES.LEVEL_COMPLETE && state.phase !== previous.phase) {
    scene?.react('complete');
    audio.play('level');
    audio.speak(`Bé đã hoàn thành màn chơi và nhận ${state.earnedStars} sao!`);
  }
  if (state.phase === PHASES.MENU) audio.stopSpeech();
  if (state.phase !== previous.phase && state.phase !== PHASES.QUESTION_COMPLETE) {
    audio.speak(speechForState(state));
  } else if (state.fingerCountError && !previous.fingerCountError) {
    audio.play('wrong');
    audio.speak(speechForState(state));
    ui.announce('Bé xem lại số ngón cần giơ rồi thử lại nhé.');
  }
}

function openScreen(name) {
  screen = name;
  game.goHome();
}

function start(level, mode = selectedMode) {
  selectedMode = mode;
  screen = 'play';
  game.start(level, mode);
}

function tapFinger(index) {
  audio.unlock();
  game.tapFinger(index);
}

const actions = {
  home: () => openScreen('menu'),
  levels: () => openScreen('levels'),
  'quick-start': () => {
    const level = LEVELS.find(item => !game.state.progress.completedLevels.includes(item.id)) ?? LEVELS[0];
    start(level.id, 'guided');
  },
  'start-level': value => start(value),
  'next-level': () => start(game.state.level.id + 1),
  'play-again': () => start(game.state.level.id),
  advance: () => {
    game.advance();
    if (game.state.phase === PHASES.QUESTION_COMPLETE) game.advance();
  },
  'select-fingers': value => game.setFingerCount(value),
  tap: tapFinger,
  answer: value => game.chooseAnswer(value),
  retry: () => game.retry(),
  sound: () => game.toggleSound(),
  line: () => game.toggleNumberLine(),
  help: () => {
    if (game.requestHelp()) {
      audio.speak(speechForState(game.state));
      ui.announce('Mimo đã bật gợi ý và đường số.');
    }
  },
  replay: () => {
    const { phase, currentValue, countedSteps } = game.state;
    const reminder = phase === PHASES.COUNTING && countedSteps ? `Bé đếm đến số ${currentValue}. ` : '';
    audio.speak(reminder + speechForState(game.state));
  },
};

document.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button || button.getAttribute('aria-disabled') === 'true') return;
  const { action, value } = button.dataset;
  audio.unlock();
  if (action !== 'tap' && action !== 'answer' && action !== 'sound') audio.play('click');
  actions[action]?.(Number(value));
}, { signal: listeners.signal });

document.addEventListener('change', event => {
  if (!event.target.matches('input[name="mode"]')) return;
  audio.unlock();
  audio.play('click');
  selectedMode = event.target.value;
}, { signal: listeners.signal });

try {
  scene = new SceneManager(document.getElementById('stage'), {
    onFingerTap: tapFinger,
    onAvailabilityChange: available => ui.setSceneAvailable(available),
  });
} catch (error) {
  console.warn('Không thể mở lớp học 3D của Mimo.', error);
  ui.setSceneAvailable(false);
}

render(game.state);

function dispose() {
  listeners.abort();
  scene?.dispose();
  audio.dispose();
}

window.addEventListener('pagehide', event => {
  if (!event.persisted) dispose();
}, { signal: listeners.signal });
if (import.meta.hot) import.meta.hot.dispose(dispose);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register(new URL('sw.js', document.baseURI)).catch(() => {});
}
