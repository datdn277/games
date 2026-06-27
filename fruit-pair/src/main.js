let THREE;

try {
  THREE = await import('three');
} catch {
  THREE = await import('../../crocodile/vendor/three.module.js');
}

const canvas = document.querySelector('#game-canvas');
const instructionEl = document.querySelector('#instruction');
const announcementEl = document.querySelector('#announcement');
const teachToggle = document.querySelector('#teach-toggle');
const hintBtn = document.querySelector('#hint-btn');
const resetBtn = document.querySelector('#reset-btn');
const answerButtons = Array.from(document.querySelectorAll('[data-answer]'));

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xe9f7ff, 18, 42);

const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 60);
camera.position.set(0, 5.5, 20);
camera.lookAt(0, -0.2, 0);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const dragPoint = new THREE.Vector3();

const stageRoot = new THREE.Group();
const levelRoot = new THREE.Group();
const effectRoot = new THREE.Group();
const decorRoot = new THREE.Group();
scene.add(decorRoot, stageRoot, levelRoot, effectRoot);

const sharedGeometries = new Map();
const floatingDecor = [];
const interactiveMeshes = [];
const itemLookup = new Map();
let tweens = [];
let particles = [];
let guideTimers = [];
let hoverTarget = null;
let dragState = null;
let lastSignature = '';
let lastTime = performance.now();

const ANSWERS = {
  LEFT: 'left-more',
  EQUAL: 'equal',
  RIGHT: 'right-more',
};

const SIDES = {
  LEFT: 'left',
  RIGHT: 'right',
};

const ZONES = {
  left: new THREE.Vector3(-5.65, 0.58, 0),
  pair: new THREE.Vector3(0, 0.58, 0),
  right: new THREE.Vector3(5.65, 0.58, 0),
};

const BOUNDS = {
  minX: -8.4,
  maxX: 8.4,
  minY: -3.2,
  maxY: 2.2,
};

const gameState = {
  leftCount: 0,
  rightCount: 0,
  leftItems: [],
  rightItems: [],
  pairs: [],
  completed: false,
  selectedAnswer: null,
  teachingMode: false,
  guideRunning: false,
  answerChecked: false,
};

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspect = width / Math.max(height, 1);
  const viewHeight = aspect < 0.72 ? 20.6 : aspect < 1.05 ? 17.8 : 15.4;

  renderer.setSize(width, height, false);
  camera.left = (-viewHeight * aspect) / 2;
  camera.right = (viewHeight * aspect) / 2;
  camera.top = viewHeight / 2;
  camera.bottom = -viewHeight / 2;
  camera.position.set(0, aspect < 0.72 ? 6.4 : 5.5, 20);
  camera.lookAt(0, -0.25, 0);
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', resize);
resize();

function setInstruction(message) {
  instructionEl.textContent = message;
  announcementEl.textContent = message;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateCounts() {
  let leftCount;
  let rightCount;
  let signature;
  let guard = 0;

  do {
    leftCount = randomInt(1, 10);
    rightCount = randomInt(1, 10);
    signature = `${leftCount}:${rightCount}`;
    guard += 1;
  } while (signature === lastSignature && guard < 24);

  lastSignature = signature;
  return { leftCount, rightCount };
}

function scheduleGuideTask(callback, delay) {
  const timer = window.setTimeout(() => {
    guideTimers = guideTimers.filter((item) => item !== timer);
    callback();
  }, delay);
  guideTimers.push(timer);
  return timer;
}

function clearGuideTasks() {
  guideTimers.forEach((timer) => window.clearTimeout(timer));
  guideTimers = [];
}

function canvasTexture(width, height, drawer) {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = width;
  textureCanvas.height = height;
  const ctx = textureCanvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  drawer(ctx, width, height);
  const texture = new THREE.CanvasTexture(textureCanvas);
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

function getRoundedBoxGeometry(width, height, depth, radius = Math.min(width, height) * 0.16) {
  const key = [width, height, depth, radius].map((value) => value.toFixed(3)).join(':');
  if (!sharedGeometries.has(key)) {
    const geometry = new THREE.ExtrudeGeometry(roundedRectShape(width, height, radius), {
      depth,
      bevelEnabled: true,
      bevelSegments: 5,
      steps: 1,
      curveSegments: 8,
      bevelSize: Math.min(radius * 0.24, depth * 0.48),
      bevelThickness: Math.min(depth * 0.34, radius * 0.2),
    });
    geometry.center();
    geometry.computeVertexNormals();
    geometry.userData.shared = true;
    sharedGeometries.set(key, geometry);
  }
  return sharedGeometries.get(key);
}

function makeSoftShadowTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 24, w / 2, h / 2, w / 2);
    gradient.addColorStop(0, 'rgba(27, 56, 84, 0.42)');
    gradient.addColorStop(0.58, 'rgba(27, 56, 84, 0.16)');
    gradient.addColorStop(1, 'rgba(27, 56, 84, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  });
}

function makeGlowTexture(color, dashed = false) {
  return canvasTexture(320, 320, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 18;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 26;
    if (dashed) ctx.setLineDash([24, 16]);
    roundRect(ctx, 26, 26, w - 52, h - 52, 38);
    ctx.stroke();
  });
}

function makeOrbTexture(color) {
  return canvasTexture(512, 512, (ctx, w, h) => {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, w * 0.08, w / 2, h / 2, w * 0.48);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.34, color.replace('1)', '0.52)'));
    gradient.addColorStop(1, color.replace('1)', '0)'));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  });
}

function makeSparkTexture(colorA = '#ffd34d', colorB = '#ff7d55') {
  return canvasTexture(160, 160, (ctx, w, h) => {
    ctx.translate(w / 2, h / 2);
    const gradient = ctx.createRadialGradient(0, 0, 4, 0, 0, w * 0.42);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.3, colorA);
    gradient.addColorStop(1, colorB);
    ctx.fillStyle = gradient;
    ctx.shadowColor = colorB;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const radius = i % 2 === 0 ? 54 : 24;
      const angle = (Math.PI * 2 * i) / 10 - Math.PI / 2;
      ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fill();
  });
}

function makePanelTexture(title, subtitle, accentLeft, accentRight, tintBottom) {
  return canvasTexture(1200, 1320, (ctx, w, h) => {
    const body = ctx.createLinearGradient(0, 0, 0, h);
    body.addColorStop(0, '#ffffff');
    body.addColorStop(1, tintBottom);
    roundRect(ctx, 20, 20, w - 40, h - 40, 86);
    ctx.fillStyle = body;
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(255,255,255,0.94)';
    ctx.stroke();

    const topGlow = ctx.createLinearGradient(0, 72, w, 240);
    topGlow.addColorStop(0, `${accentLeft}22`);
    topGlow.addColorStop(0.5, 'rgba(255,255,255,0.14)');
    topGlow.addColorStop(1, `${accentRight}20`);
    roundRect(ctx, 82, 78, w - 164, 108, 42);
    ctx.fillStyle = topGlow;
    ctx.fill();

    const lane = ctx.createLinearGradient(0, h * 0.18, 0, h * 0.92);
    lane.addColorStop(0, 'rgba(255,255,255,0.24)');
    lane.addColorStop(0.45, 'rgba(255,255,255,0.1)');
    lane.addColorStop(1, 'rgba(255,255,255,0.02)');
    roundRect(ctx, 110, 216, w - 220, h - 328, 56);
    ctx.fillStyle = lane;
    ctx.fill();
  });
}

function createRoundedBox(width, height, depth, options = {}) {
  const {
    color = 0xffffff,
    radius = Math.min(width, height) * 0.16,
    roughness = 0.38,
    metalness = 0.06,
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
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (position) mesh.position.copy(position);
  return mesh;
}

function addPlane(parent, width, height, material, position) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.position.copy(position);
  parent.add(mesh);
  return mesh;
}

function addShadowBlob(parent, width, height, opacity, position) {
  const shadow = addPlane(parent, width, height, new THREE.MeshBasicMaterial({
    map: makeSoftShadowTexture(),
    transparent: true,
    opacity,
    depthWrite: false,
  }), position);
  shadow.rotation.z = Math.random() * 0.12 - 0.06;
  return shadow;
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

function tween(target, duration, update, onComplete, easing = easeOutCubic) {
  tweens.push({ target, duration, elapsed: 0, update, onComplete, easing });
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function animateTo(object, to, duration = 420, onComplete, easing = easeOutCubic) {
  const from = object.position.clone();
  const end = to.clone();
  tween(object, duration, (t) => {
    object.position.lerpVectors(from, end, t);
  }, onComplete, easing);
}

function animateArc(object, to, duration = 720, onComplete) {
  const from = object.position.clone();
  const end = to.clone();
  const control = from.clone().lerp(end, 0.5);
  control.y += 0.88;
  control.z = Math.max(from.z, end.z) + 1.05;
  tween(object, duration, (t) => {
    const inv = 1 - t;
    object.position.set(
      inv * inv * from.x + 2 * inv * t * control.x + t * t * end.x,
      inv * inv * from.y + 2 * inv * t * control.y + t * t * end.y,
      inv * inv * from.z + 2 * inv * t * control.z + t * t * end.z,
    );
  }, onComplete, easeInOutCubic);
}

function createGlowPulse(position, size = 1.15, color = '#53d86a', duration = 860) {
  const glow = addPlane(effectRoot, size, size, new THREE.MeshBasicMaterial({
    map: makeGlowTexture(color),
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
  }), position.clone().add(new THREE.Vector3(0, 0, 1.15)));

  tween(glow, duration, (t) => {
    const scale = 1 + t * 0.28;
    glow.scale.set(scale, scale, 1);
    glow.material.opacity = 0.88 * (1 - t);
  }, () => {
    effectRoot.remove(glow);
    disposeObject(glow);
  }, easeOutCubic);
}

function launchFirework(center, colors = ['#ffd34d', '#ff7d55']) {
  createGlowPulse(center, 1.36, colors[1], 920);
  for (let i = 0; i < 22; i += 1) {
    const angle = (Math.PI * 2 * i) / 22;
    const speed = 1.2 + Math.random() * 1.05;
    const spark = addPlane(effectRoot, 0.26, 0.26, new THREE.MeshBasicMaterial({
      map: makeSparkTexture(colors[0], colors[1]),
      transparent: true,
      opacity: 0.96,
      depthWrite: false,
    }), center.clone().add(new THREE.Vector3(0, 0, 1.2)));

    particles.push({
      mesh: spark,
      velocity: new THREE.Vector3(Math.cos(angle) * speed, Math.sin(angle) * speed + 0.55, 0),
      life: 0,
      maxLife: 0.82 + Math.random() * 0.38,
      spin: (Math.random() - 0.5) * 7,
    });
  }
}

function celebrateCorrectAnswer(correct) {
  const bursts = correct === ANSWERS.LEFT
    ? [
      { center: new THREE.Vector3(-5.3, 3.5, 0), colors: ['#ffd95b', '#ff7d55'] },
      { center: new THREE.Vector3(-2.1, 2.9, 0), colors: ['#ffe17d', '#ff6d74'] },
      { center: new THREE.Vector3(0.1, 3.3, 0), colors: ['#8fe3ff', '#4ec8ff'] },
    ]
    : correct === ANSWERS.RIGHT
      ? [
        { center: new THREE.Vector3(5.3, 3.5, 0), colors: ['#ffd95b', '#ff9a4d'] },
        { center: new THREE.Vector3(2.1, 2.9, 0), colors: ['#ffe17d', '#ff7d55'] },
        { center: new THREE.Vector3(-0.1, 3.3, 0), colors: ['#8fe3ff', '#4ec8ff'] },
      ]
      : [
        { center: new THREE.Vector3(-4.6, 3.3, 0), colors: ['#ffd95b', '#ff7d55'] },
        { center: new THREE.Vector3(0, 3.7, 0), colors: ['#8fe3ff', '#4ec8ff'] },
        { center: new THREE.Vector3(4.6, 3.3, 0), colors: ['#ffe17d', '#ff9a4d'] },
      ];

  bursts.forEach((burst, index) => {
    scheduleGuideTask(() => launchFirework(burst.center, burst.colors), index * 180);
  });
}

function createTransferOrb(from, to, color = 'rgba(83, 216, 106, 1)', duration = 860) {
  const orb = addPlane(effectRoot, 0.56, 0.56, new THREE.MeshBasicMaterial({
    map: makeOrbTexture(color),
    transparent: true,
    opacity: 0.94,
    depthWrite: false,
  }), from.clone().add(new THREE.Vector3(0, 0, 1.2)));

  const start = orb.position.clone();
  const end = to.clone().add(new THREE.Vector3(0, 0, 1.2));
  const control = start.clone().lerp(end, 0.5);
  control.y += 0.74;

  tween(orb, duration, (t) => {
    const inv = 1 - t;
    orb.position.set(
      inv * inv * start.x + 2 * inv * t * control.x + t * t * end.x,
      inv * inv * start.y + 2 * inv * t * control.y + t * t * end.y,
      inv * inv * start.z + 2 * inv * t * control.z + t * t * end.z,
    );
    const scale = 0.8 + Math.sin(t * Math.PI) * 0.38;
    orb.scale.set(scale, scale, 1);
    orb.material.opacity = 0.94 * (1 - t * 0.3);
  }, () => {
    effectRoot.remove(orb);
    disposeObject(orb);
  }, easeInOutCubic);
}

function buildBackdrop() {
  const glows = [
    { size: 7.2, x: -7.4, y: 3.6, z: -8.6, color: 'rgba(137, 218, 255, 1)', opacity: 0.28, amplitude: 0.18, speed: 0.48 },
    { size: 6.1, x: 7.2, y: 1.4, z: -8.3, color: 'rgba(255, 214, 125, 1)', opacity: 0.24, amplitude: 0.22, speed: 0.62 },
    { size: 5.2, x: 0.4, y: -4.8, z: -9.1, color: 'rgba(255, 255, 255, 1)', opacity: 0.16, amplitude: 0.14, speed: 0.44 },
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

  const floorGlow = addPlane(decorRoot, 18, 8.4, new THREE.MeshBasicMaterial({
    map: makeOrbTexture('rgba(255,255,255,1)'),
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
  }), new THREE.Vector3(0, -4.9, -10.2));
  floorGlow.scale.y = 0.46;
}

function addLights() {
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xcde8ff, 1.08);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.12);
  keyLight.position.set(-7.4, 10.4, 12);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 40;
  keyLight.shadow.camera.left = -12;
  keyLight.shadow.camera.right = 12;
  keyLight.shadow.camera.top = 12;
  keyLight.shadow.camera.bottom = -12;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x8fd6ff, 0.42);
  fillLight.position.set(8.2, 0.4, 10.2);
  scene.add(fillLight);

  const warmLight = new THREE.PointLight(0xffd286, 0.36, 26, 2);
  warmLight.position.set(4.5, 4.8, 8.6);
  scene.add(warmLight);
}

function buildZonePlatform(center, config) {
  const group = new THREE.Group();
  group.position.copy(center.clone().add(new THREE.Vector3(0, 0, -0.16)));
  addShadowBlob(group, config.width + 0.78, config.height + 0.9, 0.24, new THREE.Vector3(0, -0.2, -0.28));
  group.add(createRoundedBox(config.width + 0.34, config.height + 0.42, 0.42, {
    color: config.bodyColor,
    roughness: 0.38,
    metalness: 0.04,
  }));
  group.add(createRoundedBox(config.width + 0.18, config.height + 0.26, 0.18, {
    color: 0xffffff,
    roughness: 0.18,
    metalness: 0.08,
    position: new THREE.Vector3(0, 0, 0.24),
  }));
  addPlane(group, config.width, config.height, new THREE.MeshBasicMaterial({
    map: makePanelTexture(config.title, config.subtitle, config.accentLeft, config.accentRight, config.tintBottom),
    transparent: true,
  }), new THREE.Vector3(0, 0, 0.42));
  stageRoot.add(group);
}

function buildStage() {
  while (stageRoot.children.length) {
    const child = stageRoot.children.pop();
    disposeObject(child);
  }

  buildZonePlatform(ZONES.left, {
    width: 5.44,
    height: 6.12,
    bodyColor: 0xfff1e3,
    accentLeft: '#ffb574',
    accentRight: '#ff7867',
    tintBottom: '#fff6ee',
    title: '',
    subtitle: '',
  });

  buildZonePlatform(ZONES.right, {
    width: 5.44,
    height: 6.12,
    bodyColor: 0xfff2e2,
    accentLeft: '#ffbf63',
    accentRight: '#ff8a58',
    tintBottom: '#fff7f0',
    title: '',
    subtitle: '',
  });
}

function createApple() {
  const group = new THREE.Group();
  const materials = [];

  const shadow = addPlane(group, 1.06, 0.42, new THREE.MeshBasicMaterial({
    map: makeSoftShadowTexture(),
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
  }), new THREE.Vector3(0, -0.52, -0.2));
  shadow.scale.x = 1.08;

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xff5b54,
    roughness: 0.42,
    metalness: 0.08,
    emissive: 0x000000,
  });
  materials.push(bodyMat);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.46, 28, 28), bodyMat);
  body.scale.set(1.04, 0.98, 1.02);
  body.position.y = -0.02;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const gloss = new THREE.Mesh(new THREE.SphereGeometry(0.16, 18, 18), new THREE.MeshStandardMaterial({
    color: 0xffc0b6,
    roughness: 0.18,
    metalness: 0.14,
    transparent: true,
    opacity: 0.72,
  }));
  gloss.position.set(0.13, 0.14, 0.3);
  gloss.scale.set(0.9, 1.1, 0.5);
  group.add(gloss);

  const dimpleMat = new THREE.MeshStandardMaterial({
    color: 0xcc383b,
    roughness: 0.56,
    metalness: 0.02,
    emissive: 0x000000,
  });
  materials.push(dimpleMat);
  const topDimple = new THREE.Mesh(new THREE.SphereGeometry(0.16, 18, 18), dimpleMat);
  topDimple.scale.set(1.15, 0.55, 1.15);
  topDimple.position.set(0, 0.36, 0);
  group.add(topDimple);

  const stemMat = new THREE.MeshStandardMaterial({
    color: 0x7c5331,
    roughness: 0.74,
    metalness: 0.04,
    emissive: 0x000000,
  });
  materials.push(stemMat);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.3, 10), stemMat);
  stem.position.set(-0.02, 0.55, -0.02);
  stem.rotation.z = -0.24;
  stem.castShadow = true;
  group.add(stem);

  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x56bc6b,
    roughness: 0.42,
    metalness: 0.04,
    emissive: 0x000000,
  });
  materials.push(leafMat);
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 18), leafMat);
  leaf.scale.set(1.45, 0.48, 0.82);
  leaf.position.set(0.18, 0.48, 0.02);
  leaf.rotation.z = 0.54;
  leaf.castShadow = true;
  group.add(leaf);

  return { group, materials };
}

function createOrange() {
  const group = new THREE.Group();
  const materials = [];

  const shadow = addPlane(group, 1.08, 0.42, new THREE.MeshBasicMaterial({
    map: makeSoftShadowTexture(),
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  }), new THREE.Vector3(0, -0.5, -0.2));
  shadow.scale.x = 1.12;

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xff9b47,
    roughness: 0.44,
    metalness: 0.06,
    emissive: 0x000000,
  });
  materials.push(bodyMat);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 30, 30), bodyMat);
  body.scale.set(1.03, 1, 1.03);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const glowPatch = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 20), new THREE.MeshStandardMaterial({
    color: 0xffcf92,
    roughness: 0.2,
    metalness: 0.12,
    transparent: true,
    opacity: 0.68,
  }));
  glowPatch.position.set(0.12, 0.12, 0.26);
  glowPatch.scale.set(0.92, 1.08, 0.48);
  group.add(glowPatch);

  const topDimpleMat = new THREE.MeshStandardMaterial({
    color: 0xe57827,
    roughness: 0.56,
    metalness: 0.04,
    emissive: 0x000000,
  });
  materials.push(topDimpleMat);
  const topDimple = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 18), topDimpleMat);
  topDimple.scale.set(1.14, 0.52, 1.14);
  topDimple.position.set(0, 0.34, 0);
  group.add(topDimple);

  const bottomDimple = new THREE.Mesh(new THREE.SphereGeometry(0.1, 18, 18), topDimpleMat);
  bottomDimple.scale.set(1.08, 0.46, 1.08);
  bottomDimple.position.set(0, -0.36, 0);
  group.add(bottomDimple);

  const stemMat = new THREE.MeshStandardMaterial({
    color: 0x7d5531,
    roughness: 0.76,
    metalness: 0.04,
    emissive: 0x000000,
  });
  materials.push(stemMat);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 0.18, 10), stemMat);
  stem.position.set(0.02, 0.48, -0.02);
  stem.rotation.z = 0.18;
  stem.castShadow = true;
  group.add(stem);

  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x4cb66c,
    roughness: 0.42,
    metalness: 0.04,
    emissive: 0x000000,
  });
  materials.push(leafMat);
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 18), leafMat);
  leaf.scale.set(1.5, 0.44, 0.86);
  leaf.position.set(-0.18, 0.48, 0.04);
  leaf.rotation.z = -0.52;
  leaf.castShadow = true;
  group.add(leaf);

  return { group, materials };
}

function createPairConnector(from, to) {
  const mid = from.clone().lerp(to, 0.5);
  mid.y += 0.22;
  mid.z += 0.12;
  const curve = new THREE.CatmullRomCurve3([from, mid, to]);
  const material = new THREE.MeshStandardMaterial({
    color: 0x7dd5ff,
    emissive: 0x8af0ff,
    emissiveIntensity: 0.84,
    roughness: 0.18,
    metalness: 0.1,
    transparent: true,
    opacity: 0.96,
  });
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.045, 12, false), material);
  mesh.castShadow = true;
  mesh.userData.connectorMaterial = material;
  return mesh;
}

function buildItemLayout(side, count) {
  const center = side === SIDES.LEFT ? ZONES.left : ZONES.right;

  function makeRow(rowCount, y, spacing) {
    const startX = center.x - ((rowCount - 1) * spacing) / 2;
    return Array.from({ length: rowCount }, (_, index) => new THREE.Vector3(startX + index * spacing, center.y + y, 0.32));
  }

  if (count <= 5) {
    const spacing = count >= 5 ? 1.02 : count === 4 ? 1.12 : 1.24;
    return makeRow(count, -0.54, spacing);
  }

  const topCount = Math.ceil(count / 2);
  const bottomCount = count - topCount;
  return [
    ...makeRow(topCount, 0.58, topCount >= 5 ? 1.02 : 1.12),
    ...makeRow(bottomCount, -1.66, bottomCount >= 5 ? 1.02 : 1.12),
  ];
}

function buildPairSlots(pairCount) {
  const slots = [];
  const cols = pairCount > 4 ? 2 : 1;
  const rows = Math.ceil(pairCount / cols);
  const stepX = 1.74;
  const stepY = 1.08;
  const topY = ZONES.pair.y + (rows === 1 ? -0.08 : 1.38);

  for (let row = 0; row < rows; row += 1) {
    const remaining = pairCount - slots.length;
    const currentCols = Math.min(cols, remaining);
    const startX = ZONES.pair.x - ((currentCols - 1) * stepX) / 2;
    const y = topY - row * stepY;
    for (let col = 0; col < currentCols; col += 1) {
      const x = startX + col * stepX;
      slots.push({
        center: new THREE.Vector3(x, y, 0.56),
        left: new THREE.Vector3(x - 0.48, y, 0.74),
        right: new THREE.Vector3(x + 0.48, y, 0.74),
      });
    }
  }

  return slots;
}

function clearLevel() {
  clearGuideTasks();
  hoverTarget = null;
  dragState = null;
  tweens = [];
  interactiveMeshes.length = 0;
  itemLookup.clear();

  while (levelRoot.children.length) {
    const child = levelRoot.children.pop();
    disposeObject(child);
  }

  while (effectRoot.children.length) {
    const child = effectRoot.children.pop();
    disposeObject(child);
  }

  gameState.leftItems = [];
  gameState.rightItems = [];
  gameState.pairs = [];
  particles = [];
  gameState.completed = false;
  gameState.selectedAnswer = null;
  gameState.answerChecked = false;
  gameState.guideRunning = false;
  canvas.classList.remove('dragging');
  setAnswerButtonsEnabled(false);
  updateAnswerButtons();
}

function createItem(side, index, position) {
  const anchor = new THREE.Group();
  const visual = new THREE.Group();
  const fruit = side === SIDES.LEFT ? createApple() : createOrange();
  anchor.position.copy(position);
  visual.add(fruit.group);
  anchor.add(visual);

  const halo = addPlane(visual, 1.52, 1.52, new THREE.MeshBasicMaterial({
    map: makeGlowTexture(side === SIDES.LEFT ? '#ff946c' : '#ffad63'),
    transparent: true,
    opacity: 0,
    depthWrite: false,
  }), new THREE.Vector3(0, -0.02, -0.04));

  const hitRadius = side === SIDES.LEFT ? 0.58 : 0.64;
  const hitMesh = new THREE.Mesh(new THREE.SphereGeometry(hitRadius, 14, 14), new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  }));
  hitMesh.position.set(0, 0, 0.16);
  visual.add(hitMesh);

  const item = {
    id: `${side}-${index}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
    side,
    mesh: anchor,
    visual,
    hitMesh,
    halo,
    materials: fruit.materials,
    paired: false,
    pairId: null,
    originalPosition: position.clone(),
    restPosition: position.clone(),
    restScale: 1,
    lift: 0,
    floatPhase: Math.random() * Math.PI * 2,
    floatSpeed: 0.8 + Math.random() * 0.5,
    flags: {
      hovered: false,
      guide: false,
      remainder: false,
      answer: false,
      dragging: false,
    },
  };

  hitMesh.userData.itemId = item.id;
  itemLookup.set(item.id, item);
  interactiveMeshes.push(hitMesh);
  levelRoot.add(anchor);
  return item;
}

function allItems() {
  return [...gameState.leftItems, ...gameState.rightItems];
}

function availableItems(side) {
  const items = side === SIDES.LEFT ? gameState.leftItems : gameState.rightItems;
  return items.filter((item) => !item.paired);
}

function clearItemFlags(flagName) {
  allItems().forEach((item) => {
    item.flags[flagName] = false;
  });
}

function clearAllFocusFlags() {
  allItems().forEach((item) => {
    item.flags.hovered = false;
    item.flags.guide = false;
    item.flags.answer = false;
  });
}

function createLevel(counts) {
  clearLevel();

  const { leftCount, rightCount } = counts;
  gameState.leftCount = leftCount;
  gameState.rightCount = rightCount;

  const leftPositions = buildItemLayout(SIDES.LEFT, leftCount);
  const rightPositions = buildItemLayout(SIDES.RIGHT, rightCount);

  gameState.leftItems = leftPositions.map((position, index) => createItem(SIDES.LEFT, index, position));
  gameState.rightItems = rightPositions.map((position, index) => createItem(SIDES.RIGHT, index, position));

  setInstruction('Kéo từng quả Táo ghép với từng quả Cam. Nhìn phần còn dư để biết bên nào nhiều hơn, ít hơn hoặc bằng nhau.');
}

function getCorrectAnswer() {
  if (gameState.leftCount > gameState.rightCount) return ANSWERS.LEFT;
  if (gameState.rightCount > gameState.leftCount) return ANSWERS.RIGHT;
  return ANSWERS.EQUAL;
}

function setAnswerButtonsEnabled(enabled) {
  answerButtons.forEach((button) => {
    button.disabled = !enabled;
  });
}

function updateAnswerButtons() {
  const correct = getCorrectAnswer();
  answerButtons.forEach((button) => {
    const answer = button.dataset.answer;
    const isSelected = gameState.selectedAnswer === answer;
    const isWrong = gameState.answerChecked && isSelected && answer !== correct;
    const isCorrect = gameState.answerChecked && answer === correct && gameState.selectedAnswer === correct;
    button.classList.toggle('is-selected', isSelected);
    button.classList.toggle('is-wrong', isWrong);
    button.classList.toggle('is-correct', isCorrect);
    button.setAttribute('aria-pressed', String(isSelected));
  });
}

function worldPointFromPointer(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  raycaster.ray.intersectPlane(dragPlane, dragPoint);
  return dragPoint.clone();
}

function pickItem(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(interactiveMeshes, false);
  const hit = hits.find((entry) => {
    const item = itemLookup.get(entry.object.userData.itemId);
    return item && !item.paired;
  });
  return hit ? itemLookup.get(hit.object.userData.itemId) : null;
}

function setHoverTarget(item) {
  if (hoverTarget === item) return;
  if (hoverTarget) hoverTarget.flags.hovered = false;
  hoverTarget = item;
  if (hoverTarget) hoverTarget.flags.hovered = true;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function handleDragStart(event) {
  if (gameState.guideRunning || gameState.completed) return;
  const item = pickItem(event);
  if (!item) return;

  const point = worldPointFromPointer(event);
  dragState = {
    item,
    pointerId: event.pointerId,
    offset: item.mesh.position.clone().sub(point),
  };

  item.flags.dragging = true;
  item.mesh.position.z = 1.18;
  canvas.classList.add('dragging');
  try {
    canvas.setPointerCapture(event.pointerId);
  } catch {
    // Synthetic QA events do not always own a real pointer capture.
  }
}

function findClosestTarget(item) {
  const targetSide = item.side === SIDES.LEFT ? SIDES.RIGHT : SIDES.LEFT;
  const targets = availableItems(targetSide);
  let best = null;
  let bestDistance = Infinity;

  targets.forEach((candidate) => {
    const distance = item.mesh.position.distanceTo(candidate.mesh.position);
    if (distance < 1.55 && distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  });

  return best;
}

function handleDragMove(event) {
  if (!dragState) return;
  const point = worldPointFromPointer(event);
  const item = dragState.item;
  const next = point.add(dragState.offset);

  item.mesh.position.x = clamp(next.x, BOUNDS.minX, BOUNDS.maxX);
  item.mesh.position.y = clamp(next.y, BOUNDS.minY, BOUNDS.maxY);
  item.mesh.position.z = 1.18;
  setHoverTarget(findClosestTarget(item));
}

function animateBackHome(item) {
  item.flags.dragging = false;
  animateTo(item.mesh, item.restPosition.clone(), 320, () => {
    item.mesh.position.copy(item.restPosition);
  }, easeInOutCubic);
}

function createPair(fromItem, toItem, options = {}) {
  const leftItem = fromItem.side === SIDES.LEFT ? fromItem : toItem;
  const rightItem = fromItem.side === SIDES.RIGHT ? fromItem : toItem;
  if (!leftItem || !rightItem || leftItem.paired || rightItem.paired) return;

  clearAllFocusFlags();
  setHoverTarget(null);

  const pairId = `pair-${gameState.pairs.length + 1}`;
  const pairSlots = buildPairSlots(Math.min(gameState.leftCount, gameState.rightCount));
  const slot = pairSlots[gameState.pairs.length];

  leftItem.paired = true;
  leftItem.pairId = pairId;
  leftItem.restPosition = slot.left.clone();
  leftItem.restScale = 0.82;
  leftItem.flags.dragging = false;

  rightItem.paired = true;
  rightItem.pairId = pairId;
  rightItem.restPosition = slot.right.clone();
  rightItem.restScale = 0.82;
  rightItem.flags.dragging = false;

  const connector = createPairConnector(slot.left.clone().add(new THREE.Vector3(0, 0, 0.02)), slot.right.clone().add(new THREE.Vector3(0, 0, 0.02)));
  connector.material.opacity = 0;
  effectRoot.add(connector);
  tween(connector.material, 420, (t) => {
    connector.material.opacity = 0.96 * t;
  }, null, easeOutCubic);

  const pair = {
    id: pairId,
    leftItem,
    rightItem,
    connector,
    center: slot.center.clone(),
  };
  gameState.pairs.push(pair);

  let settled = 0;
  const onSettled = () => {
    settled += 1;
    if (settled === 2) {
      createGlowPulse(slot.center, 1.18, '#7dd5ff', 920);
      if (!options.silent) createTransferOrb(leftItem.originalPosition, slot.center, 'rgba(255, 148, 108, 1)', 760);
      checkCompletion();
    }
  };

  animateArc(leftItem.mesh, slot.left.clone(), options.guided ? 820 : 700, onSettled);
  animateArc(rightItem.mesh, slot.right.clone(), options.guided ? 820 : 700, onSettled);
  scheduleGuideTask(() => checkCompletion(), options.guided ? 860 : 740);
}

function handleDragEnd(event) {
  if (!dragState) return;
  const { item, pointerId } = dragState;
  try {
    if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
  } catch {
    // Ignore capture release failures for synthetic QA events.
  }

  if (hoverTarget && !hoverTarget.paired) {
    createPair(item, hoverTarget);
  } else {
    animateBackHome(item);
  }

  dragState = null;
  item.flags.dragging = false;
  setHoverTarget(null);
  canvas.classList.remove('dragging');
}

function highlightRemainders() {
  allItems().forEach((item) => {
    item.flags.remainder = false;
    item.flags.answer = false;
  });

  const leftRemain = availableItems(SIDES.LEFT);
  const rightRemain = availableItems(SIDES.RIGHT);

  if (leftRemain.length) {
    leftRemain.forEach((item) => {
      item.flags.remainder = true;
      createGlowPulse(item.mesh.position, 1.16, '#ff8b74', 940);
    });
    setInstruction('Bên trái còn dư. Hãy chọn Trái nhiều hơn.');
    return;
  }

  if (rightRemain.length) {
    rightRemain.forEach((item) => {
      item.flags.remainder = true;
      createGlowPulse(item.mesh.position, 1.16, '#ffad63', 940);
    });
    setInstruction('Bên phải còn dư. Hãy chọn Phải nhiều hơn.');
    return;
  }

  setInstruction('Không bên nào còn dư. Hãy chọn Bằng nhau.');
  gameState.pairs.forEach((pair) => createGlowPulse(pair.center, 1.08, '#7dd5ff', 920));
}

function checkCompletion() {
  const maxPairs = Math.min(gameState.leftCount, gameState.rightCount);
  if (gameState.pairs.length < maxPairs) return;

  gameState.completed = true;
  highlightRemainders();
  if (!gameState.guideRunning) setAnswerButtonsEnabled(true);
}

function highlightCorrectReason() {
  clearItemFlags('answer');
  const correct = getCorrectAnswer();

  if (correct === ANSWERS.LEFT) {
    availableItems(SIDES.LEFT).forEach((item) => {
      item.flags.answer = true;
      createGlowPulse(item.mesh.position, 1.24, '#ff8b74', 1120);
    });
    return;
  }

  if (correct === ANSWERS.RIGHT) {
    availableItems(SIDES.RIGHT).forEach((item) => {
      item.flags.answer = true;
      createGlowPulse(item.mesh.position, 1.24, '#ffad63', 1120);
    });
    return;
  }

  gameState.pairs.forEach((pair) => {
    pair.leftItem.flags.answer = true;
    pair.rightItem.flags.answer = true;
    createGlowPulse(pair.center, 1.08, '#7dd5ff', 1120);
  });
}

function checkAnswer(answer) {
  if (!gameState.completed || gameState.guideRunning) {
    setInstruction('Hãy ghép hết các cặp trước, rồi nhìn phần còn dư để chọn đáp án nhé.');
    return;
  }

  gameState.selectedAnswer = answer;
  gameState.answerChecked = true;
  updateAnswerButtons();

  const correct = getCorrectAnswer();
  highlightCorrectReason();

  if (answer === correct) {
    celebrateCorrectAnswer(correct);
    if (correct === ANSWERS.EQUAL) {
      setInstruction('Đúng rồi! Không bên nào còn dư nên hai bên bằng nhau.');
    } else {
      setInstruction('Đúng rồi! Sau khi ghép cặp, bên còn dư là bên nhiều hơn.');
    }
    return;
  }

  if (correct === ANSWERS.LEFT) {
    setInstruction('Chưa đúng. Hãy nhìn phần còn dư: Táo còn dư nên bên trái nhiều hơn.');
  } else if (correct === ANSWERS.RIGHT) {
    setInstruction('Chưa đúng. Hãy nhìn phần còn dư: Cam còn dư nên bên phải nhiều hơn.');
  } else {
    setInstruction('Chưa đúng. Sau khi ghép hết cặp, không bên nào còn dư nên hai bên bằng nhau.');
  }
}

function simpleHint() {
  if (gameState.completed) {
    highlightRemainders();
    return;
  }

  clearAllFocusFlags();
  const leftItem = availableItems(SIDES.LEFT)[0];
  const rightItem = availableItems(SIDES.RIGHT)[0];
  if (!leftItem || !rightItem) return;

  leftItem.flags.guide = true;
  rightItem.flags.guide = true;
  createGlowPulse(leftItem.mesh.position, 1.14, '#ff8b74', 980);
  createGlowPulse(rightItem.mesh.position, 1.14, '#ffad63', 980);
  setInstruction('Hãy kéo một quả Táo vào gần một quả Cam để ghép thành một cặp 1-1.');
  scheduleGuideTask(() => {
    leftItem.flags.guide = false;
    rightItem.flags.guide = false;
  }, 1200);
}

function rebuildCurrentCounts() {
  createLevel({
    leftCount: gameState.leftCount,
    rightCount: gameState.rightCount,
  });
}

function runTeachingGuide() {
  if (gameState.guideRunning) return;

  if (dragState) {
    dragState.item.flags.dragging = false;
    dragState = null;
    canvas.classList.remove('dragging');
  }

  if (gameState.pairs.length || gameState.completed || gameState.selectedAnswer) {
    rebuildCurrentCounts();
  }

  clearGuideTasks();
  gameState.guideRunning = true;
  setAnswerButtonsEnabled(false);
  clearAllFocusFlags();

  const totalPairs = Math.min(gameState.leftCount, gameState.rightCount);
  const firstLeft = availableItems(SIDES.LEFT)[0];
  const firstRight = availableItems(SIDES.RIGHT)[0];
  if (!firstLeft || !firstRight) {
    gameState.guideRunning = false;
    return;
  }

  setInstruction('Ta sẽ ghép mỗi quả Táo với một quả Cam.');
  firstLeft.flags.guide = true;
  firstRight.flags.guide = true;
  createGlowPulse(firstLeft.mesh.position, 1.16, '#ff8b74', 1260);
  createGlowPulse(firstRight.mesh.position, 1.16, '#ffad63', 1260);

  scheduleGuideTask(() => {
    setInstruction('Một quả Táo ghép với một quả Cam tạo thành một cặp.');
    const leftItem = availableItems(SIDES.LEFT)[0];
    const rightItem = availableItems(SIDES.RIGHT)[0];
    if (leftItem && rightItem) {
      createPair(leftItem, rightItem, { guided: true, silent: true });
    }
  }, 1420);

  scheduleGuideTask(() => {
    setInstruction('Tiếp tục ghép từng cặp 1-1.');
  }, 2620);

  const baseDelay = 3140;
  for (let step = 1; step < totalPairs; step += 1) {
    scheduleGuideTask(() => {
      clearAllFocusFlags();
      const leftItem = availableItems(SIDES.LEFT)[0];
      const rightItem = availableItems(SIDES.RIGHT)[0];
      if (!leftItem || !rightItem) return;
      leftItem.flags.guide = true;
      rightItem.flags.guide = true;
      createGlowPulse(leftItem.mesh.position, 1.08, '#ff8b74', 980);
      createGlowPulse(rightItem.mesh.position, 1.08, '#ffad63', 980);
      createPair(leftItem, rightItem, { guided: true, silent: true });
    }, baseDelay + (step - 1) * 1340);
  }

  const finishDelay = baseDelay + Math.max(0, totalPairs - 1) * 1340 + 980;
  scheduleGuideTask(() => {
    clearAllFocusFlags();
    gameState.completed = true;
    highlightRemainders();
    const answer = getCorrectAnswer();
    if (answer === ANSWERS.LEFT) {
      setInstruction('Bên trái còn dư. Vậy bên trái nhiều hơn.');
    } else if (answer === ANSWERS.RIGHT) {
      setInstruction('Bên phải còn dư. Vậy bên phải nhiều hơn.');
    } else {
      setInstruction('Không bên nào còn dư. Hai bên bằng nhau.');
    }
    gameState.guideRunning = false;
    setAnswerButtonsEnabled(true);
  }, finishDelay);
}

function resetGame() {
  createLevel(generateCounts());
}

function updateTweens(deltaMs) {
  tweens = tweens.filter((entry) => {
    entry.elapsed += deltaMs;
    const raw = Math.min(entry.elapsed / entry.duration, 1);
    const t = entry.easing ? entry.easing(raw) : raw;
    entry.update(t, raw);
    if (raw >= 1) {
      entry.onComplete?.();
      return false;
    }
    return true;
  });
}

function updateParticles(delta) {
  particles = particles.filter((particle) => {
    particle.life += delta;
    particle.mesh.position.x += particle.velocity.x * delta;
    particle.mesh.position.y += particle.velocity.y * delta;
    particle.velocity.y -= 2.9 * delta;
    particle.mesh.rotation.z += particle.spin * delta;
    const t = particle.life / particle.maxLife;
    particle.mesh.scale.setScalar(Math.max(0.18, 1 - t * 0.34));
    particle.mesh.material.opacity = Math.max(0, 0.96 * (1 - t));
    if (t >= 1) {
      effectRoot.remove(particle.mesh);
      disposeObject(particle.mesh);
      return false;
    }
    return true;
  });
}

function updateDecor(now) {
  const time = now * 0.001;
  floatingDecor.forEach((item) => {
    item.mesh.position.y = item.basePosition.y + Math.sin(time * item.speed + item.phase) * item.amplitude;
    item.mesh.rotation.z = Math.sin(time * item.speed * 0.72 + item.phase) * 0.14;
  });
}

function updateItems(now) {
  const time = now * 0.001;
  allItems().forEach((item) => {
    const bob = item.paired ? 0 : Math.sin(time * item.floatSpeed + item.floatPhase) * 0.06;
    const remainderLift = item.flags.remainder ? Math.abs(Math.sin(time * 3.2 + item.floatPhase)) * 0.16 : 0;
    item.visual.position.y = bob + remainderLift;

    let scale = item.restScale;
    let haloOpacity = 0;
    let emissiveBoost = 0;

    if (item.flags.answer) {
      scale *= 1.08 + Math.abs(Math.sin(time * 3.8 + item.floatPhase)) * 0.08;
      haloOpacity = 0.52;
      emissiveBoost = 0.38;
    } else if (item.flags.remainder) {
      scale *= 1.02 + Math.abs(Math.sin(time * 3 + item.floatPhase)) * 0.12;
      haloOpacity = 0.44;
      emissiveBoost = 0.26;
    } else if (item.flags.dragging) {
      scale *= 1.12;
      haloOpacity = 0.28;
      emissiveBoost = 0.18;
    } else if (item.flags.guide) {
      scale *= 1.06 + Math.sin(time * 5.4 + item.floatPhase) * 0.04;
      haloOpacity = 0.34;
      emissiveBoost = 0.18;
    } else if (item.flags.hovered) {
      scale *= 1.08;
      haloOpacity = 0.26;
      emissiveBoost = 0.12;
    }

    item.visual.scale.setScalar(scale);
    item.halo.material.opacity = haloOpacity;
    item.materials.forEach((material) => {
      material.emissiveIntensity = emissiveBoost;
    });
  });

  gameState.pairs.forEach((pair) => {
    const connectorMaterial = pair.connector.userData.connectorMaterial;
    if (!connectorMaterial) return;
    const pulse = gameState.answerChecked ? 0.95 + Math.sin(time * 4.4 + pair.center.x) * 0.12 : 0.78;
    connectorMaterial.emissiveIntensity = pulse;
  });
}

function worldToClientPoint(position) {
  const projected = position.clone().project(camera);
  return {
    x: ((projected.x + 1) / 2) * canvas.clientWidth,
    y: ((-projected.y + 1) / 2) * canvas.clientHeight,
  };
}

function exposeDebugApi() {
  window.__fruitPairGame = {
    getState() {
      return {
        leftCount: gameState.leftCount,
        rightCount: gameState.rightCount,
        pairs: gameState.pairs.length,
        completed: gameState.completed,
        selectedAnswer: gameState.selectedAnswer,
        teachingMode: gameState.teachingMode,
        guideRunning: gameState.guideRunning,
        correctAnswer: getCorrectAnswer(),
        instruction: instructionEl.textContent,
      };
    },
    getAvailablePoints() {
      return {
        left: availableItems(SIDES.LEFT).map((item) => ({ id: item.id, ...worldToClientPoint(item.mesh.position) })),
        right: availableItems(SIDES.RIGHT).map((item) => ({ id: item.id, ...worldToClientPoint(item.mesh.position) })),
      };
    },
    async simulateOnePair() {
      const available = this.getAvailablePoints();
      const left = available.left[0];
      const right = available.right[0];
      if (!left || !right) return this.getState();

      const pointerId = 99;
      handleDragStart({
        pointerId,
        clientX: left.x,
        clientY: left.y,
      });
      handleDragMove({
        pointerId,
        clientX: right.x,
        clientY: right.y,
      });
      handleDragEnd({
        pointerId,
        clientX: right.x,
        clientY: right.y,
      });

      await new Promise((resolve) => window.setTimeout(resolve, 980));
      return this.getState();
    },
    async runSmokeTest() {
      const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
      const waitFor = async (predicate, timeout = 12000) => {
        const start = performance.now();
        while (performance.now() - start < timeout) {
          if (predicate()) return true;
          await wait(60);
        }
        return false;
      };

      const report = {};
      teachToggle.checked = false;
      gameState.teachingMode = false;
      createLevel({ leftCount: 3, rightCount: 2 });
      report.initial = this.getState();
      await this.simulateOnePair();
      report.afterDragPairs = this.getState();

      createLevel({ leftCount: 3, rightCount: 2 });
      let leftRemain = availableItems(SIDES.LEFT)[0];
      let rightRemain = availableItems(SIDES.RIGHT)[0];
      if (leftRemain && rightRemain) {
        createPair(leftRemain, rightRemain, { silent: true });
        await wait(980);
      }
      leftRemain = availableItems(SIDES.LEFT)[0];
      rightRemain = availableItems(SIDES.RIGHT)[0];
      if (leftRemain && rightRemain) {
        createPair(leftRemain, rightRemain, { silent: true });
        await wait(980);
      }
      checkAnswer(ANSWERS.RIGHT);
      await wait(80);
      report.afterWrongAnswer = this.getState();
      report.wrongInstruction = instructionEl.textContent;
      checkAnswer(ANSWERS.LEFT);
      await wait(80);
      report.afterCorrectAnswer = this.getState();
      report.correctInstruction = instructionEl.textContent;

      teachToggle.checked = true;
      gameState.teachingMode = true;
      createLevel({ leftCount: 2, rightCount: 2 });
      runTeachingGuide();
      await waitFor(() => gameState.guideRunning === true, 4000);
      await waitFor(() => gameState.guideRunning === false && gameState.completed === true, 12000);
      report.afterGuide = this.getState();
      report.guideInstruction = instructionEl.textContent;
      return report;
    },
    resetGame,
    runTeachingGuide,
  };
}

async function maybeRunQaMode() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('qa') !== '1') return;

  const output = document.createElement('pre');
  output.id = 'qa-output';
  output.style.position = 'absolute';
  output.style.left = '8px';
  output.style.bottom = '8px';
  output.style.zIndex = '10';
  output.style.maxWidth = '320px';
  output.style.padding = '10px';
  output.style.borderRadius = '16px';
  output.style.background = 'rgba(255,255,255,0.92)';
  output.style.font = '12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace';
  output.style.whiteSpace = 'pre-wrap';
  output.style.pointerEvents = 'none';
  document.body.append(output);

  try {
    const result = await window.__fruitPairGame.runSmokeTest();
    const payload = JSON.stringify({ ok: true, result });
    output.textContent = payload;
    document.body.dataset.qaStatus = 'done';
    document.body.dataset.qaResult = payload;
  } catch (error) {
    const payload = JSON.stringify({ ok: false, error: error.message });
    output.textContent = payload;
    document.body.dataset.qaStatus = 'error';
    document.body.dataset.qaResult = payload;
  }
}

function animate(now = performance.now()) {
  const deltaMs = now - lastTime;
  lastTime = now;
  updateDecor(now);
  updateTweens(deltaMs);
  updateParticles(deltaMs / 1000);
  updateItems(now);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

canvas.addEventListener('pointerdown', handleDragStart);
canvas.addEventListener('pointermove', handleDragMove);
canvas.addEventListener('pointerup', handleDragEnd);
canvas.addEventListener('pointercancel', handleDragEnd);
canvas.addEventListener('pointerleave', handleDragEnd);

answerButtons.forEach((button) => {
  button.addEventListener('click', () => checkAnswer(button.dataset.answer));
});

teachToggle.addEventListener('change', (event) => {
  gameState.teachingMode = Boolean(event.target.checked);
  setInstruction(gameState.teachingMode
    ? 'Đã bật Hướng dẫn chi tiết. Bấm Gợi ý để xem game tự ghép từng cặp 1-1.'
    : 'Đã tắt Hướng dẫn chi tiết. Hãy tự kéo để ghép từng cặp 1-1.');
});

hintBtn.addEventListener('click', () => {
  if (gameState.teachingMode) runTeachingGuide();
  else simpleHint();
});

resetBtn.addEventListener('click', resetGame);

addLights();
buildBackdrop();
buildStage();
createLevel(generateCounts());
exposeDebugApi();
maybeRunQaMode();
animate();
