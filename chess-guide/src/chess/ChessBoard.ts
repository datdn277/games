import {
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshStandardMaterial,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  Vector3,
} from "three";
import type { BoardState, Position } from "../game/GameState";
import { positionKey, samePosition } from "../game/GameState";
import { boardToWorldPosition, SQUARE_SIZE } from "./BoardCoordinates";
import { createChessPiece } from "./ChessPiece";
import { ChessSquare, type SquareState } from "./ChessSquare";

const disposeGroup = (group: Group) => {
  group.traverse((object) => {
    if (object instanceof Mesh || object instanceof Line) {
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((entry) => entry.dispose());
    }
  });
};

export class ChessBoard {
  readonly group = new Group();
  private content = new Group();
  private effects = new Group();
  private squares = new Map<string, ChessSquare>();
  private piece: Group | null = null;
  private targets: Group[] = [];
  private board: BoardState | null = null;

  constructor() {
    this.group.add(this.content, this.effects);
  }

  load(board: BoardState): void {
    disposeGroup(this.content);
    this.group.remove(this.content);
    this.content = new Group();
    this.group.add(this.content);
    disposeGroup(this.effects);
    this.group.remove(this.effects);
    this.effects = new Group();
    this.group.add(this.effects);
    this.squares.clear();
    this.targets = [];
    this.board = board;

    const platform = new Mesh(
      new BoxGeometry(board.cols * SQUARE_SIZE + 0.45, 0.25, board.rows * SQUARE_SIZE + 0.45),
      new MeshStandardMaterial({ color: 0x9a6b49, roughness: 0.7 }),
    );
    platform.position.y = -0.22;
    platform.castShadow = true;
    platform.receiveShadow = true;
    this.content.add(platform);

    for (let row = 0; row < board.rows; row += 1) {
      for (let col = 0; col < board.cols; col += 1) {
        const position = { row, col };
        const square = new ChessSquare(position, (row + col) % 2 === 0);
        square.group.position.copy(boardToWorldPosition(position, board.rows, board.cols, 0));
        this.squares.set(positionKey(position), square);
        this.content.add(square.group);
      }
    }

    this.piece = createChessPiece(board.piece.type);
    this.piece.position.copy(boardToWorldPosition(board.piece.position, board.rows, board.cols, 0.09));
    this.content.add(this.piece);

    board.targets.forEach((position, index) => {
      const target = this.createStar(index);
      target.position.copy(boardToWorldPosition(position, board.rows, board.cols, 0.16));
      target.userData.baseY = target.position.y;
      this.targets.push(target);
      this.content.add(target);
    });

    board.blockers.forEach((position, index) => {
      const blocker = index % 2 === 0 ? this.createRock() : this.createTree();
      blocker.position.copy(boardToWorldPosition(position, board.rows, board.cols, 0.11));
      this.content.add(blocker);
      this.squares.get(positionKey(position))?.setState("blocked");
    });
  }

  getInteractiveMeshes(): Mesh[] {
    return [...this.squares.values()].map((square) => square.mesh);
  }

  getPiece(): Group {
    if (!this.piece) throw new Error("Board has no piece.");
    return this.piece;
  }

  setPiecePosition(position: Position): void {
    if (!this.piece || !this.board) return;
    this.piece.position.copy(boardToWorldPosition(position, this.board.rows, this.board.cols, 0.09));
  }

  getWorldPosition(position: Position, y = 0.09): Vector3 {
    if (!this.board) return new Vector3();
    return boardToWorldPosition(position, this.board.rows, this.board.cols, y);
  }

  clearHighlights(): void {
    if (!this.board) return;
    for (const square of this.squares.values()) square.setState("normal");
    for (const blocker of this.board.blockers) this.setSquareState(blocker, "blocked");
  }

  setSquareState(position: Position, state: SquareState): void {
    this.squares.get(positionKey(position))?.setState(state);
  }

  showMoves(moves: Position[], targets: Position[] = [], hinted = false): void {
    for (const move of moves) {
      const target = targets.some((candidate) => samePosition(candidate, move));
      this.setSquareState(move, target ? "capture-target" : hinted ? "hinted" : "valid-move");
    }
  }

  showSelected(selected: Position[]): void {
    for (const position of selected) this.setSquareState(position, "selected");
  }

  flashIncorrect(position: Position): void {
    const square = this.squares.get(positionKey(position));
    if (!square) return;
    const previous = square.getState();
    square.setState("incorrect");
    window.setTimeout(() => square.setState(previous), 520);
  }

  showGuidePath(from: Position, to: Position, type: BoardState["piece"]["type"]): void {
    disposeGroup(this.effects);
    this.group.remove(this.effects);
    this.effects = new Group();
    this.group.add(this.effects);
    const start = this.getWorldPosition(from, 0.28);
    const end = this.getWorldPosition(to, 0.28);
    const points = type === "knight"
      ? [start, new Vector3(end.x, 0.28, start.z), end]
      : [start, end];
    const line = new Line(
      new BufferGeometry().setFromPoints(points),
      new LineBasicMaterial({ color: type === "bishop" ? 0xc88cff : type === "knight" ? 0xff9a65 : 0x55ddff }),
    );
    this.effects.add(line);
    points.slice(1).forEach((point) => {
      const footprint = new Mesh(
        new CircleGeometry(0.09, 16),
        new MeshStandardMaterial({ color: 0xffffff, emissive: 0x53b9dc, emissiveIntensity: 0.5 }),
      );
      footprint.rotation.x = -Math.PI / 2;
      footprint.position.copy(point);
      this.effects.add(footprint);
    });
  }

  clearGuide(): void {
    disposeGroup(this.effects);
    this.group.remove(this.effects);
    this.effects = new Group();
    this.group.add(this.effects);
  }

  celebrateTarget(position: Position): void {
    if (!this.board) return;
    const index = this.board.targets.findIndex((target) => samePosition(target, position));
    const star = this.targets[index];
    if (!star) return;
    star.userData.celebrating = true;
    star.userData.startedAt = performance.now();
  }

  update(time: number): void {
    this.targets.forEach((star, index) => {
      star.rotation.y = time * 0.0012 + index;
      const baseY = star.userData.baseY as number;
      star.position.y = baseY;
      star.children[0]?.scale.setScalar(1 + Math.sin(time * 0.004 + index) * 0.08);
      if (star.userData.celebrating) {
        const progress = Math.min(1, (time - star.userData.startedAt) / 800);
        star.position.y = baseY + progress * 1.3;
        star.scale.setScalar(1 - progress * 0.7);
        if (progress >= 1) star.visible = false;
      }
    });
  }

  private createStar(index: number): Group {
    const group = new Group();
    const shape = new Shape();
    for (let i = 0; i < 10; i += 1) {
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      const radius = i % 2 === 0 ? 0.33 : 0.15;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    shape.closePath();
    const star = new Mesh(
      new ShapeGeometry(shape),
      new MeshStandardMaterial({ color: index === 0 ? 0xffd84d : 0xff9f43, emissive: 0x9a5a00, emissiveIntensity: 0.45, side: 2 }),
    );
    star.rotation.x = -Math.PI / 2;
    star.castShadow = true;
    group.add(star);
    return group;
  }

  private createRock(): Group {
    const group = new Group();
    const rock = new Mesh(
      new SphereGeometry(0.34, 10, 7),
      new MeshStandardMaterial({ color: 0x718195, roughness: 0.9 }),
    );
    rock.scale.set(1.1, 0.75, 0.9);
    rock.position.y = 0.25;
    rock.rotation.y = 0.5;
    rock.castShadow = true;
    group.add(rock);
    return group;
  }

  private createTree(): Group {
    const group = new Group();
    const trunk = new Mesh(
      new BoxGeometry(0.16, 0.48, 0.16),
      new MeshStandardMaterial({ color: 0x8b5a3c, roughness: 0.9 }),
    );
    trunk.position.y = 0.28;
    const crown = new Mesh(
      new ConeGeometry(0.38, 0.7, 12),
      new MeshStandardMaterial({ color: 0x3b9b65, roughness: 0.8 }),
    );
    crown.position.y = 0.78;
    trunk.castShadow = crown.castShadow = true;
    group.add(trunk, crown);
    return group;
  }
}
