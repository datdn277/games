import { Game, LEVELS, STATE } from './game/Game.js';
import { Stage } from './scene/Stage.js';
import { AudioManager } from './audio/AudioManager.js';
import { InputManager } from './ui/InputManager.js';
import { PartyView } from './ui/PartyView.js';
import './styles/global.css';
import './styles/menu.css';
import './styles/game.css';

const container = document.querySelector('#stage');
const root = document.querySelector('#interface');
const view = new PartyView(root, document.querySelector('#announcer'), LEVELS);
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const playStates = new Set([STATE.INTRO, STATE.DEMONSTRATING, STATE.AWAITING_INPUT, STATE.CORRECT_FEEDBACK, STATE.INCORRECT_FEEDBACK]);

let storage;
try { storage = window.localStorage; } catch { /* In-memory progress is available. */ }

const game = new Game({ storage, onEvent: handleEvent });
const audio = new AudioManager({ muted: game.snapshot().progress.muted });
let stage;
let frame = 0;
let previousTime = null;
let contextLost = false;
let lastStars = 0;
let focusRequested = false;
let focusOnResult = false;
let phase = null;

function dispatch(action, payload) {
  if (action === 'reload') {
    window.location.reload();
    return;
  }
  if (contextLost || !stage) return;
  audio.unlock();
  if (action !== 'toggleMute' && action !== 'answer') audio.play('click');
  focusRequested = true;
  game.send(action, payload);
  focusRequested = false;
}

function handleEvent(event) {
  const snapshot = game.snapshot();
  if (event.type === 'state') {
    const fromPause = event.previous === STATE.PAUSED;
    if (event.state === STATE.PAUSED) {
      audio.pause();
    } else if (event.state === STATE.INTRO) {
      stage.setMode('play');
      stage.setPrompt(null);
      if (fromPause) audio.resume();
    } else if (playStates.has(event.state) && fromPause) {
      audio.resume();
    } else if (event.state === STATE.MAIN_MENU || event.state === STATE.LEVEL_SELECT || event.state === STATE.TUTORIAL) {
      audio.stopMusic();
      audio.resume();
      audio.cancelSpeech();
      stage.setMode('menu');
      stage.setPrompt(null);
      stage.setTheme(0);
      if (event.state === STATE.TUTORIAL) {
        audio.speak('Mình cùng nhảy nhé! Hãy nhìn Mimo, nghe hướng dẫn, rồi chọn trái hoặc phải.');
      }
    } else if (event.state === STATE.LEVEL_COMPLETE) {
      focusOnResult = true;
    }
    if (event.state === STATE.DEMONSTRATING && !fromPause) {
      stage.setPrompt(null);
      stage.play('idle');
    }
    if (event.state === STATE.AWAITING_INPUT && !fromPause && snapshot.round.moves.length > 1) {
      stage.setPrompt(null);
      stage.play('idle');
      if (event.previous === STATE.DEMONSTRATING) audio.speak('Đến lượt bé! Chọn các hướng vừa xem nhé.');
    }
    if (event.state === STATE.AWAITING_INPUT && event.previous === STATE.INCORRECT_FEEDBACK && snapshot.round.moves.length === 1) {
      const move = snapshot.cue;
      if (move) {
        stage.play(move.animation, { duration: 1.8, hold: true });
        if (snapshot.level.id === 2 || snapshot.level.id === 4) stage.setPrompt(move.direction);
      }
    }
  } else if (event.type === 'intro') {
    lastStars = 0;
    stage.setTheme(0);
    stage.play('idle');
    audio.playTrack(event.level.track);
    audio.play('greeting');
    audio.speak('Mimo làm mẫu trước nhé!');
  } else if (event.type === 'cue') {
    const { move, sequenceLength, duration } = event;
    stage.play(move.animation, { duration, hold: sequenceLength === 1 });
    if (sequenceLength === 1 && (snapshot.level.id === 2 || snapshot.level.id === 4)) stage.setPrompt(move.direction);
    audio.speak(sequenceLength > 1 ? move.prompt : move.narration);
  } else if (event.type === 'interlude') {
    stage.setTheme(event.theme);
    stage.play(event.animation, { duration: event.duration });
    audio.speak('Cùng nhảy với Mimo!');
  } else if (event.type === 'feedback') {
    stage.setPrompt(event.correct && (snapshot.level.id === 2 || snapshot.level.id === 4) ? event.direction : null);
    stage.play(event.correct ? (event.roundComplete ? 'happy' : 'clap') : 'encourage', { duration: event.duration });
    audio.play(event.correct ? 'correct' : 'incorrect');
    if (event.correct && event.roundComplete) stage.burst();
    if (event.stars > lastStars) {
      lastStars = event.stars;
      audio.play('star');
    }
    if (!event.correct) audio.speak('Mình thử hướng khác nhé!');
  } else if (event.type === 'complete') {
    audio.stopMusic();
    audio.play('complete');
    audio.speak('Bé giỏi quá! Bé đã chọn đúng các hướng rồi.');
    stage.setPrompt(null);
    stage.setMode('celebration');
  } else if (event.type === 'mute') {
    audio.setMuted(event.muted);
    if (!event.muted) {
      audio.unlock();
      audio.play('click');
    }
  }

  phase = snapshot.phase;
  if (!contextLost) {
    view.render(snapshot, { focus: focusRequested || focusOnResult });
    if (snapshot.state === STATE.LEVEL_COMPLETE) focusOnResult = false;
  }
}

function tick(now) {
  const dt = previousTime === null ? 0 : Math.min(Math.max(0, (now - previousTime) / 1000), .10);
  previousTime = now;
  audio.update();
  game.update(dt, audio.beatDuration, audio);
  const snapshot = game.snapshot();
  if (phase !== snapshot.phase) {
    phase = snapshot.phase;
    view.render(snapshot);
  }
  const paused = game.state === STATE.PAUSED;
  if (!paused) stage.update(dt, audio.beatPulse);
  stage.render();
  frame = requestAnimationFrame(tick);
}

function startLoop() {
  if (!stage || contextLost || frame || document.hidden) return;
  previousTime = null;
  frame = requestAnimationFrame(tick);
}

function stopLoop() {
  cancelAnimationFrame(frame);
  frame = 0;
  previousTime = null;
}

function handleContextLost() {
  contextLost = true;
  stopLoop();
  game.send('pause');
  audio.pause();
  view.showContextMessage('Sân khấu đang được khôi phục. Bé chờ Mimo một chút nhé!', true);
}

function handleContextRestored() {
  contextLost = false;
  if (game.state !== STATE.PAUSED) audio.resume();
  view.render(game.snapshot(), { focus: true });
  startLoop();
}

view.render(game.snapshot());
const input = new InputManager(root, dispatch, () => game.state, () => view.primaryButton());
try {
  stage = new Stage(container, {
    reducedMotion: prefersReducedMotion.matches,
    onContextLost: handleContextLost,
    onContextRestored: handleContextRestored,
  });
  game.send('boot');
  startLoop();
} catch (error) {
  console.error('Mimo could not initialize the WebGL stage.', error);
  view.showContextMessage('Thiết bị chưa mở được sân khấu 3D. Bé có thể thử lại bằng trình duyệt khác nhé.', true);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    game.send('pause');
    audio.pause();
    stopLoop();
  } else {
    if (game.state !== STATE.PAUSED && !contextLost) audio.resume();
    startLoop();
  }
});
prefersReducedMotion.addEventListener('change', event => stage?.setReducedMotion?.(event.matches));
window.addEventListener('pagehide', event => {
  if (event.persisted) return;
  stopLoop();
  input.dispose();
  audio.dispose();
  stage?.dispose();
});
