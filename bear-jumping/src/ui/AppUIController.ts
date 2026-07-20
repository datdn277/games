import type {
  Direction,
  GridCell,
  LevelGenerationOptions,
  LevelLayout,
  RunOutcome,
} from '../game/types';
import { DIRECTIONS } from '../game/types';

export type Tool = Direction | 'erase' | null;

interface UIHandlers {
  onToolSelected: (tool: Tool) => void;
  onRun: () => void;
  onReset: () => void;
  onClear: () => void;
  onGenerateLevel: (options: LevelGenerationOptions) => void;
  onSpeedChanged: (durationMs: number) => void;
  onReplay: () => void;
  onTryAgain: () => void;
}

const LABELS: Record<Direction | 'erase', string> = {
  up: 'Lên',
  down: 'Xuống',
  left: 'Trái',
  right: 'Phải',
  erase: 'Xóa ô',
};

export class AppUIController {
  private readonly toolButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-tool]')];
  private readonly runButton = this.element<HTMLButtonElement>('run-button');
  private readonly resetButton = this.element<HTMLButtonElement>('reset-button');
  private readonly clearButton = this.element<HTMLButtonElement>('clear-button');
  private readonly speedSelect = this.element<HTMLSelectElement>('speed-select');
  private readonly levelLayoutSelect = this.element<HTMLSelectElement>('level-layout-select');
  private readonly obstacleCountSelect = this.element<HTMLSelectElement>('obstacle-count-select');
  private readonly newLevelButton = this.element<HTMLButtonElement>('new-level-button');
  private readonly levelSummary = this.element<HTMLElement>('level-summary');
  private readonly selectedLabel = this.element<HTMLElement>('selected-tool-label');
  private readonly preview = this.element<HTMLElement>('command-preview');
  private readonly previewSummary = this.element<HTMLElement>('preview-summary');
  private readonly statusPanel = this.element<HTMLElement>('status-panel');
  private readonly statusTitle = this.element<HTMLElement>('status-title');
  private readonly statusMessage = this.element<HTMLElement>('status-message');
  private readonly successModal = this.element<HTMLElement>('success-modal');
  private readonly replayButton = this.element<HTMLButtonElement>('replay-button');
  private readonly tryAgainButton = this.element<HTMLButtonElement>('try-again-button');
  private readonly confettiLayer = this.element<HTMLElement>('confetti-layer');
  private readonly questionBubble = this.element<HTMLElement>('question-bubble');
  private handlers: UIHandlers | null = null;
  private previewItems: HTMLElement[] = [];

  constructor() {
    this.toolButtons.forEach((button) => {
      button.addEventListener('click', this.handleToolClick);
      button.addEventListener('dragstart', this.handleDragStart);
    });
    this.runButton.addEventListener('click', () => this.handlers?.onRun());
    this.resetButton.addEventListener('click', () => this.handlers?.onReset());
    this.clearButton.addEventListener('click', () => this.handlers?.onClear());
    this.speedSelect.addEventListener('change', () => {
      this.handlers?.onSpeedChanged(Number(this.speedSelect.value));
    });
    this.newLevelButton.addEventListener('click', this.handleNewLevel);
    this.replayButton.addEventListener('click', () => this.handlers?.onReplay());
    this.tryAgainButton.addEventListener('click', () => this.handlers?.onTryAgain());
    window.addEventListener('keydown', this.handleKeyDown);
  }

  bind(handlers: UIHandlers): void {
    this.handlers = handlers;
  }

  setSelectedTool(tool: Tool): void {
    this.toolButtons.forEach((button) => {
      const selected = button.dataset.tool === tool;
      button.setAttribute('aria-pressed', String(selected));
    });
    this.selectedLabel.textContent = tool ? LABELS[tool] : 'Chưa chọn';
  }

  setRunning(running: boolean): void {
    this.toolButtons.forEach((button) => {
      button.disabled = running;
      button.draggable = !running && button.classList.contains('direction-button');
    });
    this.runButton.disabled = running;
    this.speedSelect.disabled = running;
    this.levelLayoutSelect.disabled = running;
    this.obstacleCountSelect.disabled = running;
    this.runButton.classList.toggle('is-running', running);
    this.runButton.lastChild!.textContent = running ? ' Gấu đang đi…' : ' Cho Gấu đi';
    this.resetButton.textContent = running ? 'Dừng và về đầu' : 'Đưa Gấu về đầu';
  }

  setLevelInfo(layout: LevelLayout, obstacleCount: number, goal: GridCell): void {
    const layoutLabel: Record<LevelLayout, string> = {
      classic: 'Bố trí cổ điển',
      'random-obstacles': 'Hồ ngẫu nhiên',
      'random-goal': 'Đích ngẫu nhiên',
      'random-all': 'Tất cả ngẫu nhiên',
    };
    this.levelLayoutSelect.value = layout;
    this.obstacleCountSelect.value = String(obstacleCount);
    this.levelSummary.textContent = `${layoutLabel[layout]} · ${obstacleCount} hồ · Đích H${goal.row + 1}, C${goal.col + 1}`;
  }

  setStatus(title: string, message: string, tone: 'info' | 'warning' | 'success'): void {
    this.statusTitle.textContent = title;
    this.statusMessage.textContent = message;
    this.statusPanel.dataset.tone = tone;
  }

  renderPreview(outcome: RunOutcome): void {
    this.preview.replaceChildren();
    this.previewItems = [];
    outcome.steps.forEach((step, index) => {
      const item = document.createElement('span');
      item.className = 'preview-command';
      item.dataset.stepIndex = String(index);
      item.setAttribute('aria-label', `Bước ${index + 1}: ${LABELS[step.direction]}`);
      const number = document.createElement('small');
      number.textContent = String(index + 1);
      const arrow = document.createElement('i');
      arrow.className = `css-arrow arrow-${step.direction}`;
      arrow.setAttribute('aria-hidden', 'true');
      item.append(number, arrow);
      this.preview.append(item);
      this.previewItems.push(item);
    });

    const terminal = document.createElement('span');
    terminal.className = `preview-terminal ${outcome.kind === 'success' ? 'goal' : 'stop'}`;
    terminal.textContent = outcome.kind === 'success' ? 'ĐÍCH' : 'STOP';
    this.preview.append(terminal);

    if (outcome.kind === 'success') {
      this.previewSummary.textContent = `${outcome.steps.length} câu lệnh — đường đi đã hoàn chỉnh!`;
    } else if (outcome.steps.length === 0 && outcome.kind === 'missing-command') {
      this.previewSummary.textContent = 'Đặt mũi tên tại ô có Gấu để bắt đầu chuỗi.';
    } else if (outcome.steps.length === 0) {
      this.previewSummary.textContent = 'Chuỗi dừng ngay ở lệnh đầu tiên — hãy đổi hướng.';
    } else {
      this.previewSummary.textContent = `${outcome.steps.length} bước đã đọc — chuỗi cần được sửa hoặc nối tiếp.`;
    }
  }

  highlightPreviewStep(index: number): void {
    this.previewItems.forEach((item, itemIndex) => {
      item.classList.toggle('active', itemIndex === index);
    });
  }

  showQuestion(show: boolean): void {
    this.questionBubble.hidden = !show;
    this.questionBubble.setAttribute('aria-hidden', String(!show));
  }

  showSuccess(): void {
    this.successModal.hidden = false;
    this.replayButton.focus();
    this.launchConfetti();
  }

  hideSuccess(): void {
    this.successModal.hidden = true;
  }

  showWebGLFallback(): void {
    const fallback = this.element<HTMLElement>('webgl-fallback');
    fallback.hidden = false;
    this.runButton.disabled = true;
    this.toolButtons.forEach((button) => (button.disabled = true));
  }

  updateDebugStats(text: string): void {
    const stats = this.element<HTMLElement>('debug-stats');
    stats.hidden = false;
    stats.textContent = text;
  }

  private launchConfetti(): void {
    this.confettiLayer.replaceChildren();
    const colors = ['#ffcc4d', '#ff7f62', '#58b879', '#6da9ff', '#9b7bea'];
    for (let index = 0; index < 42; index += 1) {
      const piece = document.createElement('i');
      piece.style.setProperty('--x', `${(index * 37) % 100}vw`);
      piece.style.setProperty('--delay', `${(index % 9) * 0.035}s`);
      piece.style.setProperty('--spin', `${180 + (index % 5) * 90}deg`);
      piece.style.background = colors[index % colors.length] ?? '#ffcc4d';
      this.confettiLayer.append(piece);
    }
    window.setTimeout(() => this.confettiLayer.replaceChildren(), 1800);
  }

  private readonly handleToolClick = (event: Event): void => {
    const button = event.currentTarget as HTMLButtonElement;
    this.handlers?.onToolSelected(button.dataset.tool as Exclude<Tool, null>);
  };

  private readonly handleDragStart = (event: DragEvent): void => {
    const button = event.currentTarget as HTMLButtonElement;
    const tool = button.dataset.tool;
    if (!event.dataTransfer || !DIRECTIONS.includes(tool as Direction)) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData('application/x-bear-direction', tool ?? '');
    event.dataTransfer.effectAllowed = 'copy';
    this.handlers?.onToolSelected(tool as Direction);
  };

  private readonly handleNewLevel = (): void => {
    this.handlers?.onGenerateLevel({
      layout: this.levelLayoutSelect.value as LevelLayout,
      obstacleCount: Number(this.obstacleCountSelect.value),
    });
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.target instanceof HTMLSelectElement || event.target instanceof HTMLInputElement) return;
    const keyMap: Partial<Record<string, Tool>> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      Escape: null,
    };
    if (!(event.key in keyMap)) return;
    event.preventDefault();
    this.handlers?.onToolSelected(keyMap[event.key] ?? null);
  };

  private element<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Missing UI element #${id}`);
    return element as T;
  }

  dispose(): void {
    this.toolButtons.forEach((button) => {
      button.removeEventListener('click', this.handleToolClick);
      button.removeEventListener('dragstart', this.handleDragStart);
    });
    this.newLevelButton.removeEventListener('click', this.handleNewLevel);
    window.removeEventListener('keydown', this.handleKeyDown);
  }
}
