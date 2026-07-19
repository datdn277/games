import type { BoardState, PieceType, Position } from "../game/GameState";
import type { ProgressData } from "../game/ProgressStorage";
import type { Lesson } from "../lessons/Lesson";
import { PIECE_NAMES } from "../lessons/Lesson";
import { FeedbackPanel, type FeedbackTone } from "./FeedbackPanel";
import { LessonMenu } from "./LessonMenu";

export type UIActions = {
  choosePiece: (piece: PieceType) => void;
  chooseLesson: (index: number) => void;
  startPractice: (piece: PieceType) => void;
  backToPieces: () => void;
  backToLessons: () => void;
  hint: () => void;
  reset: () => void;
  replayVoice: () => void;
  toggleVoice: () => void;
  checkSelection: () => void;
  understand: () => void;
  next: () => void;
  selectSquare: (position: Position) => void;
};

export class GameUI {
  readonly canvasHost: HTMLElement;
  private readonly menu: LessonMenu;
  private readonly feedback: FeedbackPanel;
  private actions: UIActions | null = null;
  private currentPiece: PieceType | null = null;
  private readonly lessonOverlay: HTMLElement;
  private readonly completion: HTMLElement;

  constructor(private readonly root: HTMLElement) {
    root.innerHTML = `
      <div class="game-shell">
        <header class="topbar">
          <button id="menu-button" class="round-button" aria-label="Mở danh sách bài học">☰</button>
          <div class="brand-lockup">
            <span class="brand-crown" aria-hidden="true">♛</span>
            <span><strong>Học Viện Cờ Vua Nhí</strong><small id="lesson-title">Vương quốc đồ chơi</small></span>
          </div>
          <div class="top-actions">
            <span id="lesson-progress" class="progress-chip" aria-label="Tiến độ bài học">Sẵn sàng</span>
            <button id="voice-button" class="round-button" aria-label="Tắt giọng đọc" aria-pressed="true">🔊</button>
          </div>
        </header>
        <main class="play-area">
          <section id="canvas-host" class="canvas-host" aria-label="Bàn cờ 3D 6 nhân 6">
            <div class="world-decor world-decor--left" aria-hidden="true">☁</div>
            <div class="world-decor world-decor--right" aria-hidden="true">☁</div>
            <div id="access-board" class="access-board" role="grid" aria-label="Bàn cờ có thể điều khiển bằng bàn phím"></div>
          </section>
          <aside class="objective-chip" aria-live="polite">
            <span id="piece-badge" class="piece-badge" aria-hidden="true">♜</span>
            <span><small>NHIỆM VỤ</small><strong id="instruction">Chọn một quân để bắt đầu</strong></span>
          </aside>
          <div id="feedback" class="feedback" data-tone="neutral" aria-live="assertive">Chào mừng đến với Học Viện Cờ Vua Nhí!</div>
        </main>
        <footer class="control-dock">
          <button id="replay-button" class="game-button game-button--quiet" aria-label="Nghe lại hướng dẫn">🔈 <span>Nghe lại</span></button>
          <button id="hint-button" class="game-button game-button--hint" aria-label="Mở gợi ý tiếp theo">💡 <span>Gợi ý</span><b id="hint-step">0/3</b></button>
          <button id="reset-button" class="game-button game-button--quiet" aria-label="Làm lại bài học">↻ <span>Làm lại</span></button>
          <button id="check-button" class="game-button game-button--primary" aria-label="Kiểm tra các ô đã chọn" hidden>✓ <span>Kiểm tra</span></button>
          <button id="understand-button" class="game-button game-button--primary" aria-label="Con đã hiểu bài hướng dẫn" hidden>✨ <span>Con đã hiểu</span></button>
          <button id="practice-exit-button" class="game-button game-button--exit" aria-label="Thoát luyện tập săn sao" hidden>← <span>Thoát luyện tập</span></button>
        </footer>
        <div id="lesson-menu" class="modal-layer"></div>
        <div id="completion" class="modal-layer" hidden></div>
      </div>`;
    this.canvasHost = this.byId("canvas-host");
    this.lessonOverlay = this.byId("lesson-menu");
    this.completion = this.byId("completion");
    this.menu = new LessonMenu(this.lessonOverlay);
    this.feedback = new FeedbackPanel(this.byId("feedback"));
    this.bindStaticEvents();
  }

  setActions(actions: UIActions): void {
    this.actions = actions;
  }

  showPieceMenu(progress: ProgressData): void {
    this.currentPiece = null;
    this.setPracticeShell(false);
    this.completion.hidden = true;
    this.menu.renderPieceChoice(progress);
    this.bindMenuEvents();
  }

  showLessonMenu(piece: PieceType, lessons: Lesson[], progress: ProgressData): void {
    this.currentPiece = piece;
    this.setPracticeShell(false);
    this.completion.hidden = true;
    this.menu.renderLessons(piece, lessons, progress);
    this.bindMenuEvents();
  }

  startLesson(lesson: Lesson, index: number, total: number, board: BoardState): void {
    this.setPracticeShell(false);
    this.setLessonControls(lesson);
    this.menu.hide();
    this.completion.hidden = true;
    this.byId("lesson-title").textContent = lesson.title;
    this.byId("instruction").textContent = lesson.instruction;
    this.byId("lesson-progress").textContent = `Bài ${index + 1}/${total}`;
    this.byId("piece-badge").textContent = lesson.piece === "rook" ? "♜" : lesson.piece === "bishop" ? "♝" : "♞";
    this.byId("piece-badge").className = `piece-badge piece-badge--${lesson.piece}`;
    this.byId("hint-step").textContent = "0/3";
    this.setFeedback(lesson.instruction, "neutral");
    this.renderAccessibleBoard(board);
  }

  startPractice(piece: PieceType, board: BoardState): void {
    this.currentPiece = piece;
    this.setPracticeShell(true);
    this.menu.hide();
    this.completion.hidden = true;
    this.byId("lesson-title").textContent = `Săn sao cùng quân ${PIECE_NAMES[piece]}`;
    this.byId("instruction").textContent = "Tìm đường tới ngôi sao";
    this.byId("lesson-progress").textContent = "⭐ 0 ngôi sao";
    this.byId("piece-badge").textContent = piece === "rook" ? "♜" : piece === "bishop" ? "♝" : "♞";
    this.byId("piece-badge").className = `piece-badge piece-badge--${piece}`;
    this.setFeedback(`Có sao chỉ cần một bước, có sao cần nhiều bước. Chạm vào quân ${PIECE_NAMES[piece]} để bắt đầu!`, "neutral");
    this.renderAccessibleBoard(board);
  }

  setPracticeProgress(starsFound: number): void {
    this.byId("lesson-progress").textContent = `⭐ ${starsFound} ngôi sao`;
  }

  setPracticeMoves(moves: Position[], targets: Position[]): void {
    const moveKeys = new Set(moves.map((position) => `${position.row},${position.col}`));
    const targetKeys = new Set(targets.map((position) => `${position.row},${position.col}`));
    this.root.querySelectorAll<HTMLButtonElement>("[data-square]").forEach((button) => {
      const key = button.dataset.square ?? "";
      const valid = moveKeys.has(key);
      const baseLabel = button.dataset.baseLabel ?? button.getAttribute("aria-label") ?? "Ô cờ";
      button.dataset.valid = String(valid);
      button.setAttribute(
        "aria-label",
        valid ? `${baseLabel}, nước đi hợp lệ${targetKeys.has(key) ? ", có ngôi sao" : ""}` : baseLabel,
      );
    });
  }

  setFeedback(message: string, tone: FeedbackTone): void {
    this.feedback.show(message, tone);
  }

  setHintStep(step: number): void {
    this.byId("hint-step").textContent = `${step}/3`;
  }

  setSelectionCount(selected: number, total: number): void {
    this.byId("lesson-progress").textContent = `Đã chọn ${selected}/${total}`;
  }

  setVoice(enabled: boolean): void {
    const button = this.byId<HTMLButtonElement>("voice-button");
    button.textContent = enabled ? "🔊" : "🔇";
    button.ariaPressed = String(enabled);
    button.ariaLabel = enabled ? "Tắt giọng đọc" : "Bật giọng đọc";
  }

  showCompletion(stars: number, piece: PieceType, badgeEarned: boolean, hasNext: boolean): void {
    this.completion.innerHTML = `
      <div class="completion-card" role="dialog" aria-modal="true" aria-labelledby="complete-title">
        <div class="reward-burst" aria-hidden="true">✨</div>
        <p class="eyebrow">HOÀN THÀNH BÀI HỌC</p>
        <h2 id="complete-title">Giỏi lắm!</h2>
        <div class="big-stars" aria-label="Nhận được ${stars} sao">${"★".repeat(stars)}${"☆".repeat(3 - stars)}</div>
        <p>${badgeEarned ? `🏅 Con đã nhận huy hiệu <strong>${PIECE_NAMES[piece]} Siêu Sao</strong>!` : `${PIECE_NAMES[piece]} đã học thêm một năng lực mới.`}</p>
        <div class="completion-actions">
          <button id="completion-lessons" class="game-button game-button--quiet">Danh sách bài</button>
          ${hasNext ? `<button id="next-button" class="game-button game-button--primary">Bài tiếp →</button>` : ""}
        </div>
      </div>`;
    this.completion.hidden = false;
    this.completion.querySelector<HTMLButtonElement>("#completion-lessons")?.addEventListener("click", () => this.actions?.backToLessons());
    this.completion.querySelector<HTMLButtonElement>("#next-button")?.addEventListener("click", () => this.actions?.next());
  }

  updateAccessibleSquare(position: Position, selected: boolean, valid: boolean): void {
    const button = this.root.querySelector<HTMLButtonElement>(`[data-square="${position.row},${position.col}"]`);
    if (!button) return;
    button.ariaPressed = String(selected);
    button.dataset.selected = String(selected);
    button.dataset.valid = String(valid);
  }

  syncAccessibleBoard(board: BoardState): void {
    this.renderAccessibleBoard(board);
  }

  private renderAccessibleBoard(board: BoardState): void {
    const accessBoard = this.byId("access-board");
    accessBoard.innerHTML = "";
    accessBoard.style.setProperty("--rows", String(board.rows));
    accessBoard.style.setProperty("--cols", String(board.cols));
    for (let row = 0; row < board.rows; row += 1) {
      for (let col = 0; col < board.cols; col += 1) {
        const button = document.createElement("button");
        const position = { row, col };
        const isPiece = board.piece.position.row === row && board.piece.position.col === col;
        const isTarget = board.targets.some((target) => target.row === row && target.col === col);
        const isBlocked = board.blockers.some((blocker) => blocker.row === row && blocker.col === col);
        button.dataset.square = `${row},${col}`;
        button.setAttribute("role", "gridcell");
        const label = `Hàng ${row + 1}, cột ${col + 1}${isPiece ? `, quân ${PIECE_NAMES[board.piece.type]}` : ""}${isTarget ? ", ngôi sao" : ""}${isBlocked ? ", vật cản" : ""}`;
        button.dataset.baseLabel = label;
        button.setAttribute("aria-label", label);
        button.addEventListener("click", () => this.actions?.selectSquare(position));
        button.addEventListener("keydown", (event) => this.handleGridArrow(event, row, col, board.rows, board.cols));
        accessBoard.appendChild(button);
      }
    }
  }

  private handleGridArrow(event: KeyboardEvent, row: number, col: number, rows: number, cols: number): void {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.actions?.selectSquare({ row, col });
      return;
    }
    const delta: Record<string, [number, number]> = {
      ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
    };
    const move = delta[event.key];
    if (!move) return;
    event.preventDefault();
    const nextRow = Math.max(0, Math.min(rows - 1, row + move[0]));
    const nextCol = Math.max(0, Math.min(cols - 1, col + move[1]));
    this.root.querySelector<HTMLButtonElement>(`[data-square="${nextRow},${nextCol}"]`)?.focus();
  }

  private bindStaticEvents(): void {
    this.byId("menu-button").addEventListener("click", () => this.actions?.backToLessons());
    this.byId("voice-button").addEventListener("click", () => this.actions?.toggleVoice());
    this.byId("replay-button").addEventListener("click", () => this.actions?.replayVoice());
    this.byId("hint-button").addEventListener("click", () => this.actions?.hint());
    this.byId("reset-button").addEventListener("click", () => this.actions?.reset());
    this.byId("check-button").addEventListener("click", () => this.actions?.checkSelection());
    this.byId("understand-button").addEventListener("click", () => this.actions?.understand());
    this.byId("practice-exit-button").addEventListener("click", () => this.actions?.backToLessons());
  }

  private bindMenuEvents(): void {
    this.lessonOverlay.querySelectorAll<HTMLButtonElement>("[data-piece]").forEach((button) => {
      button.addEventListener("click", () => this.actions?.choosePiece(button.dataset.piece as PieceType));
    });
    this.lessonOverlay.querySelectorAll<HTMLButtonElement>("[data-lesson]").forEach((button) => {
      button.addEventListener("click", () => this.actions?.chooseLesson(Number(button.dataset.lesson)));
    });
    this.lessonOverlay.querySelectorAll<HTMLButtonElement>("[data-practice]").forEach((button) => {
      button.addEventListener("click", () => this.actions?.startPractice(button.dataset.practice as PieceType));
    });
    this.lessonOverlay.querySelector<HTMLButtonElement>(".back-to-pieces")?.addEventListener("click", () => this.actions?.backToPieces());
  }

  private byId<T extends HTMLElement = HTMLElement>(id: string): T {
    const element = this.root.querySelector<T>(`#${id}`);
    if (!element) throw new Error(`Missing UI element #${id}`);
    return element;
  }

  private setLessonControls(lesson: Lesson): void {
    this.byId<HTMLButtonElement>("replay-button").hidden = false;
    this.byId<HTMLButtonElement>("hint-button").hidden = false;
    this.byId<HTMLButtonElement>("reset-button").hidden = false;
    this.byId<HTMLButtonElement>("check-button").hidden = lesson.objective !== "select-valid-squares";
    this.byId<HTMLButtonElement>("understand-button").hidden = lesson.objective !== "tutorial";
    this.byId<HTMLButtonElement>("practice-exit-button").hidden = true;
  }

  private setPracticeShell(enabled: boolean): void {
    this.root.querySelector(".game-shell")?.classList.toggle("is-practice", enabled);
    const menuButton = this.byId<HTMLButtonElement>("menu-button");
    menuButton.textContent = enabled ? "←" : "☰";
    menuButton.ariaLabel = enabled ? "Thoát luyện tập săn sao" : "Mở danh sách bài học";
    if (!enabled) return;
    this.byId<HTMLButtonElement>("replay-button").hidden = false;
    this.byId<HTMLButtonElement>("hint-button").hidden = true;
    this.byId<HTMLButtonElement>("reset-button").hidden = true;
    this.byId<HTMLButtonElement>("check-button").hidden = true;
    this.byId<HTMLButtonElement>("understand-button").hidden = true;
    this.byId<HTMLButtonElement>("practice-exit-button").hidden = false;
  }
}
