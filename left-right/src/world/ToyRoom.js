import * as THREE from 'three';
import { batchStaticMeshes, block, matte, mesh, oval, rounded, tube } from './Shapes.js';

const floorColors = ['#eed0a6', '#efd3aa', '#f0d6ae', '#ecd0a8', '#edcca3', '#efd2a5'].map((color) => matte(color));
const gap = matte('#dbb687');
const woodGrain = [matte('#e7c499'), matte('#f4d8b3')];
const mint = matte('#a8d9cb');
const wallTrim = matte('#d4eee1');
const seam = matte('#8fc8bc');
const cream = matte('#fff3d8');
const warmCream = matte('#ffe6b0');
const peach = matte('#ef9f89');
const coral = matte('#e98777');
const sky = matte('#8dd2e5');
const paleSky = matte('#bfe9ef');
const violet = matte('#bb9beb');
const deepViolet = matte('#a888db');
const blue = matte('#80bccc');
const straw = matte('#ecc47e');
const walnut = matte('#ba9169');
const terra = matte('#db987b');
const pink = matte('#eeb2a8');
const green = matte('#6bb39b');
const lightGreen = matte('#98cfab');
const rug = matte('#c6adeb', 0.95);
const rugEdge = matte('#ad8fdb', 0.94);
const rugBand = matte('#d4bff2', 0.96);
const rugStitch = matte('#dfcef5', 0.96);
const marketRugColors = new Map([
  [rug, '#b5d9ba'], [rugEdge, '#90be9e'], [rugBand, '#c8e6c9'], [rugStitch, '#e1efdc'],
]);

const WALL_Z = -4.18;
const CIRCLE = Math.PI * 2;

function decorateFloor(room) {
  block(room, floorColors[1], 0, -0.075, 16.65, 50, 0.11, 41.75, false);
  block(room, gap, 0, -0.075, 6.9, 34, 0.113, 22.25, false);
  const boardWidth = 0.71;
  for (let row = 0; row < 45; row++) {
    const z = -3.83 + row * boardWidth;
    const offset = (row % 3) * 0.92;
    for (let col = -5; col <= 5; col++) {
      const x = col * 3.31 + offset;
      const style = floorColors[((row * 7 + col * 13) % floorColors.length + floorColors.length) % floorColors.length];
      block(room, style, x, -0.04, z, 3.305, 0.08, boardWidth - 0.011, false);

      if (row > 13 || Math.abs(col) > 3 || (row + col) % 3 === 1) continue;
      const shift = Math.sin(row * 2.9 + col) * 0.63;
      const grain = block(room, woodGrain[Math.abs(row + col) % woodGrain.length],
        x + shift, 0.0008, z - 0.14, 0.52, 0.0004, 0.012, false);
      grain.rotation.y = Math.sin(row + col) * 0.012;
    }
  }

  const centerZ = 0.27;
  const pad = mesh(room, new THREE.CylinderGeometry(1, 1, 0.032, 96), rugEdge, 0, 0.018, centerZ, false);
  pad.scale.set(5.42, 1, 3.04);
  const top = mesh(room, new THREE.CylinderGeometry(1, 1, 0.014, 96), rug, 0, 0.035, centerZ, false);
  top.scale.set(5.365, 1, 2.994);
  const border = mesh(room, new THREE.RingGeometry(0.903, 0.966, 96), rugBand, 0, 0.046, centerZ, false);
  border.rotation.x = -Math.PI / 2;
  border.scale.set(5.365, 2.994, 1);

  for (let index = 0; index < 88; index++) {
    const angle = index / 88 * CIRCLE;
    const x = Math.cos(angle) * 5.03;
    const z = Math.sin(angle) * 2.8;
    const dash = block(room, rugStitch, x, 0.048, centerZ + z, 0.121, 0.003, 0.027, false);
    dash.rotation.y = -Math.atan2(2.8 * Math.cos(angle), -5.03 * Math.sin(angle));
  }
}

function decorateWall(room) {
  block(room, mint, 0, 7.5, WALL_Z - 0.15, 50, 15, 0.3, false);
  block(room, wallTrim, 0, 0.49, WALL_Z + 0.013, 35, 0.98, 0.05, false);
  block(room, seam, 0, 0.092, WALL_Z + 0.045, 35, 0.184, 0.085, false);
  block(room, cream, 0, 1, WALL_Z + 0.059, 35, 0.083, 0.087, false);
  block(room, cream, 0, 0.153, WALL_Z + 0.098, 35, 0.075, 0.094, false);

  for (let column = -27; column <= 27; column++) {
    block(room, mint, column * 0.62, 0.55, WALL_Z + 0.039, 0.017, 0.807, 0.012, false);
  }
}

function starShape() {
  const shape = new THREE.Shape();
  for (let index = 0; index < 10; index++) {
    const angle = index * Math.PI / 5 + Math.PI / 2;
    const radius = index % 2 === 0 ? 1 : 0.48;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function createWindow(room) {
  const x = -3.89;
  const y = 2.02;
  const z = WALL_Z + 0.16;
  rounded(room, cream, x, y, z, 2.19, 2.07, 0.255, 0.2);
  rounded(room, paleSky, x, y, z + 0.117, 1.92, 1.8, 0.105, 0.16, false);

  oval(room, warmCream, x + 0.48, y + 0.43, z + 0.174, 0.235, 0.235, 0.025, false);
  for (const [dx, dy, scale] of [[-0.57, 0.31, 0.68], [0.38, -0.11, 1]]) {
    oval(room, cream, x + dx, y + dy, z + 0.175, 0.285 * scale, 0.095 * scale, 0.015, false);
    oval(room, cream, x + dx + 0.017, y + dy + 0.08 * scale, z + 0.178, 0.135 * scale, 0.12 * scale, 0.016, false);
    oval(room, cream, x + dx - 0.128 * scale, y + dy + 0.045 * scale, z + 0.179, 0.1 * scale, 0.087 * scale, 0.015, false);
  }
  oval(room, sky, x - 0.41, y - 0.623, z + 0.176, 0.56, 0.26, 0.023, false);
  oval(room, blue, x + 0.412, y - 0.623, z + 0.176, 0.54, 0.26, 0.023, false);
  rounded(room, cream, x, y, z + 0.199, 0.073, 1.799, 0.079, 0.028, false);
  rounded(room, cream, x, y + 0.05, z + 0.198, 1.918, 0.069, 0.078, 0.026, false);
  rounded(room, cream, x, y - 0.985, z + 0.158, 2.36, 0.172, 0.492, 0.077);
}

function createArtwork(room) {
  const frameX = 0.14;
  const frameY = 2.51;
  const frameZ = WALL_Z + 0.126;
  const picture = new THREE.Group();
  rounded(picture, cream, 0, 0, 0, 1.09, 1.16, 0.14, 0.11);
  rounded(picture, pink, 0, 0, 0.076, 0.867, 0.936, 0.033, 0.074, false);

  const arcs = [[coral, 0.322], [warmCream, 0.239], [mint, 0.156]];
  for (const [material, radius] of arcs) {
    const points = [];
    for (let index = 0; index <= 16; index++) {
      const angle = (index / 16) * Math.PI;
      points.push([Math.cos(angle) * radius, Math.sin(angle) * radius - 0.114, 0.108]);
    }
    tube(picture, material, points, 0.04, false, 20);
  }
  oval(picture, cream, -0.27, -0.115, 0.133, 0.141, 0.059, 0.018, false);
  oval(picture, cream, -0.263, -0.081, 0.135, 0.071, 0.054, 0.018, false);
  oval(picture, cream, 0.284, -0.109, 0.133, 0.13, 0.054, 0.018, false);
  oval(picture, cream, 0.258, -0.078, 0.135, 0.061, 0.053, 0.018, false);
  picture.position.set(frameX, frameY, frameZ);
  picture.rotation.z = -0.05;
  room.add(picture);

  const shape = starShape();
  const geometry = new THREE.ShapeGeometry(shape);
  for (const [x, y, scale, material] of [[-1.17, 2.65, 0.1, warmCream], [-0.91, 3.01, 0.082, cream], [1.24, 2.49, 0.107, cream], [1.6, 2.87, 0.072, warmCream]]) {
    const star = mesh(room, geometry, material, x, y, WALL_Z + 0.014, false);
    star.scale.setScalar(scale);
    star.rotation.z = 0.15 * x;
  }
}

function createPlant(room, x, y, z, scale) {
  const plant = new THREE.Group();
  const pot = mesh(plant, new THREE.CylinderGeometry(0.289, 0.224, 0.43, 20), terra, 0, 0.234, 0);
  pot.scale.z = 0.91;
  const rim = mesh(plant, new THREE.CylinderGeometry(0.305, 0.299, 0.093, 24), peach, 0, 0.434, 0);
  rim.scale.z = 0.91;
  const soil = mesh(plant, new THREE.CylinderGeometry(0.263, 0.263, 0.026, 20), walnut, 0, 0.484, 0, false);
  soil.scale.z = 0.9;
  for (const [dx, dy, dz, angle, material] of [[-0.196, 0.76, 0.018, 0.83, green], [0.2, 0.833, 0, -0.68, lightGreen], [-0.051, 0.941, -0.07, 0.16, green], [0.051, 0.693, 0.08, -0.35, lightGreen]]) {
    const leaf = oval(plant, material, dx, dy, dz, 0.12, 0.259, 0.061);
    leaf.rotation.z = angle;
    leaf.rotation.x = -0.23;
  }
  plant.position.set(x, y, z);
  plant.scale.setScalar(scale);
  room.add(plant);
}

function createShelf(room) {
  const x = 3.92;
  const z = -3.48;
  const w = 2.76;
  rounded(room, straw, x, 0.95, z - 0.33, w - 0.165, 1.75, 0.14, 0.05);
  for (const y of [0.23, 0.997, 1.77]) {
    rounded(room, cream, x, y, z, w, 0.143, 0.86, 0.065);
  }
  for (const side of [-1, 1]) {
    rounded(room, cream, x + side * 1.287, 0.995, z, 0.154, 1.62, 0.816, 0.069);
    for (const footZ of [z - 0.249, z + 0.249]) {
      rounded(room, walnut, x + side * 1.073, 0.127, footZ, 0.175, 0.254, 0.175, 0.07);
    }
  }
  rounded(room, cream, x + 0.035, 0.995, z - 0.01, 0.103, 1.564, 0.73, 0.04);

  rounded(room, violet, x + 0.616, 0.521, z + 0.04, 0.99, 0.444, 0.64, 0.082);
  rounded(room, deepViolet, x + 0.616, 0.732, z + 0.04, 1.018, 0.086, 0.67, 0.037);
  rounded(room, cream, x + 0.616, 0.54, z + 0.363, 0.192, 0.056, 0.033, 0.016, false);
  rounded(room, peach, x - 0.687, 0.513, z + 0.04, 0.894, 0.419, 0.62, 0.08);
  rounded(room, coral, x - 0.687, 0.709, z + 0.04, 0.937, 0.083, 0.651, 0.035);
  rounded(room, cream, x - 0.687, 0.526, z + 0.358, 0.192, 0.056, 0.033, 0.016, false);

  for (const [offset, height, material, angle] of [[-1.04, 0.52, blue, -0.09], [-0.831, 0.572, pink, 0.05], [-0.644, 0.485, violet, 0.09], [-0.456, 0.46, lightGreen, -0.11]]) {
    const book = new THREE.Group();
    rounded(book, material, 0, 0, 0, 0.152, height, 0.435, 0.032);
    rounded(book, cream, 0, height * 0.24, 0.225, 0.107, 0.029, 0.021, 0.009, false);
    rounded(book, cream, 0, height * -0.29, 0.225, 0.107, 0.023, 0.021, 0.008, false);
    book.position.set(x + offset, 1.074 + height * 0.495, z + 0.065);
    book.rotation.z = angle;
    room.add(book);
  }

  rounded(room, peach, x + 0.601, 1.192, z, 0.62, 0.238, 0.52, 0.067);
  rounded(room, cream, x + 0.601, 1.3, z, 0.64, 0.066, 0.54, 0.028);
  const toyStar = mesh(room, new THREE.ExtrudeGeometry(starShape(), {
    depth: 0.18, bevelSize: 0.11, bevelThickness: 0.12, bevelSegments: 3, steps: 1,
  }), warmCream, x + 0.61, 1.45, z + 0.038);
  toyStar.scale.setScalar(0.235);
  toyStar.rotation.z = 0.14;

  createPlant(room, x + 0.732, 1.843, z - 0.036, 0.66);
  rounded(room, violet, x - 0.687, 1.923, z, 0.745, 0.167, 0.47, 0.055);
  rounded(room, cream, x - 0.687, 1.935, z + 0.228, 0.61, 0.072, 0.022, 0.012, false);
  const topBook = rounded(room, coral, x - 0.675, 2.061, z, 0.624, 0.123, 0.39, 0.043);
  topBook.rotation.y = -0.15;
}

function createMarketDecor() {
  const market = new THREE.Group();
  const board = new THREE.Group();
  rounded(board, cream, 0, 0, 0, 1.35, 0.96, 0.19, 0.13);
  rounded(board, lightGreen, 0, 0, 0.086, 1.14, 0.75, 0.05, 0.09, false);
  const basket = new THREE.Shape();
  basket.moveTo(-0.33, 0.05);
  basket.lineTo(0.33, 0.05);
  basket.lineTo(0.245, -0.24);
  basket.lineTo(-0.245, -0.24);
  basket.closePath();
  mesh(board, new THREE.ExtrudeGeometry(basket, {
    depth: 0.032, bevelSize: 0.02, bevelThickness: 0.023, bevelSegments: 2, steps: 1,
  }), peach, 0, 0, 0.115, false);
  rounded(board, coral, 0, 0.058, 0.163, 0.754, 0.087, 0.071, 0.028, false);
  tube(board, cream, [[-0.23, 0.08, 0.156], [-0.14, 0.232, 0.156], [0, 0.276, 0.156],
    [0.14, 0.232, 0.156], [0.23, 0.08, 0.156]], 0.027);
  for (const x of [-0.126, 0, 0.126]) {
    rounded(board, cream, x, -0.107, 0.174, 0.034, 0.132, 0.021, 0.01, false);
  }
  board.position.set(0.14, 2.51, WALL_Z + 0.3);
  market.add(board);

  for (const side of [-1, 1]) {
    const z = WALL_Z + 0.04;
    const points = [1.02, 1.42, 1.88, 2.36, 2.79].map((x) => [side * x, 2.68 + 0.19 * (x - 1.89) ** 2, z]);
    tube(market, cream, points, 0.022);
    const flag = new THREE.Shape();
    flag.moveTo(-0.154, 0);
    flag.lineTo(0, -0.254);
    flag.lineTo(0.154, 0);
    flag.closePath();
    const pennant = new THREE.ShapeGeometry(flag);
    [warmCream, coral, lightGreen].forEach((material, index) => {
      const [x, y] = points[index + 1];
      const part = mesh(market, pennant, material, x, y, z + 0.021, false);
      part.rotation.z = side * (index - 1) * 0.12;
    });
  }
  batchStaticMeshes(market);
  market.visible = false;
  return market;
}

export function createToyRoom() {
  const room = new THREE.Group();
  room.name = 'Phòng đồ chơi của Mimo';
  decorateFloor(room);
  decorateWall(room);
  createWindow(room);
  createShelf(room);
  createPlant(room, -5.07, 0, -3.07, 1.04);
  batchStaticMeshes(room);

  const artwork = new THREE.Group();
  createArtwork(artwork);
  batchStaticMeshes(artwork);
  const market = createMarketDecor();
  const rugs = room.children.filter((part) => marketRugColors.has(part.material)).map((part) => {
    const normal = part.material;
    const alternate = normal.clone();
    alternate.color.set(marketRugColors.get(normal));
    return { part, normal, alternate };
  });
  room.add(artwork, market);
  room.userData.setMarketMode = (enabled) => {
    artwork.visible = !enabled;
    market.visible = Boolean(enabled);
    for (const { part, normal, alternate } of rugs) part.material = enabled ? alternate : normal;
  };
  room.userData.disposeMarketMaterials = () => {
    for (const { part, normal, alternate } of rugs) {
      const inactive = part.material === normal ? alternate : normal;
      inactive.dispose();
    }
  };
  return room;
}
