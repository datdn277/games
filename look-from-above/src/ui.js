import { COLORS, COLOR_LABELS, LEVELS, PHASE, VIEW } from './game.js';
import { icon } from './icons.js';

const letters = ['A', 'B', 'C', 'D'];
const shapes = ['cube', 'grid', 'up', 'layers', 'eyes', 'cube'];
const buildModes = [
  ['add', 'Thêm', 'plus'], ['remove', 'Bớt', 'minus'],
  ['color', 'Đổi màu', 'cube'], ['move', 'Chuyển', 'move'],
];
const errorLabels = { position: 'Sai vị trí', color: 'Sai màu', missing: 'Thiếu ô', extra: 'Thừa ô' };
export const viewNames = {
  [VIEW.ISOMETRIC]: 'Nhìn nghiêng',
  [VIEW.FRONT]: 'Nhìn từ trước',
  [VIEW.LEFT]: 'Nhìn từ trái',
  [VIEW.RIGHT]: 'Nhìn từ phải',
  [VIEW.TOP]: 'Nhìn thẳng từ trên',
  [VIEW.FREE_ORBIT]: 'Xoay tự do',
};

const press = (value) => `aria-pressed="${Boolean(value)}"`;
const line = (text, hint = false) => text ? `<p class="task-line${hint ? ' hint-line' : ''}">${text}</p>` : '';
const buttons = (content) => `<div class="actions">${content}</div>`;
function button(action, label, style = 'secondary', glyph = '', extra = '') {
  return `<button type="button" class="button ${style}" data-action="${action}" ${extra}>${glyph ? icon(glyph) : ''}${label}</button>`;
}

function describe(matrix) {
  return matrix.map((row) => row.map((color) => COLOR_LABELS[color ?? 'empty']).join(', ')).join('. ');
}

function pointIn(bounds, point) {
  return point ? { row: point.z - bounds.minZ, col: point.x - bounds.minX } : null;
}

function projection(matrix, { action, errors = [], focus, source, counts, mini = false, front = true } = {}) {
  const grid = matrix.map((row, r) => row.map((color, c) => {
    const error = errors.find((item) => item.row === r && item.col === c)?.type;
    const highlighted = focus?.row === r && focus?.col === c;
    const marked = source?.row === r && source?.col === c;
    const count = counts?.[r]?.[c];
    const classes = `class="cell" data-color="${color ?? ''}"${error ? ` data-error="${error}"` : ''}${highlighted ? ' data-focus' : ''}${marked ? ' data-marked' : ''}`;
    const value = `${count > 1 ? count : ''}`;
    if (action) {
      return `<button type="button" ${classes} data-action="${action}" data-row="${r}" data-col="${c}"
        aria-label="Hàng ${r + 1}, cột ${c + 1}, ${COLOR_LABELS[color ?? 'empty']}${count ? `, ${count} tầng` : ''}">${value}</button>`;
    }
    return `<span ${classes}></span>`;
  }).join('')).join('');
  return `<div class="${mini ? 'mini-grid' : 'projection-wrap'}">
    <div class="projection" style="--cols:${matrix[0]?.length ?? 1}" ${action ? 'role="group" aria-label="Lưới ô vuông"' : `role="img" aria-label="${describe(matrix)}"`}>${grid}</div>
    ${front ? `<div class="grid-front" aria-label="Phía trước ở dưới lưới">${icon('up')} Phía trước</div>` : ''}
  </div>`;
}

function palette(current, erase) {
  const colors = [...Object.values(COLORS), ...(erase ? [null] : [])];
  return `<div class="palette" aria-label="Màu ô vuông">${colors.map((color) =>
    `<button class="button control" type="button" data-action="color" data-color="${color ?? ''}" ${press(color === current)}>
      <i class="swatch" data-color="${color ?? ''}" aria-hidden="true"></i>${COLOR_LABELS[color ?? 'empty']}</button>`).join('')}</div>`;
}

function choiceCards(question, selected, flying) {
  return `<h2>Dự đoán của bé</h2><div class="choices">${question.options.map((option, index) =>
    `<button class="choice" type="button" data-action="choose" data-index="${index}" ${press(index === selected)} ${flying ? 'disabled' : ''}
       aria-label="Hình ${letters[index]}: ${describe(option)}">
       <span class="choice-letter" aria-hidden="true">${letters[index]}</span>
       <span aria-hidden="true">${projection(option, { mini: true, front: false })}</span></button>`).join('')}</div>
    <div class="grid-front">${icon('up')} Phía trước</div>`;
}

function comparison(game) {
  const before = game.question.type === 'grid' ? game.drawing : game.question.options?.[game.predictionIndex];
  if (!before) return '';
  const reasons = [...new Set(game.errors.map(({ type }) => type))];
  return `<h2>Cùng so sánh</h2><div class="compare-grid"><article><h3>Hình của bé</h3>
    ${projection(before, { errors: game.errors, mini: true })}</article>
    <article><h3>Nhìn từ trên</h3>${projection(game.projection, { mini: true })}</article></div>
    ${reasons.length ? `<div class="legend">${reasons.map((type) => `<span>${errorLabels[type]}</span>`).join('')}</div>` : ''}`;
}

function counts(game) {
  const matrix = game.projection.map((row) => row.map(() => 0));
  for (const { x, z } of game.cubes) matrix[z - game.bounds.minZ][x - game.bounds.minX]++;
  return matrix;
}

export function createUI(nodes, game) {
  const markup = new WeakMap();

  function fill(node, value) {
    if (markup.get(node) === value) return;
    markup.set(node, value);
    node.innerHTML = value;
  }

  function activity(state) {
    const { question, bounds } = game;
    const phase = game.phase === PHASE.PAUSED ? game.phaseBeforePause : game.phase;
    if (phase === PHASE.TUTORIAL) return '';
    if ([PHASE.CORRECT_FEEDBACK, PHASE.INCORRECT_FEEDBACK, PHASE.LEVEL_COMPLETE].includes(phase) && question.type !== 'faces') return comparison(game);
    if (question.type === 'sandbox') {
      const moves = buildModes.map(([value, label, glyph]) =>
        button('build-mode', label, 'control', glyph, `data-mode="${value}" ${press(state.buildMode === value)}`)).join('');
      return `<h2>Bàn xếp khối</h2>${palette(state.color, false)}
        ${projection(game.projection, { action: 'build-cell', counts: counts(game), focus: pointIn(bounds, state.focus), source: pointIn(bounds, game.moveSource) })}
        <div class="tool-row">${moves}</div>
        <div class="tool-row">${button('undo', 'Hoàn tác', 'control', 'reset', game.canUndo === false ? 'disabled' : '')}
        ${button('save', 'Lưu công trình', 'control', 'save')}</div>`;
    }
    if (phase === PHASE.BUILDING_2D) {
      return `<h2>Tô hình chiếu</h2>${palette(state.color, true)}
        ${projection(game.drawing, { action: 'paint', errors: game.errors, focus: pointIn(bounds, state.focus) })}
        <div class="tool-row">${button('clear', 'Xóa hình', 'control', 'erase')}</div>`;
    }
    const choosing = [PHASE.PREDICTING, PHASE.CHOOSING_ANSWER].includes(phase);
    const flying = phase === PHASE.CAMERA_TRANSITION && !game.hasDiscovered;
    if (question.options && (choosing || flying)) return choiceCards(question, game.predictionIndex, flying);
    if (game.hasDiscovered) {
      return `<h2>Nhìn từ trên</h2>${projection(game.projection, {
        action: 'inspect-cell',
        focus: pointIn(bounds, state.focus),
        counts: game.xray ? counts(game) : undefined,
      })}`;
    }
    return '';
  }

  function instructions(state) {
    const { phase, question } = game;
    if (phase === PHASE.PAUSED) return line('Bobo nghỉ một chút nhé!') + button('pause', 'Tiếp tục', 'primary', 'play');
    if (phase === PHASE.TUTORIAL) return line(game.level.tutorial) + button('begin', 'Bắt đầu nào', 'primary', 'play');
    if (phase === PHASE.CAMERA_TRANSITION) return line('Cùng Bobo bay lên cao…');
    if (phase === PHASE.CORRECT_FEEDBACK || phase === PHASE.LEVEL_COMPLETE) {
      const end = phase === PHASE.LEVEL_COMPLETE;
      const next = end || game.roundIndex + 1 < game.roundCount ? 'Chơi tiếp' : 'Xem kết quả';
      return line(`<strong>Giỏi lắm!</strong> ${game.feedback || 'Bé đã hoàn thành thử thách cùng Bobo.'}`) +
        buttons(button('next', next, 'primary', 'next') + button('reset', 'Chơi lại', 'secondary', 'reset') + button('home', 'Về trang chủ'));
    }
    if (phase === PHASE.INCORRECT_FEEDBACK) {
      return line(game.feedback || 'Bé xem các ô viền cam rồi thử lại nhé!') +
        button('retry', question.type === 'grid' ? 'Sửa hình' : 'Dự đoán lại', 'primary', 'reset');
    }
    const hint = line(game.hint, true);
    const fly = game.canFly && game.view !== VIEW.TOP
      ? button('fly', game.hasDiscovered || question.type === 'sandbox' ? 'Nhìn từ trên' : 'Bay lên cùng Bobo', 'primary', 'up')
      : '';
    const xray = game.canXRay || game.xray
      ? button('xray', 'Nhìn xuyên khối', 'secondary', 'eyes', press(game.xray)) : '';
    const verify = game.canVerify ? button('verify', 'Kiểm tra', 'primary', 'check') : '';
    const result = state.notice ? line(state.notice) : '';
    if (question.type === 'sandbox') {
      const tips = {
        add: 'Chạm một ô để đặt khối. Chạm lại để xếp thêm một tầng.',
        remove: 'Chạm một cột để nhấc khối trên cùng.',
        color: 'Chọn màu, rồi chạm cột muốn tô khối trên cùng.',
        move: game.moveSource ? 'Chạm ô đích để chuyển khối.' : 'Chạm cột chứa khối bé muốn chuyển.',
      };
      return (result || line(tips[state.buildMode])) + hint + buttons(fly + xray);
    }
    if (question.type === 'faces' && !game.hasDiscovered) {
      const tips = ['Chạm vào mặt trên của khối.', 'Bây giờ, chạm vào một mặt đứng của khối.', 'Bé đã tìm thấy hai loại mặt. Bay lên để xem còn nhìn thấy mặt nào nhé!'];
      const alternatives = !state.hasWorld && game.faceStep < 2
        ? buttons(button('face-alt', 'Mặt trên', 'control', '', 'data-face="top"') +
          button('face-alt', 'Mặt đứng', 'control', '', 'data-face="front"')) : '';
      return (result || line(tips[Math.min(game.faceStep, 2)])) + hint + alternatives + fly;
    }
    if (question.type === 'grid' && phase === PHASE.BUILDING_2D) {
      return (result || line('Tô màu các ô mà bé đã quan sát, rồi bấm Kiểm tra.')) + hint + buttons(fly + verify);
    }
    if (question.type === 'grid' && game.hasDiscovered) {
      return (result || line('Mỗi mặt trên cao nhất ứng với một ô vuông.')) + hint +
        buttons(button('draw', 'Tự ghép hình', 'primary', 'grid') + fly);
    }
    if (question.type === 'xray' && game.hasDiscovered && !game.foundHidden) {
      return (result || line(game.xray ? 'Chạm vào một cột có nhiều tầng để tìm khối bị che.' : 'Bật Nhìn xuyên khối để tìm khối đang nằm bên dưới.')) +
        hint + buttons(fly + xray);
    }
    if (game.hasDiscovered) {
      return (result || line(question.type === 'faces' ? 'Từ trên cao chỉ còn thấy các mặt trên.' : 'So sánh dự đoán của bé với các mặt trên.')) +
        hint + buttons(fly + xray + verify);
    }
    return (result || line(question.options ? (game.predictionIndex === null ? 'Quan sát các mặt rồi chọn một hình.' : 'Đã có dự đoán. Bay lên để kiểm chứng nhé!') :
      'Bay lên cùng Bobo để quan sát các mặt trên.')) + hint + buttons(fly);
  }

  return {
    renderHeader(sound, inGame) {
      fill(nodes.sound, icon(sound ? 'volume' : 'mute'));
      nodes.sound.setAttribute('aria-pressed', String(sound));
      nodes.sound.setAttribute('aria-label', sound ? 'Tắt âm thanh' : 'Bật âm thanh');
      nodes.sound.title = nodes.sound.getAttribute('aria-label');
      const paused = game.phase === PHASE.PAUSED;
      nodes.pause.hidden = !inGame;
      fill(nodes.pause, icon(paused ? 'play' : 'pause'));
      nodes.pause.setAttribute('aria-label', paused ? 'Tiếp tục chơi' : 'Tạm dừng');
      nodes.pause.title = nodes.pause.getAttribute('aria-label');
      nodes.total.hidden = !inGame;
      nodes.total.textContent = `${game.progress.completed} câu đã xong`;
      fill(nodes.stars, `${icon('star')}${game.progress.stars}`);
      nodes.stars.setAttribute('aria-label', `${game.progress.stars} sao`);
    },
    renderLevels() {
      fill(nodes['level-grid'], LEVELS.map(({ id, title, description }) =>
        `<button class="level-option" type="button" data-action="level" data-level="${id}">
          <span class="level-num" aria-hidden="true">${id}</span>
          <span><strong>${title}</strong><small>${description}</small></span>
          ${icon(game.progress.levels[id].finished ? 'check' : 'next')}</button>`).join(''));
    },
    renderCamera(state) {
      const locked = [PHASE.TUTORIAL, PHASE.PAUSED, PHASE.CAMERA_TRANSITION].includes(game.phase);
      const canSelectTop = game.canFly || game.view === VIEW.TOP;
      const tools = nodes['camera-tools'];
      tools.hidden = game.phase === PHASE.TUTORIAL || !state.hasWorld;
      for (const control of tools.querySelectorAll('button,input,select')) control.disabled = locked;
      nodes.views.querySelector('[value="TOP"]').disabled = !canSelectTop;
      nodes.views.value = game.view;
      nodes.tilt.max = canSelectTop ? 100 : 59;
      nodes.tilt.value = state.elevation;
      nodes['view-tag'].textContent = game.phase === PHASE.CAMERA_TRANSITION ? 'Đang bay lên…' : viewNames[game.view];
      nodes['view-tag'].hidden = !state.hasWorld;
    },
    renderGame(state) {
      const ending = game.phase === PHASE.LEVEL_COMPLETE;
      nodes['question-level'].textContent = `Cấp ${game.level.id} · ${game.level.title}`;
      nodes.prompt.textContent = ending ? 'Hoàn thành cấp độ!' : game.prompt;
      fill(nodes['question-icon'], icon(ending ? 'star' : shapes[game.level.id - 1]));
      const progress = nodes['round-progress'];
      progress.hidden = ending || game.roundCount < 2;
      progress.setAttribute('aria-label', `Câu ${game.roundIndex + 1} trên ${game.roundCount}`);
      fill(progress, Array.from({ length: game.roundCount }, (_, index) => {
        const complete = index < game.roundIndex || (index === game.roundIndex && game.phase === PHASE.CORRECT_FEEDBACK);
        return `<span data-state="${complete ? 'done' : index === game.roundIndex ? 'current' : 'later'}" aria-hidden="true">${complete ? icon('check') : ''}</span>`;
      }).join(''));
      const panel = activity(state);
      nodes.activity.hidden = !panel;
      nodes.activity.inert = [PHASE.PAUSED, PHASE.CAMERA_TRANSITION].includes(game.phase);
      nodes.workspace.toggleAttribute('data-panel', Boolean(panel));
      fill(nodes['activity-content'], panel);
      fill(nodes.instructions, instructions(state));
      nodes.tools.hidden = [PHASE.TUTORIAL, PHASE.CORRECT_FEEDBACK, PHASE.INCORRECT_FEEDBACK, PHASE.PAUSED, PHASE.LEVEL_COMPLETE].includes(game.phase);
      nodes.tools.querySelector('[data-action="hint"]').disabled = game.phase === PHASE.CAMERA_TRANSITION;
      this.renderCamera(state);
    },
  };
}
