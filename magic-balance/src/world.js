import * as THREE from 'three';
import { createAnimalFactory } from './animals.js';
import { createLabArt, makeLaboratory } from './lab-art.js';
import { getBalance } from './weights.js';

const SIDES = ['left', 'right'];
const PIVOT_Y = 3.48;
const ARM = 2.34;
const PAN_RADIUS = 1.20;
const PAN_DEPTH = .91;
const PAN_DROP = 1.37;
const PAN_Z = .40;
const MAX_ANGLE = Math.PI / 15;
const DEFAULT_BOARD = {
  left: [{ id: 'preview-buffalo', kind: 'buffalo' }],
  right: [{ id: 'preview-fox-1', kind: 'fox' }, { id: 'preview-fox-2', kind: 'fox' }],
};
const EMPTY_BOARD = { left: [], right: [] };
const LAYOUT = [
  [],
  [[0, .06, .88]],
  [[-.48, .06, .70], [.48, .06, .70]],
  [[-.67, .25, .57], [0, -.40, .62], [.67, .25, .57]],
  [[-.63, -.40, .55], [.63, -.40, .55], [-.42, .37, .53], [.42, .37, .53]],
  [[-.67, -.45, .50], [0, -.43, .51], [.67, -.45, .50], [-.38, .37, .53], [.38, .37, .53]],
  [[-.67, -.46, .48], [0, -.49, .49], [.67, -.46, .48], [-.67, .35, .49], [0, .39, .49], [.67, .35, .49]],
];

function makePan(art, scale, side) {
  const { material, mesh, geometry, cylinder, ball, ring, shadow } = art;
  const root = new THREE.Group();
  scale.add(root);
  const left = side === 'left';
  const shell = material(left ? 0x59b9b2 : 0xecaa93, { roughness: .35 });
  const enamel = material(left ? 0xb5e7d9 : 0xffdbc6, { roughness: .44 });
  const gold = material(0xeab576, { roughness: .34, metalness: .18 });
  cylinder(root, shell, [0, -.14, 0], PAN_RADIUS, .28, PAN_RADIUS * .81).scale.z = PAN_DEPTH / PAN_RADIUS;
  cylinder(root, enamel, [0, -.010, 0], PAN_RADIUS * .94, .029).scale.z = PAN_DEPTH / PAN_RADIUS;
  const trayRim = ring(root, shell, [0, .006, 0], PAN_RADIUS * .97, .048);
  trayRim.rotation.x = -Math.PI / 2;
  trayRim.scale.y = PAN_DEPTH / PAN_RADIUS;
  const accent = ring(root, gold, [0, -.115, 0], PAN_RADIUS * .96, .025);
  accent.rotation.x = -Math.PI / 2;
  accent.scale.y = PAN_DEPTH / PAN_RADIUS;
  const catchLight = ring(root, enamel, [0, -.061, 0], PAN_RADIUS * .984, .026);
  catchLight.rotation.x = -Math.PI / 2;
  catchLight.scale.y = PAN_DEPTH / PAN_RADIUS;
  const haloMaterial = new THREE.MeshBasicMaterial({
    color: left ? 0xddfff0 : 0xfff1bd, transparent: true, opacity: .84, depthWrite: false,
  });
  art.resources.add(haloMaterial);
  const glow = ring(root, haloMaterial, [0, -.050, 0], PAN_RADIUS * 1.048, .033);
  glow.rotation.x = -Math.PI / 2;
  glow.scale.y = PAN_DEPTH / PAN_RADIUS;
  glow.visible = false;

  const attachments = [-1, 1].map((sign) => {
    ball(root, gold, [sign * 1.117, .052, -.06], [.096, .067, .089]);
    return new THREE.Vector3(sign * 1.117, .082, -.06);
  });
  ball(root, gold, [0, -.26, 0], [.20, .06, .19]);
  const badge = cylinder(root, gold, [0, -.13, .892], .105, .047);
  badge.rotation.x = Math.PI / 2;
  art.star(root, enamel, [0, -.126, .92], .063);
  const shadowMesh = shadow(scale, [0, .17, PAN_Z], [1.55, .78]);

  const rodShape = geometry('hanger', () => new THREE.CylinderGeometry(.028, .028, 1, 10));
  const rods = attachments.map(() => mesh(scale, rodShape, gold));
  const hitShape = geometry('pan-target', () => new THREE.CylinderGeometry(PAN_RADIUS * 1.06, PAN_RADIUS * 1.06, .65, 20));
  const hitMaterial = material(0xffffff, { visible: false });
  const collider = mesh(root, hitShape, hitMaterial, [0, .20, 0]);
  collider.scale.z = PAN_DEPTH / PAN_RADIUS * 1.06;
  collider.userData.side = side;
  collider.visible = false;
  return { root, attachments, rods, collider, glow, haloMaterial, shadowMesh };
}

function makeScale(scene, art) {
  const { material, cylinder, ball, block, ring, star, shadow } = art;
  const body = new THREE.Group();
  scene.add(body);
  const foundation = material(0x8887c7, { roughness: .51 });
  const purple = material(0x9294d3, { roughness: .45 });
  const pale = material(0xbcbce6, { roughness: .39 });
  const gold = material(0xe9ab6f, { metalness: .22, roughness: .29 });
  const bright = material(0xffdca0, { metalness: .11, roughness: .31 });
  const enamel = material(0xf1e5f4, { roughness: .47 });
  shadow(body, [0, .174, .09], [2.18, 1.27]);
  block(body, foundation, [0, .32, .015], [2.89, .36, 1.62], .16);
  block(body, purple, [0, .506, .015], [2.73, .13, 1.48], .054);
  block(body, pale, [0, .573, .015], [2.48, .085, 1.27], .038);
  block(body, gold, [0, .41, .818], [1.22, .196, .08], .05);
  block(body, bright, [0, .41, .865], [1.08, .126, .046], .039);
  for (const x of [-.46, .46]) ball(body, gold, [x, .410, .898], [.036, .036, .023]);
  star(body, gold, [0, .414, .886], .064);

  cylinder(body, purple, [0, 1.90, -.12], .24, 2.74, .35);
  cylinder(body, foundation, [0, .694, -.12], .44, .19, .51);
  cylinder(body, gold, [0, .747, -.12], .455, .079, .455);
  cylinder(body, pale, [0, 2.94, -.12], .31, .13, .25);
  cylinder(body, gold, [0, 3.107, -.12], .322, .140, .312);
  ball(body, pale, [-.119, 1.49, .139], [.036, .72, .029]);
  ball(body, foundation, [0, 3.35, -.12], [.39, .49, .29]);

  const pivot = new THREE.Group();
  pivot.position.set(0, PIVOT_Y, 0);
  body.add(pivot);
  block(pivot, foundation, [0, .015, 0], [ARM * 2 + .60, .26, .30], .09);
  block(pivot, pale, [0, .135, 0], [ARM * 2 + .45, .112, .289], .045);
  block(pivot, gold, [0, .01, .155], [ARM * 2 + .42, .071, .059], .026);
  for (const sign of [-1, 1]) {
    ball(pivot, gold, [sign * ARM, -.017, .10], [.13, .13, .142]);
    ball(pivot, bright, [sign * ARM, .009, .22], [.088, .09, .066]);
    ring(pivot, gold, [sign * ARM, -.156, .10], .077, .028);
  }

  function disc(surface, radius, depth, z) {
    const value = cylinder(body, surface, [0, PIVOT_Y, z], radius, depth);
    value.rotation.x = Math.PI / 2;
    return value;
  }
  disc(gold, .422, .182, .28);
  disc(bright, .366, .112, .397);
  disc(enamel, .306, .091, .467);
  for (const a of [-.78, -.40, 0, .40, .78]) {
    const mark = block(body, a === 0 ? gold : foundation,
      [Math.sin(a) * .245, PIVOT_Y + Math.cos(a) * .245, .518], [.026, .058, .022], .006);
    mark.rotation.z = -a;
  }
  const needle = new THREE.Group();
  body.add(needle);
  needle.position.set(0, PIVOT_Y, .539);
  block(needle, foundation, [0, .129, 0], [.039, .231, .033], .017);
  ball(needle, gold, [0, 0, .023], [.077, .077, .045]);
  star(body, bright, [0, 4.062, -.026], .275);
  const sides = Object.fromEntries(SIDES.map((side) => [side, makePan(art, body, side)]));
  return { pivot, needle, sides };
}

function smoothstep(value) {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function lozengeColor(art, color) {
  return art.material(color, { metalness: .07, roughness: .35, emissive: color, emissiveIntensity: .18 });
}

export function createLab(canvas, { reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: false, powerPreference: 'low-power',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = .96;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe6d9ec);
  const camera = new THREE.OrthographicCamera(-5, 5, 3, -3, .1, 56);
  scene.add(new THREE.HemisphereLight(0xfff6ff, 0xbc9ebf, 1.70));
  const sun = new THREE.DirectionalLight(0xffead6, 2.10);
  sun.position.set(-3.7, 8.2, 7.5);
  scene.add(sun);
  const bounce = new THREE.DirectionalLight(0xc8f0fa, .81);
  bounce.position.set(7, 4, -3);
  scene.add(bounce);

  const art = createLabArt();
  const environment = makeLaboratory(scene, art);
  const scale = makeScale(scene, art);
  const animals = createAnimalFactory();
  const mimo = animals.create('mimo');
  scene.add(mimo.group);
  const mimoShadow = art.shadow(scene, [4.00, .174, -.74], [1.07, .68]);
  const shelfAnimal = animals.create('dog');
  shelfAnimal.group.position.set(-4.01, .165, .59);
  shelfAnimal.group.rotation.y = .34;
  shelfAnimal.group.scale.setScalar(.88);
  scene.add(shelfAnimal.group);
  const shelfShadow = art.shadow(scene, [-4.01, .173, .59], [.72, .50]);

  const prizeStar = art.star(scene, lozengeColor(art, 0xffd67a), [0, 3.72, .16]);
  prizeStar.visible = false;
  const sparks = Array.from({ length: 8 }, (_, index) => {
    const color = [0xffd76d, 0xffbdd4, 0xa9eee1, 0xc5bdfa][index % 4];
    const mesh = art.star(scene, lozengeColor(art, color), [0, 0, 0], .1);
    mesh.visible = false;
    return mesh;
  });
  const removeSparks = Array.from({ length: 5 }, (_, index) => {
    const mesh = art.star(scene, lozengeColor(art, [0xffdb83, 0xf7b8db][index % 2]), [0, 0, 0], .06);
    mesh.visible = false;
    return mesh;
  });

  const dragHaloMaterial = new THREE.MeshBasicMaterial({ color: 0xfff7d1, depthWrite: false, transparent: true, opacity: .77 });
  art.resources.add(dragHaloMaterial);
  const dragHalo = art.ring(scene, dragHaloMaterial, [0, 0, 0], .67, .031);
  dragHalo.rotation.x = -Math.PI / 2;
  dragHalo.visible = false;
  const selectionRing = art.ring(scene, dragHaloMaterial, [0, 0, 0], .67, .024);
  selectionRing.rotation.x = -Math.PI / 2;
  selectionRing.visible = false;

  const records = new Map();
  const gone = [];
  const ray = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const up = new THREE.Vector3(0, 1, 0);
  const joint = new THREE.Vector3();
  const end = new THREE.Vector3();
  const hanger = new THREE.Vector3();
  const projected = new THREE.Vector3();
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -1.65);
  const dragPoint = new THREE.Vector3();
  const panColliders = SIDES.map((side) => scale.sides[side].collider);
  const dropTint = new THREE.Color(0xffffbb);
  const hoverTint = new THREE.Color(0xe1fff1);
  let time = 0;
  let lastTick;
  let frame;
  let paused = false;
  let disposed = false;
  let width = 0;
  let height = 0;
  let mode = '';
  let focusSide = null;
  let selectedId = null;
  let balance = false;
  let angle = 0;
  let motion = null;
  let reward = null;
  let dissolvedAt = -2;
  let reaction = null;
  let dragged = null;
  const dissolveOrigin = new THREE.Vector3();

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    if (width !== w || height !== h) {
      width = w;
      height = h;
      const maxRatio = w < 680 ? 1.35 : 1.75;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxRatio));
      renderer.setSize(width, height, false);
    }
    const aspect = width / height;
    const span = Math.max(mode === 'menu' ? 10.11 : 8.69, aspect * (mode === 'menu' ? 5.84 : 5.0));
    const vertical = span / aspect;
    camera.left = -span / 2;
    camera.right = span / 2;
    camera.top = vertical / 2;
    camera.bottom = -vertical / 2;
    const targetY = mode === 'menu' ? 2.36 : 2.12;
    camera.position.set(0, targetY + 5.20, 15.3);
    camera.lookAt(0, targetY, 0);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    const smallStage = span < 9.6;
    mimo.group.position.set(smallStage ? 3.84 : 4.13, .167, -.86);
    mimo.group.scale.setScalar(smallStage ? .71 : .99);
    mimoShadow.position.x = mimo.group.position.x;
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  function updateAngles() {
    scale.pivot.rotation.z = angle;
    scale.needle.rotation.z = -angle * 2.12;
    const dx = ARM * Math.cos(angle);
    const dy = ARM * Math.sin(angle);
    SIDES.forEach((side, index) => {
      const sign = index ? 1 : -1;
      const { root, attachments, rods, shadowMesh } = scale.sides[side];
      const anchorX = sign * dx;
      const anchorY = PIVOT_Y + sign * dy;
      root.position.set(anchorX, anchorY - PAN_DROP, PAN_Z);
      shadowMesh.position.x = anchorX;
      const shadowSize = 1 + Math.max(0, anchorY - PIVOT_Y) * .25;
      shadowMesh.scale.set(1.42 * shadowSize, 1, .74 * shadowSize);
      joint.set(anchorX, anchorY - .16, .10);
      for (let rodIndex = 0; rodIndex < rods.length; rodIndex++) {
        const rod = rods[rodIndex];
        end.copy(attachments[rodIndex]).add(root.position);
        hanger.subVectors(end, joint);
        rod.position.copy(joint).lerp(end, .5);
        rod.quaternion.setFromUnitVectors(up, hanger.normalize());
        rod.scale.y = end.distanceTo(joint);
      }
    });
  }

  function makeRecord(item, side) {
    const animal = animals.create(item.kind);
    const pan = scale.sides[side].root;
    const spot = art.shadow(pan, [0, .006, 0], [.44, .32]);
    pan.add(animal.group);
    return {
      id: item.id, kind: item.kind, side, animal, spot,
      from: new THREE.Vector3(), to: new THREE.Vector3(),
      base: .6, fromScale: .6, birth: time, duration: 0,
    };
  }

  function removeRecord(record, animate) {
    const { animal, spot } = record;
    spot.removeFromParent();
    records.delete(record.id);
    if (!animate || reducedMotion || dragged?.id === record.id) {
      animal.group.removeFromParent();
      return;
    }
    scene.attach(animal.group);
    const originals = new Map();
    function translucentCopy(surface) {
      if (!originals.has(surface)) {
        const translucent = surface.clone();
        translucent.transparent = true;
        translucent.depthWrite = false;
        translucent.emissive?.setHex(0xffcc8f);
        if ('emissiveIntensity' in translucent) translucent.emissiveIntensity = .36;
        originals.set(surface, translucent);
      }
      return originals.get(surface);
    }
    animal.group.traverse((object) => {
      if (!object.isMesh) return;
      object.material = Array.isArray(object.material)
        ? object.material.map(translucentCopy)
        : translucentCopy(object.material);
    });
    dissolveOrigin.copy(animal.group.position);
    dissolvedAt = time;
    gone.push({
      group: animal.group, materials: [...originals.values()],
      birth: time, s: animal.group.scale.x, y: animal.group.position.y,
    });
  }

  function clearDepartures() {
    for (const item of gone) {
      item.group.removeFromParent();
      for (const surface of item.materials) surface.dispose();
    }
    gone.length = 0;
    dissolvedAt = -2;
  }

  function setBoard(board, { immediate = false, onSettled, placedId, difference, unweighed = false } = {}) {
    if (immediate) {
      clearDepartures();
      reward = null;
      reaction = null;
      prizeStar.visible = false;
      sparks.forEach((mesh) => { mesh.visible = false; });
    }
    const ids = new Set(SIDES.flatMap((side) => board[side].map(({ id }) => id)));
    scene.updateMatrixWorld();
    for (const record of records.values()) {
      if (!ids.has(record.id)) removeRecord(record, !immediate);
    }

    SIDES.forEach((side) => {
      const items = board[side];
      items.forEach((item, index) => {
        const [x, z, base] = LAYOUT[Math.min(items.length, LAYOUT.length - 1)][index];
        const pan = scale.sides[side].root;
        let record = records.get(item.id);
        if (!record) {
          record = makeRecord(item, side);
          records.set(item.id, record);
          record.animal.group.position.set(x, placedId === item.id ? .47 : .28, z);
        } else if (record.side !== side) {
          pan.attach(record.animal.group);
          pan.add(record.spot);
          record.side = side;
        }

        record.from.copy(record.animal.group.position);
        record.fromScale = record.animal.group.scale.x;
        record.to.set(x, .025, z);
        record.base = base;
        record.birth = time;
        record.duration = immediate ? 0 : reducedMotion ? .12 : .31;
      });
    });

    const diff = difference ?? getBalance(board.left, board.right).difference;
    const next = unweighed ? 0 : THREE.MathUtils.clamp(diff * .076, -MAX_ANGLE, MAX_ANGLE);
    balance = !unweighed && board.left.length + board.right.length > 0 && diff === 0;
    if (immediate) {
      motion = null;
      angle = next;
      updateAngles();
      updateAnimals();
      onSettled?.();
    } else {
      motion = { from: angle, to: next, birth: time, duration: reducedMotion ? .14 : .51, onSettled };
    }
  }

  function clearDrag() {
    if (dragged) {
      dragged.preview.group.removeFromParent();
      const source = records.get(dragged.id);
      if (source) source.animal.group.visible = true;
    }
    dragged = null;
    dragHalo.visible = false;
  }

  function setMode(nextMode) {
    if (mode === nextMode) return;
    mode = nextMode;
    focusSide = null;
    selectedId = null;
    clearDrag();
    shelfAnimal.group.visible = shelfShadow.visible = mode === 'menu';
    setBoard(mode === 'menu' ? DEFAULT_BOARD : EMPTY_BOARD, { immediate: true });
    resize();
  }

  function cast(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    if (x < 0 || y < 0 || x > 1 || y > 1) return false;
    pointer.set(x * 2 - 1, 1 - y * 2);
    scene.updateMatrixWorld();
    ray.setFromCamera(pointer, camera);
    return true;
  }

  function projection(point, worldWidth, worldHeight) {
    point.project(camera);
    const pixels = width / (camera.right - camera.left);
    return {
      x: (point.x + 1) * width * .5,
      y: (1 - point.y) * height * .5,
      w: worldWidth * pixels,
      h: worldHeight * pixels,
    };
  }

  function projectPlate(side) {
    if (!scale.sides[side]) return null;
    projected.copy(scale.sides[side].root.position);
    return projection(projected, PAN_RADIUS * 2, .90);
  }

  function projectAnimal(id) {
    const record = records.get(id);
    if (!record) return null;
    projected.copy(record.animal.group.position).add(scale.sides[record.side].root.position);
    projected.y += record.base * .55;
    return projection(projected, record.base * 1.25, record.base * 1.21);
  }

  function hitPlate(clientX, clientY) {
    if (!cast(clientX, clientY)) return null;
    const hit = ray.intersectObjects(panColliders, false)[0];
    if (hit) return hit.object.userData.side;

    const bounds = canvas.getBoundingClientRect();
    const x = (clientX - bounds.left) * width / bounds.width;
    const y = (clientY - bounds.top) * height / bounds.height;
    let closest = null;
    let distance = Infinity;
    for (const side of SIDES) {
      const pan = projectPlate(side);
      const dx = Math.abs(x - pan.x);
      const dy = y - pan.y;
      if (dx > pan.w * .56 || dy < -Math.max(47, pan.h * 1.62) || dy > Math.max(19, pan.h * .62)) continue;
      if (dx ** 2 + dy ** 2 >= distance) continue;
      closest = side;
      distance = dx ** 2 + dy ** 2;
    }
    return closest;
  }

  function hitAnimal(clientX, clientY) {
    if (!cast(clientX, clientY)) return null;
    let best = null;
    let distance = Infinity;
    for (const record of records.values()) {
      if (dragged?.id === record.id) continue;
      const hits = ray.intersectObject(record.animal.group, true);
      if (hits.length && hits[0].distance < distance) {
        distance = hits[0].distance;
        best = record;
      }
    }
    return best ? { id: best.id, side: best.side, kind: best.kind } : null;
  }

  function drag({ id, kind }, clientX, clientY) {
    if (dragged?.id !== id || dragged?.kind !== kind || !dragged) {
      clearDrag();
      const preview = animals.create(kind);
      preview.group.scale.setScalar(.78);
      preview.group.rotation.y = .15;
      preview.group.visible = false;
      dragged = { id, kind, preview };
      scene.add(preview.group);
      const source = records.get(id);
      if (source) source.animal.group.visible = false;
    }
    const visible = cast(clientX, clientY) && Boolean(ray.ray.intersectPlane(dragPlane, dragPoint));
    dragged.preview.group.visible = dragHalo.visible = visible;
    if (visible) {
      dragged.preview.group.position.copy(dragPoint);
      dragged.preview.group.position.y -= .43;
      dragHalo.position.copy(dragged.preview.group.position);
      dragHalo.position.y -= .015;
    }
  }

  function celebrate() {
    reward = { birth: time };
    reaction = { mood: 'happy', birth: time };
    prizeStar.visible = true;
  }

  function react(kind) {
    const mood = kind === 'think' ? 'thinking' : kind;
    reaction = { mood, birth: time };
  }

  function updateAnimals() {
    for (const record of records.values()) {
      const { animal, spot, from, to, base, fromScale, birth, duration } = record;
      const age = duration ? smoothstep((time - birth) / duration) : 1;
      animal.group.position.copy(from).lerp(to, age);
      // A transferred piece may cross outside its pan before the snap completes.
      animal.group.position.y = Math.max(age < 1 ? .035 : .025, animal.group.position.y);
      animal.group.scale.setScalar(THREE.MathUtils.lerp(fromScale, base, age));
      animal.group.rotation.y = (record.side === 'left' ? .10 : -.10) + to.x * -.13;
      spot.position.x = animal.group.position.x;
      spot.position.z = animal.group.position.z;
      spot.scale.set(base * .59, 1, base * .46);
      spot.visible = animal.group.visible;
      animal.animate(reducedMotion ? 0 : time + to.x * .71 + to.z * 1.2);
    }
    const mood = reaction && time - reaction.birth < 2.5 ? reaction.mood : mode === 'menu' && time % 6.8 < 2 ? 'wave' : 'idle';
    mimo.group.rotation.y = mood === 'point' ? -.38 : -.15;
    mimo.animate(reducedMotion ? 0 : time, reducedMotion ? 'idle' : mood);
    shelfAnimal.animate(reducedMotion ? 0 : time);
    if (dragged) dragged.preview.animate(reducedMotion ? 0 : time, 'idle');
  }

  function updateEffects() {
    const age = reward ? time - reward.birth : 9;
    for (const side of SIDES) {
      const { haloMaterial, glow } = scale.sides[side];
      const focused = focusSide === side || focusSide === 'both';
      glow.visible = focused || balance;
      haloMaterial.color.copy(focused ? dropTint : hoverTint);
      haloMaterial.opacity = focused ? .94 : age < 1.6 ? .66 : .42;
    }
    const selected = records.get(selectedId);
    selectionRing.visible = Boolean(selected?.animal.group.visible);
    if (selectionRing.visible) {
      selectionRing.position.copy(selected.animal.group.position).add(scale.sides[selected.side].root.position);
      selectionRing.position.y = scale.sides[selected.side].root.position.y + .018;
      selectionRing.scale.set(selected.base, selected.base * .78, 1);
    }
    if (reward) {
      const rise = reducedMotion ? 1 : smoothstep(age / 1.3);
      prizeStar.scale.setScalar((reducedMotion ? 1 : smoothstep(age * 3.1)) * .31);
      prizeStar.position.set(0, 3.62 + rise * 1, .40);
      prizeStar.rotation.y = reducedMotion ? 0 : Math.sin(age * 2.1) * .54;
      for (let index = 0; index < sparks.length; index++) {
        const bit = sparks[index];
        const t = age - index * .047;
        const theta = index * 2.399;
        bit.visible = !reducedMotion && t >= 0 && t <= 1.45;
        if (!bit.visible) continue;
        bit.position.set(Math.cos(theta) * (t + .31) * 1.47,
          3.45 + 1.46 * t - t * t * .54 + Math.sin(theta) * .27, .64 + Math.sin(theta) * t * .52);
        bit.scale.setScalar(Math.sin((t + .05) / 1.55 * Math.PI) * .105);
        bit.rotation.set(0, t * 3, theta + t * 1.7);
      }
    }
    for (let index = gone.length - 1; index >= 0; index--) {
      const item = gone[index];
      const dissolving = smoothstep((time - item.birth) / .37);
      item.group.position.y = item.y + dissolving * .29;
      item.group.scale.setScalar(item.s * (1 + Math.sin(dissolving * Math.PI) * .14 - dissolving * .22));
      item.materials.forEach((surface) => { surface.opacity = 1 - dissolving; });
      if (dissolving === 1) {
        item.group.removeFromParent();
        item.materials.forEach((surface) => surface.dispose());
        gone.splice(index, 1);
      }
    }
    for (let index = 0; index < removeSparks.length; index++) {
      const bit = removeSparks[index];
      const t = time - dissolvedAt - index * .018;
      bit.visible = !reducedMotion && t > 0 && t < .42;
      if (!bit.visible) continue;
      const theta = index * 2.399;
      bit.position.copy(dissolveOrigin);
      bit.position.x += Math.cos(theta) * t * 1.51;
      bit.position.y += t * 2.25 + Math.sin(theta) * t * .42 + .48;
      bit.position.z += .27;
      bit.scale.setScalar(Math.sin(t / .42 * Math.PI) * .069);
    }
  }

  function tick(now) {
    if (disposed) return;
    if (!paused && lastTick !== undefined) time += Math.min(.067, (now - lastTick) / 1000);
    lastTick = now;
    if (width && height && !paused) {
      if (motion) {
        const t = smoothstep((time - motion.birth) / motion.duration);
        angle = THREE.MathUtils.lerp(motion.from, motion.to, t);
        if (t === 1) {
          const settled = motion.onSettled;
          motion = null;
          settled?.();
        }
      }
      updateAngles();
      updateAnimals();
      updateEffects();
      environment.update(reducedMotion ? 0 : time);
      renderer.render(scene, camera);
    }
    if (!disposed) frame = requestAnimationFrame(tick);
  }

  setMode('menu');
  frame = requestAnimationFrame(tick);
  return {
    setMode, setBoard, projectPlate, projectAnimal, hitPlate, hitAnimal, drag, clearDrag,
    celebrate, react,
    setPaused(value) { paused = Boolean(value); },
    setFocus(side) { focusSide = side; },
    setSelected(id) { selectedId = id; },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      clearDrag();
      clearDepartures();
      animals.dispose();
      art.dispose();
      renderer.dispose();
    },
  };
}
