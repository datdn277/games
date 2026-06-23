import * as THREE from '../../crocodile/vendor/three.module.js';

const canvas = document.querySelector('#game-canvas');
const instructionEl = document.querySelector('#instruction');
const scoreEl = document.querySelector('#score');
const mistakeEl = document.querySelector('#mistake');
const hintBtn = document.querySelector('#hint-btn');
const resetBtn = document.querySelector('#reset-btn');
const guideModeToggle = document.querySelector('#guide-mode-toggle');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-8, 8, 5, -5, 0.1, 100);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const dragPoint = new THREE.Vector3();

const CELL = 1.18;
const BOARD_GAP = 0.04;
const SOURCE_CENTER = new THREE.Vector3(-2.35, 1.0, 0);
const TARGET_CENTER = new THREE.Vector3(2.75, 1.0, 0);
const LEGEND_CENTER = new THREE.Vector3(-3.55, -2.95, 0);
const BANK_CENTER = new THREE.Vector3(2.75, -2.95, 0);

const fruitMap = {
  orange: { emoji: '🍊', label: 'Cam', value: 1 },
  avocado: { emoji: '🥑', label: 'Bơ', value: 2 },
  grapes: { emoji: '🍇', label: 'Nho', value: 3 },
  banana: { emoji: '🍌', label: 'Chuối', value: 4 },
  strawberry: { emoji: '🍓', label: 'Dâu', value: 5 },
};

const valueToFruit = Object.fromEntries(Object.entries(fruitMap).map(([key, fruit]) => [fruit.value, key]));

let fruitGrid = [];
let lastGridSignature = '';

let interactives = [];
let sourceCells = [];
let targetCells = [];
let targetState = [];
let bankTiles = new Map();
let legendItems = new Map();
let tweens = [];
let particles = [];
let dragging = null;
let score = 0;
let mistakes = 0;
let allowInput = true;
let demoRunning = false;
let hintBox = null;
let teachingMode = false;
let guideVisuals = [];

const root = new THREE.Group();
scene.add(root);
const FRUIT_POOL = [
  'banana', 'strawberry', 'grapes',
  'avocado', 'orange', 'banana',
  'orange', 'grapes', 'strawberry',
];

function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function generateRandomFruitGrid() {
  let flat = [];
  let signature = '';
  do {
    flat = shuffle(FRUIT_POOL);
    signature = flat.join('|');
  } while (signature === lastGridSignature);
  lastGridSignature = signature;

  return [
    flat.slice(0, 3),
    flat.slice(3, 6),
    flat.slice(6, 9),
  ];
}


function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  const aspect = width / height;

  // Giữ toàn bộ 2 bảng + legend nằm trong camera cả trên desktop và mobile.
  const minWorldWidth = 9.8;
  const minWorldHeight = 9.6;
  let viewHeight = minWorldHeight;
  let viewWidth = viewHeight * aspect;
  if (viewWidth < minWorldWidth) {
    viewWidth = minWorldWidth;
    viewHeight = viewWidth / aspect;
  }

  camera.left = -viewWidth / 2;
  camera.right = viewWidth / 2;
  camera.top = viewHeight / 2;
  camera.bottom = -viewHeight / 2;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

function markInteractive(object, data) {
  object.userData.interactive = data;
  interactives.push(object);
  return object;
}

function getInteractive(object) {
  let current = object;
  while (current) {
    if (current.userData?.interactive) return current.userData.interactive;
    current = current.parent;
  }
  return null;
}

function canvasTexture(width, height, drawer) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  drawer(ctx, width, height);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.needsUpdate = true;
  return texture;
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function makeCellTexture({ fill = '#ffffff', stroke = '#10213a', strokeWidth = 5, radius = 18 } = {}) {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.save();
    ctx.shadowColor = 'rgba(30, 83, 135, 0.12)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    roundRect(ctx, 12, 12, w - 24, h - 24, radius);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = stroke;
    ctx.stroke();
    ctx.restore();
  });
}

function makeHintFrameTexture() {
  return canvasTexture(320, 320, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 18;
    ctx.strokeStyle = '#2f8cff';
    ctx.shadowColor = 'rgba(47, 140, 255, 0.65)';
    ctx.shadowBlur = 26;
    roundRect(ctx, 24, 24, w - 48, h - 48, 30);
    ctx.stroke();
  });
}

function makeFruitTexture(fruitKey, size = 256) {
  const fruit = fruitMap[fruitKey];
  return canvasTexture(size, size, (ctx, w, h) => {
    ctx.save();
    ctx.font = `${Math.floor(w * 0.68)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.13)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 7;
    ctx.fillText(fruit.emoji, w / 2, h / 2 + 4);
    ctx.restore();
  });
}

function makeTextTexture(text, options = {}) {
  const {
    width = 512,
    height = 256,
    fontSize = 96,
    fill = '#ffffff',
    stroke = 'rgba(255,255,255,0.7)',
    textColor = '#19324c',
    shadow = true,
    radius = 48,
    border = true,
    label = '',
  } = options;
  return canvasTexture(width, height, (ctx, w, h) => {
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, fill);
    gradient.addColorStop(1, '#ffffff');
    roundRect(ctx, 14, 14, w - 28, h - 28, radius);
    if (shadow) {
      ctx.shadowColor = 'rgba(38, 84, 130, 0.18)';
      ctx.shadowBlur = 22;
      ctx.shadowOffsetY = 9;
    }
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    if (border) {
      ctx.lineWidth = 8;
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textColor;
    ctx.font = `900 ${fontSize}px Inter, system-ui, sans-serif`;
    ctx.fillText(text, w / 2, label ? h * 0.43 : h / 2 + 4);
    if (label) {
      ctx.font = `800 ${Math.floor(fontSize * 0.28)}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(24, 50, 76, 0.74)';
      ctx.fillText(label, w / 2, h * 0.75);
    }
  });
}

function makePanelTexture(title) {
  return canvasTexture(1200, 360, (ctx, w, h) => {
    ctx.save();
    ctx.shadowColor = 'rgba(43, 113, 157, 0.16)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 12;
    roundRect(ctx, 18, 18, w - 36, h - 36, 56);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(255,255,255,0.94)';
    ctx.stroke();

    const ribbon = ctx.createLinearGradient(0, 0, w, 0);
    ribbon.addColorStop(0, '#ebf6ff');
    ribbon.addColorStop(1, '#fff8df');
    roundRect(ctx, 36, 28, w - 72, 88, 36);
    ctx.fillStyle = ribbon;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(34, 126, 211, 0.10)';
    ctx.stroke();

    ctx.fillStyle = '#17324d';
    ctx.font = '900 54px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, w / 2, 72);
    ctx.restore();
  });
}

function addPlane(group, width, height, material, position = new THREE.Vector3()) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.position.copy(position);
  group.add(mesh);
  return mesh;
}

function createCell(group, x, y, { type, row, col, fruitKey }) {
  const mat = new THREE.MeshBasicMaterial({
    map: makeCellTexture({ fill: type === 'source' ? '#fffef9' : '#ffffff' }),
    transparent: true,
  });
  const cell = addPlane(group, CELL, CELL, mat, new THREE.Vector3(x, y, 0));
  const data = { kind: `${type}Cell`, row, col, mesh: cell, fruitKey };
  markInteractive(cell, data);

  const shadow = addPlane(group, CELL * 0.92, CELL * 0.12, new THREE.MeshBasicMaterial({
    color: 0x2e6d8f,
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
  }), new THREE.Vector3(x, y - CELL * 0.53, -0.05));
  shadow.scale.y = 0.45;

  const item = { row, col, fruitKey, mesh: cell, shadow, center: new THREE.Vector3(x, y, 0), solved: false, tile: null };
  if (type === 'source') sourceCells.push(item);
  else targetCells.push(item);

  return item;
}

function createFruitIcon(fruitKey, x = 0, y = 0, scale = 0.72) {
  const mat = new THREE.MeshBasicMaterial({ map: makeFruitTexture(fruitKey), transparent: true });
  const mesh = addPlane(root, scale, scale, mat, new THREE.Vector3(x, y, 0.08));
  mesh.userData.fruitKey = fruitKey;
  return mesh;
}

function createBoardTitle(text, x, y) {
  const mat = new THREE.MeshBasicMaterial({
    map: makeTextTexture(text, {
      width: 640,
      height: 128,
      fontSize: 46,
      fill: '#ffffff',
      textColor: '#17436e',
      stroke: 'rgba(34, 126, 211, 0.16)',
      radius: 44,
      border: true,
    }),
    transparent: true,
  });
  addPlane(root, 2.7, 0.54, mat, new THREE.Vector3(x, y, 0.02));
}

function gridPosition(center, row, col) {
  const startX = center.x - CELL - BOARD_GAP;
  const startY = center.y + CELL + BOARD_GAP;
  return new THREE.Vector3(startX + col * (CELL + BOARD_GAP), startY - row * (CELL + BOARD_GAP), 0);
}

function buildBoards() {
  sourceCells = [];
  targetCells = [];
  targetState = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => null));

  createBoardTitle('Bảng trái cây', SOURCE_CENTER.x, SOURCE_CENTER.y + 2.17);
  createBoardTitle('Ô điền số', TARGET_CENTER.x, TARGET_CENTER.y + 2.17);

  const sourceGroup = new THREE.Group();
  const targetGroup = new THREE.Group();
  root.add(sourceGroup, targetGroup);

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const sourcePos = gridPosition(SOURCE_CENTER, r, c);
      const targetPos = gridPosition(TARGET_CENTER, r, c);
      const fruitKey = fruitGrid[r][c];
      const source = createCell(sourceGroup, sourcePos.x, sourcePos.y, { type: 'source', row: r, col: c, fruitKey });
      createFruitIcon(fruitKey, source.center.x, source.center.y, 0.78);
      createCell(targetGroup, targetPos.x, targetPos.y, { type: 'target', row: r, col: c, fruitKey });
    }
  }
}

function makeArrowTexture() {
  return canvasTexture(512, 256, (ctx, w, h) => {
    ctx.save();
    ctx.shadowColor = 'rgba(8, 66, 152, 0.28)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#096bff');
    grad.addColorStop(1, '#13b4ff');
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#08285d';
    ctx.lineWidth = 10;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(48, 91);
    ctx.lineTo(286, 91);
    ctx.lineTo(286, 48);
    ctx.lineTo(458, 128);
    ctx.lineTo(286, 208);
    ctx.lineTo(286, 165);
    ctx.lineTo(48, 165);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
}

function buildArrow() {
  const mat = new THREE.MeshBasicMaterial({ map: makeArrowTexture(), transparent: true });
  const arrow = addPlane(root, 1.12, 0.56, mat, new THREE.Vector3(0.18, 0.58, 0.1));
  arrow.scale.set(0.95, 0.95, 1);
  const baseScale = arrow.scale.clone();
  const loopPulse = () => {
    tween(arrow.scale, 700, (t) => {
      const s = 1 + Math.sin(t * Math.PI) * 0.09;
      arrow.scale.set(baseScale.x * s, baseScale.y * s, 1);
    }, loopPulse);
  };
  loopPulse();
}

function buildHintBox() {
  const mat = new THREE.MeshBasicMaterial({
    map: makeHintFrameTexture(),
    transparent: true,
    opacity: 0.98,
    depthWrite: false,
  });
  hintBox = addPlane(root, CELL * 1.06, CELL * 1.06, mat, new THREE.Vector3(TARGET_CENTER.x, TARGET_CENTER.y, 0.42));
  hintBox.visible = false;
  hintBox.userData.loopStarted = true;

  const loopPulse = () => {
    if (!hintBox) return;
    const base = 1;
    tween(hintBox.scale, 820, (t) => {
      const s = base + Math.sin(t * Math.PI) * 0.08;
      hintBox.scale.set(s, s, 1);
    }, loopPulse);
  };
  loopPulse();
}

function moveHintBoxTo(target, immediate = false) {
  if (!hintBox || !target) return;
  hintBox.visible = true;
  const destination = target.center.clone().add(new THREE.Vector3(0, 0, 0.42));
  if (immediate) {
    hintBox.position.copy(destination);
    return;
  }
  animateTo(hintBox, destination, 420, null, easeInOutCubic);
}

function getBoardBounds(center) {
  const startX = center.x - CELL - BOARD_GAP;
  const startY = center.y + CELL + BOARD_GAP;
  return {
    left: startX - CELL / 2,
    right: startX + 2 * (CELL + BOARD_GAP) + CELL / 2,
    top: startY + CELL / 2,
    bottom: startY - 2 * (CELL + BOARD_GAP) - CELL / 2,
  };
}

function clearGuideVisuals() {
  guideVisuals.forEach((obj) => {
    root.remove(obj);
    obj.traverse?.((node) => {
      if (node.geometry) node.geometry.dispose();
      if (node.material) {
        if (Array.isArray(node.material)) node.material.forEach(disposeMaterial);
        else disposeMaterial(node.material);
      }
    });
  });
  guideVisuals = [];
}

function createGuideLabel(text, position, color = '#2f8cff') {
  const label = addPlane(root, 0.94, 0.36, new THREE.MeshBasicMaterial({
    map: makeTextTexture(text, {
      width: 500,
      height: 180,
      fontSize: 60,
      fill: '#ffffff',
      textColor: color,
      stroke: 'rgba(255,255,255,0.95)',
      radius: 70,
    }),
    transparent: true,
    opacity: 0,
    depthWrite: false,
  }), position.clone().add(new THREE.Vector3(0, 0, 0.55)));
  guideVisuals.push(label);
  return label;
}

function makeGuideArrowTexture(color = '#2f8cff', direction = 'horizontal') {
  const isHorizontal = direction === 'horizontal';
  return canvasTexture(isHorizontal ? 1024 : 220, isHorizontal ? 220 : 1024, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = isHorizontal ? 20 : 18;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;

    if (isHorizontal) {
      const y = h / 2;
      ctx.beginPath();
      ctx.moveTo(56, y);
      ctx.lineTo(w - 90, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w - 90, y - 36);
      ctx.lineTo(w - 32, y);
      ctx.lineTo(w - 90, y + 36);
      ctx.closePath();
      ctx.fill();
    } else {
      const x = w / 2;
      ctx.beginPath();
      ctx.moveTo(x, 56);
      ctx.lineTo(x, h - 90);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 36, h - 90);
      ctx.lineTo(x, h - 32);
      ctx.lineTo(x + 36, h - 90);
      ctx.closePath();
      ctx.fill();
    }
  });
}

function createGuideArrow(start, end, color = '#2f8cff') {
  const horizontal = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);
  const length = horizontal ? Math.max(0.5, Math.abs(end.x - start.x)) : Math.max(0.5, Math.abs(end.y - start.y));
  const material = new THREE.MeshBasicMaterial({
    map: makeGuideArrowTexture(color, horizontal ? 'horizontal' : 'vertical'),
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const plane = addPlane(
    root,
    horizontal ? length : 0.46,
    horizontal ? 0.46 : length,
    material,
    new THREE.Vector3((start.x + end.x) / 2, (start.y + end.y) / 2, 0.52),
  );
  guideVisuals.push(plane);
  return plane;
}

function revealGuideObjects(objects, offset = new THREE.Vector3(0, 0, 0)) {
  objects.forEach((obj) => {
    const basePos = obj.position.clone();
    obj.position.copy(basePos.clone().sub(offset));
    if (obj.material?.opacity !== undefined) obj.material.opacity = 0;
    tween(obj, 320, (t) => {
      obj.position.lerpVectors(basePos.clone().sub(offset), basePos, t);
      if (obj.material?.opacity !== undefined) obj.material.opacity = t;
    }, null, easeOutCubic);
  });
}

function showPositionGuides(cell, boardCenter, row, col, palette = { row: '#2f8cff', col: '#ff5ca8' }) {
  const bounds = getBoardBounds(boardCenter);
  const rowStart = new THREE.Vector3(bounds.left - 0.7, cell.center.y, 0);
  const rowEnd = new THREE.Vector3(cell.center.x - CELL * 0.56, cell.center.y, 0);
  const colStart = new THREE.Vector3(cell.center.x, bounds.top + 0.7, 0);
  const colEnd = new THREE.Vector3(cell.center.x, cell.center.y + CELL * 0.56, 0);

  const rowArrow = createGuideArrow(rowStart, rowEnd, palette.row);
  const colArrow = createGuideArrow(colStart, colEnd, palette.col);
  const rowLabel = createGuideLabel(`Dòng ${row + 1}`, new THREE.Vector3(bounds.left - 0.18, cell.center.y + 0.34, 0), palette.row);
  const colLabel = createGuideLabel(`Cột ${col + 1}`, new THREE.Vector3(cell.center.x, bounds.top + 0.34, 0), palette.col);

  revealGuideObjects([rowArrow, rowLabel], new THREE.Vector3(0.32, 0, 0));
  revealGuideObjects([colArrow, colLabel], new THREE.Vector3(0, 0.32, 0));
}

function buildLegend() {
  legendItems = new Map();
  const panel = addPlane(root, 5.35, 1.75, new THREE.MeshBasicMaterial({
    map: makePanelTexture('Bảng quy đổi'),
    transparent: true,
  }), LEGEND_CENTER.clone().add(new THREE.Vector3(0, 0.02, -0.01)));

  const values = [1, 2, 3, 4, 5];
  const spacing = 0.96;
  values.forEach((value, index) => {
    const fruitKey = valueToFruit[value];
    const x = LEGEND_CENTER.x - spacing * 2 + index * spacing;
    const y = LEGEND_CENTER.y - 0.12;
    const fruit = createFruitIcon(fruitKey, x, y + 0.28, 0.44);
    const numMat = new THREE.MeshBasicMaterial({
      map: makeTextTexture(String(value), {
        width: 256,
        height: 256,
        fontSize: 96,
        fill: '#f8fbff',
        textColor: '#17324d',
        stroke: 'rgba(19, 90, 217, 0.12)',
        radius: 70,
      }),
      transparent: true,
    });
    const number = addPlane(root, 0.42, 0.42, numMat, new THREE.Vector3(x, y - 0.36, 0.09));
    legendItems.set(value, { fruit, number, center: new THREE.Vector3(x, y, 0), fruitKey });
  });
}

function createNumberTile(value, x, y, options = {}) {
  const { bank = false, locked = false } = options;
  const group = new THREE.Group();
  group.position.set(x, y, 0.18);
  group.userData.value = value;
  group.userData.locked = locked;

  const fills = ['#fff2c9', '#d9ffef', '#efe3ff', '#ffe0ed', '#dff1ff'];
  const mat = new THREE.MeshBasicMaterial({
    map: makeTextTexture(String(value), {
      width: 512,
      height: 512,
      fontSize: 230,
      fill: fills[(value - 1) % fills.length],
      stroke: 'rgba(255,255,255,0.92)',
      textColor: '#14365a',
      radius: 120,
      label: bank ? 'KÉO' : '',
    }),
    transparent: true,
  });
  const plane = addPlane(group, 0.82, 0.82, mat);
  plane.position.z = 0.1;
  const data = { kind: bank ? 'bankTile' : 'placedTile', value, group, plane, locked };
  markInteractive(plane, data);

  const shadow = addPlane(group, 0.72, 0.16, new THREE.MeshBasicMaterial({
    color: 0x245a87,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
  }), new THREE.Vector3(0.04, -0.43, -0.05));
  shadow.scale.y = 0.55;

  root.add(group);
  return { group, plane, value, shadow, data };
}

function buildBank() {
  bankTiles = new Map();
  const panel = addPlane(root, 5.35, 1.75, new THREE.MeshBasicMaterial({
    map: makePanelTexture('Kéo số vào ô trống'),
    transparent: true,
  }), BANK_CENTER.clone().add(new THREE.Vector3(0, 0.02, -0.01)));

  const spacing = 0.96;
  [1, 2, 3, 4, 5].forEach((value, index) => {
    const tile = createNumberTile(value, BANK_CENTER.x - spacing * 2 + index * spacing, BANK_CENTER.y - 0.20, { bank: true });
    bankTiles.set(value, tile);
  });
}

function clearScene() {
  while (root.children.length) {
    const child = root.children.pop();
    child.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(disposeMaterial);
        else disposeMaterial(obj.material);
      }
    });
  }
  interactives = [];
  tweens = [];
  particles = [];
  dragging = null;
  score = 0;
  mistakes = 0;
  allowInput = true;
  demoRunning = false;
  clearGuideVisuals();
  hintBox = null;
  scoreEl.textContent = '0/9';
  mistakeEl.textContent = '0';
  canvas.classList.remove('dragging');
}

function disposeMaterial(material) {
  if (material.map) material.map.dispose();
  material.dispose();
}

function startGame() {
  clearScene();
  fruitGrid = generateRandomFruitGrid();
  buildBoards();
  buildArrow();
  buildLegend();
  buildBank();
  buildHintBox();
  setInstruction('Quan sát quả ở bảng bên trái. Hãy kéo số đúng vào ô đang được viền sáng ở bảng bên phải. Bật Hướng dẫn chi tiết để xem mũi tên Dòng/Cột và cách tìm số.');
  setTimeout(() => guideNext(), 650);
}

function tween(target, duration, update, onComplete, easing = easeOutCubic) {
  tweens.push({ target, duration, elapsed: 0, update, onComplete, easing });
}

function animateTo(object, to, duration = 420, onComplete, easing = easeOutCubic) {
  const from = object.position.clone();
  const end = to.clone();
  tween(object, duration, (t) => {
    object.position.lerpVectors(from, end, t);
  }, onComplete, easing);
}

function scalePulse(object, scaleUp = 1.16, duration = 520) {
  const base = object.scale.clone();
  tween(object, duration, (t) => {
    const s = 1 + Math.sin(t * Math.PI) * (scaleUp - 1);
    object.scale.set(base.x * s, base.y * s, base.z);
  }, () => object.scale.copy(base), easeOutCubic);
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function setInstruction(message) {
  instructionEl.textContent = message;
}

function findSource(row, col) {
  return sourceCells.find((c) => c.row === row && c.col === col);
}

function findTarget(row, col) {
  return targetCells.find((c) => c.row === row && c.col === col);
}

function nextUnsolved() {
  return targetCells.find((cell) => !cell.solved);
}

function createGlow(position, size = 1.25, color = '#35a7ff', duration = 820) {
  const texture = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 14;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 25;
    roundRect(ctx, 24, 24, w - 48, h - 48, 26);
    ctx.stroke();
  });
  const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.92, depthWrite: false });
  const glow = addPlane(root, size, size, mat, position.clone().add(new THREE.Vector3(0, 0, 0.35)));
  tween(glow, duration, (t) => {
    const s = 1 + t * 0.28;
    glow.scale.set(s, s, 1);
    glow.material.opacity = 0.92 * (1 - t);
  }, () => {
    root.remove(glow);
    glow.geometry.dispose();
    disposeMaterial(glow.material);
  }, easeOutCubic);
}

function pulseTargetCell(target) {
  moveHintBoxTo(target);
  createGlow(target.center, 1.26, '#2f8cff', 760);
}

function pulseSourceCell(source) {
  createGlow(source.center, 1.26, '#53d86a', 820);
  scalePulse(source.mesh, 1.06, 520);
}

function pulseLegend(value) {
  const item = legendItems.get(value);
  if (!item) return;
  createGlow(item.center.clone().add(new THREE.Vector3(0, -0.05, 0)), 0.9, '#53d86a', 820);
  scalePulse(item.fruit, 1.18, 560);
  scalePulse(item.number, 1.2, 560);
}

function pulseBankTile(value) {
  const tile = bankTiles.get(value);
  if (!tile) return;
  createGlow(tile.group.position.clone(), 0.92, '#ff9b2f', 820);
  scalePulse(tile.group, 1.22, 560);
}

function animateGuidePath(from, to, fruitKey, color = '#ffb326', duration = 850) {
  const dot = createFruitIcon(fruitKey, from.x, from.y, 0.34);
  dot.position.z = 0.95;
  const control = new THREE.Vector3((from.x + to.x) / 2, Math.max(from.y, to.y) + 0.85, 0.95);
  tween(dot, duration, (t) => {
    const a = from.clone().lerp(control, t);
    const b = control.clone().lerp(to, t);
    dot.position.copy(a.lerp(b, t));
    dot.rotation.z = Math.sin(t * Math.PI * 2) * 0.12;
  }, () => {
    root.remove(dot);
    dot.geometry.dispose();
    disposeMaterial(dot.material);
    createGlow(to, 0.86, color, 640);
  }, easeInOutCubic);
}

function runTeachingGuide(target, source, fruit) {
  allowInput = false;
  clearGuideVisuals();
  moveHintBoxTo(target, true);
  pulseTargetCell(target);
  setInstruction(`Bước 1: Ở bảng số, hãy xác định ô cần điền bằng Dòng ${target.row + 1} và Cột ${target.col + 1}.`);
  showPositionGuides(target, TARGET_CENTER, target.row, target.col);

  setTimeout(() => {
    clearGuideVisuals();
    setInstruction(`Bước 2: Sang bảng trái, tìm đúng Dòng ${source.row + 1} và Cột ${source.col + 1}. Ô giao nhau chính là vị trí tương ứng.`);
    showPositionGuides(source, SOURCE_CENTER, source.row, source.col);
    pulseSourceCell(source);
  }, 1500);

  setTimeout(() => {
    const legendItem = legendItems.get(fruit.value);
    if (legendItem) {
      animateGuidePath(source.center.clone(), legendItem.center.clone(), source.fruitKey, '#53d86a', 860);
    }
    pulseLegend(fruit.value);
    setInstruction(`Bước 3: Ở vị trí đó là quả ${fruit.label}. Tìm quả ${fruit.label} trong bảng quy đổi để biết số tương ứng.`);
  }, 2800);

  setTimeout(() => {
    const legendItem = legendItems.get(fruit.value);
    const bankTile = bankTiles.get(fruit.value);
    if (legendItem && bankTile) {
      animateGuidePath(legendItem.center.clone(), bankTile.group.position.clone(), source.fruitKey, '#ff9b2f', 860);
    }
    pulseBankTile(fruit.value);
    moveHintBoxTo(target, true);
    createGlow(target.center, 1.22, '#2f8cff', 900);
    setInstruction(`Bước 4: ${fruit.label} tương ứng với số ${fruit.value}. Hãy kéo số ${fruit.value} vào ô viền sáng bên phải.`);
  }, 4100);

  setTimeout(() => {
    clearGuideVisuals();
    allowInput = true;
    demoRunning = false;
  }, 5100);
}

function guideCell(row, col) {
  if (demoRunning) return;
  const target = findTarget(row, col);
  const source = findSource(row, col);
  if (!target || !source || target.solved) return;

  demoRunning = true;
  const fruit = fruitMap[source.fruitKey];

  if (teachingMode) {
    runTeachingGuide(target, source, fruit);
    return;
  }

  setInstruction(`Hãy nhìn ô cùng vị trí ở bảng trái (hàng ${row + 1}, cột ${col + 1}) rồi kéo số đúng vào ô viền sáng bên phải.`);
  pulseTargetCell(target);

  setTimeout(() => {
    demoRunning = false;
  }, 500);
}

function guideNext() {
  const target = nextUnsolved();
  if (!target) return;
  guideCell(target.row, target.col);
}

function updatePointer(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function worldPointFromPointer(event) {
  updatePointer(event);
  raycaster.setFromCamera(pointer, camera);
  raycaster.ray.intersectPlane(dragPlane, dragPoint);
  return dragPoint.clone();
}

function pickInteractive(event) {
  updatePointer(event);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(interactives, false);
  if (!hits.length) return null;
  return getInteractive(hits[0].object);
}

function pointerDown(event) {
  if (!allowInput) return;
  const picked = pickInteractive(event);
  if (!picked) return;

  if (picked.kind === 'sourceCell') {
    guideCell(picked.row, picked.col);
    return;
  }

  if (picked.kind === 'targetCell') {
    const target = findTarget(picked.row, picked.col);
    if (target && !target.solved) guideCell(picked.row, picked.col);
    return;
  }

  if (picked.kind === 'bankTile') {
    const p = worldPointFromPointer(event);
    const tile = createNumberTile(picked.value, p.x, p.y, { bank: false });
    tile.group.position.z = 1.0;
    tile.group.scale.set(1.08, 1.08, 1);
    dragging = {
      value: picked.value,
      tile,
      offset: new THREE.Vector3(0, 0.05, 0),
      fromBank: true,
    };
    canvas.classList.add('dragging');
    renderer.domElement.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }
}

function pointerMove(event) {
  if (!dragging) return;
  const p = worldPointFromPointer(event);
  dragging.tile.group.position.set(p.x + dragging.offset.x, p.y + dragging.offset.y, 1.0);
  event.preventDefault();
}

function pointerUp(event) {
  if (!dragging) return;
  const p = worldPointFromPointer(event);
  const target = targetAtPoint(p);
  const current = dragging;
  dragging = null;
  canvas.classList.remove('dragging');
  renderer.domElement.releasePointerCapture?.(event.pointerId);

  if (!target || target.solved) {
    rejectTile(current.tile, 'Hãy thả số vào một ô trống bên phải nhé.');
    return;
  }

  const expected = fruitMap[target.fruitKey].value;
  if (current.value === expected) {
    acceptTile(current.tile, target, expected);
  } else {
    mistakes += 1;
    mistakeEl.textContent = String(mistakes);
    const wrongFruit = fruitMap[valueToFruit[current.value]]?.label || '';
    setInstruction(`Chưa đúng rồi. Ô này là ${fruitMap[target.fruitKey].label}, không phải số của ${wrongFruit}. Thử lại nhé!`);
    createGlow(target.center, 1.26, '#ff4b4b', 680);
    shake(current.tile.group, () => rejectTile(current.tile));
    guideCell(target.row, target.col);
  }
}

function targetAtPoint(point) {
  return targetCells.find((cell) => {
    return Math.abs(point.x - cell.center.x) <= CELL * 0.52 && Math.abs(point.y - cell.center.y) <= CELL * 0.52;
  });
}

function acceptTile(tile, target, expected) {
  allowInput = false;
  target.solved = true;
  target.tile = tile;
  targetState[target.row][target.col] = expected;
  tile.group.userData.locked = true;
  tile.data.locked = true;
  tile.group.position.z = 0.75;
  animateTo(tile.group, target.center.clone().add(new THREE.Vector3(0, 0, 0.28)), 360, () => {
    allowInput = true;
    score += 1;
    scoreEl.textContent = `${score}/9`;
    setInstruction(`Tuyệt vời! ${fruitMap[target.fruitKey].label} tương ứng với số ${expected}.`);
    createGlow(target.center, 1.28, '#29d66f', 920);
    scalePulse(tile.group, 1.18, 540);
    burst(target.center, expected);
    if (score === 9) {
      setTimeout(winGame, 700);
    } else {
      setTimeout(guideNext, 950);
    }
  }, easeOutCubic);
}

function rejectTile(tile, message) {
  if (message) setInstruction(message);
  const group = tile.group;
  tween(group, 260, (t) => {
    group.scale.setScalar(1 - t * 0.35);
    group.traverse((obj) => {
      if (obj.material?.opacity !== undefined) obj.material.opacity = 1 - t;
    });
  }, () => {
    root.remove(group);
    group.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) disposeMaterial(obj.material);
    });
  });
}

function shake(object, onComplete) {
  const base = object.position.clone();
  tween(object, 420, (t) => {
    const amp = (1 - t) * 0.18;
    object.position.x = base.x + Math.sin(t * Math.PI * 10) * amp;
    object.position.y = base.y + Math.sin(t * Math.PI * 7) * amp * 0.35;
  }, () => {
    object.position.copy(base);
    onComplete?.();
  }, (t) => t);
}

function burst(center, value) {
  const fruitKey = valueToFruit[value];
  for (let i = 0; i < 16; i++) {
    const angle = (Math.PI * 2 * i) / 16;
    const speed = 0.7 + Math.random() * 0.45;
    const icon = Math.random() > 0.45 ? createFruitIcon(fruitKey, center.x, center.y, 0.22) : createSpark(center.x, center.y);
    icon.position.z = 1.2;
    particles.push({
      mesh: icon,
      velocity: new THREE.Vector3(Math.cos(angle) * speed, Math.sin(angle) * speed, 0),
      life: 0,
      maxLife: 0.75 + Math.random() * 0.25,
      spin: (Math.random() - 0.5) * 4,
    });
  }
}

function createSpark(x, y) {
  const texture = canvasTexture(128, 128, (ctx, w, h) => {
    ctx.translate(w / 2, h / 2);
    ctx.fillStyle = '#ffd54d';
    ctx.shadowColor = '#ff9e1a';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const radius = i % 2 === 0 ? 50 : 18;
      const angle = (Math.PI * 2 * i) / 8 - Math.PI / 2;
      ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fill();
  });
  const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
  return addPlane(root, 0.22, 0.22, mat, new THREE.Vector3(x, y, 1.2));
}

function winGame() {
  allowInput = false;
  if (hintBox) hintBox.visible = false;
  setInstruction('Con đã hoàn thành! Con hiểu rằng mỗi quả có một số, và vị trí bên phải giữ nguyên hàng/cột như bên trái.');
  const center = new THREE.Vector3((SOURCE_CENTER.x + TARGET_CENTER.x) / 2, 0.58, 0);
  for (let i = 0; i < 80; i++) {
    setTimeout(() => burst(center.clone().add(new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 2.5, 0)), 1 + (i % 5)), i * 18);
  }
  targetCells.forEach((cell, index) => setTimeout(() => createGlow(cell.center, 1.25, '#35a7ff', 900), index * 80));
  setTimeout(() => { allowInput = true; }, 1800);
}

function updateTweens(deltaMs) {
  tweens = tweens.filter((tw) => {
    tw.elapsed += deltaMs;
    const raw = Math.min(tw.elapsed / tw.duration, 1);
    const t = tw.easing ? tw.easing(raw) : raw;
    tw.update(t, raw);
    if (raw >= 1) {
      tw.onComplete?.();
      return false;
    }
    return true;
  });
}

function updateParticles(delta) {
  particles = particles.filter((p) => {
    p.life += delta;
    p.mesh.position.x += p.velocity.x * delta;
    p.mesh.position.y += p.velocity.y * delta;
    p.velocity.y -= 1.35 * delta;
    p.mesh.rotation.z += p.spin * delta;
    const t = p.life / p.maxLife;
    p.mesh.scale.setScalar(Math.max(0.01, 1 - t * 0.5));
    if (p.mesh.material?.opacity !== undefined) p.mesh.material.opacity = Math.max(0, 1 - t);
    if (t >= 1) {
      root.remove(p.mesh);
      p.mesh.traverse?.((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) disposeMaterial(obj.material);
      });
      return false;
    }
    return true;
  });
}

let last = performance.now();
function animate(now = performance.now()) {
  const deltaMs = now - last;
  last = now;
  updateTweens(deltaMs);
  updateParticles(deltaMs / 1000);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

renderer.domElement.addEventListener('pointerdown', pointerDown);
renderer.domElement.addEventListener('pointermove', pointerMove);
renderer.domElement.addEventListener('pointerup', pointerUp);
renderer.domElement.addEventListener('pointercancel', pointerUp);
hintBtn.addEventListener('click', guideNext);
resetBtn.addEventListener('click', startGame);
guideModeToggle?.addEventListener('change', (event) => {
  teachingMode = Boolean(event.target.checked);
  setInstruction(teachingMode
    ? 'Chế độ Hướng dẫn chi tiết đã bật. Bấm Gợi ý để xem mũi tên Dòng/Cột và cách tìm số.'
    : 'Chế độ Hướng dẫn chi tiết đã tắt. Game chỉ viền sáng ô cần điền ở bảng số.');
});

startGame();
animate();
