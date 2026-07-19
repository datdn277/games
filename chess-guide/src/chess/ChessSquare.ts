import {
  BoxGeometry,
  CircleGeometry,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RingGeometry,
} from "three";
import type { Position } from "../game/GameState";

export type SquareState =
  | "normal"
  | "selected"
  | "valid-move"
  | "capture-target"
  | "lesson-target"
  | "blocked"
  | "incorrect"
  | "hinted"
  | "practice-move"
  | "practice-target";

const STATE_COLORS: Record<SquareState, number> = {
  normal: 0xffffff,
  selected: 0x7dd3fc,
  "valid-move": 0x9ee6b8,
  "capture-target": 0xffdc74,
  "lesson-target": 0xffdc74,
  blocked: 0xc6b29a,
  incorrect: 0xff997f,
  hinted: 0xb9e6ff,
  "practice-move": 0xffffff,
  "practice-target": 0xffffff,
};

export class ChessSquare {
  readonly group = new Group();
  readonly mesh: Mesh<BoxGeometry, MeshStandardMaterial>;
  private readonly marker: Mesh<RingGeometry, MeshStandardMaterial>;
  private readonly practiceMarker: Mesh<CircleGeometry, MeshBasicMaterial>;
  private state: SquareState = "normal";

  constructor(readonly position: Position, light: boolean) {
    const baseColor = light ? 0xf8e8bf : 0x78b6b1;
    this.mesh = new Mesh(
      new BoxGeometry(1.13, 0.13, 1.13),
      new MeshStandardMaterial({ color: baseColor, roughness: 0.72, metalness: 0.03 }),
    );
    this.mesh.receiveShadow = true;
    this.mesh.userData.boardPosition = position;
    this.mesh.userData.baseColor = baseColor;
    this.group.add(this.mesh);

    this.marker = new Mesh(
      new RingGeometry(0.23, 0.34, 28),
      new MeshStandardMaterial({ color: 0x147d64, emissive: 0x0d4f42, emissiveIntensity: 0.2 }),
    );
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.position.y = 0.09;
    this.marker.visible = false;
    this.group.add(this.marker);

    this.practiceMarker = new Mesh(
      new CircleGeometry(0.22, 28),
      new MeshBasicMaterial({ color: 0x1b9b73, transparent: true, opacity: 0.52, depthWrite: false }),
    );
    this.practiceMarker.rotation.x = -Math.PI / 2;
    this.practiceMarker.position.y = 0.105;
    this.practiceMarker.visible = false;
    this.group.add(this.practiceMarker);
  }

  setState(state: SquareState): void {
    this.state = state;
    const baseColor = this.mesh.userData.baseColor as number;
    const practiceState = state === "practice-move" || state === "practice-target";
    this.mesh.material.color.set(state === "normal" || practiceState ? baseColor : STATE_COLORS[state]);
    this.mesh.material.emissive = new Color(
      state === "incorrect" ? 0x6b120a : state === "selected" ? 0x075985 : 0x000000,
    );
    this.mesh.material.emissiveIntensity = state === "normal" ? 0 : 0.15;
    this.marker.visible = ["valid-move", "capture-target", "hinted"].includes(state);
    this.marker.material.color.set(
      state === "capture-target" ? 0xf2a900 : state === "hinted" ? 0x267cc9 : 0x147d64,
    );
    this.marker.scale.setScalar(state === "hinted" ? 1.18 : 1);
    this.practiceMarker.visible = practiceState;
    this.practiceMarker.material.color.set(state === "practice-target" ? 0xf1ab16 : 0x168f6a);
    this.practiceMarker.material.opacity = state === "practice-target" ? 0.68 : 0.48;
    this.practiceMarker.scale.setScalar(state === "practice-target" ? 1.16 : 1);
  }

  getState(): SquareState {
    return this.state;
  }
}
