import { Builder } from './builder.js';
import { BUILD_BOUNDS, LEVELS } from './levels.js';
import { COLORS, compareGrids, emptyGrid, getColumns, getTopView, isColor } from './projection.js';

export { COLORS, COLOR_LABELS, compareGrids, getAnswerOptions, getColumns, getTopView } from './projection.js';
export { BUILD_BOUNDS, LEVELS } from './levels.js';
export { BUILD_HEIGHT } from './builder.js';

export const PHASE = Object.freeze({
  BOOT: 'BOOT',
  MAIN_MENU: 'MAIN_MENU',
  LEVEL_SELECT: 'LEVEL_SELECT',
  TUTORIAL: 'TUTORIAL',
  OBSERVING: 'OBSERVING',
  PREDICTING: 'PREDICTING',
  CAMERA_TRANSITION: 'CAMERA_TRANSITION',
  TOP_VIEW_EXPLORATION: 'TOP_VIEW_EXPLORATION',
  X_RAY_EXPLORATION: 'X_RAY_EXPLORATION',
  BUILDING_2D: 'BUILDING_2D',
  CHOOSING_ANSWER: 'CHOOSING_ANSWER',
  VERIFYING: 'VERIFYING',
  CORRECT_FEEDBACK: 'CORRECT_FEEDBACK',
  INCORRECT_FEEDBACK: 'INCORRECT_FEEDBACK',
  LEVEL_COMPLETE: 'LEVEL_COMPLETE',
  BUILDING_3D: 'BUILDING_3D',
  PAUSED: 'PAUSED',
});

export const VIEW = Object.freeze({
  ISOMETRIC: 'ISOMETRIC',
  FRONT: 'FRONT',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
  TOP: 'TOP',
  FREE_ORBIT: 'FREE_ORBIT',
});

export const SUPPORT = Object.freeze({
  GUIDED: 'GUIDED',
  ASSISTED: 'ASSISTED',
  INDEPENDENT: 'INDEPENDENT',
});

const selections = [PHASE.PREDICTING, PHASE.CHOOSING_ANSWER];
const cubeFaces = ['top', 'front', 'back', 'left', 'right', 'side'];
const inactive = [PHASE.BOOT, PHASE.TUTORIAL, PHASE.MAIN_MENU, PHASE.LEVEL_SELECT, PHASE.PAUSED,
  PHASE.CAMERA_TRANSITION, PHASE.VERIFYING];
const gradingPhases = [PHASE.TOP_VIEW_EXPLORATION, PHASE.BUILDING_2D, PHASE.CHOOSING_ANSWER, PHASE.X_RAY_EXPLORATION];
const readCount = (value) => Number.isSafeInteger(value) && value >= 0 ? value : 0;

function normalize(saved) {
  const allQuestions = new Set(LEVELS.flatMap(({ rounds }) => rounds.map(({ id }) => id)));
  const solved = Array.isArray(saved?.solved)
    ? [...new Set(saved.solved.filter((id) => allQuestions.has(id) && id !== 'my-build'))] : [];
  return {
    version: 1,
    stars: readCount(saved?.stars),
    completed: readCount(saved?.completed),
    wrong: readCount(saved?.wrong),
    retries: readCount(saved?.retries),
    hints: readCount(saved?.hints),
    cleanStreak: readCount(saved?.cleanStreak),
    support: Object.values(SUPPORT).includes(saved?.support) ? saved.support : SUPPORT.GUIDED,
    solved,
    skills: Object.fromEntries(['faces', 'projection', 'occlusion'].map((skill) => [skill, readCount(saved?.skills?.[skill])])),
    levels: Object.fromEntries(LEVELS.map(({ id }) => [id, {
      completed: readCount(saved?.levels?.[id]?.completed),
      stars: readCount(saved?.levels?.[id]?.stars),
      finished: saved?.levels?.[id]?.finished === true,
    }])),
  };
}

export class Game {
  #flight = null;
  #serial = 0;
  #pausedPhase = null;
  #builder;
  #friction = 0;
  #hintCount = 0;
  #projection = [];

  constructor(savedProgress, savedBuild) {
    this.progress = normalize(savedProgress);
    this.#builder = new Builder(savedBuild);
    this.phase = PHASE.BOOT;
    this.openMenu();
  }

  get question() {
    return this.level?.rounds[this.roundIndex] ?? null;
  }

  get roundCount() {
    return this.level?.rounds.length ?? 0;
  }

  get bounds() {
    return this.question?.bounds ?? null;
  }

  get build() {
    return this.#builder.cubes;
  }

  get cubes() {
    return this.question?.type === 'sandbox' ? this.build : this.question?.cubes ?? [];
  }

  get projection() {
    return this.#projection;
  }

  get moveSource() {
    return this.#builder.moveSource;
  }

  get canUndo() {
    return this.phase === PHASE.BUILDING_3D && this.#builder.canUndo;
  }

  get support() {
    return this.level?.id <= 2 ? SUPPORT.GUIDED : this.progress.support;
  }

  get phaseBeforePause() {
    return this.#pausedPhase;
  }

  get prediction() {
    return this.question?.options?.[this.predictionIndex] ?? null;
  }

  get prompt() {
    if (this.question?.type === 'faces') {
      return ['Bé hãy chạm vào mặt trên của một khối.', 'Thử chạm vào một mặt đứng của khối nào!',
        'Bay cùng Bobo để xem mặt nào còn nhìn thấy nhé!'][this.faceStep];
    }
    return this.question?.prompt ?? '';
  }

  get canInspect() {
    return Boolean(this.question) && !inactive.includes(this.phase);
  }

  get canFly() {
    if (!this.canInspect || this.view === VIEW.TOP) return false;
    if (this.question.type === 'faces') return this.faceStep === 2;
    if (this.question.options) {
      const assistedPreview = this.question.id === 'terrace' && this.support !== SUPPORT.INDEPENDENT && this.#hintCount > 0;
      return this.predictionIndex !== null || assistedPreview;
    }
    return true;
  }

  get canXRay() {
    return this.canInspect && (this.question.type === 'sandbox' ||
      (this.question.type === 'xray' && this.hasDiscovered));
  }

  get canVerify() {
    if (!gradingPhases.includes(this.phase) || !this.hasDiscovered) return false;
    if (this.question.type === 'faces') return this.faceStep === 2;
    if (this.question.type === 'grid') return this.phase === PHASE.BUILDING_2D;
    if (this.question.type === 'xray' && !this.foundHidden) return false;
    return this.predictionIndex !== null;
  }

  #resetRound() {
    this.#flight = null;
    this.#pausedPhase = null;
    this.#friction = 0;
    this.#hintCount = 0;
    this.#builder.cancelMove();
    this.view = VIEW.ISOMETRIC;
    this.xray = false;
    this.selectedCube = null;
    this.inspection = null;
    this.faceStep = 0;
    this.foundHidden = false;
    this.hasDiscovered = false;
    this.predictionIndex = null;
    this.feedback = '';
    this.hint = '';
    this.errors = [];
    this.drawing = emptyGrid(this.bounds);
    this.#refreshProjection();
  }

  #refreshProjection() {
    this.#projection = getTopView(this.cubes, this.bounds);
  }

  #open(phase) {
    this.level = null;
    this.roundIndex = 0;
    this.#resetRound();
    this.phase = phase;
  }

  openMenu() {
    this.#open(PHASE.MAIN_MENU);
  }

  openLevels() {
    this.#open(PHASE.LEVEL_SELECT);
  }

  startLevel(id) {
    const level = LEVELS.find((candidate) => candidate.id === id);
    if (!level) return false;
    this.level = level;
    this.roundIndex = 0;
    this.#resetRound();
    this.phase = PHASE.TUTORIAL;
    return true;
  }

  #activate() {
    if (this.question.type === 'sandbox') this.phase = PHASE.BUILDING_3D;
    else if (this.question.options) this.phase = PHASE.PREDICTING;
    else this.phase = PHASE.OBSERVING;
  }

  begin() {
    if (this.phase !== PHASE.TUTORIAL) return false;
    this.#activate();
    return true;
  }

  reset() {
    if (!this.question) return false;
    const tutorial = this.phase === PHASE.TUTORIAL || this.#pausedPhase === PHASE.TUTORIAL;
    this.#resetRound();
    if (tutorial) this.phase = PHASE.TUTORIAL;
    else this.#activate();
    return true;
  }

  choose(index) {
    const selectable = selections.includes(this.phase) || this.phase === PHASE.INCORRECT_FEEDBACK;
    if (!selectable || !this.question.options || !Number.isInteger(index) || !this.question.options[index]) return false;
    this.predictionIndex = index;
    this.phase = PHASE.CHOOSING_ANSWER;
    this.feedback = '';
    this.errors = [];
    return true;
  }

  startFlight() {
    if (!this.canFly) return null;
    const token = ++this.#serial;
    this.#flight = { token, from: this.phase };
    this.phase = PHASE.CAMERA_TRANSITION;
    return token;
  }

  finishFlight(token) {
    if (this.phase !== PHASE.CAMERA_TRANSITION || token !== this.#flight.token) return false;
    const previous = this.#flight.from;
    this.#flight = null;
    this.view = VIEW.TOP;
    this.hasDiscovered = true;
    this.hint = '';
    if (previous === PHASE.OBSERVING ||
      (previous === PHASE.CHOOSING_ANSWER && this.question.options)) {
      this.phase = PHASE.TOP_VIEW_EXPLORATION;
      this.feedback = this.question.type === 'xray'
        ? 'Con thấy các mặt trên rồi! Hãy bật Nhìn xuyên khối và chạm vào một chồng khối.'
        : 'Từ trên cao, mỗi cột khối chỉ hiện một mặt trên.';
    } else {
      this.phase = previous;
    }
    return true;
  }

  setView(view) {
    if (!this.canInspect || !Object.values(VIEW).includes(view) || view === VIEW.TOP || this.view === view) return false;
    this.view = view;
    return true;
  }

  showIncline() {
    return this.setView(VIEW.ISOMETRIC);
  }

  toggleXRay() {
    if (!this.canXRay) return false;
    this.xray = !this.xray;
    if (this.question.type === 'xray') {
      const exploration = [PHASE.TOP_VIEW_EXPLORATION, PHASE.X_RAY_EXPLORATION].includes(this.phase);
      if (exploration) this.phase = this.xray ? PHASE.X_RAY_EXPLORATION : PHASE.TOP_VIEW_EXPLORATION;
      if (!this.foundHidden) this.feedback = this.xray
        ? 'Bé chạm vào một chồng khối để tìm tầng bị che nhé.'
        : 'Khi tắt nhìn xuyên, chỉ thấy khối trên cùng của mỗi cột.';
    }
    return true;
  }

  #recordFriction() {
    this.#friction += 1;
    this.progress.cleanStreak = 0;
    if (this.#friction >= 2) this.progress.support = SUPPORT.GUIDED;
    else if (this.progress.support === SUPPORT.INDEPENDENT) this.progress.support = SUPPORT.ASSISTED;
  }

  inspect(id, face) {
    if (!this.canInspect || !cubeFaces.includes(face)) return false;
    const cube = this.cubes.find((candidate) => candidate.id === id);
    if (!cube) return false;
    const { visible, hidden } = getColumns(this.cubes).find(({ x, z }) => x === cube.x && z === cube.z);
    const column = [visible, ...hidden];
    this.selectedCube = cube;
    this.inspection = { cube, face, column, hidden };
    if (this.question.type === 'faces' && this.faceStep < 2) {
      const matches = this.faceStep === 0 ? face === 'top' : face !== 'top';
      if (matches) {
        this.faceStep += 1;
        this.hint = '';
        this.feedback = this.faceStep === 1 ? 'Đúng rồi, đó là mặt trên!' : 'Đúng rồi, đó là mặt đứng!';
      } else {
        this.progress.wrong += 1;
        this.#recordFriction();
        this.feedback = this.faceStep === 0 ? 'Hãy thử chạm mặt nằm ngang ở trên cùng.' : 'Hãy thử chạm mặt dựng đứng ở phía trước hoặc bên cạnh.';
      }
    } else if (this.xray) {
      if (hidden.length > 0) this.foundHidden = true;
      this.feedback = hidden.length > 0
        ? `Chồng này có ${column.length} tầng. Khối trên cùng che ${hidden.length} khối bên dưới khi nhìn từ trên.`
        : 'Ô này chỉ có một tầng. Hãy thử tìm chồng cao hơn.';
    } else if (this.phase !== PHASE.CORRECT_FEEDBACK && this.phase !== PHASE.LEVEL_COMPLETE) {
      this.feedback = face === 'top' ? 'Bé vừa chạm mặt trên của khối.' : 'Bé vừa chạm một mặt dựng đứng.';
    }
    return true;
  }

  beginDrawing() {
    if (this.question?.type !== 'grid' || this.phase !== PHASE.TOP_VIEW_EXPLORATION) return false;
    this.phase = PHASE.BUILDING_2D;
    this.feedback = '';
    return true;
  }

  paint(row, col, color) {
    if (this.phase !== PHASE.BUILDING_2D || !Number.isInteger(row) || !Number.isInteger(col) ||
      this.drawing[row]?.[col] === undefined || (color !== null && !isColor(color))) return false;
    if (this.drawing[row][col] === color) return false;
    this.drawing = this.drawing.map((line, index) => index === row
      ? line.map((item, index) => index === col ? color : item) : line);
    this.errors = this.errors.filter((item) => item.row !== row || item.col !== col);
    return true;
  }

  clearDrawing() {
    if (this.phase !== PHASE.BUILDING_2D) return false;
    this.drawing = emptyGrid(this.bounds);
    this.errors = [];
    this.feedback = '';
    return true;
  }

  #reward() {
    const { id: questionId, type } = this.question;
    if (this.progress.solved.includes(questionId)) return;
    this.progress.solved.push(questionId);
    this.progress.stars += 1;
    this.progress.completed += 1;
    const skill = type === 'faces' ? 'faces' : type === 'xray' ? 'occlusion' : 'projection';
    this.progress.skills[skill] += 1;
    const progress = this.progress.levels[this.level.id];
    progress.completed += 1;
    progress.stars += 1;
    if (this.level.rounds.every(({ id }) => this.progress.solved.includes(id))) progress.finished = true;

    if (this.#friction === 0) this.progress.cleanStreak += 1;
    const target = this.progress.support === SUPPORT.GUIDED ? 2 : 3;
    if (this.progress.support !== SUPPORT.INDEPENDENT && this.progress.cleanStreak >= target) {
      this.progress.support = this.progress.support === SUPPORT.GUIDED ? SUPPORT.ASSISTED : SUPPORT.INDEPENDENT;
      this.progress.cleanStreak = 0;
    }
  }

  verify() {
    if (!this.canVerify) return null;
    this.phase = PHASE.VERIFYING;
    const type = this.question.type;
    const actual = type === 'faces' ? this.projection : type === 'grid' ? this.drawing : this.prediction;
    const result = compareGrids(this.projection, actual);
    this.errors = result.errors;
    this.hint = '';
    this.xray = false;
    if (!result.correct) {
      this.progress.wrong += 1;
      this.#recordFriction();
      this.phase = PHASE.INCORRECT_FEEDBACK;
      const messages = {
        color: 'Có ô cần đổi màu.',
        missing: 'Bé còn thiếu một vài ô màu.',
        extra: 'Có ô cần để trống.',
        position: 'Có ô màu đang nằm lệch chỗ.',
      };
      const details = [...new Set(this.errors.map(({ type }) => messages[type]))];
      this.feedback = `${details.join(' ')} Bé quan sát và thử lại nhé!`;
      return false;
    }
    this.phase = PHASE.CORRECT_FEEDBACK;
    this.feedback = {
      faces: 'Khi nhìn thẳng xuống, mình chỉ thấy các mặt trên.',
      grid: 'Mỗi mặt trên bé nhìn thấy ứng với đúng một ô trên lưới.',
      choice: 'Bé đã giữ đúng hướng và chọn được hình của các mặt trên!',
      xray: 'Mỗi chồng chỉ hiện màu của khối cao nhất. Những khối khác vẫn ở bên dưới.',
    }[type];
    this.#reward();
    return true;
  }

  retry() {
    if (this.phase !== PHASE.INCORRECT_FEEDBACK) return false;
    this.progress.retries += 1;
    this.phase = this.question.type === 'grid' ? PHASE.BUILDING_2D : PHASE.CHOOSING_ANSWER;
    return true;
  }

  next() {
    if (this.phase === PHASE.LEVEL_COMPLETE && this.level.id < LEVELS.length) return this.startLevel(this.level.id + 1);
    if (this.phase !== PHASE.CORRECT_FEEDBACK) return false;
    if (this.roundIndex + 1 === this.roundCount) {
      this.phase = PHASE.LEVEL_COMPLETE;
    } else {
      this.roundIndex += 1;
      this.#resetRound();
      this.#activate();
    }
    return true;
  }

  useHint() {
    if (!this.canInspect || [PHASE.CORRECT_FEEDBACK, PHASE.LEVEL_COMPLETE].includes(this.phase)) return false;
    const first = this.#hintCount === 0;
    this.#hintCount += 1;
    this.progress.hints += 1;
    this.#recordFriction();
    if (this.question.type === 'faces') this.hint = [
      'Mặt trên giống mái nhà của khối vuông. Bé nhìn phía cao nhất nhé!',
      'Mặt đứng giống bức tường. Bé chạm phía trước hoặc bên cạnh nhé!',
      'Bé bấm Bay lên cùng Bobo để nhìn thẳng xuống.',
    ][this.faceStep];
    else if (this.question.type === 'sandbox') this.hint = first
      ? 'Chạm ô trống để đặt khối. Chạm tiếp để xếp thêm một tầng.'
      : 'Thử hai màu ở cùng một cột rồi xem màu nào thấy được từ trên.';
    else if (this.question.type === 'grid') this.hint = this.hasDiscovered
      ? 'Mỗi ô tô màu ứng với một mặt trên. Hàng gần mũi tên là phía trước.'
      : 'Bé bay lên để nhìn rõ vị trí của từng mặt trên.';
    else if (this.question.type === 'xray' && this.hasDiscovered) {
      this.hint = this.foundHidden ? 'Khi kiểm tra hình, lấy màu của khối cao nhất trong mỗi cột.'
        : 'Bật Nhìn xuyên khối rồi chạm vào một chồng có từ hai tầng trở lên.';
    } else {
      this.hint = first ? 'Tìm phía trước của bàn rồi nhìn màu của các mặt trên.'
        : 'Mỗi vị trí chỉ lấy khối nằm trên cùng. Để trống chỗ không có khối.';
    }
    return true;
  }

  edit(mode, x, z, color = COLORS.WHITE) {
    if (this.phase !== PHASE.BUILDING_3D || !this.#builder.edit(mode, x, z, color)) return false;
    this.#refreshBuild();
    return true;
  }

  cancelMove() {
    this.#builder.cancelMove();
  }

  #refreshBuild() {
    this.selectedCube = null;
    this.inspection = null;
    this.feedback = '';
    this.#refreshProjection();
  }

  undo() {
    if (this.phase !== PHASE.BUILDING_3D || !this.#builder.undo()) return false;
    this.#refreshBuild();
    return true;
  }

  clearBuild() {
    if (this.phase !== PHASE.BUILDING_3D || !this.#builder.clear()) return false;
    this.#refreshBuild();
    return true;
  }

  pause() {
    if (!this.question || this.phase === PHASE.PAUSED) return false;
    this.#pausedPhase = this.phase;
    this.phase = PHASE.PAUSED;
    return true;
  }

  resume() {
    if (this.phase !== PHASE.PAUSED) return false;
    this.phase = this.#pausedPhase;
    this.#pausedPhase = null;
    return true;
  }
}
