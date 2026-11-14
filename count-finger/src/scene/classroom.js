import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function createClassroom() {
  const room = new THREE.Group();
  room.name = 'Lớp học của Mimo';

  const materials = new Map();
  const boxes = new Map();
  const circle = new THREE.SphereGeometry(1, 16, 10);

  function material(color) {
    if (!materials.has(color)) {
      materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
    }
    return materials.get(color);
  }

  function place(geometry, color, x, y, z) {
    const mesh = new THREE.Mesh(geometry, material(color));
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    room.add(mesh);
    return mesh;
  }

  function box(w, h, d, x, y, z, color, radius = 0.08) {
    const key = [w, h, d, radius].join(',');
    if (!boxes.has(key)) {
      boxes.set(key, radius > 0
        ? new RoundedBoxGeometry(w, h, d, 2, radius)
        : new THREE.BoxGeometry(w, h, d));
    }
    return place(boxes.get(key), color, x, y, z);
  }

  function sphere(x, y, z, w, h, d, color) {
    const mesh = place(circle, color, x, y, z);
    mesh.scale.set(w, h, d);
    return mesh;
  }

  function stroke(from, to, width, z, color) {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const bar = box(Math.hypot(dx, dy) + width / 2, width, width,
      (from[0] + to[0]) / 2, (from[1] + to[1]) / 2, z, color, width / 2);
    bar.rotation.z = Math.atan2(dy, dx);
  }

  const cream = '#fff8e7';
  const wood = '#e7bc91';
  const wallGeometry = new THREE.PlaneGeometry(22, 10, 12, 10);
  const positions = wallGeometry.getAttribute('position');
  const paint = [];
  const corner = new THREE.Color('#ddd0f6');
  const light = new THREE.Color('#f5eaff');
  const color = new THREE.Color();
  for (let i = 0; i < positions.count; i += 1) {
    const x = (positions.getX(i) + 1.3) / 7.2;
    const y = (positions.getY(i) - 0.9) / 4.6;
    color.copy(corner).lerp(light, Math.exp(-x * x - y * y));
    paint.push(color.r, color.g, color.b);
  }
  wallGeometry.setAttribute('color', new THREE.Float32BufferAttribute(paint, 3));
  const wall = new THREE.Mesh(wallGeometry, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
  wall.position.set(0, 4.4, -3.67);
  room.add(wall);
  box(22, 0.62, 0.17, 0, -0.04, -3.64, '#d7cafa', 0);
  box(22, 0.095, 0.18, 0, 0.30, -3.60, '#f5edff', 0);

  box(22, 0.18, 14, 0, -0.48, 3.25, wood, 0);
  const plankColors = ['#f9e5c9', '#f3dab8', '#f8e1c1', '#f6e3c8', '#fbe9d0'];
  const plankPositions = plankColors.map(() => []);
  for (let row = 0; row < 12; row += 1) {
    for (let column = -2; column <= 2; column += 1) {
      const x = (column + (row % 2) * 0.5) * 4.25;
      const z = -3.28 + row * 0.88;
      const index = (row * 2 + column + plankColors.length) % plankColors.length;
      plankPositions[index].push([x, -0.38, z]);
    }
  }
  const plankGeometry = new RoundedBoxGeometry(4.225, 0.08, 0.867, 1, 0.025);
  const transform = new THREE.Matrix4();
  plankPositions.forEach((positions, index) => {
    const planks = new THREE.InstancedMesh(plankGeometry, material(plankColors[index]), positions.length);
    positions.forEach(([x, y, z], plank) => {
      planks.setMatrixAt(plank, transform.makeTranslation(x, y, z));
    });
    planks.receiveShadow = true;
    room.add(planks);
  });

  const stageProfile = new THREE.LatheGeometry([
    new THREE.Vector2(0, -0.34),
    new THREE.Vector2(1.87, -0.34),
    new THREE.Vector2(2.04, -0.28),
    new THREE.Vector2(2.14, -0.15),
    new THREE.Vector2(2.14, 0.02),
    new THREE.Vector2(2.06, 0.15),
    new THREE.Vector2(1.91, 0.20),
    new THREE.Vector2(0, 0.20),
  ], 80);
  const stage = place(stageProfile, '#9a83dd', 0, 0, -0.42);
  stage.scale.z = 0.66;
  const stageTop = new THREE.CylinderGeometry(1.88, 1.88, 0.062, 80);
  place(stageTop, '#faebff', 0, 0.21, -0.42).scale.z = 0.66;
  const rim = place(new THREE.TorusGeometry(1.92, 0.032, 8, 80), '#d8c1ff', 0, 0.202, -0.42);
  rim.rotation.x = Math.PI / 2;
  rim.scale.y = 0.66;

  // Inset window, with the landscape kept behind the frame.
  const windowX = -3.95;
  const windowY = 4.48;
  box(2.46, 2.53, 0.22, windowX, windowY, -3.55, '#c5b7eb', 0.20);
  box(2.25, 2.30, 0.24, windowX, windowY + 0.04, -3.42, cream, 0.17);
  box(1.99, 2.05, 0.16, windowX, windowY + 0.04, -3.27, '#b9e7fd', 0.09);
  sphere(windowX + 0.57, windowY + 0.64, -3.16, 0.21, 0.21, 0.044, '#ffe492');
  for (const [x, y, width, height] of [[-0.56, 0.53, 0.31, 0.10], [-0.54, 0.59, 0.17, 0.13], [0.56, 0.27, 0.22, 0.078], [0.55, 0.31, 0.12, 0.11]]) {
    sphere(windowX + x, windowY + y, -3.11, width, height, 0.045, '#f8ffff');
  }
  sphere(windowX + 0.35, windowY - 0.67, -3.155, 0.62, 0.33, 0.06, '#96dacf');
  sphere(windowX - 0.33, windowY - 0.71, -3.12, 0.63, 0.29, 0.052, '#b9edc6');
  box(0.095, 2.18, 0.09, windowX, windowY + 0.03, -3.07, cream, 0.046);
  box(2.14, 0.095, 0.09, windowX, windowY + 0.04, -3.07, cream, 0.045);
  box(2.63, 0.16, 0.52, windowX, windowY - 1.16, -3.30, '#fff3d0');

  // Rounded chalkboard and a small tray of chalk.
  const boardX = 3.86;
  const boardY = 4.33;
  stroke([boardX - 0.58, boardY + 0.83], [boardX, boardY + 1.23], 0.046, -3.50, '#aa98cf');
  stroke([boardX + 0.58, boardY + 0.83], [boardX, boardY + 1.23], 0.046, -3.50, '#aa98cf');
  sphere(boardX, boardY + 1.23, -3.47, 0.075, 0.075, 0.048, '#ebba7d');
  box(2.72, 1.77, 0.22, boardX, boardY, -3.48, '#c5b1e8', 0.16);
  box(2.66, 1.72, 0.20, boardX, boardY + 0.018, -3.35, '#e8b986', 0.14);
  box(2.41, 1.47, 0.16, boardX, boardY + 0.018, -3.22, '#76bcb5', 0.11);
  box(2.33, 0.12, 0.28, boardX, boardY - 0.79, -3.15, '#fae1b9');
  box(0.33, 0.08, 0.08, boardX - 0.47, boardY - 0.68, -3.06, '#fffad8', 0.04);
  box(0.25, 0.085, 0.10, boardX + 0.19, boardY - 0.68, -3.06, '#ffc4dd', 0.04);

  const chalk = '#fffae2';
  const plusX = boardX - 0.70;
  const lineY = boardY + 0.07;
  stroke([plusX - 0.16, lineY], [plusX + 0.16, lineY], 0.065, -3.12, chalk);
  stroke([plusX, lineY - 0.16], [plusX, lineY + 0.16], 0.065, -3.12, chalk);
  stroke([boardX - 0.14, lineY], [boardX + 0.14, lineY], 0.065, -3.12, chalk);
  for (let i = 0; i < 5; i += 1) {
    const a = (i * Math.PI * 2) / 5 + Math.PI / 2;
    const b = a + Math.PI / 5;
    const c = b + Math.PI / 5;
    const point = (angle, radius) => [boardX + 0.74 + Math.cos(angle) * radius, lineY + Math.sin(angle) * radius];
    stroke(point(a, 0.27), point(b, 0.105), 0.05, -3.12, '#ffde88');
    stroke(point(b, 0.105), point(c, 0.27), 0.05, -3.12, '#ffde88');
  }

  // Low bookcase with grouped books, a peg toy and coloured blocks.
  const cabinetX = 4.43;
  const cabinetZ = -2.84;
  box(2.14, 1.47, 0.59, cabinetX, 0.54, cabinetZ, '#d5b5ee', 0.10);
  box(1.92, 1.17, 0.23, cabinetX, 0.60, cabinetZ + 0.23, '#b995da', 0.05);
  for (const height of [-0.12, 0.52, 1.27]) {
    box(2.24, 0.13, 0.73, cabinetX, height, cabinetZ + 0.055, '#fae2bc');
  }
  for (const side of [-0.99, 0.99]) {
    box(0.19, 1.35, 0.65, cabinetX + side, 0.575, cabinetZ + 0.02, '#e9ceac');
  }
  const books = [
    [-0.76, 0.25, 0.47, '#f29eb5', 0], [-0.56, 0.25, 0.49, '#8dcfd1', 0],
    [-0.31, 0.25, 0.40, '#ffd581', -0.14], [0.53, 0.25, 0.45, '#bfadf3', 0.17],
    [-0.44, 0.92, 0.49, '#a1dccc', 0], [-0.25, 0.92, 0.57, '#8baff0', 0],
    [-0.05, 0.94, 0.48, '#f8c482', 0], [0.21, 0.93, 0.52, '#f8a8bc', -0.17],
  ];
  for (const [x, y, height, color, tilt] of books) {
    box(0.185, height, 0.31, cabinetX + x, y, cabinetZ + 0.30, color, 0.038).rotation.z = tilt;
  }
  box(0.50, 0.14, 0.39, cabinetX - 0.43, 1.40, cabinetZ + 0.16, '#89cfc5');
  box(0.44, 0.13, 0.36, cabinetX - 0.51, 1.53, cabinetZ + 0.16, '#ffc49b').rotation.y = 0.12;
  const peg = place(new THREE.CylinderGeometry(0.29, 0.32, 0.09, 24), '#e8b883', cabinetX + 0.51, 1.39, cabinetZ + 0.14);
  peg.scale.z = 0.94;
  place(new THREE.CylinderGeometry(0.046, 0.046, 0.47, 12), '#ffe3ab', cabinetX + 0.51, 1.62, cabinetZ + 0.14);
  for (const [y, radius, color] of [[1.49, 0.23, '#f5a3ca'], [1.59, 0.18, '#b8a2ff'], [1.69, 0.135, '#a6ddee']]) {
    const ring = place(new THREE.TorusGeometry(radius - 0.06, 0.065, 10, 28),
      color, cabinetX + 0.51, y, cabinetZ + 0.14);
    ring.rotation.x = Math.PI / 2;
  }

  const deskX = -4.46;
  const deskZ = -2.13;
  for (const x of [-0.64, 0.64]) {
    for (const z of [-0.40, 0.40]) {
      const leg = box(0.15, 0.98, 0.15, deskX + x, 0.16, deskZ + z, '#eabb8c', 0.055);
      leg.rotation.z = -x * 0.15;
    }
  }
  box(1.80, 0.20, 1.14, deskX, 0.67, deskZ, '#ffe4ae', 0.085);
  box(1.70, 0.06, 1.02, deskX, 0.78, deskZ, '#fff3ce', 0.029);
  box(0.49, 0.39, 0.48, deskX - 0.35, 1.005, deskZ + 0.09, '#f4a8bd').rotation.y = 0.21;
  sphere(deskX + 0.29, 1.06, deskZ - 0.08, 0.26, 0.26, 0.26, '#a4dccb');
  const cone = place(new THREE.ConeGeometry(0.22, 0.51, 32), '#b6a6ee', deskX + 0.12, 1.04, deskZ + 0.31);
  cone.rotation.z = 0.09;

  // Star decals above the side furniture leave the play area clear.
  const star = new THREE.Shape();
  for (let i = 0; i < 10; i += 1) {
    const angle = Math.PI / 2 + i * Math.PI / 5;
    const radius = i % 2 === 0 ? 0.24 : 0.125;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) star.moveTo(x, y);
    else star.lineTo(x, y);
  }
  star.closePath();
  const sticker = new THREE.ExtrudeGeometry(star, {
    depth: 0.04, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2, steps: 1,
  });
  for (const [x, y, size, tilt, color] of [
    [-2.70, 5.27, 0.76, 0.25, '#fbd787'],
    [-2.92, 5.84, 0.52, -0.18, '#f8b6de'],
    [-5.58, 3.35, 0.53, 0.19, '#f8ce8a'],
    [2.57, 5.67, 0.59, -0.12, '#edb0e2'],
    [5.70, 5.45, 0.69, 0.32, '#ffda8e'],
    [3.16, 2.94, 0.46, 0.25, '#a9e0cb'],
  ]) {
    const charm = place(sticker, color, x, y, -3.59);
    charm.scale.setScalar(size);
    charm.rotation.z = tilt;
  }

  return room;
}
