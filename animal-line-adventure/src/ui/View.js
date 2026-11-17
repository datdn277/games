import { ANIMAL_NAMES, LEVELS, QuestionType } from '../gameplay/Questions.js';
import { STATE } from '../gameplay/Game.js';
import { directionKey, ORDINALS, questionText, SIDE } from './copy.js';

const $ = (id) => document.getElementById(id);
const stars = (count) => '★'.repeat(count);
const animalName = (question, index) => ANIMAL_NAMES[question.animals[index]];
const DIRECTIONS = Object.keys(SIDE);
const ANIMAL_INPUT_STATES = new Set([STATE.CHOOSE_START, STATE.COUNTING, STATE.SELECT_ANSWER]);

function setText(id, text) {
  const node = $(id);
  if (node.textContent !== text) node.textContent = text;
}

function show(id, visible) {
  $(id).hidden = !visible;
}

function buttonText(id, text) {
  const button = $(id);
  if (button.firstChild?.nodeType !== Node.TEXT_NODE) button.prepend(document.createTextNode(''));
  button.firstChild.data = text + ' ';
}

function fillComparison(prefix, comparison) {
  show(prefix, Boolean(comparison));
  if (!comparison) return;
  setText(prefix + '-left', ANIMAL_NAMES[comparison.left]);
  setText(prefix + '-right', ANIMAL_NAMES[comparison.right]);
  const ordinal = $(prefix + '-ordinal');
  if (ordinal) ordinal.textContent = 'Bạn thứ ' + ORDINALS[comparison.ordinal];
}

export function promptFor(game) {
  const phase = game.activeState ?? game.state;
  const q = game.question;
  const side = SIDE[q.direction];
  const fullHelp = game.support === 1 || game.hinted;
  const otherSide = side === 'trái' ? 'phải' : 'trái';

  switch (phase) {
    case STATE.CHOOSE_DIRECTION:
      return q.type === QuestionType.CHOOSE_FLAG
        ? ['Tìm lá cờ', `Bé chạm nút có lá cờ ở bên ${side} nhé.`]
        : ['1 · Chọn đầu hàng', 'Chúng mình bắt đầu đếm từ phía nào nhỉ?'];
    case STATE.CHOOSE_START:
      if (q.type === QuestionType.CHOOSE_END_ANIMAL) {
        return ['Tìm bạn ngoài cùng', `Bé chạm vào bạn đứng ngoài cùng bên ${side} của hàng nhé.`];
      }
      return ['2 · Tìm bạn đầu tiên', fullHelp
        ? `Bắt đầu từ bạn ${animalName(q, game.startIndex)} ở đầu bên ${side} nhé!`
        : `Bạn nào là số một nếu bắt đầu từ bên ${side}?`];
    case STATE.COUNTING:
      return ['3 · Đếm từng bạn', `Đã đếm ${game.counted.length} bạn. Chạm bạn đứng liền kề theo hướng sang ${otherSide} nhé!`];
    case STATE.SELECT_ANSWER:
      return ['4 · Dừng lại và chọn', `Đã đến số ${q.targetOrdinal}! Chạm lại bạn đứng thứ ${ORDINALS[q.targetOrdinal]} để xác nhận nhé.`];
    case STATE.QUESTION_COMPLETE:
      if (game.comparison) {
        return ['Đổi đầu, đổi thứ tự', 'Các bạn vẫn đứng nguyên chỗ. Khi mình đếm từ đầu bên kia, thứ tự của các bạn thay đổi!'];
      }
      if (q.comparisonRound === 1) {
        return ['Sắp đổi chiều', `Bạn ${animalName(q, game.targetIndex)} đứng thứ ${ORDINALS[q.targetOrdinal]} từ trái. Giữ nguyên hàng và thử đếm từ bên phải nhé!`];
      }
      return ['Bé làm được rồi!', q.type === QuestionType.CHOOSE_FLAG
        ? `Đúng rồi, đây là bên ${side}!`
        : q.type === QuestionType.CHOOSE_END_ANIMAL
          ? `Bạn ${animalName(q, game.targetIndex)} đứng ngoài cùng bên ${side}!`
          : `Bạn ${animalName(q, game.targetIndex)} đứng thứ ${ORDINALS[q.targetOrdinal]} từ bên ${side}!`];
    default:
      return ['Mimo hướng dẫn', questionText(q)];
  }
}

export class View {
  constructor({ onAnimal }) {
    this.app = $('app');
    this.host = $('world');
    this.markers = $('animal-markers');
    this.targetNodes = [];
    this.row = null;
    this.onAnimal = onAnimal;
  }

  levels(progress) {
    const list = $('level-list');
    const items = LEVELS.map(({ id, title, description, questionCount }) => {
      const button = document.createElement('button');
      button.className = 'level-card';
      button.type = 'button';
      button.dataset.level = id;
      button.innerHTML = `<span class="level-number">0${id}</span><span class="level-copy"><strong>${title}</strong><small>${description}</small></span><span class="level-stars"></span><svg class="icon level-chevron" aria-hidden="true"><use href="#i-chevron"></use></svg>`;
      const earned = progress.levelStars[id] ?? 0;
      const count = button.querySelector('.level-stars');
      count.textContent = earned ? `★ ${earned}/${questionCount}` : '☆';
      count.setAttribute('aria-label', `${earned} trên ${questionCount} sao`);
      return button;
    });
    list.replaceChildren(...items);
  }

  sound(enabled) {
    for (const id of ['menu-sound', 'sound']) {
      const button = $(id);
      button.setAttribute('aria-pressed', String(enabled));
      button.setAttribute('aria-label', enabled ? 'Tắt âm thanh' : 'Bật âm thanh');
      button.querySelector('use').setAttribute('href', enabled ? '#i-sound' : '#i-muted');
    }
  }

  goals(game) {
    const q = game.question;
    const isOrdinal = q.type === QuestionType.FIND_ANIMAL_BY_ORDINAL;
    const level = LEVELS[game.level - 1];
    setText('level-label', `Chặng ${level.id} · ${level.title}`);
    setText('progress-label', `${game.questionIndex + 1} / ${game.questions.length}`);
    $('progress-fill').style.width = (game.questionIndex + 1) / game.questions.length * 100 + '%';
    setText('star-count', String(game.progress.stars));
    setText('question', questionText(q));
    setText('question-ordinal', isOrdinal ? `Số ${q.targetOrdinal} · Thứ ${ORDINALS[q.targetOrdinal]}` : '');
    setText('question-direction', `${directionKey(q.direction) === 'left' ? '←' : '→'} Bên ${SIDE[q.direction]}`);
    show('question-ordinal', isOrdinal);
    show('question-direction', true);
  }

  play(game, { feedback, notice, world }) {
    this.goals(game);
    const q = game.question;
    const state = game.activeState ?? game.state;
    const isComplete = state === STATE.QUESTION_COMPLETE;
    const isOrdinal = q.type === QuestionType.FIND_ANIMAL_BY_ORDINAL;
    const choosingDirection = state === STATE.CHOOSE_DIRECTION || feedback?.kind === 'direction';
    const canUseAnimals = ANIMAL_INPUT_STATES.has(game.state);
    const [step, instruction] = promptFor(game);
    setText('step-label', feedback?.label ?? step);
    setText('instruction', feedback?.text ?? (notice || instruction));
    show('direction-controls', choosingDirection);
    for (const direction of DIRECTIONS) {
      const button = $('choose-' + directionKey(direction));
      button.setAttribute('aria-disabled', String(game.state !== STATE.CHOOSE_DIRECTION));
      button.classList.toggle('is-suggested', choosingDirection && game.hinted && q.direction === direction);
    }
    $('hint').disabled = !canUseAnimals && game.state !== STATE.CHOOSE_DIRECTION;
    show('hint', !isComplete);
    show('continue', isComplete);
    buttonText('continue', game.questionIndex === game.questions.length - 1
      ? 'Khởi hành' : q.comparisonRound === 1 ? 'Đếm từ bên phải' : 'Tiếp theo');
    fillComparison('play-comparison', isComplete && game.comparison);

    const progress = $('count-progress');
    const count = game.counted.length;
    if (progress.dataset.count !== String(count)) {
      progress.dataset.count = count;
      progress.replaceChildren(...Array.from({ length: count }, (_, i) => {
        const item = document.createElement('span');
        item.textContent = i + 1;
        return item;
      }));
    }
    show('count-progress', isOrdinal && count > 0);
    this.updateAnimalMarkers(game, world, canUseAnimals);
    world.setEnabled(canUseAnimals);
  }

  updateAnimalMarkers(game, world, selectable) {
    const row = game.question.animals;
    const signature = row.join('/');
    const isOrdinal = game.question.type === QuestionType.FIND_ANIMAL_BY_ORDINAL;
    const answer = game.state === STATE.SELECT_ANSWER || game.state === STATE.QUESTION_COMPLETE;
    if (signature !== this.row) {
      this.row = signature;
      this.targetNodes = row.map((id, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'animal-target';
        button.dataset.animal = id;
        button.dataset.index = index;
        button.setAttribute('aria-label', `Chạm bạn ${ANIMAL_NAMES[id]}`);
        button.textContent = ANIMAL_NAMES[id];
        button.addEventListener('click', () => this.onAnimal(index));
        const number = document.createElement('span');
        number.className = 'ordinal-marker';
        number.setAttribute('aria-hidden', 'true');
        return { button, number };
      });
      this.markers.replaceChildren(...this.targetNodes.flatMap(({ button, number }) => [button, number]));
    }

    for (const [index, { button, number }] of this.targetNodes.entries()) {
      button.tabIndex = selectable ? 0 : -1;
      button.setAttribute('aria-disabled', String(!selectable));
      const ordinal = game.counted.indexOf(index) + 1;
      number.hidden = !isOrdinal || ordinal === 0;
      number.textContent = ordinal || '';
      number.classList.toggle('is-answer', answer && index === game.targetIndex);
    }

    this.placeAnimalMarkers(world);
  }

  markCue(highlight) {
    if (!this.markers.classList.contains('fallback')) return;
    for (const [index, { button }] of this.targetNodes.entries()) {
      button.classList.toggle('is-suggested', highlight === index);
    }
  }

  placeAnimalMarkers(world) {
    if (!world) return;
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    if (!width || !height) return;

    const count = this.targetNodes.length;
    const targetWidth = Math.min(112, width * .9 / (count || 1));

    for (const [index, { button, number }] of this.targetNodes.entries()) {
      const x = width * (.035 + .93 * (index + .5) / count);
      const top = world.available ? world.getAnimalAnchor(index) : { x, y: height * .46 };
      if (!top) continue;
      const body = world.getAnimalHitAnchor?.(index) ?? { x: top.x, y: top.y + (world.available ? 39 : 63) };
      for (const [node, position] of [[button, body], [number, top]]) {
        node.style.left = position.x + 'px';
        node.style.top = position.y + 'px';
      }
      button.style.width = targetWidth + 'px';
    }
  }

  clearMarkers() {
    this.row = null;
    this.targetNodes = [];
    this.markers.replaceChildren();
  }

  result(game, comparison) {
    const count = game.sessionStars ?? game.questions.length;
    setText('result-text', game.level === 5
      ? 'Các bạn vẫn đứng nguyên chỗ. Đổi đầu hàng, thứ tự đếm thay đổi!'
      : 'Bé đã đưa các bạn lên tàu. Chuyến tàu Cầu Vồng khởi hành nào!');
    const earned = $('result-stars');
    earned.textContent = stars(count);
    earned.setAttribute('aria-label', `Bé nhận được ${count} sao`);
    fillComparison('comparison', game.level === 5 && comparison ? comparison : null);
    buttonText('play-next', game.level === LEVELS.length ? 'Chọn chặng khác' : 'Chơi tiếp');
  }

  unavailable() {
    this.markers.classList.add('fallback');
    this.host.classList.add('world-fallback');
    setText('world-status', 'Máy này chưa mở được sân ga 3D. Bé vẫn có thể chạm vào tên các bạn thú để đếm.');
    show('world-status', true);
  }

  speechFallback(muted) {
    const instruction = $('instruction');
    instruction.parentElement.classList.remove('reading-fallback');
    // Restart the reminder even when pressed twice in a row.
    void instruction.offsetWidth;
    instruction.parentElement.classList.add('reading-fallback');
    $('retry-speech').title = muted
      ? 'Âm thanh đang tắt. Lời Mimo ở ngay bên trên.'
      : 'Máy này chưa có giọng đọc tiếng Việt. Bé xem lời Mimo ở bên trên nhé.';
  }
}
