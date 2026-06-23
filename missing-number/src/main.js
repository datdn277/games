
let THREE;

try {
  THREE = await import('three');
} catch {
  THREE = await import('../../crocodile/vendor/three.module.js');
}

const canvas = document.querySelector('#game-canvas');
const instructionEl = document.querySelector('#instruction');
const scoreEl = document.querySelector('#score');
const mistakeEl = document.querySelector('#mistake');
const hintBtn = document.querySelector('#hint-btn');
const resetBtn = document.querySelector('#reset-btn');
const teachToggle = document.querySelector('#teach-toggle');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.96;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xe6f6ff, 14, 34);

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 40);
camera.position.set(0, 0.35, 11.3);
camera.lookAt(0, -0.45, 0);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const dragPoint = new THREE.Vector3();

const NUMBERS = [1, 2, 3, 4, 5, 6];
const ROWS = 2;
const COLS = 3;
const CELL = 1.34;
const GAP = 0.055;
const BOARD_W = COLS * CELL + (COLS - 1) * GAP;
const BOARD_H = ROWS * CELL + (ROWS - 1) * GAP;
const BOARD_CENTER = new THREE.Vector3(0, 0.26, 0);
const BANK_CENTER = new THREE.Vector3(0, -3.04, 0);
const WRONG_TILE_HIDE_DELAY = 3000;

const root = new THREE.Group();
scene.add(root);

const decorRoot = new THREE.Group();
scene.add(decorRoot);

const sharedGeometries = new Map();
const floatingDecor = [];

let board = null;
let interactives = [];
let cells = [];
let bankTiles = new Map();
let guideTiles = new Map();
let tweens = [];
let particles = [];
let wrongTiles = [];
let dragging = null;
let activeFrame = null;
let score = 0;
let mistakes = 0;
let allowInput = true;
let demoRunning = false;
let teachingMode = false;
let lastBoardSignature = '';
let guideTimers = [];

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  const aspect = width / height;
  camera.aspect = aspect;
  camera.fov = aspect < 0.72 ? 49 : aspect < 1.05 ? 43 : 38;
  camera.position.set(0, aspect < 0.72 ? 0.58 : 0.35, aspect < 0.72 ? 13.4 : 11.3);
  camera.lookAt(0, -0.45, 0);
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

function isGuideLayout() {
  return teachingMode;
}

function getBoardCenter() {
  if (!isGuideLayout()) return BOARD_CENTER.clone();
  const shift = camera.aspect < 0.84 ? -1.45 : -2.02;
  return BOARD_CENTER.clone().add(new THREE.Vector3(shift, 0, 0));
}

function getBankCenter() {
  if (!isGuideLayout()) return BANK_CENTER.clone();
  const shift = camera.aspect < 0.84 ? -0.34 : -0.72;
  return BANK_CENTER.clone().add(new THREE.Vector3(shift, 0, 0));
}

function getGuideTrayCenter() {
  return new THREE.Vector3(camera.aspect < 0.84 ? 2.08 : 2.72, 0.02, 0);
}

function scheduleGuideTask(callback, delay) {
  const timer = setTimeout(() => {
    guideTimers = guideTimers.filter((item) => item !== timer);
    callback();
  }, delay);
  guideTimers.push(timer);
  return timer;
}

function clearGuideTasks() {
  guideTimers.forEach((timer) => clearTimeout(timer));
  guideTimers = [];
}

function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function generateBoard() {
  let numbers;
  let missingIndex;
  let missingValue;
  let signature;

  do {
    numbers = shuffle(NUMBERS);
    missingIndex = Math.floor(Math.random() * numbers.length);
    missingValue = numbers[missingIndex];
    numbers[missingIndex] = null;
    signature = `${numbers.join(',')}:${missingValue}`;
  } while (signature === lastBoardSignature);

  lastBoardSignature = signature;
  return { numbers, missingIndex, missingValue };
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

function roundedRectShape(width, height, radius) {
  const w = width / 2;
  const h = height / 2;
  const r = Math.min(radius, w, h);
  const shape = new THREE.Shape();
  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.quadraticCurveTo(w, -h, w, -h + r);
  shape.lineTo(w, h - r);
  shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-w + r, h);
  shape.quadraticCurveTo(-w, h, -w, h - r);
  shape.lineTo(-w, -h + r);
  shape.quadraticCurveTo(-w, -h, -w + r, -h);
  return shape;
}

function getRoundedBoxGeometry(width, height, depth, radius = Math.min(width, height) * 0.18) {
  const key = [width, height, depth, radius].map((value) => value.toFixed(3)).join(':');
  if (!sharedGeometries.has(key)) {
    const geometry = new THREE.ExtrudeGeometry(roundedRectShape(width, height, radius), {
      depth,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      curveSegments: 6,
      bevelSize: Math.min(radius * 0.28, depth * 0.46),
      bevelThickness: Math.min(depth * 0.32, radius * 0.2),
    });
    geometry.center();
    geometry.computeVertexNormals();
    geometry.userData.shared = true;
    sharedGeometries.set(key, geometry);
  }
  return sharedGeometries.get(key);
}

function disposeMaterial(material) {
  if (material.map) material.map.dispose();
  material.dispose();
}

function disposeObject(object) {
  object.traverse?.((node) => {
    if (node.geometry && !node.geometry.userData?.shared) node.geometry.dispose();
    if (node.material) {
      if (Array.isArray(node.material)) node.material.forEach(disposeMaterial);
      else disposeMaterial(node.material);
    }
  });
}

function addPlane(group, width, height, material, position = new THREE.Vector3()) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.position.copy(position);
  if (!Array.isArray(material) && material.opacity !== undefined) {
    mesh.userData.opacityScale = material.opacity;
  }
  group.add(mesh);
  return mesh;
}

function forEachMaterial(object, callback) {
  object.traverse?.((node) => {
    if (!node.material) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach(callback);
  });
}

function setGroupOpacity(group, opacity) {
  group.userData.currentOpacity = opacity;
  group.traverse?.((node) => {
    if (!node.material) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    const opacityScale = node.userData?.opacityScale ?? 1;
    materials.forEach((material) => {
      if (material.opacity === undefined) return;
      material.transparent = opacity < 1 || material.transparent;
      material.opacity = opacityScale * opacity;
    });
  });
}

function animateGroupOpacity(group, to, duration = 320) {
  const from = group.userData.currentOpacity ?? 1;
  tween(group.userData, duration, (t) => {
    setGroupOpacity(group, THREE.MathUtils.lerp(from, to, t));
  }, () => setGroupOpacity(group, to), easeInOutCubic);
}

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

function makeTextTexture(text, options = {}) {
  const {
    width = 512,
    height = 512,
    fontSize = 200,
    fill = '#ffffff',
    textColor = '#16324f',
    stroke = 'rgba(255,255,255,0.96)',
    radius = 96,
    label = '',
    labelColor = 'rgba(22, 50, 79, 0.65)',
    border = true,
    shadow = true,
  } = options;

  return canvasTexture(width, height, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.35, fill);
    grad.addColorStop(1, '#fff7ee');

    roundRect(ctx, 16, 16, w - 32, h - 32, radius);
    if (shadow) {
      ctx.shadowColor = 'rgba(41, 95, 146, 0.22)';
      ctx.shadowBlur = 28;
      ctx.shadowOffsetY = 14;
    }
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    if (border) {
      ctx.lineWidth = 8;
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }

    const gloss = ctx.createLinearGradient(0, 24, 0, h * 0.52);
    gloss.addColorStop(0, 'rgba(255,255,255,0.58)');
    gloss.addColorStop(1, 'rgba(255,255,255,0)');
    roundRect(ctx, 42, 34, w - 84, h * 0.28, radius * 0.65);
    ctx.fillStyle = gloss;
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textColor;
    ctx.font = `900 ${fontSize}px Inter, system-ui, sans-serif`;
    ctx.shadowColor = 'rgba(255,255,255,0.34)';
    ctx.shadowBlur = 12;
    ctx.fillText(text, w / 2, label ? h * 0.42 : h / 2 + 7);
    ctx.shadowColor = 'transparent';

    if (label) {
      ctx.font = `850 ${Math.floor(fontSize * 0.24)}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = labelColor;
      ctx.fillText(label, w / 2, h * 0.74);
    }
  });
}

function makeCellTexture({ empty = false } = {}) {
  return canvasTexture(320, 320, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, empty ? '#fffde8' : '#ffffff');
    grad.addColorStop(1, empty ? '#ffe8a8' : '#eef8ff');

    ctx.save();
    ctx.shadowColor = 'rgba(36, 84, 130, 0.12)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 7;
    roundRect(ctx, 20, 20, w - 40, h - 40, 30);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 6;
    ctx.strokeStyle = empty ? 'rgba(212, 138, 8, 0.62)' : 'rgba(17, 40, 67, 0.22)';
    ctx.stroke();

    const gloss = ctx.createLinearGradient(0, 26, 0, h * 0.48);
    gloss.addColorStop(0, 'rgba(255,255,255,0.64)');
    gloss.addColorStop(1, 'rgba(255,255,255,0)');
    roundRect(ctx, 36, 30, w - 72, h * 0.24, 26);
    ctx.fillStyle = gloss;
    ctx.fill();

    if (empty) {
      ctx.setLineDash([18, 12]);
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#ffb326';
      roundRect(ctx, 52, 52, w - 104, h - 104, 24);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffb326';
      ctx.font = '900 102px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', w / 2, h / 2 + 8);
    }
    ctx.restore();
  });
}

function makeBoardCardTexture() {
  return canvasTexture(960, 760, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.58, '#f3fbff');
    grad.addColorStop(1, '#e7f5ff');
    roundRect(ctx, 18, 22, w - 36, h - 44, 54);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(255,255,255,0.88)';
    ctx.stroke();

    const band = ctx.createLinearGradient(0, 0, w, 0);
    band.addColorStop(0, '#73c3ff');
    band.addColorStop(0.55, '#8ce2ff');
    band.addColorStop(1, '#ffe69a');
    roundRect(ctx, 52, 40, w - 104, 112, 34);
    ctx.fillStyle = band;
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    roundRect(ctx, 84, 52, w - 168, 30, 15);
    ctx.fill();

    ctx.fillStyle = '#17324d';
    ctx.font = '900 52px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Nhóm số 1 → 6', w / 2, 95);

    ctx.font = '760 32px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(23,50,77,0.62)';
    ctx.fillText('Tìm số chưa xuất hiện trong nhóm', w / 2, 178);
  });
}

function makePanelTexture(title, subtitle = '') {
  return canvasTexture(1400, 420, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#eef9ff');
    roundRect(ctx, 18, 18, w - 36, h - 36, 54);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 7;
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.stroke();

    const pillGrad = ctx.createLinearGradient(0, 0, w, 0);
    pillGrad.addColorStop(0, 'rgba(121, 203, 255, 0.2)');
    pillGrad.addColorStop(1, 'rgba(255, 210, 124, 0.22)');
    roundRect(ctx, 62, 40, w - 124, 92, 28);
    ctx.fillStyle = pillGrad;
    ctx.fill();

    ctx.fillStyle = '#17324d';
    ctx.font = '900 50px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, w / 2, subtitle ? 86 : h / 2);

    if (subtitle) {
      ctx.font = '750 31px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(23, 50, 77, 0.62)';
      ctx.fillText(subtitle, w / 2, 150);
    }
  });
}

function makeGuideTrayTexture(title, subtitle = '') {
  return canvasTexture(1800, 620, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#eef8ff');
    roundRect(ctx, 24, 24, w - 48, h - 48, 66);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.stroke();

    const band = ctx.createLinearGradient(0, 0, w, 0);
    band.addColorStop(0, '#79c9ff');
    band.addColorStop(1, '#ffe08b');
    roundRect(ctx, 70, 54, w - 140, 156, 38);
    ctx.fillStyle = band;
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    roundRect(ctx, 110, 74, w - 220, 42, 20);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#17324d';
    ctx.font = '900 72px Inter, system-ui, sans-serif';
    ctx.fillText(title, w / 2, 138);

    ctx.fillStyle = 'rgba(23, 50, 77, 0.62)';
    ctx.font = '800 42px Inter, system-ui, sans-serif';
    ctx.fillText(subtitle, w / 2, 228);

    ctx.fillStyle = 'rgba(23, 50, 77, 0.08)';
    for (let col = 0; col < 6; col += 1) {
      roundRect(ctx, 112 + col * 268, 322, 206, 214, 46);
      ctx.fill();
    }
  });
}

function makeGlowTexture(color = '#2f8cff', dashed = false) {
  return canvasTexture(320, 320, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 18;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 24;
    if (dashed) ctx.setLineDash([26, 14]);
    roundRect(ctx, 26, 26, w - 52, h - 52, 30);
    ctx.stroke();
  });
}

function makeSparkTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.translate(w / 2, h / 2);
    ctx.fillStyle = '#ffd54d';
    ctx.shadowColor = '#ff9e1a';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const radius = i % 2 === 0 ? 50 : 18;
      const angle = (Math.PI * 2 * i) / 8 - Math.PI / 2;
      ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fill();
  });
}

function makeSoftShadowTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const grad = ctx.createRadialGradient(w / 2, h / 2, 18, w / 2, h / 2, w / 2);
    grad.addColorStop(0, 'rgba(26, 57, 82, 0.48)');
    grad.addColorStop(0.55, 'rgba(26, 57, 82, 0.18)');
    grad.addColorStop(1, 'rgba(26, 57, 82, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
}

function makeOrbTexture(color) {
  return canvasTexture(512, 512, (ctx, w, h) => {
    const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.08, w / 2, h / 2, w * 0.5);
    grad.addColorStop(0, color);
    grad.addColorStop(0.34, color.replace('1)', '0.58)'));
    grad.addColorStop(1, color.replace('1)', '0)'));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
}

function createRoundedBox(width, height, depth, options = {}) {
  const {
    color = 0xffffff,
    radius = Math.min(width, height) * 0.18,
    roughness = 0.4,
    metalness = 0.04,
    emissive = 0x000000,
    emissiveIntensity = 0,
    position = null,
  } = options;

  const mesh = new THREE.Mesh(
    getRoundedBoxGeometry(width, height, depth, radius),
    new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      emissive,
      emissiveIntensity,
    }),
  );
  if (position) mesh.position.copy(position);
  return mesh;
}

function addShadowBlob(group, width, height, opacity, position) {
  const shadow = addPlane(group, width, height, new THREE.MeshBasicMaterial({
    map: makeSoftShadowTexture(),
    transparent: true,
    opacity,
    depthWrite: false,
  }), position);
  shadow.rotation.z = Math.random() * 0.16 - 0.08;
  return shadow;
}

function buildBackdrop() {
  const glows = [
    { size: 6.4, x: -5.2, y: 2.8, z: -6.5, color: 'rgba(121, 207, 255, 1)', opacity: 0.32, amplitude: 0.18, speed: 0.55 },
    { size: 5.4, x: 5.3, y: 0.9, z: -6.8, color: 'rgba(255, 222, 138, 1)', opacity: 0.28, amplitude: 0.22, speed: 0.72 },
    { size: 4.2, x: -0.5, y: -4.7, z: -7.4, color: 'rgba(170, 225, 255, 1)', opacity: 0.22, amplitude: 0.16, speed: 0.48 },
    { size: 2.8, x: 4.2, y: 3.9, z: -6.3, color: 'rgba(255, 179, 120, 1)', opacity: 0.16, amplitude: 0.14, speed: 0.91 },
  ];

  glows.forEach((item, index) => {
    const orb = addPlane(decorRoot, item.size, item.size, new THREE.MeshBasicMaterial({
      map: makeOrbTexture(item.color),
      transparent: true,
      opacity: item.opacity,
      depthWrite: false,
    }), new THREE.Vector3(item.x, item.y, item.z));
    floatingDecor.push({
      mesh: orb,
      basePosition: orb.position.clone(),
      amplitude: item.amplitude,
      speed: item.speed,
      phase: index * 1.4,
    });
  });

  const floorGlow = addPlane(decorRoot, 15.5, 8.6, new THREE.MeshBasicMaterial({
    map: makeOrbTexture('rgba(255, 255, 255, 1)'),
    transparent: true,
    opacity: 0.15,
    depthWrite: false,
  }), new THREE.Vector3(0, -4.2, -8));
  floorGlow.scale.y = 0.44;
}

const hemiLight = new THREE.HemisphereLight(0xffffff, 0xb7dcff, 1.08);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 1.15);
keyLight.position.set(-4.6, 6.2, 8.4);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x8fd8ff, 0.4);
fillLight.position.set(5.2, -1.4, 7.2);
scene.add(fillLight);

const warmLight = new THREE.PointLight(0xffd37d, 0.34, 28, 2);
warmLight.position.set(4.8, 3.6, 5.6);
scene.add(warmLight);

buildBackdrop();

function cellPosition(cellIndex) {
  const boardCenter = getBoardCenter();
  const row = Math.floor(cellIndex / COLS);
  const col = cellIndex % COLS;
  const startX = boardCenter.x - BOARD_W / 2 + CELL / 2;
  const startY = boardCenter.y + BOARD_H / 2 - CELL / 2 - 0.26;
  return new THREE.Vector3(
    startX + col * (CELL + GAP),
    startY - row * (CELL + GAP),
    0,
  );
}

function createNumberTile(value, x, y, options = {}) {
  const { bank = false, fixed = false, guide = false } = options;
  const group = new THREE.Group();
  group.position.set(x, y, guide ? 0.38 : bank ? 0.34 : 0.88);
  group.userData.value = value;

  const fills = ['#ffe39b', '#bff2dc', '#d9c8ff', '#ffc7d8', '#c7e5ff', '#ffe0b7'];
  const size = guide ? 0.66 : bank ? 0.74 : 0.92;
  const depth = guide ? 0.16 : bank ? 0.18 : 0.22;

  addShadowBlob(group, size * 0.94, size * 0.34, guide ? 0.16 : bank ? 0.18 : 0.22, new THREE.Vector3(0.04, -size * 0.5, -0.16));
  group.add(createRoundedBox(size * 0.96, size * 0.96, depth, {
    color: fills[(value - 1) % fills.length],
    roughness: 0.3,
    metalness: 0.08,
  }));
  group.add(createRoundedBox(size * 0.84, size * 0.84, depth * 0.24, {
    color: 0xffffff,
    roughness: 0.18,
    metalness: 0.14,
    position: new THREE.Vector3(0, 0, depth * 0.54),
  }));

  const mat = new THREE.MeshBasicMaterial({
    map: makeTextTexture(String(value), {
      width: 512,
      height: 512,
      fontSize: guide ? 190 : bank ? 205 : 250,
      fill: fills[(value - 1) % fills.length],
      textColor: '#14365a',
      stroke: 'rgba(255,255,255,0.95)',
      radius: 112,
      label: guide ? '' : bank ? 'KÉO' : '',
    }),
    transparent: true,
  });

  const plane = addPlane(group, size * 0.84, size * 0.84, mat, new THREE.Vector3(0, 0, depth * 0.68 + 0.02));
  addPlane(group, size * 0.72, size * 0.14, new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
  }), new THREE.Vector3(0, size * 0.16, depth * 0.68 + 0.026));

  const data = { kind: guide ? 'guideTile' : bank ? 'bankTile' : fixed ? 'fixedTile' : 'dragTile', value, group, plane };
  if (!guide) markInteractive(plane, data);
  root.add(group);
  return { group, plane, value, data };
}

function createCell(cellIndex, value) {
  const pos = cellPosition(cellIndex);
  const empty = value === null;
  const group = new THREE.Group();
  group.position.copy(pos.clone().add(new THREE.Vector3(0, 0, 0.08)));

  addShadowBlob(group, CELL * 0.95, CELL * 0.34, 0.16, new THREE.Vector3(0.02, -CELL * 0.52, -0.18));
  group.add(createRoundedBox(CELL * 0.98, CELL * 0.98, 0.14, {
    color: empty ? 0xfff3c2 : 0xf8fbff,
    roughness: 0.48,
    metalness: 0.02,
  }));
  group.add(createRoundedBox(CELL * 0.86, CELL * 0.86, 0.08, {
    color: 0xffffff,
    roughness: 0.22,
    metalness: 0.08,
    position: new THREE.Vector3(0, 0, 0.08),
  }));

  const mesh = addPlane(group, CELL * 0.84, CELL * 0.84, new THREE.MeshBasicMaterial({
    map: makeCellTexture({ empty }),
    transparent: true,
  }), new THREE.Vector3(0, 0, 0.14));
  const data = { kind: 'cell', cellIndex, value, mesh, group, center: pos, empty };
  markInteractive(mesh, data);
  cells.push(data);
  root.add(group);

  if (value !== null) {
    const tile = createNumberTile(value, pos.x, pos.y, { fixed: true });
    tile.group.position.z = 0.34;
    tile.data.cellIndex = cellIndex;
  }

  return data;
}

function buildBoard() {
  cells = [];
  const boardCenter = getBoardCenter();
  const group = new THREE.Group();
  group.position.copy(boardCenter.clone().add(new THREE.Vector3(0, 0.04, -0.06)));
  addShadowBlob(group, BOARD_W + 1.18, BOARD_H + 1.2, 0.26, new THREE.Vector3(0.04, -0.28, -0.24));
  group.add(createRoundedBox(BOARD_W + 0.9, BOARD_H + 1.2, 0.26, {
    color: 0xf3faff,
    roughness: 0.34,
    metalness: 0.04,
  }));
  group.add(createRoundedBox(BOARD_W + 0.74, BOARD_H + 1.02, 0.12, {
    color: 0xffffff,
    roughness: 0.18,
    metalness: 0.08,
    position: new THREE.Vector3(0, 0, 0.16),
  }));
  addPlane(group, BOARD_W + 0.72, BOARD_H + 1.0, new THREE.MeshBasicMaterial({
    map: makeBoardCardTexture(),
    transparent: true,
  }), new THREE.Vector3(0, 0, 0.3));
  root.add(group);

  board.numbers.forEach((value, cellIndex) => createCell(cellIndex, value));
}

function buildNumberBank() {
  bankTiles = new Map();
  const bankCenter = getBankCenter();
  const group = new THREE.Group();
  group.position.copy(bankCenter.clone().add(new THREE.Vector3(0, 0.03, -0.03)));
  addShadowBlob(group, 6.7, 1.86, 0.2, new THREE.Vector3(0.03, -0.18, -0.22));
  group.add(createRoundedBox(6.35, 1.72, 0.2, {
    color: 0xf6fbff,
    roughness: 0.36,
    metalness: 0.04,
  }));
  group.add(createRoundedBox(6.15, 1.54, 0.1, {
    color: 0xffffff,
    roughness: 0.18,
    metalness: 0.08,
    position: new THREE.Vector3(0, 0, 0.13),
  }));
  addPlane(group, 6.1, 1.5, new THREE.MeshBasicMaterial({
    map: makePanelTexture('Khay số để kéo', 'Chọn số còn thiếu rồi kéo vào ô trống'),
    transparent: true,
  }), new THREE.Vector3(0, 0, 0.24));
  root.add(group);

  const spacing = 0.86;
  NUMBERS.forEach((value, index) => {
    const x = bankCenter.x - spacing * 2.5 + index * spacing;
    const tile = createNumberTile(value, x, bankCenter.y - 0.42, { bank: true });
    bankTiles.set(value, tile);
  });
}

function buildGuideBank() {
  guideTiles = new Map();
  const center = getGuideTrayCenter();
  const group = new THREE.Group();
  group.position.copy(center.clone().add(new THREE.Vector3(0, 0.03, -0.04)));
  addShadowBlob(group, 4.92, 1.96, 0.2, new THREE.Vector3(0.02, -0.18, -0.22));
  group.add(createRoundedBox(4.66, 1.8, 0.2, {
    color: 0xf7fbff,
    roughness: 0.36,
    metalness: 0.04,
  }));
  group.add(createRoundedBox(4.48, 1.62, 0.1, {
    color: 0xffffff,
    roughness: 0.18,
    metalness: 0.08,
    position: new THREE.Vector3(0, 0, 0.13),
  }));
  addPlane(group, 4.42, 1.56, new THREE.MeshBasicMaterial({
    map: makeGuideTrayTexture('Số đã thấy', 'Số xuất hiện sẽ sáng lên'),
    transparent: true,
  }), new THREE.Vector3(0, 0, 0.22));
  root.add(group);

  const spacingX = 0.7;
  NUMBERS.forEach((value, index) => {
    const x = center.x - spacingX * 2.5 + index * spacingX;
    const y = center.y - 0.22;
    const tile = createNumberTile(value, x, y, { bank: true, guide: true });
    tile.group.userData.guideSeen = false;
    tile.group.scale.set(0.92, 0.92, 1);
    setGroupOpacity(tile.group, 0.26);
    guideTiles.set(value, tile);
  });
}

function createActiveFrame() {
  activeFrame = addPlane(root, CELL * 1.08, CELL * 1.08, new THREE.MeshBasicMaterial({
    map: makeGlowTexture('#2f8cff', true),
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  }), new THREE.Vector3(0, 0, 0.58));
  activeFrame.visible = false;

  const loopPulse = () => {
    if (!activeFrame) return;
    tween(activeFrame.scale, 760, (t) => {
      const s = 1 + Math.sin(t * Math.PI) * 0.08;
      activeFrame.scale.set(s, s, 1);
    }, loopPulse);
  };
  loopPulse();
}

function emptyCell() {
  return cells.find((cell) => cell.empty);
}

function moveFrameToEmpty(immediate = false) {
  const cell = emptyCell();
  if (!activeFrame || !cell) return;
  activeFrame.visible = true;
  const dest = cell.center.clone().add(new THREE.Vector3(0, 0, 0.58));
  if (immediate) activeFrame.position.copy(dest);
  else animateTo(activeFrame, dest, 360, null, easeInOutCubic);
}

function moveFrameToCell(cell, immediate = false) {
  if (!activeFrame || !cell) return;
  activeFrame.visible = true;
  const dest = cell.center.clone().add(new THREE.Vector3(0, 0, 0.58));
  if (immediate) activeFrame.position.copy(dest);
  else animateTo(activeFrame, dest, 340, null, easeInOutCubic);
}

function createGlow(position, size = 1.0, color = '#2f8cff', duration = 780) {
  const glow = addPlane(root, size, size, new THREE.MeshBasicMaterial({
    map: makeGlowTexture(color),
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  }), position.clone().add(new THREE.Vector3(0, 0, 0.75)));

  tween(glow, duration, (t) => {
    const s = 1 + t * 0.24;
    glow.scale.set(s, s, 1);
    glow.material.opacity = 0.92 * (1 - t);
  }, () => {
    root.remove(glow);
    disposeObject(glow);
  });
}

function createGuideTransfer(from, to, color = 'rgba(83, 216, 106, 1)', duration = 820) {
  const orb = addPlane(root, 0.46, 0.46, new THREE.MeshBasicMaterial({
    map: makeOrbTexture(color),
    transparent: true,
    opacity: 0.94,
    depthWrite: false,
  }), from.clone().add(new THREE.Vector3(0, 0, 0.98)));

  const start = orb.position.clone();
  const end = to.clone().add(new THREE.Vector3(0, 0, 0.98));
  const control = start.clone().lerp(end, 0.5);
  control.y += 0.54;

  tween(orb, duration, (t) => {
    const inv = 1 - t;
    orb.position.set(
      inv * inv * start.x + 2 * inv * t * control.x + t * t * end.x,
      inv * inv * start.y + 2 * inv * t * control.y + t * t * end.y,
      inv * inv * start.z + 2 * inv * t * control.z + t * t * end.z,
    );
    const scale = 0.78 + Math.sin(t * Math.PI) * 0.3;
    orb.scale.set(scale, scale, 1);
    orb.material.opacity = 0.94 * (1 - t * 0.28);
  }, () => {
    root.remove(orb);
    disposeObject(orb);
  }, easeInOutCubic);
}

function highlightBank(value, color = '#ff7a45') {
  const tile = bankTiles.get(value);
  if (!tile) return;
  createGlow(tile.group.position.clone(), 0.98, color, 820);
  scalePulse(tile.group, 1.22, 560);
}

function resetGuideTrayState() {
  guideTiles.forEach((tile) => {
    tile.group.userData.guideSeen = false;
    tile.group.scale.set(0.92, 0.92, 1);
    setGroupOpacity(tile.group, 0.26);
  });
}

function revealGuideTile(value, color = '#53d86a') {
  const tile = guideTiles.get(value);
  if (!tile || tile.group.userData.guideSeen) return;
  tile.group.userData.guideSeen = true;
  animateGroupOpacity(tile.group, 1, 280);
  tile.group.scale.set(1, 1, 1);
  scalePulse(tile.group, 1.18, 520);
  createGlow(tile.group.position.clone(), 0.82, color, 860);
}

function focusGuideTile(value, color = '#ffb326') {
  const tile = guideTiles.get(value);
  if (!tile) return;
  if (!tile.group.userData.guideSeen) animateGroupOpacity(tile.group, 0.58, 240);
  scalePulse(tile.group, 1.16, 540);
  createGlow(tile.group.position.clone(), 0.82, color, 920);
}

function scalePulse(object, scaleUp = 1.15, duration = 520) {
  const base = object.scale.clone();
  tween(object, duration, (t) => {
    const s = 1 + Math.sin(t * Math.PI) * (scaleUp - 1);
    object.scale.set(base.x * s, base.y * s, base.z);
  }, () => object.scale.copy(base), easeOutCubic);
}

function animateTo(object, to, duration = 420, onComplete, easing = easeOutCubic) {
  const from = object.position.clone();
  const end = to.clone();
  tween(object, duration, (t) => object.position.lerpVectors(from, end, t), onComplete, easing);
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function tween(target, duration, update, onComplete, easing = easeOutCubic) {
  tweens.push({ target, duration, elapsed: 0, update, onComplete, easing });
}

function setInstruction(message) {
  instructionEl.textContent = message;
}

function runBasicHint() {
  if (demoRunning) return;
  const cell = emptyCell();
  moveFrameToEmpty(false);
  if (cell) createGlow(cell.center, 1.12, '#2f8cff', 820);
  setInstruction('Hãy kiểm tra các số đã có trong nhóm. Số nào chưa xuất hiện trong 1, 2, 3, 4, 5, 6 thì kéo số đó vào ô trống.');
}

function runDetailedGuide() {
  if (demoRunning || !allowInput) return;
  clearGuideTasks();
  demoRunning = true;
  allowInput = false;
  resetGuideTrayState();
  const orderedCells = [...cells].sort((a, b) => a.cellIndex - b.cellIndex);
  const filledCells = orderedCells.filter((cell) => board.numbers[cell.cellIndex] !== null);
  const stepDelay = 1700;
  const startDelay = 820;

  if (filledCells[0]) moveFrameToCell(filledCells[0], true);
  setInstruction('Mình sẽ nhìn lần lượt từng ô từ trái qua phải, trên xuống dưới. Số nào xuất hiện sẽ sáng lên trong khay bên phải.');

  filledCells.forEach((cell, index) => {
    scheduleGuideTask(() => {
      const value = board.numbers[cell.cellIndex];
      const guideTile = guideTiles.get(value);
      moveFrameToCell(cell, index === 0);
      createGlow(cell.center, 1.08, '#53d86a', 1320);
      if (guideTile) createGuideTransfer(cell.center, guideTile.group.position, 'rgba(83, 216, 106, 1)', 1080);
      revealGuideTile(value, '#53d86a');
      setInstruction(`Ô này có số ${value}. Số ${value} trong khay bên phải đã sáng lên.`);
    }, startDelay + index * stepDelay);
  });

  const finishDelay = startDelay + filledCells.length * stepDelay + 760;
  scheduleGuideTask(() => {
    const cell = emptyCell();
    moveFrameToEmpty(false);
    if (cell) createGlow(cell.center, 1.12, '#ffb326', 920);
    focusGuideTile(board.missingValue, '#ffb326');
    highlightBank(board.missingValue, '#ff9b2f');
    setInstruction(`Trong khay bên phải, số ${board.missingValue} chưa sáng như các số khác. Đó là số còn thiếu, hãy kéo số ${board.missingValue} vào ô trống.`);
    allowInput = true;
    demoRunning = false;
  }, finishDelay);
}

function guideNext() {
  if (teachingMode) runDetailedGuide();
  else runBasicHint();
}

function worldPointFromPointer(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  raycaster.ray.intersectPlane(dragPlane, dragPoint);
  return dragPoint.clone();
}

function pickInteractive(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(interactives, false);
  if (!hits.length) return null;
  return getInteractive(hits[0].object);
}

function pointerDown(event) {
  if (!allowInput) return;
  const picked = pickInteractive(event);
  if (!picked) return;

  if (picked.kind === 'cell') {
    if (picked.empty) guideNext();
    return;
  }

  if (picked.kind === 'bankTile') {
    const p = worldPointFromPointer(event);
    const tile = createNumberTile(picked.value, p.x, p.y, { bank: false });
    tile.group.position.z = 1.2;
    tile.group.scale.set(1.08, 1.08, 1);
    dragging = {
      value: picked.value,
      tile,
      offset: new THREE.Vector3(0, 0.05, 0),
    };
    canvas.classList.add('dragging');
    renderer.domElement.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }
}

function pointerMove(event) {
  if (!dragging) return;
  const p = worldPointFromPointer(event);
  dragging.tile.group.position.set(p.x + dragging.offset.x, p.y + dragging.offset.y, 1.2);
  event.preventDefault();
}

function pointerUp(event) {
  if (!dragging) return;

  const p = worldPointFromPointer(event);
  const target = emptyCellAtPoint(p);
  const current = dragging;
  dragging = null;
  canvas.classList.remove('dragging');
  renderer.domElement.releasePointerCapture?.(event.pointerId);

  if (!target) {
    rejectTile(current.tile, 'Hãy thả số vào ô trống nhé.');
    return;
  }

  if (current.value === board.missingValue) {
    acceptTile(current.tile, target);
  } else {
    mistakes += 1;
    mistakeEl.textContent = String(mistakes);
    const message = board.numbers.includes(current.value)
      ? `Chưa đúng. Nhóm này đã có số ${current.value} rồi. Số sai sẽ tự ẩn sau 3 giây.`
      : 'Chưa đúng. Hãy kiểm tra lại các số đã có trong nhóm. Số sai sẽ tự ẩn sau 3 giây.';
    showWrongTileTemporarily(current.tile, target, message);
  }
}

function emptyCellAtPoint(point) {
  const cell = emptyCell();
  if (!cell) return null;
  return Math.abs(point.x - cell.center.x) <= CELL * 0.62 && Math.abs(point.y - cell.center.y) <= CELL * 0.62 ? cell : null;
}

function acceptTile(tile, cell) {
  allowInput = false;
  board.numbers[board.missingIndex] = board.missingValue;
  tile.group.position.z = 1.0;

  animateTo(tile.group, cell.center.clone().add(new THREE.Vector3(0, 0, 0.35)), 360, () => {
    score += 1;
    scoreEl.textContent = String(score);
    setInstruction(`Đúng rồi! Số còn thiếu là ${board.missingValue}. Nhóm đã đủ 1, 2, 3, 4, 5, 6.`);
    createGlow(cell.center, 1.16, '#29d66f', 920);
    scalePulse(tile.group, 1.16, 520);
    burst(cell.center);
    setTimeout(nextRound, 1100);
  });
}

function rejectTile(tile, message) {
  if (message) setInstruction(message);
  fadeAndRemoveTile(tile, 240);
}

function fadeAndRemoveTile(tile, duration = 260) {
  if (!tile?.group || tile.group.userData.removing) return;
  tile.group.userData.removing = true;
  tween(tile.group, duration, (t) => {
    tile.group.scale.setScalar(1 - t * 0.35);
    tile.group.traverse((obj) => {
      if (!obj.material) return;
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      materials.forEach((material) => {
        if (material.opacity !== undefined) {
          material.transparent = true;
          material.opacity = 1 - t;
        }
      });
    });
  }, () => {
    root.remove(tile.group);
    disposeObject(tile.group);
    wrongTiles = wrongTiles.filter((item) => item.tile !== tile);
  });
}

function showWrongTileTemporarily(tile, cell, message) {
  if (message) setInstruction(message);
  tile.group.position.z = 0.92;
  wrongTiles.push({
    tile,
    hideAt: performance.now() + WRONG_TILE_HIDE_DELAY,
  });
  animateTo(tile.group, cell.center.clone().add(new THREE.Vector3(0, 0, 0.34)), 220, () => {
    createGlow(cell.center, 1.1, '#ff4b4b', 700);
    shake(tile.group, () => {
      tile.group.traverse((obj) => {
        if (!obj.material) return;
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        materials.forEach((material) => {
          if (material.opacity !== undefined) {
            material.transparent = true;
            material.opacity = 0.78;
          }
        });
      });
    });
  }, easeOutCubic);
}

function shake(object, onComplete) {
  const base = object.position.clone();
  tween(object, 420, (t) => {
    const amp = (1 - t) * 0.16;
    object.position.x = base.x + Math.sin(t * Math.PI * 10) * amp;
    object.position.y = base.y + Math.sin(t * Math.PI * 7) * amp * 0.35;
  }, () => {
    object.position.copy(base);
    onComplete?.();
  }, (t) => t);
}

function createSpark(x, y) {
  return addPlane(root, 0.2, 0.2, new THREE.MeshBasicMaterial({
    map: makeSparkTexture(),
    transparent: true,
  }), new THREE.Vector3(x, y, 1.25));
}

function burst(center) {
  for (let i = 0; i < 22; i += 1) {
    const angle = (Math.PI * 2 * i) / 22;
    const speed = 0.75 + Math.random() * 0.45;
    const spark = createSpark(center.x, center.y);
    particles.push({
      mesh: spark,
      velocity: new THREE.Vector3(Math.cos(angle) * speed, Math.sin(angle) * speed, 0),
      life: 0,
      maxLife: 0.75 + Math.random() * 0.25,
      spin: (Math.random() - 0.5) * 5,
    });
  }
}

function clearScene(keepScore = true) {
  clearGuideTasks();
  while (root.children.length) {
    const child = root.children.pop();
    disposeObject(child);
  }
  interactives = [];
  cells = [];
  bankTiles = new Map();
  guideTiles = new Map();
  tweens = [];
  particles = [];
  wrongTiles = [];
  dragging = null;
  activeFrame = null;
  allowInput = true;
  demoRunning = false;
  canvas.classList.remove('dragging');

  if (!keepScore) {
    score = 0;
    mistakes = 0;
    scoreEl.textContent = '0';
    mistakeEl.textContent = '0';
  }
}

function buildRound() {
  buildBoard();
  if (teachingMode) buildGuideBank();
  buildNumberBank();
  createActiveFrame();
  moveFrameToEmpty(true);
}

function rebuildCurrentRound() {
  if (!board) return;
  clearScene(true);
  buildRound();
}

function nextRound() {
  clearScene(true);
  board = generateBoard();
  buildRound();
  setInstruction('Câu mới! Hãy tìm số còn thiếu trong nhóm rồi kéo số đó vào ô trống.');
  setTimeout(() => guideNext(), 520);
}

function startGame() {
  clearScene(false);
  board = generateBoard();
  buildRound();
  setInstruction('Mỗi nhóm cần đủ các số từ 1 đến 6. Tìm số còn thiếu rồi kéo vào ô trống.');
  setTimeout(() => guideNext(), 650);
}

function updateWrongTiles(now) {
  wrongTiles = wrongTiles.filter((item) => {
    if (!item?.tile?.group || item.tile.group.userData.removing) return false;
    if (now >= item.hideAt) {
      fadeAndRemoveTile(item.tile, 320);
      return false;
    }
    return true;
  });
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
      disposeObject(p.mesh);
      return false;
    }
    return true;
  });
}

function updateDecor(now) {
  const time = now * 0.001;
  floatingDecor.forEach((item) => {
    item.mesh.position.y = item.basePosition.y + Math.sin(time * item.speed + item.phase) * item.amplitude;
    item.mesh.rotation.z = Math.sin(time * item.speed * 0.7 + item.phase) * 0.14;
  });
}

let last = performance.now();
function animate(now = performance.now()) {
  const deltaMs = now - last;
  last = now;
  updateDecor(now);
  updateWrongTiles(now);
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
teachToggle.addEventListener('change', (event) => {
  teachingMode = Boolean(event.target.checked);
  rebuildCurrentRound();
  setInstruction(teachingMode
    ? 'Đã bật Hướng dẫn chi tiết. Bấm Gợi ý để xem từng số sáng lên trong khay bên phải.'
    : 'Đã tắt Hướng dẫn chi tiết. Game chỉ highlight ô trống cần điền.');
});

startGame();
animate();
