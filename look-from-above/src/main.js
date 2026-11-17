import '@fontsource-variable/nunito';
import './styles.css';
import { createAudio } from './audio.js';
import { COLORS, COLOR_LABELS, Game, LEVELS, PHASE, SUPPORT, VIEW } from './game.js';
import { icon } from './icons.js';
import { createUI } from './ui.js';
import { createWorld } from './world.js';

const nodes = Object.fromEntries([...document.querySelectorAll('[id]')].map((node) => [node.id, node]));
const app = nodes.app;
const canvas = nodes.studio;
const progressKey = 'look-from-above:progress:v1';
const buildKey = 'look-from-above:build:v1';
const soundKey = 'look-from-above:sound';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function load(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

const game = new Game(load(progressKey), load(buildKey));
const ui = createUI(nodes, game);
let sound = load(soundKey) !== false;
const audio = createAudio(sound);
let world;
let screen = '';
let elevation = 0;
let focus = null;
let brush = COLORS.WHITE;
let buildMode = 'add';
let notice = '';
let gesture = null;
let flight = null;

try {
  world = createWorld(canvas, { reducedMotion });
} catch {
  nodes['webgl-note'].hidden = false;
}

for (const element of app.querySelectorAll('[data-icon]')) element.innerHTML = icon(element.dataset.icon);
nodes.collection.hidden = !import.meta.env.PROD || !/\/look-from-above\/static(?:\/|$)/.test(location.pathname);

function announce(text, aloud = false) {
  if (!text) return;
  nodes.announcement.textContent = text;
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
    nodes[`${name}-stage`].prepend(nodes['stage-frame']);
    world?.setMode(name);
  }
  nodes['view-tag'].hidden = name !== 'game' || !world;
  window.scrollTo(0, 0);
  pauseEffects();
}

function state() {
  return { elevation, focus, color: brush, buildMode, notice, hasWorld: Boolean(world) };
}

function sceneEffects() {
  if (!world || screen !== 'game') return;
  const guided = game.support === SUPPORT.GUIDED;
  const discovering = game.view === VIEW.TOP && game.hasDiscovered;
  const faceHint = game.question.type === 'faces' && game.faceStep < 2 && (guided || game.hint)
    ? { id: game.cubes[0].id, face: game.faceStep === 0 ? 'top' : 'front' }
    : null;
  const selected = game.inspection;
  world.setXRay(game.xray, game.xray && focus ? focus : null);
  world.setGrid(guided || discovering || game.question.type === 'sandbox' || Boolean(game.hint));
  world.setHighlights({
    id: faceHint?.id ?? selected?.cube.id,
    face: faceHint?.face ?? selected?.face,
    visibleTops: discovering && !game.xray && [PHASE.TOP_VIEW_EXPLORATION, PHASE.BUILDING_2D].includes(game.phase),
    hidden: game.xray,
    cell: focus,
  });
}

function render() {
  if (game.phase === PHASE.MAIN_MENU) openScreen('menu');
  else if (game.phase === PHASE.LEVEL_SELECT) {
    openScreen('levels');
    ui.renderLevels();
  } else {
    openScreen('game');
    sceneEffects();
    ui.renderGame(state());
  }
  ui.renderHeader(sound, screen === 'game');
}

function focusControl(action, match = '') {
  app.querySelector(`[data-action="${action}"]${match}:not([hidden])`)?.focus({ preventScroll: true });
}

function cancelFlight() {
  flight = null;
  world?.cancelTransition();
}

function clearUI() {
  cancelFlight();
  elevation = 0;
  focus = null;
  brush = COLORS.WHITE;
  buildMode = 'add';
  notice = '';
  gesture = null;
  audio.stopSpeech();
}

function loadRound() {
  openScreen('game');
  world?.setBoard(game.cubes, { bounds: game.bounds });
  world?.setView(VIEW.ISOMETRIC, { immediate: true });
  render();
}

function startLevel(id) {
  if (!game.startLevel(id)) return;
  clearUI();
  loadRound();
  world?.react('wave');
  focusControl('begin');
  announce(game.level.tutorial, true);
}

function begin() {
  if (!game.begin()) return;
  render();
  world?.react('point');
  announce(game.prompt, true);
  nodes.prompt.focus({ preventScroll: true });
}

function setView(view) {
  if (view === VIEW.TOP) {
    fly();
    return;
  }
  if (!game.canInspect || !Object.hasOwn(VIEW, view)) return;
  game.setView(view);
  elevation = 0;
  world?.setView(view);
  render();
}

function fly(immediate = false) {
  const token = game.startFlight();
  if (token === null) return;
  flight = token;
  notice = '';
  audio.play('flying');
  world?.react('flying');
  announce('Bây giờ chúng mình cùng bay lên cao nào!', true);
  render();
  const onDone = () => {
    if (flight !== token || !game.finishFlight(token)) return;
    flight = null;
    elevation = 100;
    audio.play('reveal');
    render();
    const message = game.question.type === 'sandbox' ? 'Bé đang nhìn thẳng từ trên.' : game.feedback || 'Từ trên cao, bé thấy các mặt trên.';
    announce(message, true);
    if (!immediate) nodes.prompt.focus({ preventScroll: true });
  };
  if (world) world.setView(VIEW.TOP, { onDone, immediate });
  else onDone();
}

function changeElevation() {
  if (!game.canInspect) return;
  const next = Number(nodes.tilt.value);
  if (next >= 100) {
    if (game.view !== VIEW.TOP) fly(true);
    return;
  }
  elevation = next;
  game.setView(next === 0 ? VIEW.ISOMETRIC : VIEW.FREE_ORBIT);
  world?.setElevation(next / 100);
  sceneEffects();
  ui.renderCamera(state());
}

function orbit(horizontal, vertical = 0) {
  if (!world || !game.canInspect) return;
  if (game.view === VIEW.TOP) {
    game.setView(VIEW.FREE_ORBIT);
    world.setView(VIEW.FREE_ORBIT, { immediate: true });
  }
  const allowedVertical = game.canFly || game.hasDiscovered
    ? vertical : Math.min(0, vertical);
  if (!world.orbit(horizontal, allowedVertical)) return;
  game.setView(VIEW.FREE_ORBIT);
  elevation = Math.round(world.getPose().elevation * 100);
  sceneEffects();
  ui.renderCamera(state());
}

function toggleXRay() {
  if (!game.toggleXRay()) return;
  notice = '';
  focus = null;
  audio.play('reveal');
  world?.react('point');
  render();
  announce(game.xray ? 'Chạm một chồng khối để tìm tầng đang bị che.' : 'Chỉ còn thấy các mặt trên cao nhất khi nhìn từ trên.', true);
}

function inspect(id, face) {
  const step = game.faceStep;
  if (!game.inspect(id, face)) return;
  const { cube, hidden } = game.inspection;
  focus = { x: cube.x, z: cube.z };
  notice = game.feedback;
  audio.play('select');
  if (game.xray && hidden.length) world?.react('point');
  else if (step !== game.faceStep) world?.react('encourage');
  save(progressKey, game.progress);
  render();
  announce(game.feedback, game.support === SUPPORT.GUIDED || game.xray);
}

function inspectCell(x, z) {
  const cube = game.cubes.filter((item) => item.x === x && item.z === z).reduce(
    (top, item) => top && top.y > item.y ? top : item, null);
  if (cube) inspect(cube.id, 'top');
  else if (game.canInspect) {
    focus = { x, z };
    notice = 'Ô này trống vì không có khối nào ở đó.';
    render();
    announce(notice);
  }
}

function commitBuild() {
  world?.setBoard(game.cubes, { bounds: game.bounds });
  save(buildKey, game.build);
  render();
}

function edit(x, z) {
  if (game.phase !== PHASE.BUILDING_3D) return;
  if (game.xray) {
    inspectCell(x, z);
    return;
  }
  const source = game.moveSource;
  if (!game.edit(buildMode, x, z, brush)) {
    notice = buildMode === 'add' ? 'Cột này đã cao nhất rồi. Bé chọn ô khác nhé!' :
      buildMode === 'move' ? 'Chọn một cột có khối, rồi chọn ô đích còn chỗ.' : 'Bé chọn một ô có khối nhé!';
    render();
    announce(notice);
    return;
  }
  focus = { x, z };
  if (buildMode === 'move' && game.moveSource && !source) {
    notice = 'Đã chọn khối. Bây giờ chạm vào ô đích.';
    audio.play('select');
    render();
    announce(notice);
    return;
  }
  notice = buildMode === 'move' ? 'Đã chuyển khối.' : '';
  audio.play('place');
  commitBuild();
}

function verify() {
  const result = game.verify();
  if (result === null) return;
  notice = '';
  save(progressKey, game.progress);
  render();
  if (result) {
    world?.react('happy');
    audio.play('correct');
    announce(`Giỏi lắm! ${game.feedback}`, true);
    focusControl('next');
  } else {
    world?.react('think');
    audio.play('retry');
    announce(game.feedback, true);
    focusControl('retry');
  }
}

function next() {
  if (!game.next()) return;
  clearUI();
  if (game.phase === PHASE.LEVEL_COMPLETE) {
    elevation = game.view === VIEW.TOP ? 100 : Math.round((world?.getPose().elevation ?? 0) * 100);
    render();
    audio.play('level');
    announce(`Bé đã hoàn thành ${game.level.title}!`, true);
    nodes.prompt.focus({ preventScroll: true });
  } else {
    loadRound();
    announce(game.phase === PHASE.TUTORIAL ? game.level.tutorial : game.prompt, true);
    if (game.phase === PHASE.TUTORIAL) focusControl('begin');
    else nodes.prompt.focus({ preventScroll: true });
  }
}

function reset() {
  if (!game.reset()) return;
  clearUI();
  loadRound();
  pauseEffects();
  announce(game.phase === PHASE.TUTORIAL ? game.level.tutorial : game.prompt);
  nodes.prompt.focus({ preventScroll: true });
}

function pause() {
  if (game.phase === PHASE.PAUSED) {
    if (!game.resume()) return;
  } else if (!game.pause()) return;
  gesture = null;
  pauseEffects();
  render();
  if (game.phase === PHASE.PAUSED) nodes.instructions.querySelector('[data-action="pause"]')?.focus();
  else nodes.pause.focus({ preventScroll: true });
}

const cellCoords = ({ row, col }) => ({
  x: Number(col) + game.bounds.minX, z: Number(row) + game.bounds.minZ,
});
const attrCell = ({ row, col }) => `[data-row="${row}"][data-col="${col}"]`;

const actions = {
  home: () => {
    clearUI();
    game.openMenu();
    render();
    nodes.title.focus({ preventScroll: true });
  },
  levels: () => {
    clearUI();
    game.openLevels();
    render();
    nodes['levels-title'].focus({ preventScroll: true });
  },
  start: () => startLevel(LEVELS.find(({ id }) => !game.progress.levels[id].finished)?.id ?? 1),
  level: ({ level }) => startLevel(Number(level)),
  begin,
  fly: () => fly(),
  rotate: () => orbit(Math.PI / 4),
  'zoom-in': () => { if (game.canInspect) world?.zoom(1.13); },
  'zoom-out': () => { if (game.canInspect) world?.zoom(1 / 1.13); },
  'face-alt': ({ face }) => { if (game.cubes[0]) inspect(game.cubes[0].id, face); },
  xray: toggleXRay,
  choose: ({ index }) => {
    if (!game.choose(Number(index))) return;
    notice = '';
    audio.play('select');
    render();
    focusControl('choose', `[data-index="${index}"]`);
    announce(game.view === VIEW.TOP ? 'Đã chọn hình. Bé bấm Kiểm tra nhé!' : 'Đã chọn hình. Bây giờ bay lên kiểm chứng nhé!');
  },
  draw: () => {
    if (!game.beginDrawing()) return;
    notice = '';
    render();
    focusControl('paint');
    announce('Tô lại các mặt trên trên lưới nhé!', true);
  },
  color: ({ color }) => {
    brush = color || null;
    audio.play('click');
    render();
    focusControl('color', `[data-color="${color}"]`);
  },
  paint: (cell) => {
    if (!game.paint(Number(cell.row), Number(cell.col), brush)) return;
    focus = cellCoords(cell);
    notice = '';
    audio.play('place');
    render();
    focusControl('paint', attrCell(cell));
  },
  clear: () => {
    if (!game.clearDrawing()) return;
    focus = null;
    notice = '';
    render();
    focusControl('paint');
  },
  'inspect-cell': (cell) => {
    const { x, z } = cellCoords(cell);
    inspectCell(x, z);
    focusControl('inspect-cell', attrCell(cell));
  },
  'build-cell': (cell) => {
    const { x, z } = cellCoords(cell);
    edit(x, z);
    focusControl('build-cell', attrCell(cell));
  },
  'build-mode': ({ mode }) => {
    game.cancelMove();
    buildMode = mode;
    notice = '';
    render();
    focusControl('build-mode', `[data-mode="${mode}"]`);
  },
  undo: () => {
    if (!game.undo()) return;
    notice = 'Đã hoàn tác bước vừa rồi.';
    commitBuild();
  },
  save: () => {
    notice = save(buildKey, game.build) ? 'Đã lưu công trình trên thiết bị này.' : 'Thiết bị chưa lưu được công trình.';
    audio.play('click');
    render();
    announce(notice, true);
  },
  verify,
  retry: () => {
    if (!game.retry()) return;
    notice = '';
    save(progressKey, game.progress);
    render();
    focusControl(game.question.type === 'grid' ? 'paint' : 'choose');
  },
  next,
  reset,
  pause,
  listen: () => announce(notice || game.hint || game.prompt, true),
  hint: () => {
    if (!game.useHint()) return;
    notice = '';
    save(progressKey, game.progress);
    world?.react('point');
    audio.play('click');
    render();
    announce(game.hint, true);
  },
  sound: () => {
    sound = !sound;
    save(soundKey, sound);
    audio.setEnabled(sound);
    ui.renderHeader(sound, screen === 'game');
    if (sound) audio.play('click');
  },
};

function click(event) {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  audio.unlock();
  actions[button.dataset.action]?.(button.dataset);
}

function pointDown(event) {
  if (!game.canInspect || !world || event.button !== 0 || !event.isPrimary) return;
  gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, drag: false };
  canvas.setPointerCapture(event.pointerId);
}

function pointMove(event) {
  if (!gesture || gesture.id !== event.pointerId) return;
  const dx = event.clientX - gesture.x;
  const dy = event.clientY - gesture.y;
  if (!gesture.drag && Math.hypot(dx, dy) < 7) return;
  gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, drag: true };
  orbit(-dx * .011, dy * .008);
}

function pointUp(event) {
  if (!gesture || gesture.id !== event.pointerId) return;
  const { drag } = gesture;
  gesture = null;
  if (drag || !game.canInspect) return;
  const hit = world?.hit(event.clientX, event.clientY);
  if (!hit) return;
  audio.unlock();
  if (game.phase === PHASE.BUILDING_3D) edit(hit.x, hit.z);
  else if (hit.id) inspect(hit.id, hit.face);
}

function cancelPointer() { gesture = null; }
function changeView() { setView(nodes.views.value); }

function contextLost() {
  world?.dispose();
  world = null;
  nodes['webgl-note'].hidden = false;
  if (game.phase === PHASE.PAUSED && game.phaseBeforePause === PHASE.CAMERA_TRANSITION) reset();
  else if (flight !== null && game.finishFlight(flight)) {
    flight = null;
    elevation = 100;
  }
  render();
}

function teardown(event) {
  if (event.persisted) return;
  app.removeEventListener('click', click);
  canvas.removeEventListener('pointerdown', pointDown);
  canvas.removeEventListener('pointermove', pointMove);
  canvas.removeEventListener('pointerup', pointUp);
  canvas.removeEventListener('pointercancel', cancelPointer);
  canvas.removeEventListener('webglcontextlost', contextLost);
  nodes.views.removeEventListener('change', changeView);
  nodes.tilt.removeEventListener('input', changeElevation);
  document.removeEventListener('visibilitychange', pauseEffects);
  world?.dispose();
  audio.dispose();
}

app.addEventListener('click', click);
canvas.addEventListener('pointerdown', pointDown);
canvas.addEventListener('pointermove', pointMove);
canvas.addEventListener('pointerup', pointUp);
canvas.addEventListener('pointercancel', cancelPointer);
canvas.addEventListener('webglcontextlost', contextLost);
nodes.views.addEventListener('change', changeView);
nodes.tilt.addEventListener('input', changeElevation);
document.addEventListener('visibilitychange', pauseEffects);
window.addEventListener('pagehide', teardown);
render();
