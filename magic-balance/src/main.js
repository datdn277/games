import '@fontsource-variable/nunito';
import './styles.css';
import { createAudio } from './audio.js';
import { ANIMALS, BALANCE, Game, LEVELS, PHASE, SUPPORT } from './game.js';
import { icon } from './icons.js';
import { bindDrag } from './interactions.js';
import { createAnimalPortraits } from './portraits.js';
import { createUI, factText, sideLabel, sides } from './ui.js';
import { createLab } from './world.js';

const nodes = Object.fromEntries([...document.querySelectorAll('[id]')].map((node) => [node.id, node]));
const app = nodes.app;
const canvas = nodes.lab;
const progressKey = 'magic-balance:progress:v1';
const soundKey = 'magic-balance:sound';
const stored = (key) => {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
};
function store(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Play works without storage. */ }
}

const game = new Game(stored(progressKey));
const ui = createUI(nodes, game);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let sound = stored(soundKey) !== false;
const audio = createAudio(sound);
let world;
let selected = null;
let selectedGroup = null;
let factIndex = null;
let screen = '';
let hotGroup = null;
let hoveringTray = false;
let draggingAnimal = false;
let dragPortrait = null;
let motion = null;
let checking = false;
let drawId;
let timerTime;

function enableFallback() {
  nodes['webgl-note'].hidden = false;
}

try {
  world = createLab(canvas, { reducedMotion });
} catch {
  enableFallback();
}

for (const element of app.querySelectorAll('[data-icon]')) element.innerHTML = icon(element.dataset.icon);
nodes.collection.hidden = !import.meta.env.PROD || !/\/magic-balance\/static(?:\/|$)/.test(location.pathname);

const phase = () => game.phase === PHASE.PAUSED ? game.phaseBeforePause : game.phase;
const previewTilt = () => game.question?.id === 'follow-tilt' && factIndex === null &&
  [PHASE.TUTORIAL, PHASE.PREDICTING].includes(phase());

function save() {
  store(progressKey, game.progress);
}

function announce(text, aloud = false) {
  if (!text) return;
  nodes['speech-status'].textContent = text;
  if (aloud) audio.speak(text);
}

function pauseEffects() {
  const paused = document.hidden || game.phase === PHASE.PAUSED;
  world?.setPaused(paused || screen === 'levels');
  audio.setPaused(paused);
}

function openScreen(name) {
  if (screen === name) return;
  screen = name;
  for (const section of ['menu', 'levels', 'game']) nodes[section].hidden = section !== name;
  if (name !== 'levels') {
    nodes[`${name}-stage`].prepend(nodes['lab-frame']);
    world?.setMode(name);
  }
  nodes['pan-targets'].hidden = name !== 'game';
  if (name !== 'game') nodes['fallback-board'].hidden = true;
  window.scrollTo(0, 0);
  pauseEffects();
}

function view() {
  return {
    factIndex,
    previewTilt: previewTilt(),
    hasWebGL: Boolean(world),
    selected,
    selectedGroup,
    hotGroup,
    dropInTray: hoveringTray,
    draggingAnimal,
    checking,
    busy: [PHASE.DRAGGING, PHASE.WEIGHING, PHASE.PAUSED].includes(game.phase),
  };
}

function render() {
  if (game.phase === PHASE.MAIN_MENU) openScreen('menu');
  else if (game.phase === PHASE.LEVEL_SELECT) {
    openScreen('levels');
    ui.renderLevels();
  } else {
    openScreen('game');
    ui.renderGame(view());
  }
  world?.setSelected(selected?.id ?? null);
  ui.renderHeader(sound, screen === 'game');
}

function focusAction(action) {
  nodes.task.querySelector(`[data-action="${action}"]`)?.focus({ preventScroll: true });
}

function focusQuestion() {
  nodes['question-title'].focus({ preventScroll: true });
}

function clearRound() {
  pointer.cancel();
  selected = null;
  selectedGroup = null;
  factIndex = null;
  motion = null;
  checking = false;
  audio.stopSpeech();
  world?.setFocus(null);
}

function visualBoard() {
  if (factIndex === null) return game.board;
  const fact = game.facts[factIndex];
  return Object.fromEntries(sides.map((side) => [
    side,
    fact[side].map((kind, index) => ({ id: `fact-${factIndex}-${side}-${index}`, kind, locked: true })),
  ]));
}

function syncBoard(options = {}) {
  if (world) {
    const unweighed = previewTilt();
    world.setBoard(visualBoard(), { ...options, unweighed, difference: unweighed ? 0 : undefined });
  } else if (options.onSettled) {
    motion = { remaining: reducedMotion ? 80 : 285, done: options.onSettled };
  }
}

function setPanFocus() {
  if (!selected || factIndex !== null) {
    world?.setFocus(null);
    return;
  }
  const targets = sides.filter((side) => game.canDrop(side) && selected.side !== side);
  world?.setFocus(targets.length === 2 ? 'both' : targets[0] ?? null);
}

function loadQuestion(animate = false) {
  openScreen('game');
  syncBoard({ immediate: !animate });
  render();
}

function selectLevel(id) {
  clearRound();
  if (!game.startLevel(id)) return;
  loadQuestion(true);
  world?.react('wave');
  focusAction('begin');
  announce(game.level.tutorial, true);
}

function backHome() {
  clearRound();
  game.openMenu();
  render();
  nodes.title.focus({ preventScroll: true });
}

function openLevels() {
  clearRound();
  game.openLevels();
  render();
  nodes['levels-title'].focus({ preventScroll: true });
}

function begin() {
  if (!game.begin()) return;
  render();
  world?.react('point');
  announce(game.prompt, true);
  focusQuestion();
}

function announceResult() {
  world?.celebrate();
  audio.play('correct');
  announce(`Giỏi lắm! ${game.feedback}`, true);
  focusAction('next');
}

function weigh(token) {
  if (token === null) return;
  const action = game.lastAction;
  audio.play(action.kind === 'remove' && action.animal.kind === 'fox' && game.level.id === 4 ? 'swap' : 'drop');
  selected = null;
  world?.setFocus(null);
  save();
  const done = () => {
    if (!game.finishWeigh(token)) return;
    save();
    render();
    if (game.phase === PHASE.QUESTION_COMPLETE) {
      announceResult();
    } else if (game.phase === PHASE.BALANCE_FEEDBACK) {
      world?.celebrate();
      audio.play(game.level.id === 4 ? 'swap' : 'balance');
      announce(game.feedback, true);
      if (game.level.id !== 2) focusAction('next');
    } else {
      audio.play(game.balance.state === BALANCE.BALANCED ? 'balance' : 'tilt');
      if (game.support === SUPPORT.GUIDED) world?.react('point');
      const spoken = action.kind === 'remove' && game.level.id === 4 ? game.prompt : game.feedback;
      announce(spoken, game.support === SUPPORT.GUIDED);
    }
  };
  render();
  syncBoard({ placedId: action.kind === 'remove' ? undefined : action.animal.id, onSettled: done });
}

function toggleAnimal(source) {
  if (factIndex !== null || !game.canExperiment || game.phase === PHASE.DRAGGING) return;
  if (source.id && !game.canLift(source.id)) return;
  if (source.id && source.kind === 'fox' && game.level.id === 4 && [0, 2].includes(game.step)) {
    weigh(game.remove(source.id));
    return;
  }
  const same = selected?.kind === source.kind && selected?.id === source.id && selected?.toy === source.toy;
  selected = same ? null : source;
  setPanFocus();
  audio.play('select');
  render();
  if (!same) {
    const label = ANIMALS[source.kind].name.toLowerCase();
    announce(`Đã chọn ${label}. Bé chạm vào đĩa cân để ${source.id ? 'chuyển' : 'đặt'} bạn ấy nhé!`);
    if (game.support === SUPPORT.GUIDED) world?.react('point');
  }
}

function activatePlate(side) {
  if (factIndex !== null && game.phase !== PHASE.PAUSED) {
    announce(factText(game.facts[factIndex]), true);
    return;
  }
  if (!selected || !game.canDrop(side) || selected.side === side) return;
  const token = selected.id ? game.move(selected.id, side) : game.place(selected.kind, side);
  weigh(token);
}

function showFact(index) {
  if (![PHASE.OBSERVING, PHASE.PREDICTING].includes(game.phase)) return;
  if (index !== null && !game.facts[index]) return;
  selected = null;
  factIndex = index;
  world?.setFocus(null);
  syncBoard({ immediate: true });
  render();
  audio.play('select');
  announce(index === null ? game.prompt : factText(game.facts[index]), true);
  const target = index === null ? '[data-action="challenge"]' : `[data-action="fact"][data-index="${index}"]`;
  nodes.evidence.querySelector(target)?.focus({ preventScroll: true });
}

function answer(choice) {
  if (factIndex !== null) return;
  const predictingTilt = previewTilt();
  const result = game.answer(choice);
  if (result === null) return;
  save();
  checking = result && predictingTilt;
  render();
  if (checking) {
    syncBoard({ onSettled: () => {
      checking = false;
      render();
      announceResult();
    } });
  } else if (result) {
    announceResult();
  } else {
    audio.play('retry');
    world?.react('think');
    announce(game.feedback, true);
    nodes.task.querySelector(`[data-choice="${choice}"]`)?.focus({ preventScroll: true });
  }
}

function putGroup(group, slot) {
  if (!game.placeGroup(group, slot)) return;
  save();
  selectedGroup = null;
  audio.play('swap');
  render();
  if (game.phase === PHASE.QUESTION_COMPLETE) announceResult();
  else {
    announce(game.feedback, true);
    nodes.task.querySelector('[data-action="group"]')?.focus({ preventScroll: true });
  }
}

function next() {
  if (motion || checking || !game.next()) return;
  clearRound();
  save();
  if (game.phase === PHASE.LEVEL_COMPLETE) {
    render();
    audio.play('level');
    announce(`Bé đã hoàn thành ${game.level.title}!`, true);
    focusQuestion();
  } else if (game.phase === PHASE.QUESTION_COMPLETE) {
    render();
    announceResult();
  } else if (game.phase === PHASE.TUTORIAL) {
    loadQuestion(true);
    announce(game.level.tutorial, true);
    focusAction('begin');
  } else {
    loadQuestion();
    announce(game.prompt, true);
    focusQuestion();
  }
}

function reset() {
  clearRound();
  if (!game.reset()) return;
  loadQuestion();
  pauseEffects();
  if (game.phase === PHASE.TUTORIAL) focusAction('begin');
  else focusQuestion();
  announce(game.phase === PHASE.TUTORIAL ? game.level.tutorial : game.prompt, true);
}

function pause() {
  pointer.cancel();
  if (game.phase === PHASE.PAUSED) {
    if (!game.resume()) return;
  } else if (!game.pause()) return;
  pauseEffects();
  render();
  if (game.phase === PHASE.PAUSED) focusAction('pause');
  else nodes.pause.focus({ preventScroll: true });
}

const actions = {
  home: backHome,
  start: () => selectLevel(LEVELS.find(({id}) => !game.progress.levels[id].finished)?.id ?? 1),
  levels: openLevels,
  level: ({id}) => selectLevel(Number(id)),
  begin,
  sound: () => {
    sound = !sound;
    audio.setEnabled(sound);
    store(soundKey, sound);
    ui.renderHeader(sound, screen === 'game');
    if (sound) audio.play('select');
  },
  pause,
  answer: ({choice}) => answer(choice),
  animal: ({animal, toy}) => toggleAnimal({ kind: animal, toy }),
  plate: ({side}) => activatePlate(side),
  remove: ({id}) => weigh(game.remove(id)),
  return: () => { if (selected?.id) weigh(game.remove(selected.id)); },
  fact: ({index}) => showFact(Number(index)),
  challenge: () => showFact(null),
  group: ({group}) => {
    const number = Number(group);
    if (game.phase !== PHASE.REASONING || game.groups.includes(number)) return;
    selectedGroup = selectedGroup === number ? null : number;
    audio.play('select');
    render();
    nodes.task.querySelector(`[data-group="${number}"]`)?.focus({ preventScroll: true });
  },
  'group-slot': ({slot}) => { if (selectedGroup !== null) putGroup(selectedGroup, Number(slot)); },
  next,
  reset,
  listen: () => announce(factIndex === null ? game.prompt : factText(game.facts[factIndex]), true),
  hint: () => {
    if (!game.useHint()) return;
    save();
    world?.react('point');
    if (game.question.target && factIndex === null && game.canDrop(game.question.target)) world?.setFocus(game.question.target);
    render();
    announce(game.hint, true);
  },
};

function click(event) {
  if (pointer.consumeClick(event)) return;
  const button = event.target.closest('[data-action]');
  const onScene = screen === 'game' && nodes['lab-frame'].contains(event.target);
  audio.unlock();
  if (onScene && event.detail !== 0 && world) {
    if (selected || factIndex !== null) {
      const side = world.hitPlate(event.clientX, event.clientY) ?? button?.dataset.side;
      if (side) activatePlate(side);
    } else {
      const toy = world.hitAnimal(event.clientX, event.clientY);
      if (toy) toggleAnimal(toy);
    }
    return;
  }
  if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return;
  actions[button.dataset.action]?.(button.dataset);
}

function gestureSource(event) {
  const group = event.target.closest('[data-group]');
  if (game.phase === PHASE.REASONING && group) return { group: Number(group.dataset.group) };
  if (!game.canExperiment || game.phase === PHASE.DRAGGING || factIndex !== null) return null;
  const tray = event.target.closest('[data-animal]');
  if (tray) return { kind: tray.dataset.animal, toy: tray.dataset.toy };
  if (nodes['lab-frame'].contains(event.target)) {
    const toy = world?.hitAnimal(event.clientX, event.clientY);
    if (toy && game.canLift(toy.id)) return toy;
  }
  return null;
}

function dropTarget(event) {
  const target = document.elementFromPoint(event.clientX, event.clientY);
  if (target?.closest('.tray-return')) return 'tray';
  const side = target?.closest('.pan-chip')?.dataset.side;
  return side ?? world?.hitPlate(event.clientX, event.clientY) ?? target?.closest('.pan-target')?.dataset.side ?? null;
}

function showDragPortrait(kind, event) {
  if (!dragPortrait) {
    dragPortrait = document.createElement('div');
    dragPortrait.className = 'drag-portrait';
    dragPortrait.setAttribute('aria-hidden', 'true');
    dragPortrait.innerHTML = ui.dragIcon(kind);
    app.append(dragPortrait);
  }
  dragPortrait.hidden = false;
  dragPortrait.style.setProperty('--drag-x', `${event.clientX}px`);
  dragPortrait.style.setProperty('--drag-y', `${event.clientY}px`);
}

function clearDragVisuals() {
  world?.clearDrag();
  world?.setFocus(null);
  dragPortrait?.remove();
  dragPortrait = null;
  hotGroup = null;
  hoveringTray = false;
  draggingAnimal = false;
}

const pointer = bindDrag(app, {
  find: gestureSource,
  start(source) {
    audio.unlock();
    if (source.group !== undefined) {
      selectedGroup = source.group;
      audio.play('drag');
      render();
      return 'group';
    }
    const token = game.beginDrag(source);
    if (token === null) return null;
    draggingAnimal = Boolean(source.id);
    selected = source;
    audio.play('drag');
    render();
    return token;
  },
  move({ source, token }, event) {
    if (token === 'group') {
      showDragPortrait('group', event);
      const slot = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-slot]')?.dataset.slot;
      const hot = slot === undefined ? null : Number(slot);
      if (hot !== hotGroup) {
        hotGroup = hot;
        render();
      }
      return;
    }
    const inStage = Boolean(document.elementFromPoint(event.clientX, event.clientY)?.closest('#lab-frame'));
    world?.drag(source, event.clientX, event.clientY);
    if (!world || !inStage) showDragPortrait(source.kind, event);
    else if (dragPortrait) dragPortrait.hidden = true;
    const target = dropTarget(event);
    const valid = game.canDrop(target);
    world?.setFocus(valid && target !== 'tray' ? target : null);
    const tray = valid && target === 'tray';
    if (tray !== hoveringTray) {
      hoveringTray = tray;
      render();
    }
  },
  end({ source, token }, event) {
    clearDragVisuals();
    if (token === 'group') {
      const slot = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-slot]')?.dataset.slot;
      selectedGroup = null;
      if (slot !== undefined) putGroup(source.group, Number(slot));
      render();
    } else {
      const nextToken = game.drop(token, dropTarget(event));
      selected = null;
      if (nextToken !== null) weigh(nextToken);
      else render();
    }
  },
  cancel({ token }) {
    clearDragVisuals();
    selected = null;
    selectedGroup = null;
    if (token !== 'group') game.cancelDrag(token);
    render();
  },
});

function positionTargets() {
  const frame = nodes['lab-frame'];
  const width = frame.clientWidth;
  const height = frame.clientHeight;
  for (const target of nodes['pan-targets'].children) {
    const {side} = target.dataset;
    const rect = world?.projectPlate(side) ?? {
      x: width * (side === 'left' ? .25 : .75), y: height * .58, w: width * .45, h: height * .5,
    };
    const css = { x: rect.x, y: rect.y - 8, w: rect.w * 1.08, h: Math.max(44, rect.h + 18) };
    for (const [key, value] of Object.entries(css)) {
      const pixels = `${Math.round(value)}px`;
      if (target.style.getPropertyValue(`--${key}`) !== pixels) target.style.setProperty(`--${key}`, pixels);
    }
  }
}

function tick(now) {
  const elapsed = timerTime === undefined ? 0 : Math.min(now - timerTime, 90);
  timerTime = now;
  if (motion && game.phase !== PHASE.PAUSED && !document.hidden) {
    motion.remaining -= elapsed;
    if (motion.remaining <= 0) {
      const { done } = motion;
      motion = null;
      done();
    }
  }
  if (screen === 'game' && game.phase !== PHASE.PAUSED) positionTargets();
  drawId = requestAnimationFrame(tick);
}

function visibility() {
  if (document.hidden) pointer.cancel();
  pauseEffects();
}

function contextLost() {
  world?.dispose();
  world = null;
  checking = false;
  enableFallback();
  if (phase() === PHASE.WEIGHING) reset();
  else render();
}

function teardown(event) {
  if (event.persisted) return;
  pointer.dispose();
  cancelAnimationFrame(drawId);
  app.removeEventListener('click', click);
  canvas.removeEventListener('webglcontextlost', contextLost);
  document.removeEventListener('visibilitychange', visibility);
  world?.dispose();
  audio.dispose();
}

app.addEventListener('click', click);
canvas.addEventListener('webglcontextlost', contextLost);
document.addEventListener('visibilitychange', visibility);
window.addEventListener('pagehide', teardown);
render();
drawId = requestAnimationFrame(tick);
const later = window.requestIdleCallback ?? ((run) => window.setTimeout(run, 80));
if (world) later(() => { ui.setPortraits(createAnimalPortraits()); render(); });
