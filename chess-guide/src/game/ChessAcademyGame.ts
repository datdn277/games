import {
  AmbientLight,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  OrthographicCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from "three";
import { AnimationController } from "../animation/AnimationController";
import { HighlightAnimator } from "../animation/HighlightAnimator";
import { AudioController } from "../audio/AudioController";
import { ChessBoard } from "../chess/ChessBoard";
import { MoveEngine } from "../chess/MoveEngine";
import { InputController } from "../input/InputController";
import { lessonsByPiece } from "../lessons";
import type { Lesson } from "../lessons/Lesson";
import { PIECE_NAMES, PIECE_RULES } from "../lessons/Lesson";
import { GameUI } from "../ui/GameUI";
import { HintController } from "../ui/HintController";
import type { BoardState, PieceType, Position } from "./GameState";
import { createInitialGameState, positionKey, samePosition } from "./GameState";
import { LessonManager } from "./LessonManager";
import { PracticeSession } from "./PracticeSession";
import { calculateStars, ProgressStorage, type ProgressData } from "./ProgressStorage";

const BADGES: Record<PieceType, string> = {
  rook: "Xe Đường Thẳng",
  bishop: "Tượng Đường Chéo",
  knight: "Mã Nhảy Cao",
};

export class ChessAcademyGame {
  private readonly ui: GameUI;
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
  private readonly renderer: WebGLRenderer;
  private readonly chessBoard = new ChessBoard();
  private readonly engine = new MoveEngine();
  private readonly lessons = new LessonManager();
  private readonly practice = new PracticeSession();
  private readonly storage = new ProgressStorage();
  private readonly hintController = new HintController();
  private readonly animation: AnimationController;
  private readonly highlightAnimator: HighlightAnimator;
  private readonly input: InputController;
  private readonly audio: AudioController;
  private progress: ProgressData;
  private state;
  private boardState: BoardState | null = null;
  private currentPieceMenu: PieceType | null = null;
  private lessonToken = 0;
  private practiceLocked = false;

  constructor(root: HTMLElement) {
    this.progress = this.storage.load();
    this.state = createInitialGameState(this.progress.voiceEnabled);
    this.audio = new AudioController(this.progress.voiceEnabled);
    this.ui = new GameUI(root);

    this.renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.domElement.className = "game-canvas";
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    this.ui.canvasHost.prepend(this.renderer.domElement);

    this.setupScene();
    this.animation = new AnimationController(this.chessBoard);
    this.highlightAnimator = new HighlightAnimator(this.chessBoard);
    this.input = new InputController(this.renderer, this.camera, this.chessBoard, (position) => this.handleSquare(position));
    this.bindUI();
    this.handleResize();
    window.addEventListener("resize", () => this.handleResize());
    this.renderer.domElement.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      this.ui.setFeedback("Bàn cờ đang nghỉ một chút. Con hãy tải lại trang nhé.", "try-again");
    });
    this.renderer.setAnimationLoop((time) => this.render(time));

    this.ui.setVoice(this.progress.voiceEnabled);
    this.ui.showPieceMenu(this.progress);
    window.setTimeout(() => this.audio.speak("Chào mừng đến với Học Viện Cờ Vua Nhí."), 350);
  }

  private setupScene(): void {
    this.scene.background = new Color(0xc9ecf4);
    this.scene.fog = new Fog(0xc9ecf4, 17, 28);
    this.camera.position.set(0, 9.8, 6.7);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(new AmbientLight(0xffffff, 1.25));
    this.scene.add(new HemisphereLight(0xe8fbff, 0x9c6849, 1.8));
    const sun = new DirectionalLight(0xfff3d0, 3.1);
    sun.position.set(-5, 10, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -7;
    sun.shadow.camera.right = 7;
    sun.shadow.camera.top = 7;
    sun.shadow.camera.bottom = -7;
    this.scene.add(sun, this.chessBoard.group);
  }

  private bindUI(): void {
    this.ui.setActions({
      choosePiece: (piece) => this.showLessons(piece),
      chooseLesson: (index) => this.startLesson(this.currentPieceMenu ?? "rook", index),
      startPractice: (piece) => this.startPractice(piece),
      backToPieces: () => this.showPieces(),
      backToLessons: () => this.currentPieceMenu ? this.showLessons(this.currentPieceMenu) : this.showPieces(),
      hint: () => this.useHint(),
      reset: () => this.resetLesson(),
      replayVoice: () => this.replayVoice(),
      toggleVoice: () => this.toggleVoice(),
      checkSelection: () => this.checkSelection(),
      understand: () => {
        if (!this.state.interactionLocked) this.completeLesson();
      },
      next: () => this.nextLesson(),
      selectSquare: (position) => this.handleSquare(position),
    });
  }

  private showPieces(): void {
    this.lessonToken += 1;
    this.audio.stop();
    this.practice.stop();
    this.practiceLocked = false;
    this.input.setEnabled(false);
    this.state.interactionLocked = true;
    this.currentPieceMenu = null;
    this.ui.showPieceMenu(this.progress);
  }

  private showLessons(piece: PieceType): void {
    this.lessonToken += 1;
    this.audio.stop();
    this.practice.stop();
    this.practiceLocked = false;
    this.input.setEnabled(false);
    this.state.interactionLocked = true;
    this.currentPieceMenu = piece;
    this.ui.showLessonMenu(piece, this.lessons.getLessons(piece), this.progress);
  }

  private startLesson(piece: PieceType, index: number): void {
    this.practice.stop();
    this.practiceLocked = false;
    const lesson = this.lessons.getLesson(piece, index);
    this.currentPieceMenu = piece;
    const board: BoardState = {
      rows: lesson.boardSize.rows,
      cols: lesson.boardSize.cols,
      piece: { type: lesson.piece, position: { ...lesson.startPosition } },
      blockers: lesson.blockers.map((position) => ({ ...position })),
      targets: lesson.targets.map((position) => ({ ...position })),
    };
    this.boardState = board;
    this.state = {
      ...createInitialGameState(this.audio.isEnabled()),
      currentPiece: piece,
      currentLesson: lesson,
      lessonIndex: index,
      validMoves: this.engine.getValidMoves(board, board.piece),
      hintStep: this.progress.preferredHintLevel,
    };
    this.chessBoard.load(board);
    this.ui.startLesson(lesson, index, this.lessons.getLessons(piece).length, board);
    this.ui.setVoice(this.audio.isEnabled());
    this.input.setEnabled(true);
    if (lesson.showValidMovesInitially) this.chessBoard.showMoves(this.state.validMoves, lesson.targets);
    this.audio.speak(lesson.voiceInstruction);
    this.lessonToken += 1;
    const token = this.lessonToken;
    if (lesson.objective === "tutorial") window.setTimeout(() => this.playTutorial(token), 700);
  }

  private startPractice(piece: PieceType): void {
    this.lessonToken += 1;
    this.audio.stop();
    this.currentPieceMenu = piece;
    this.practiceLocked = false;
    this.state = {
      ...createInitialGameState(this.audio.isEnabled()),
      currentPiece: piece,
    };
    const board = this.practice.start(piece);
    this.boardState = board;
    this.chessBoard.load(board);
    this.ui.startPractice(piece, board);
    this.ui.setVoice(this.audio.isEnabled());
    this.input.setEnabled(true);
    this.audio.speak(`Có ngôi sao chỉ cần một bước, có ngôi sao cần nhiều bước. Chạm vào quân ${PIECE_NAMES[piece]} và tìm đường đến ngôi sao.`);
  }

  private async playTutorial(token: number): Promise<void> {
    const lesson = this.state.currentLesson;
    const board = this.boardState;
    const destination = lesson?.targets[0];
    if (!lesson || !board || !destination || token !== this.lessonToken) return;
    this.state.interactionLocked = true;
    this.input.setEnabled(false);
    this.chessBoard.clearHighlights();
    this.chessBoard.showMoves(this.state.validMoves, lesson.targets, true);
    await this.animation.move(board.piece.position, destination, lesson.piece);
    if (token !== this.lessonToken) return;
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    await this.animation.move(destination, board.piece.position, lesson.piece);
    if (token !== this.lessonToken) return;
    this.state.interactionLocked = false;
    this.input.setEnabled(true);
    this.ui.setFeedback(`${PIECE_NAMES[lesson.piece]} vừa biểu diễn năng lực của mình!`, "success");
  }

  private handleSquare(position: Position): void {
    if (this.practice.isActive()) {
      this.handlePracticeSquare(position);
      return;
    }
    const lesson = this.state.currentLesson;
    const board = this.boardState;
    if (!lesson || !board || this.state.interactionLocked || this.state.completed || lesson.objective === "tutorial") return;
    if (samePosition(position, board.piece.position)) {
      this.selectPiece();
      return;
    }
    if (!this.state.selectedSquare) {
      this.ui.setFeedback(`Chạm vào quân ${PIECE_NAMES[lesson.piece]} trước nhé!`, "hint");
      this.audio.speak(`Con hãy chọn quân ${PIECE_NAMES[lesson.piece]} trước nhé.`);
      return;
    }
    if (lesson.objective === "select-valid-squares") {
      this.toggleSelectedSquare(position);
      return;
    }
    void this.tryMove(position);
  }

  private handlePracticeSquare(position: Position): void {
    const board = this.practice.getBoard();
    if (!board || this.practiceLocked) return;
    const piece = board.piece.type;
    if (samePosition(position, board.piece.position)) {
      const moves = this.practice.selectPiece();
      this.chessBoard.clearHighlights();
      this.chessBoard.setSquareState(board.piece.position, "selected");
      this.chessBoard.showPracticeMoves(moves, board.targets);
      this.ui.setPracticeMoves(moves, board.targets);
      this.ui.setFeedback(`Chọn một chấm tròn để đi một bước. Con hãy suy nghĩ đường tới ngôi sao nhé!`, "hint");
      return;
    }
    if (!this.practice.isSelected()) {
      this.ui.setFeedback(`Chạm vào quân ${PIECE_NAMES[piece]} trước để hiện các nước đi nhé!`, "hint");
      this.audio.speak(`Con hãy chạm vào quân ${PIECE_NAMES[piece]} trước nhé.`);
      return;
    }
    if (!this.practice.canMove(position)) {
      this.explainPracticeWrong(position, board);
      return;
    }
    void this.tryPracticeMove(position);
  }

  private async tryPracticeMove(destination: Position): Promise<void> {
    const board = this.practice.getBoard();
    if (!board || !this.practice.canMove(destination)) return;
    const piece = board.piece.type;
    const from = { ...board.piece.position };
    const reachedTarget = this.practice.isTarget(destination);
    const token = this.lessonToken;
    this.practiceLocked = true;
    this.input.setEnabled(false);
    await this.animation.move(from, destination, piece);
    if (token !== this.lessonToken || !this.practice.isActive()) return;

    this.chessBoard.setPiecePosition(destination);
    if (reachedTarget) this.chessBoard.celebrateTarget(destination);
    const result = this.practice.commitMove(destination);
    this.ui.syncAccessibleBoard(board);

    if (result.status === "target") {
      this.ui.setPracticeProgress(result.starsFound);
      this.ui.setFeedback(`Tuyệt vời! Con đã tìm được ngôi sao thứ ${result.starsFound}!`, "success");
      this.audio.speak(`Tuyệt vời! Con đã tìm được ngôi sao thứ ${result.starsFound}.`);
      await this.animation.celebrate();
      await new Promise((resolve) => window.setTimeout(resolve, 220));
      if (token !== this.lessonToken || !this.practice.isActive()) return;
      this.chessBoard.setTargets(board.targets);
      this.chessBoard.clearHighlights();
      this.ui.syncAccessibleBoard(board);
      this.ui.setFeedback(`Ngôi sao mới xuất hiện! Có thể ở gần hoặc ở xa. Chạm vào quân ${PIECE_NAMES[piece]} nhé.`, "success");
    } else {
      this.chessBoard.clearHighlights();
      this.ui.setFeedback(`Đúng rồi! Ngôi sao vẫn ở đó. Chạm lại vào quân ${PIECE_NAMES[piece]} để chọn bước tiếp theo.`, "success");
    }

    this.practiceLocked = false;
    this.input.setEnabled(true);
  }

  private explainPracticeWrong(destination: Position, board: BoardState): void {
    const piece = board.piece.type;
    const from = board.piece.position;
    const rowDelta = Math.abs(destination.row - from.row);
    const colDelta = Math.abs(destination.col - from.col);
    let reason: string;
    if (piece === "rook") {
      reason = rowDelta > 0 && colDelta > 0
        ? "Quân Xe chỉ đi theo đường ngang hoặc đường dọc."
        : "Ô này chưa nằm trên đường đi của quân Xe.";
    } else if (piece === "bishop") {
      reason = rowDelta === 0 || colDelta === 0 || rowDelta !== colDelta
        ? "Quân Tượng chỉ đi theo đường chéo."
        : "Ô này chưa nằm trên đường đi của quân Tượng.";
    } else {
      reason = "Quân Mã đi hai ô rồi rẽ một ô, tạo thành hình chữ L.";
    }
    this.chessBoard.flashIncorrect(destination);
    this.ui.setFeedback(`${reason} Hãy chọn một ô có chấm tròn nhé!`, "try-again");
    this.audio.speak(`${reason} Con hãy chọn một ô có chấm tròn nhé.`);
  }

  private selectPiece(): void {
    const lesson = this.state.currentLesson;
    const board = this.boardState;
    if (!lesson || !board) return;
    this.state.selectedSquare = { ...board.piece.position };
    this.chessBoard.clearHighlights();
    this.chessBoard.setSquareState(board.piece.position, "selected");
    if (lesson.showValidMovesInitially || this.state.hintStep >= 2) {
      this.chessBoard.showMoves(this.state.validMoves, lesson.targets, this.state.hintStep >= 2);
    }
    this.ui.setFeedback(`Đã chọn quân ${PIECE_NAMES[lesson.piece]}. Bây giờ chọn một ô đích!`, "neutral");
  }

  private toggleSelectedSquare(position: Position): void {
    const lesson = this.state.currentLesson;
    const board = this.boardState;
    if (!lesson || !board || board.blockers.some((blocker) => samePosition(blocker, position))) {
      if (lesson) this.explainWrong(position);
      return;
    }
    const index = this.state.selectedSquares.findIndex((selected) => samePosition(selected, position));
    if (index >= 0) this.state.selectedSquares.splice(index, 1);
    else this.state.selectedSquares.push({ ...position });
    this.chessBoard.clearHighlights();
    this.chessBoard.setSquareState(board.piece.position, "selected");
    this.chessBoard.showSelected(this.state.selectedSquares);
    this.ui.setSelectionCount(this.state.selectedSquares.length, this.state.validMoves.length);
    this.ui.updateAccessibleSquare(position, index < 0, this.state.validMoves.some((move) => samePosition(move, position)));
  }

  private async tryMove(destination: Position): Promise<void> {
    const lesson = this.state.currentLesson;
    const board = this.boardState;
    if (!lesson || !board) return;
    if (!this.engine.isMoveValid(board, board.piece, destination)) {
      this.explainWrong(destination);
      return;
    }
    const from = { ...board.piece.position };
    const token = this.lessonToken;
    this.state.interactionLocked = true;
    this.input.setEnabled(false);
    await this.animation.move(from, destination, board.piece.type);
    if (token !== this.lessonToken) return;
    board.piece.position = { ...destination };
    this.chessBoard.setPiecePosition(destination);
    this.state.validMoves = this.engine.getValidMoves(board, board.piece);
    this.state.selectedSquare = null;
    const reachedTarget = lesson.targets.some((target) => samePosition(target, destination));
    if (reachedTarget) {
      this.chessBoard.celebrateTarget(destination);
      this.ui.setFeedback(this.correctExplanation(lesson.piece), "success");
      this.audio.speak(`${this.correctExplanation(lesson.piece)} Con đã hoàn thành bài học.`);
      await this.animation.celebrate();
      if (token !== this.lessonToken) return;
      this.completeLesson();
      return;
    }
    this.state.interactionLocked = false;
    this.input.setEnabled(true);
    this.ui.syncAccessibleBoard(board);
    this.chessBoard.clearHighlights();
    this.ui.setFeedback(`${this.correctExplanation(lesson.piece)} Hãy tiếp tục tìm ngôi sao.`, "success");
  }

  private checkSelection(): void {
    const lesson = this.state.currentLesson;
    const board = this.boardState;
    if (!lesson || !board || this.state.interactionLocked) return;
    const answers = new Set(this.state.validMoves.map(positionKey));
    const selected = new Set(this.state.selectedSquares.map(positionKey));
    const extras = this.state.selectedSquares.filter((position) => !answers.has(positionKey(position)));
    const missing = this.state.validMoves.filter((position) => !selected.has(positionKey(position)));
    if (extras.length === 0 && missing.length === 0) {
      this.ui.setFeedback(`Tuyệt vời! Con đã tìm đúng tất cả ${answers.size} ô.`, "success");
      this.audio.speak(`Đúng rồi! Con đã tìm đúng tất cả ô quân ${PIECE_NAMES[lesson.piece]} có thể đi.`);
      const token = this.lessonToken;
      this.state.interactionLocked = true;
      this.input.setEnabled(false);
      void this.animation.celebrate().then(() => {
        if (token === this.lessonToken) this.completeLesson();
      });
      return;
    }
    this.state.mistakes += 1;
    extras.forEach((position) => this.chessBoard.setSquareState(position, "incorrect"));
    missing.forEach((position) => this.chessBoard.setSquareState(position, "hinted"));
    const message = extras.length > 0
      ? `Có ${extras.length} ô chưa đúng và còn thiếu ${missing.length} ô. ${PIECE_RULES[lesson.piece]}`
      : `Gần đúng rồi! Con còn thiếu ${missing.length} ô. Quan sát các dấu vòng xanh nhé.`;
    this.ui.setFeedback(message, "try-again");
    this.audio.speak(`${message} Con hãy thử lại nhé.`);
  }

  private explainWrong(destination: Position): void {
    const lesson = this.state.currentLesson;
    const board = this.boardState;
    if (!lesson || !board) return;
    this.state.mistakes += 1;
    this.chessBoard.flashIncorrect(destination);
    const from = board.piece.position;
    const rowDelta = Math.abs(destination.row - from.row);
    const colDelta = Math.abs(destination.col - from.col);
    let reason: string;
    if (board.blockers.some((blocker) => samePosition(blocker, destination))) {
      reason = "Ô này có vật cản. Con hãy chọn ô trống nhé.";
    } else if (lesson.piece === "rook") {
      reason = rowDelta > 0 && colDelta > 0
        ? "Xe không đi đường chéo. Con hãy chọn một ô cùng hàng hoặc cùng cột."
        : this.engine.isPathBlocked(board, from, destination)
          ? "Xe không thể đi xuyên qua vật cản. Con hãy dừng trước vật cản."
          : "Xe chỉ đi theo đường thẳng.";
    } else if (lesson.piece === "bishop") {
      reason = rowDelta === 0 || colDelta === 0
        ? "Tượng chỉ đi theo đường chéo. Ô này không nằm trên đường chéo."
        : this.engine.isPathBlocked(board, from, destination)
          ? "Tượng không thể nhảy qua vật cản."
          : "Ô này không nằm trên đường chéo của Tượng.";
    } else {
      reason = "Mã đi hai ô rồi rẽ sang một ô. Con hãy tìm một ô tạo thành hình chữ L.";
    }
    const message = `Nước đi này chưa đúng. ${reason}`;
    this.ui.setFeedback(message, "try-again");
    this.audio.speak(`${message} Con hãy thử lại nhé.`);
  }

  private useHint(): void {
    const lesson = this.state.currentLesson;
    const board = this.boardState;
    if (!lesson || !board || this.state.completed || this.state.interactionLocked) return;
    this.state.hintStep = Math.min(3, this.state.hintStep + 1);
    this.state.hintsUsed += 1;
    this.ui.setHintStep(this.state.hintStep);
    const hint = this.hintController.getHint(lesson, this.state.hintStep);
    this.ui.setFeedback(hint, "hint");
    this.audio.speak(this.state.hintStep === 1 ? `${PIECE_RULES[lesson.piece]} ${hint}` : hint);
    if (this.state.hintStep >= 2) {
      this.chessBoard.clearHighlights();
      this.chessBoard.setSquareState(board.piece.position, "selected");
      this.highlightAnimator.pulse(this.state.validMoves);
    }
    if (this.state.hintStep === 3) {
      const destinations = lesson.objective === "reach-target"
        ? lesson.targets.filter((target) => this.engine.isMoveValid(board, board.piece, target))
        : this.state.validMoves;
      this.chessBoard.showMoves(destinations, lesson.targets, true);
    }
  }

  private replayVoice(): void {
    const practiceBoard = this.practice.getBoard();
    if (practiceBoard) {
      this.audio.speak(`Có ngôi sao chỉ cần một bước, có ngôi sao cần nhiều bước. Chạm vào quân ${PIECE_NAMES[practiceBoard.piece.type]} và tìm đường đến ngôi sao.`);
      return;
    }
    const lesson = this.state.currentLesson;
    if (lesson) this.audio.speak(lesson.voiceInstruction);
    else this.audio.speak("Chào mừng đến với Học Viện Cờ Vua Nhí.");
  }

  private toggleVoice(): void {
    const enabled = !this.audio.isEnabled();
    this.audio.setEnabled(enabled);
    this.state.voiceEnabled = enabled;
    this.progress = { ...this.progress, voiceEnabled: enabled };
    this.storage.save(this.progress);
    this.ui.setVoice(enabled);
    if (enabled) this.replayVoice();
  }

  private resetLesson(): void {
    const lesson = this.state.currentLesson;
    if (lesson) this.startLesson(lesson.piece, this.state.lessonIndex);
  }

  private completeLesson(): void {
    const lesson = this.state.currentLesson;
    if (!lesson || this.state.completed) return;
    this.state.completed = true;
    this.state.interactionLocked = true;
    this.input.setEnabled(false);
    const stars = calculateStars(this.state.mistakes, this.state.hintsUsed);
    this.progress = this.storage.completeLesson(this.progress, lesson.id, stars);
    const pieceLessons = lessonsByPiece[lesson.piece];
    const earnedBadge = pieceLessons.every((item) => this.progress.completedLessons.includes(item.id));
    const isNewBadge = earnedBadge && !this.progress.badges.includes(lesson.piece);
    if (isNewBadge) this.progress = { ...this.progress, badges: [...this.progress.badges, lesson.piece] };
    this.storage.save(this.progress);
    const hasNext = this.lessons.getNext(lesson) !== null;
    this.ui.showCompletion(stars, lesson.piece, isNewBadge, hasNext);
    if (isNewBadge) this.audio.speak(`Con đã nhận huy hiệu ${BADGES[lesson.piece]}.`);
  }

  private nextLesson(): void {
    const lesson = this.state.currentLesson;
    const next = lesson ? this.lessons.getNext(lesson) : null;
    if (!next) {
      if (lesson) this.showLessons(lesson.piece);
      return;
    }
    const index = this.lessons.getLessons(next.piece).findIndex((candidate) => candidate.id === next.id);
    this.startLesson(next.piece, index);
  }

  private correctExplanation(piece: PieceType): string {
    if (piece === "rook") return "Đúng rồi! Xe đi đến ô này theo đường thẳng.";
    if (piece === "bishop") return "Đúng rồi! Tượng đã đi theo đường chéo.";
    return "Đúng rồi! Mã đã đi theo hình chữ L.";
  }

  private handleResize(): void {
    const rect = this.ui.canvasHost.getBoundingClientRect();
    const width = Math.max(320, rect.width);
    const height = Math.max(320, rect.height);
    const aspect = width / height;
    const preferredVerticalSize = aspect < 0.8 ? 10.2 : aspect > 1.55 ? 8.7 : 9.3;
    const minimumHorizontalSize = 8.4;
    const verticalSize = Math.max(preferredVerticalSize, minimumHorizontalSize / aspect);
    this.camera.top = verticalSize / 2;
    this.camera.bottom = -verticalSize / 2;
    this.camera.left = (-verticalSize * aspect) / 2;
    this.camera.right = (verticalSize * aspect) / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private render(time: number): void {
    this.chessBoard.update(time);
    this.renderer.render(this.scene, this.camera);
  }
}
