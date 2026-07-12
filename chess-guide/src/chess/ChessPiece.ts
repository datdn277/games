import {
  BoxGeometry,
  CapsuleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
} from "three";
import type { PieceType } from "../game/GameState";

const material = (color: number, roughness = 0.46, metalness = 0.08) =>
  new MeshStandardMaterial({ color, roughness, metalness });

const addMesh = (
  group: Group,
  geometry: ConstructorParameters<typeof Mesh>[0],
  meshMaterial: MeshStandardMaterial,
  position: [number, number, number],
  scale: [number, number, number] = [1, 1, 1],
) => {
  const mesh = new Mesh(geometry, meshMaterial);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
};

const addFace = (group: Group, y: number, z: number, spread = 0.13) => {
  const eye = material(0x15283b, 0.8, 0);
  addMesh(group, new SphereGeometry(0.045, 12, 8), eye, [-spread, y, z]);
  addMesh(group, new SphereGeometry(0.045, 12, 8), eye, [spread, y, z]);
  const smile = addMesh(group, new TorusGeometry(0.105, 0.018, 8, 20, Math.PI), eye, [0, y - 0.1, z + 0.01]);
  smile.rotation.z = Math.PI;
};

function createRook(): Group {
  const group = new Group();
  const blue = material(0x2f9bd3, 0.38, 0.12);
  const dark = material(0x1d608f, 0.5, 0.08);
  const gold = material(0xffcf4d, 0.32, 0.22);
  addMesh(group, new CylinderGeometry(0.41, 0.5, 0.18, 24), dark, [0, 0.16, 0]);
  addMesh(group, new CylinderGeometry(0.3, 0.39, 0.72, 20), blue, [0, 0.6, 0]);
  addMesh(group, new CylinderGeometry(0.43, 0.33, 0.22, 20), gold, [0, 1.02, 0]);
  for (let i = 0; i < 4; i += 1) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    addMesh(group, new BoxGeometry(0.24, 0.22, 0.24), blue, [Math.cos(angle) * 0.27, 1.22, Math.sin(angle) * 0.27]);
  }
  addFace(group, 0.73, 0.295, 0.11);
  return group;
}

function createBishop(): Group {
  const group = new Group();
  const purple = material(0x8b62d5, 0.4, 0.1);
  const deep = material(0x553399, 0.52, 0.06);
  const gold = material(0xffcf4d, 0.35, 0.18);
  addMesh(group, new CylinderGeometry(0.4, 0.49, 0.17, 24), deep, [0, 0.15, 0]);
  addMesh(group, new ConeGeometry(0.34, 0.78, 24), purple, [0, 0.58, 0]);
  addMesh(group, new SphereGeometry(0.26, 22, 14), purple, [0, 0.93, 0]);
  const hat = addMesh(group, new ConeGeometry(0.29, 0.55, 22), deep, [0.06, 1.25, 0]);
  hat.rotation.z = -0.16;
  addMesh(group, new SphereGeometry(0.065, 12, 10), gold, [0.11, 1.56, 0]);
  addFace(group, 0.96, 0.245, 0.095);
  return group;
}

function createKnight(): Group {
  const group = new Group();
  const coral = material(0xed6f5a, 0.43, 0.08);
  const dark = material(0xa53e47, 0.55, 0.05);
  const cream = material(0xffdd9d, 0.55, 0.02);
  addMesh(group, new CylinderGeometry(0.4, 0.5, 0.18, 24), dark, [0, 0.15, 0]);
  addMesh(group, new CapsuleGeometry(0.24, 0.52, 8, 16), coral, [0, 0.65, -0.04]);
  const muzzle = addMesh(group, new CapsuleGeometry(0.16, 0.28, 8, 14), cream, [0, 1.04, 0.17]);
  muzzle.rotation.x = Math.PI / 2.6;
  addMesh(group, new ConeGeometry(0.09, 0.27, 12), coral, [-0.17, 1.28, -0.05]);
  addMesh(group, new ConeGeometry(0.09, 0.27, 12), coral, [0.17, 1.28, -0.05]);
  const mane = addMesh(group, new BoxGeometry(0.11, 0.65, 0.23), dark, [0, 0.96, -0.22]);
  mane.rotation.x = -0.2;
  addFace(group, 1.08, 0.275, 0.105);
  return group;
}

export function createChessPiece(type: PieceType): Group {
  const piece = type === "rook" ? createRook() : type === "bishop" ? createBishop() : createKnight();
  piece.name = `piece-${type}`;
  piece.userData.pieceType = type;
  return piece;
}
