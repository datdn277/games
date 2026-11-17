import { ANIMALS, BALANCE, getBalance, LEVELS, PHASE, SUPPORT } from './game.js';
import { icon } from './icons.js';

export const sides = ['left', 'right'];
export const sideLabel = { left: 'trái', right: 'phải' };
const letters = ['A', 'B'];
const artColors = ['scale', 'equal', 'scale', 'exchange', 'lens', 'sparkle'];

const balanceLabels = {
  [BALANCE.EMPTY]: 'Cân trống',
  [BALANCE.BALANCED]: 'Thăng bằng',
  [BALANCE.LEFT_HEAVIER]: 'Nghiêng trái',
  [BALANCE.RIGHT_HEAVIER]: 'Nghiêng phải',
};

const name = (kind) => ANIMALS[kind].name.toLowerCase();
const pressed = (value) => `aria-pressed="${Boolean(value)}"`;
const block = (value) => value ? ' aria-disabled="true"' : '';
const glyphs = { left: 'back', right: 'next', equal: 'equal' };

function button(action, label, kind = 'soft', glyph = '') {
  return `<button type="button" class="button ${kind}" data-action="${action}">${glyph ? icon(glyph) : ''}${label}</button>`;
}
const line = (text, kind = '') => `<p class="task-line ${kind}">${text}</p>`;
const actions = (content) => `<div class="actions">${content}</div>`;

function quantities(kinds) {
  const counts = new Map();
  for (const kind of kinds) counts.set(kind, (counts.get(kind) ?? 0) + 1);
  return [...counts].map(([kind, count]) => `${count} ${name(kind)}`).join(' và ') || 'đĩa trống';
}

export function factText(fact) {
  const relation = fact.relation === BALANCE.BALANCED ? 'cân bằng với'
    : fact.relation === BALANCE.LEFT_HEAVIER ? 'nặng hơn' : 'nhẹ hơn';
  return `${quantities(fact.left)} ${relation} ${quantities(fact.right)}.`;
}

export function createUI(nodes, game) {
  const lastMarkup = new WeakMap();
  let portraits = {};

  function fill(element, markup) {
    if (lastMarkup.get(element) !== markup) {
      lastMarkup.set(element, markup);
      element.innerHTML = markup;
    }
  }

  function picture(kind, decorative = false) {
    return portraits[kind]
      ? `<img src="${portraits[kind]}" alt="${decorative ? '' : name(kind)}" draggable="false">`
      : decorative ? icon('sparkle') : `<small>${name(kind)}</small>`;
  }

  function factArt(fact) {
    const tilt = fact.relation === BALANCE.LEFT_HEAVIER ? 'left' : fact.relation === BALANCE.RIGHT_HEAVIER ? 'right' : '';
    return `<span class="fact-picture" role="img" aria-label="${factText(fact)}">
      <span class="fact-side" aria-hidden="true">${fact.left.map((kind) => picture(kind)).join('')}</span>
      <span class="fact-symbol" data-tilt="${tilt}">${icon(tilt ? 'scale' : 'equal')}</span>
      <span class="fact-side" aria-hidden="true">${fact.right.map((kind) => picture(kind)).join('')}</span></span>`;
  }

  function groupExercise(selectedGroup, hotGroup) {
    const pieces = game.groups.map((_, group) => {
      if (game.groups.includes(group)) return '';
      return `<button type="button" class="tray-item group-piece" data-action="group" data-group="${group}" ${pressed(group === selectedGroup)}
        aria-label="Chọn nhóm ${letters[group]} có hai chó">${picture('dog', true)}${picture('dog', true)}<span>Nhóm ${letters[group]}</span></button>`;
    }).join('');
    const slots = game.groups.map((filled, index) =>
      `<button type="button" class="group-slot" data-action="group-slot" data-slot="${index}"
        aria-label="${filled === null ? `Vị trí cáo ${index + 1}` : `Vị trí cáo ${index + 1}: nhóm ${letters[filled]}`}"
        ${filled !== null ? 'data-filled disabled' : ''} ${hotGroup === index ? 'data-hot' : ''}>
        ${filled === null ? picture('fox', true) + `Cáo ${index + 1}` : picture('dog', true).repeat(2) + `Nhóm ${letters[filled]}`}
      </button>`).join('');
    return `<div class="group-board">${pieces}<span class="group-divider" aria-hidden="true">→</span>${slots}</div>`;
  }

  function task({ factIndex, selected, selectedGroup, hotGroup, checking }) {
    const phase = game.phase;
    if (phase === PHASE.PAUSED) return line('Mimo nghỉ một chút nhé!') + button('pause', 'Tiếp tục', 'primary', 'play');
    if (phase === PHASE.TUTORIAL) return line(game.level.tutorial) + button('begin', 'Bắt đầu nào', 'primary', 'play');
    if (checking) return line('Cùng xem cân C nghiêng về đâu nhé…');
    if (phase === PHASE.QUESTION_COMPLETE || phase === PHASE.LEVEL_COMPLETE) {
      const ended = phase === PHASE.LEVEL_COMPLETE;
      const knowledge = ended && game.knowledge.length
        ? `<div class="knowledge">${game.knowledge.map(factArt).join('')}</div>` : '';
      return line(`<strong>Giỏi lắm!</strong> ${game.feedback}`) + knowledge + actions(
        button('next', ended || game.roundIndex + 1 < game.roundCount ? 'Chơi tiếp' : 'Xem kết quả', 'primary', 'next') +
        button('reset', 'Chơi lại', 'soft', 'reset') + button('home', 'Về trang chủ'),
      );
    }
    if (phase === PHASE.BALANCE_FEEDBACK) {
      return line(game.feedback) + button('next', game.canExperiment ? 'Xác nhận cân bằng' : 'Tiếp tục', 'primary', 'next');
    }
    const hint = game.hint ? line(game.hint, 'hint') : '';
    if (factIndex !== null) {
      const fact = game.facts[factIndex];
      return line(`<strong>Cân ${letters[factIndex]}</strong> · ${factText(fact)}`) + hint +
        button('challenge', 'Thử trên cân C', 'primary', 'next');
    }
    if (phase === PHASE.WEIGHING) return line('Nhìn xem chiếc cân chuyển động thế nào…');
    if (phase === PHASE.REASONING) {
      return line(game.feedback || 'Ghép mỗi nhóm hai chó vào vị trí của một bạn cáo.') + hint +
        groupExercise(selectedGroup, hotGroup);
    }
    if (phase === PHASE.PREDICTING) {
      return (game.feedback ? line(game.feedback) : '') + hint + actions(game.question.choices.map(({ id, label }) =>
        `<button type="button" class="button soft" data-action="answer" data-choice="${id}">${icon(glyphs[id])}${label}</button>`).join(''));
    }
    const guided = game.support === SUPPORT.GUIDED;
    const needsFox = game.question.type === 'substitute' && (game.step === 0 || game.step === 2);
    let guidance = needsFox ? 'Chạm bạn cáo hoặc kéo bạn ấy ra khỏi đĩa phải.'
      : guided ? 'Kéo một bạn thú lên cân. Bé cũng có thể chạm bạn thú rồi chạm đĩa.' : 'Thử với các bạn thú trong khay.';
    if (selected) guidance = selected.side
      ? 'Chạm đĩa bên kia để chuyển, hoặc chạm khay để bớt bạn thú.'
      : `Đã chọn ${name(selected.kind)}. Bé chạm đĩa cân để đặt bạn ấy lên nhé!`;
    const text = selected || needsFox ? guidance : game.feedback || guidance;
    return line(text) + hint;
  }

  function panButtons(view, balance, board) {
    const phase = game.phase;
    const liftable = view.factIndex === null && game.canExperiment;
    const prediction = view.factIndex === null && game.question.type === 'compare' &&
      [PHASE.TUTORIAL, PHASE.PREDICTING].includes(phase);
    const label = view.previewTilt ? 'Chờ dự đoán' : prediction ? 'Quan sát cân'
      : phase === PHASE.WEIGHING ? 'Đang cân…' : balanceLabels[balance.state];
    const state = prediction ? 'PREDICTION' : phase === PHASE.WEIGHING ? 'WEIGHING' : balance.state;
    const sideButton = (side) => {
      const canTap = view.factIndex !== null || (view.selected && game.canDrop(side) && view.selected.side !== side);
      const latest = liftable && [...board[side]].reverse().find(({ id }) => game.canLift(id));
      return `<div class="pan-group ${side}">
        <button class="pan-chip" type="button" data-action="plate" data-side="${side}" ${block(!canTap)}
          aria-label="Đĩa ${sideLabel[side]}, ${board[side].length} bạn thú">Đĩa ${sideLabel[side]} <strong>· ${board[side].length}</strong></button>
        ${latest ? `<button class="remove-chip" type="button" data-action="remove" data-id="${latest.id}" data-fox="${latest.kind === 'fox'}"
          aria-label="Bớt ${name(latest.kind)} ở đĩa ${sideLabel[side]}" title="Bớt ${name(latest.kind)}">${icon('minus')}</button>` : ''}
      </div>`;
    };
    fill(nodes['pan-controls'], sideButton('left') +
      `<span class="balance-status" data-state="${state}">${label}</span>` + sideButton('right'));
    for (const target of nodes['pan-targets'].children) {
      const { side } = target.dataset;
      const interactive = view.factIndex !== null || (view.selected && game.canDrop(side) && view.selected.side !== side);
      const guided = game.support === SUPPORT.GUIDED && view.selected && interactive && view.factIndex === null;
      target.toggleAttribute('data-interactive', Boolean(interactive));
      target.toggleAttribute('data-hint', Boolean(guided));
      target.tabIndex = interactive ? 0 : -1;
      target.setAttribute('aria-disabled', String(!interactive));
    }
  }

  function renderGame(view) {
    const { factIndex, selected, dropInTray, hasWebGL } = view;
    const phase = game.phase;
    const ended = phase === PHASE.LEVEL_COMPLETE;
    const fact = factIndex === null ? null : game.facts[factIndex];
    const board = fact ? Object.fromEntries(sides.map((side) => [side, fact[side].map((kind) => ({ kind }))])) : game.board;
    const balance = fact ? getBalance(fact.left, fact.right) : game.balance;
    fill(nodes['question-icon'], icon(ended ? 'star' : artColors[game.level.id - 1]));
    nodes['level-name'].textContent = `Cấp ${game.level.id} · ${game.level.title}`;
    nodes['question-title'].textContent = ended ? 'Hoàn thành cấp độ!' : game.prompt;
    const round = nodes['round-progress'];
    round.hidden = ended || game.roundCount === 1;
    round.setAttribute('aria-label', `Câu ${game.roundIndex + 1} trên ${game.roundCount}`);
    fill(round, Array.from({ length: game.roundCount }, (_, index) => {
      const done = index < game.roundIndex || (index === game.roundIndex && phase === PHASE.QUESTION_COMPLETE);
      return `<span data-state="${done ? 'done' : index === game.roundIndex ? 'current' : 'later'}" aria-hidden="true">${done ? icon('check') : ''}</span>`;
    }).join(''));
    const evidence = nodes.evidence;
    evidence.hidden = !game.facts.length || ![PHASE.OBSERVING, PHASE.PREDICTING, PHASE.DRAGGING, PHASE.WEIGHING].includes(phase);
    if (!evidence.hidden) {
      fill(evidence, game.facts.map((item, index) =>
        `<button type="button" class="fact-tab" data-action="fact" data-index="${index}" ${pressed(index === factIndex)}
          ${view.busy ? 'disabled' : ''}><span class="fact-tab-name">Cân ${letters[index]}</span>${factArt(item)}</button>`).join('') +
        `<button type="button" class="fact-tab" data-action="challenge" ${pressed(factIndex === null)}
          ${view.busy ? 'disabled' : ''}><span>Cân C · Thử nghiệm</span></button>`);
    }
    nodes['pan-targets'].hidden = false;
    nodes['fallback-board'].hidden = hasWebGL;
    if (!hasWebGL) fill(nodes['fallback-board'], sides.map((side) =>
      `<p>Đĩa ${sideLabel[side]}<br>${quantities(board[side].map(({kind}) => kind))}</p>`).join(''));
    panButtons(view, balance, board);
    fill(nodes.task, task(view));
    const tools = nodes.tools;
    tools.hidden = [PHASE.PAUSED, PHASE.TUTORIAL, PHASE.QUESTION_COMPLETE, PHASE.LEVEL_COMPLETE].includes(phase) ||
      (phase === PHASE.BALANCE_FEEDBACK && !game.canExperiment);
    tools.querySelector('[data-action="hint"]').disabled = view.busy;
    const tray = nodes.tray;
    const showTray = factIndex === null && (game.canExperiment || phase === PHASE.WEIGHING) &&
      (game.available.length > 0 || view.draggingAnimal);
    tray.hidden = !showTray;
    if (showTray) {
      const canReturn = Boolean(selected?.side) || view.draggingAnimal;
      const replacing = game.level.id === 4;
      const replacementsPlaced = replacing ? game.board.right.filter(({ kind, locked }) => kind === 'dog' && !locked).length : 0;
      const supply = replacing && game.available.length ? Array(Math.max(0, 2 - replacementsPlaced)).fill('dog') : game.available;
      fill(tray, supply.map((kind, index) =>
        `<button type="button" class="tray-item" data-action="animal" data-animal="${kind}" data-toy="${index}"
           ${pressed(selected?.kind === kind && !selected?.id && Number(selected.toy) === index)}
           ${replacing ? `aria-label="Chó thay thế ${index + 1}"` : ''}
           ${game.support === SUPPORT.GUIDED ? 'data-guide' : ''}${block(view.busy)}>
           ${picture(kind, true)} ${ANIMALS[kind].name}</button>`).join('') +
        (canReturn ? `<button type="button" class="tray-item tray-return" data-action="return"${dropInTray ? ' data-hot' : ''}>${icon('minus')} Về khay</button>` : ''));
    }
  }

  return {
    setPortraits(value) { portraits = value; },
    dragIcon(kind) { return kind === 'group' ? picture('dog', true).repeat(2) : picture(kind) + (portraits[kind] ? '' : ` <span>${name(kind)}</span>`); },
    renderHeader(sound, inGame) {
      const paused = game.phase === PHASE.PAUSED;
      fill(nodes.sound, icon(sound ? 'volume' : 'mute'));
      nodes.sound.setAttribute('aria-pressed', String(sound));
      nodes.sound.setAttribute('aria-label', sound ? 'Tắt âm thanh' : 'Bật âm thanh');
      nodes.sound.title = nodes.sound.getAttribute('aria-label');
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
        `<button type="button" class="level-option" data-action="level" data-id="${id}">
          <span class="level-num" aria-hidden="true">${id}</span>
          <span><strong>${title}</strong><small>${description}</small></span>
          ${icon(game.progress.levels[id].finished ? 'check' : 'next')}</button>`).join(''));
    },
    renderGame,
  };
}
