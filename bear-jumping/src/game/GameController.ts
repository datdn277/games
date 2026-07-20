import type { Direction, GridCell, LevelGenerationOptions, RunOutcome } from './types';
import { GameSession } from './GameSession';
import { GARDEN_LEVEL } from './level';
import { LevelGenerator } from './LevelGenerator';
import { PathSimulator } from './PathSimulator';
import { ThreeGameApp } from '../render/ThreeGameApp';
import { AppUIController, type Tool } from '../ui/AppUIController';

const OUTCOME_MESSAGES: Record<
  Exclude<RunOutcome['kind'], 'success' | 'missing-command'>,
  { title: string; message: string }
> = {
  obstacle: {
    title: 'Ôi, phía trước là hồ!',
    message: 'Phía trước là hồ nước! Hãy đổi mũi tên để Gấu đi vòng qua hồ.',
  },
  boundary: {
    title: 'Gấu sắp ra khỏi vườn!',
    message: 'Mũi tên đưa Gấu ra ngoài khu vườn. Hãy chọn hướng khác.',
  },
  loop: {
    title: 'Gấu đang đi vòng tròn!',
    message: 'Gấu đang đi vòng tròn. Hãy đổi một mũi tên để mở đường mới.',
  },
};

export class GameController {
  session = new GameSession(GARDEN_LEVEL);
  readonly simulator = new PathSimulator();
  readonly app: ThreeGameApp;
  private readonly levelGenerator = new LevelGenerator();

  private selectedTool: Tool = null;
  private running = false;
  private runId = 0;
  private stepDurationMs = 700;
  private readonly reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  constructor(
    canvas: HTMLCanvasElement,
    container: HTMLElement,
    fallback: HTMLElement,
    private readonly ui: AppUIController,
  ) {
    this.app = new ThreeGameApp(canvas, container, fallback, {
      onCellSelected: (cell) => this.handleCellSelected(cell),
      onDirectionDropped: (cell, direction) => this.placeDirection(cell, direction),
    });
    ui.bind({
      onToolSelected: (tool) => this.selectTool(tool),
      onRun: () => void this.run(),
      onReset: () => this.resetBear(),
      onClear: () => this.clearAll(),
      onGenerateLevel: (options) => this.generateLevel(options),
      onSpeedChanged: (durationMs) => (this.stepDurationMs = durationMs),
      onReplay: () => {
        this.ui.hideSuccess();
        void this.run();
      },
      onTryAgain: () => {
        this.ui.hideSuccess();
        this.resetBear();
        this.ui.setStatus('Hãy thử một đường mới!', 'Đổi mũi tên nào bạn muốn rồi cho Gấu đi lại.', 'info');
      },
    });
    this.ui.setLevelInfo('classic', GARDEN_LEVEL.obstacles.length, GARDEN_LEVEL.goal);
    this.updatePreview();
  }

  selectTool(tool: Tool): void {
    if (this.running) return;
    this.selectedTool = tool;
    this.ui.setSelectedTool(tool);
    if (tool) {
      this.ui.setStatus(
        `Đã chọn: ${this.toolLabel(tool)}`,
        tool === 'erase' ? 'Chạm vào ô muốn xóa.' : 'Bây giờ hãy chạm vào một ô trên khu vườn.',
        'info',
      );
    }
  }

  placeDirection(cell: GridCell, direction: Direction): boolean {
    if (this.running) return false;
    const result = this.session.setCommand(cell, direction);
    if (!result.ok) {
      const message = result.reason === 'obstacle'
        ? 'Không thể đặt mũi tên lên hồ nước. Hãy chọn một ô cỏ.'
        : result.reason === 'goal'
          ? 'Nhà Thỏ đã là đích đến, không cần đặt mũi tên ở đây.'
          : 'Ô này nằm ngoài khu vườn.';
      this.ui.setStatus('Thử một ô khác nhé!', message, 'warning');
      this.app.garden.setProblem(cell);
      return false;
    }

    this.app.garden.setCommand(cell, direction);
    this.ui.showQuestion(false);
    this.ui.setStatus(
      result.replaced ? 'Đã đổi câu lệnh!' : 'Đã đặt một câu lệnh!',
      `Tại hàng ${cell.row + 1}, cột ${cell.col + 1}: Gấu sẽ đi ${this.toolLabel(direction).toLowerCase()}.`,
      'info',
    );
    this.updatePreview();
    return true;
  }

  removeAt(cell: GridCell): boolean {
    if (this.running) return false;
    const removed = this.session.deleteCommand(cell);
    if (removed) {
      this.app.garden.removeCommand(cell);
      this.ui.setStatus('Đã xóa câu lệnh', `Ô hàng ${cell.row + 1}, cột ${cell.col + 1} đang trống.`, 'info');
      this.updatePreview();
    } else {
      this.ui.setStatus('Ô này chưa có mũi tên', 'Chọn một ô đang có mũi tên để xóa.', 'warning');
    }
    return removed;
  }

  async run(): Promise<void> {
    if (this.running) return;
    const currentRunId = ++this.runId;
    this.app.animationController.cancelAll();
    this.app.garden.bear.setCell(this.session.level.start);
    this.app.garden.clearFeedback();
    this.ui.showQuestion(false);
    this.ui.hideSuccess();
    this.setRunning(true);

    const outcome = this.simulator.simulate(this.session);
    this.ui.renderPreview(outcome);
    this.ui.setStatus('Gấu đang đọc thuật toán…', 'Mỗi mũi tên là một câu lệnh và một bước đi.', 'info');

    for (const step of outcome.steps) {
      if (currentRunId !== this.runId) return;
      this.app.garden.setActiveCommand(step.from);
      this.ui.highlightPreviewStep(step.index);
      const completed = await this.app.garden.bear.moveTo(
        step.from,
        step.to,
        step.direction,
        this.stepDurationMs,
        this.app.animationController,
        this.reducedMotionQuery.matches,
      );
      if (!completed || currentRunId !== this.runId) return;
    }

    this.app.garden.setActiveCommand(null);
    this.ui.highlightPreviewStep(-1);
    if (outcome.kind === 'success') {
      this.ui.setStatus('Đến nhà Thỏ rồi!', `Gấu đã hoàn thành ${outcome.steps.length} bước chính xác.`, 'success');
      await this.app.garden.bear.celebrate(
        this.app.animationController,
        this.reducedMotionQuery.matches,
      );
      if (currentRunId !== this.runId) return;
      this.setRunning(false);
      this.ui.showSuccess();
      return;
    }

    this.app.garden.setProblem(outcome.commandCell);
    if (outcome.kind === 'missing-command') {
      this.ui.showQuestion(true);
      this.ui.setStatus(
        'Gấu chưa biết đi đâu',
        `Gấu chưa biết đi đâu. Hãy đặt thêm một mũi tên tại hàng ${outcome.terminalCell.row + 1}, cột ${outcome.terminalCell.col + 1}.`,
        'warning',
      );
    } else {
      const copy = OUTCOME_MESSAGES[outcome.kind];
      this.ui.setStatus(copy.title, copy.message, 'warning');
    }
    await this.app.garden.bear.reactToProblem(
      outcome.kind,
      this.app.animationController,
      this.reducedMotionQuery.matches,
    );
    if (currentRunId === this.runId) this.setRunning(false);
  }

  resetBear(): void {
    this.cancelRun();
    this.app.garden.bear.setCell(this.session.level.start);
    this.app.garden.clearFeedback();
    this.ui.showQuestion(false);
    this.ui.hideSuccess();
    this.ui.highlightPreviewStep(-1);
    this.ui.setStatus('Gấu đã về ô bắt đầu', 'Các mũi tên vẫn được giữ nguyên để bạn thử lại.', 'info');
  }

  clearAll(): void {
    this.cancelRun();
    this.session.clearCommands();
    this.app.garden.clearCommands();
    this.app.garden.bear.setCell(this.session.level.start);
    this.ui.showQuestion(false);
    this.ui.hideSuccess();
    this.ui.setStatus('Khu vườn đã sạch!', 'Hãy tạo một chuỗi mũi tên mới cho Gấu.', 'info');
    this.updatePreview();
  }

  loadSamplePath(): void {
    this.generateLevel({ layout: 'classic', obstacleCount: 3 });
    this.placeDirection({ row: 0, col: 0 }, 'down');
    for (let col = 0; col < 5; col += 1) this.placeDirection({ row: 1, col }, 'right');
    for (let row = 1; row < 5; row += 1) this.placeDirection({ row, col: 5 }, 'down');
  }

  generateLevel(options: LevelGenerationOptions): void {
    this.cancelRun();
    const level = this.levelGenerator.generate(options);
    this.session = new GameSession(level);
    this.app.garden.setLevel(level);
    this.ui.showQuestion(false);
    this.ui.hideSuccess();
    this.ui.highlightPreviewStep(-1);
    this.ui.setLevelInfo(options.layout, level.obstacles.length, level.goal);
    this.ui.setStatus(
      'Khu vườn mới đã sẵn sàng!',
      `${level.obstacles.length} hồ nước · Nhà Thỏ ở hàng ${level.goal.row + 1}, cột ${level.goal.col + 1}. Luôn có ít nhất một đường đi.`,
      'info',
    );
    this.updatePreview();
  }

  private handleCellSelected(cell: GridCell): void {
    if (!this.selectedTool) {
      this.ui.setStatus('Hãy chọn một công cụ trước', 'Chọn mũi tên hoặc công cụ xóa, rồi chạm lại vào ô.', 'warning');
      return;
    }
    if (this.selectedTool === 'erase') this.removeAt(cell);
    else this.placeDirection(cell, this.selectedTool);
  }

  private updatePreview(): void {
    this.ui.renderPreview(this.simulator.simulate(this.session));
  }

  private cancelRun(): void {
    this.runId += 1;
    this.app.animationController.cancelAll();
    this.setRunning(false);
  }

  private setRunning(running: boolean): void {
    this.running = running;
    this.app.setInputDisabled(running);
    this.ui.setRunning(running);
  }

  private toolLabel(tool: Exclude<Tool, null>): string {
    return { up: 'Lên', down: 'Xuống', left: 'Trái', right: 'Phải', erase: 'Xóa ô' }[tool];
  }

  dispose(): void {
    this.cancelRun();
    this.app.dispose();
    this.ui.dispose();
  }
}
