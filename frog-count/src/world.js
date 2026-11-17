import * as THREE from 'three';
import { makeFroggy } from './froggy.js';
import { makeEnvironment, makeLotus } from './pond-environment.js';

const RIGHT = 'RIGHT_TO_LEFT';
const ROW_Z = 2.0;
const DECK_Y = .18;
const PAD_RADIUS = .78;
const PAD_COLORS = {
  IDLE: 0x77c967,
  HOVERED: 0x9dde68,
  NEXT_TO_COUNT: 0xa3dc69,
  COUNTED: 0x51b786,
  SELECTED: 0xc5df6c,
  CORRECT: 0xb2d95d,
  INCORRECT: 0xe9a983,
};
const RING_COLORS = {
  HOVERED: 0xfff5bb,
  NEXT_TO_COUNT: 0xffee97,
  COUNTED: 0x83e9c5,
  SELECTED: 0xffeba7,
  CORRECT: 0xffde70,
  INCORRECT: 0xffc5b4,
};

function makeAssets() {
  const resources = new Set();
  const sphere = new THREE.SphereGeometry(1, 20, 14);
  const disc = new THREE.CircleGeometry(1, 36);
  disc.rotateX(-Math.PI / 2);
  resources.add(sphere);
  resources.add(disc);
  const mesh = (geometry, material, position, scale, parent) => {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(...position);
    object.scale.set(...scale);
    parent.add(object);
    return object;
  };
  const materials = new Map();
  const material = (value, extra = {}) => {
    const color = new THREE.Color(value);
    const key = color.getHexString() + JSON.stringify(extra);
    if (!materials.has(key)) {
      const mat = new THREE.MeshStandardMaterial({ color, roughness: .66, ...extra });
      resources.add(mat);
      materials.set(key, mat);
    }
    return materials.get(key);
  };
  const cylinders = new Map();
  return {
    resources,
    material,
    ball: (parent, mat, pos, scale) => mesh(sphere, mat, pos, scale, parent),
    oval: (parent, mat, pos, [x, z]) => mesh(disc, mat, pos, [x, 1, z], parent),
    cylinder(parent, mat, top, bottom, height, pos) {
      const key = [top, bottom, height].join(',');
      if (!cylinders.has(key)) {
        const geometry = new THREE.CylinderGeometry(top, bottom, height, 16);
        resources.add(geometry);
        cylinders.set(key, geometry);
      }
      return mesh(cylinders.get(key), mat, pos, [1, 1, 1], parent);
    },
  };
}

function makeLeafGeometry(assets) {
  const shape = new THREE.Shape();
  const opening = .20;
  shape.moveTo(PAD_RADIUS * Math.cos(opening), PAD_RADIUS * Math.sin(opening));
  for (let index = 1; index <= 64; index++) {
    const angle = opening + index * (Math.PI * 2 - opening * 2) / 64;
    const radius = PAD_RADIUS * (1 + Math.sin(angle * 5 + .5) * .023);
    shape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  shape.quadraticCurveTo(.42, -.09, .09, -.025);
  shape.quadraticCurveTo(.033, 0, .09, .025);
  shape.quadraticCurveTo(.42, .09, PAD_RADIUS * Math.cos(opening), PAD_RADIUS * Math.sin(opening));
  const leaf = new THREE.ExtrudeGeometry(shape, {
    depth: .085, bevelEnabled: true, bevelThickness: .035, bevelSize: .031, bevelSegments: 3,
  });
  leaf.rotateX(-Math.PI / 2);
  assets.resources.add(leaf);

  const points = [];
  for (const angle of [.65, 1.15, 1.64, 2.20, 2.76, 3.26, 3.87, 4.45, 5.04, 5.69]) {
    let previous = new THREE.Vector3(.075, .121, -.02);
    for (let segment = 1; segment <= 8; segment++) {
      const t = segment / 8;
      const a = angle + Math.sin(t * Math.PI) * .065;
      const next = new THREE.Vector3(Math.cos(a) * .71 * t + .075 * (1 - t), .122, -Math.sin(a) * .71 * t);
      points.push(previous, next);
      previous = next;
    }
  }
  const veins = new THREE.BufferGeometry().setFromPoints(points);
  assets.resources.add(veins);
  return { leaf, veins };
}

function makeLeaf(scene, assets, geometry, ringGeometry, index) {
  const root = new THREE.Group();
  const deck = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: PAD_COLORS.IDLE, roughness: .49 });
  const veinsMat = new THREE.LineBasicMaterial({ color: 0xc7f3af, transparent: true, opacity: .48 });
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffee97, transparent: true, opacity: .82, depthWrite: false });
  assets.resources.add(mat);
  assets.resources.add(veinsMat);
  assets.resources.add(ringMat);
  const ring = new THREE.Mesh(ringGeometry, ringMat);
  ring.position.y = -.085;
  ring.visible = false;
  const leaf = new THREE.Mesh(geometry.leaf, mat);
  const veins = new THREE.LineSegments(geometry.veins, veinsMat);
  deck.rotation.y = [-.72, 1.48, -.28, 2.15, .78, -1.17, 1.02][index];
  deck.add(leaf, veins);
  root.add(deck, ring);
  scene.add(root);
  return { root, deck, ring, mat, ringMat, ringColor: new THREE.Color(), color: new THREE.Color(), state: 'IDLE', landing: -10 };
}

function makeBank(scene, assets) {
  const { oval, ball, material } = assets;
  const bank = new THREE.Group();
  const foam = material(0xc0f4db);
  const peat = material(0xd9b18c);
  const grass = material(0x9dd681);
  oval(bank, foam, [0, -.094, 0], [.85, .56]);
  ball(bank, peat, [0, -.068, 0], [.80, .155, .51]);
  ball(bank, grass, [0, -.012, -.013], [.79, .179, .495]);
  ball(bank, material(0xacb5ba), [.52, .025, .22], [.119, .075, .10]);
  ball(bank, material(0xb8c3c8), [-.52, .01, .14], [.089, .068, .073]);
  scene.add(bank);
  return bank;
}

function makeMarker(scene, assets) {
  const { material, resources, cylinder, ball } = assets;
  const marker = new THREE.Group();
  const flag = new THREE.Group();
  const purple = material(0x8d69bf);
  const gold = material(0xffd17b);
  cylinder(flag, purple, .026, .032, 1.03, [0, .53, 0]);
  ball(flag, gold, [0, 1.066, 0], [.065, .065, .065]);
  const pennant = new THREE.Shape();
  pennant.moveTo(.02, .98);
  pennant.quadraticCurveTo(.25, 1.03, .55, .84);
  pennant.quadraticCurveTo(.24, .83, .02, .70);
  pennant.closePath();
  const cloth = new THREE.ShapeGeometry(pennant, 14);
  const clothMat = material(0xe8699b, { side: THREE.DoubleSide });
  resources.add(cloth);
  flag.add(new THREE.Mesh(cloth, clothMat));
  flag.position.set(.49, .24, -.13);
  const arrow = new THREE.Group();
  arrow.position.set(.12, .088, -.34);
  for (const x of [.43, .67, .9, 1.13, 1.36]) {
    ball(arrow, purple, [x, 0, 0], [.076, .025, .060]);
  }
  for (const [x, z] of [[1.42, -.188], [1.62, -.092], [1.74, 0], [1.62, .092], [1.42, .188]]) {
    ball(arrow, purple, [x, 0, z], [.091, .028, .070]);
  }
  marker.add(arrow, flag);
  scene.add(marker);
  marker.visible = false;
  return { marker, flag, arrow };
}

function makeStarGeometry(resources) {
  const star = new THREE.Shape();
  for (let index = 0; index < 10; index++) {
    const a = index * Math.PI / 5 + Math.PI / 2;
    const radius = index % 2 ? .53 : 1;
    const x = Math.cos(a) * radius;
    const y = Math.sin(a) * radius;
    if (index === 0) star.moveTo(x, y);
    else star.lineTo(x, y);
  }
  star.closePath();
  const geometry = new THREE.ExtrudeGeometry(star, {
    depth: .126, bevelEnabled: true, bevelThickness: .058, bevelSize: .063, bevelSegments: 3,
  });
  resources.add(geometry);
  return geometry;
}

export function createPond(canvas, { reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
  const assets = makeAssets();
  const { resources, material, oval } = assets;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xc9efff);
  scene.fog = new THREE.Fog(0xc8e9ef, 22, 46);
  const camera = new THREE.OrthographicCamera(-8, 8, 4, -4, .1, 80);

  scene.add(new THREE.HemisphereLight(0xf1fcff, 0x9bb278, 2.05));
  const sun = new THREE.DirectionalLight(0xffebc5, 2.2);
  sun.position.set(-6, 9, 6);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xb7def4, .82);
  fill.position.set(4, 3, -4);
  scene.add(fill);

  const environment = makeEnvironment(scene, assets);
  const leafGeometry = makeLeafGeometry(assets);
  const ringGeometry = new THREE.TorusGeometry(.89, .025, 8, 48);
  ringGeometry.rotateX(-Math.PI / 2);
  resources.add(ringGeometry);
  const shade = new THREE.MeshBasicMaterial({ color: 0x459ca7, transparent: true, opacity: .16, depthWrite: false });
  resources.add(shade);
  const pads = Array.from({ length: 7 }, (_, index) => ({
    ...makeLeaf(scene, assets, leafGeometry, ringGeometry, index),
    shadow: oval(scene, shade, [0, -.098, ROW_Z + .035], [.80, .72]),
  }));
  const center = makeLeaf(scene, assets, leafGeometry, ringGeometry, 0);
  center.root.position.set(0, .10, -.12);
  const centerFlowers = new THREE.Group();
  const heroLotus = makeLotus(assets, 0xec75b0);
  heroLotus.position.set(-1.65, -.04, .73);
  heroLotus.scale.setScalar(1.08);
  const heroBud = makeLotus(assets, 0xcc99ea);
  heroBud.position.set(1.54, -.04, .41);
  heroBud.scale.setScalar(.78);
  centerFlowers.add(heroLotus, heroBud);
  scene.add(centerFlowers);

  const leftBank = makeBank(scene, assets);
  const rightBank = makeBank(scene, assets);
  const neutral = makeBank(scene, assets);
  neutral.position.set(0, -.09, -.43);
  neutral.scale.setScalar(.89);
  const sign = makeMarker(scene, assets);
  const frog = makeFroggy(assets);
  scene.add(frog.root);

  const shadowMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { dark: { value: new THREE.Color(0x396648) }, alpha: { value: .25 } },
    vertexShader: `
      varying vec2 point;
      void main() {
        point = uv * 2.0 - 1.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 dark;
      uniform float alpha;
      varying vec2 point;
      void main() {
        gl_FragColor = vec4(dark, (1.0 - smoothstep(0.08, 1.0, length(point))) * alpha);
        #include <colorspace_fragment>
      }
    `,
  });
  resources.add(shadowMat);
  const frogShadow = oval(scene, shadowMat, [0, .24, 0], [.76, .62]);

  const ripples = Array.from({ length: 6 }, () => {
    const mat = new THREE.MeshBasicMaterial({ color: 0xe5fbff, transparent: true, depthWrite: false });
    const ripple = new THREE.Mesh(ringGeometry, mat);
    resources.add(mat);
    ripple.visible = false;
    scene.add(ripple);
    return { ripple, mat, start: -10 };
  });
  let rippleCursor = 0;

  const prizeFlower = makeLotus(assets, 0xf065a3);
  scene.add(prizeFlower);
  prizeFlower.visible = false;
  const starGeometry = makeStarGeometry(resources);
  const star = new THREE.Mesh(starGeometry, material(0xffd35d, { roughness: .42 }));
  star.visible = false;
  scene.add(star);
  const sparks = Array.from({ length: 8 }, (_, index) => {
    const spark = new THREE.Mesh(starGeometry, material([0xffe68a, 0xffa6c1, 0xffffff, 0xd5b0fb][index % 4]));
    spark.visible = false;
    scene.add(spark);
    return spark;
  });

  const scratch = new THREE.Vector3();
  let count = 4;
  let mode = 'menu';
  let width = 0;
  let height = 0;
  let time = 0;
  let lastTick;
  let frame;
  let paused = false;
  let movement = null;
  let reward = null;
  let reaction = null;
  let restingPad = -1;
  let direction = null;
  let frogHome = { x: 0, y: DECK_Y, z: ROW_Z };

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    const sizeChanged = w !== width || h !== height;
    width = w;
    height = h;
    if (sizeChanged) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, w < 680 ? 1.45 : 1.8));
      renderer.setSize(w, h, false);
    }
    const aspect = w / h;
    const framing = mode === 'menu' ? 8.1 : 14.5;
    const span = Math.max(framing, (mode === 'menu' ? 6.55 : 7.75) * aspect);
    const sceneHeight = span / aspect;
    camera.left = -span / 2;
    camera.right = span / 2;
    camera.top = sceneHeight / 2;
    camera.bottom = -sceneHeight / 2;
    const mobileShift = Math.max(0, sceneHeight - 8) * .065;
    const targetY = mode === 'menu' ? .96 + mobileShift : .78 + mobileShift;
    const targetZ = mode === 'menu' ? -.15 : -.85;
    camera.position.set(0, targetY + 7.1, targetZ + 20);
    camera.lookAt(0, targetY, targetZ);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  function placeFrog() {
    const bob = restingPad < 0 ? 0 : pads[restingPad].deck.position.y;
    frog.root.position.set(frogHome.x, frogHome.y + bob, frogHome.z);
  }

  function clearReward() {
    reward = null;
    prizeFlower.visible = false;
    star.visible = false;
    sparks.forEach((spark) => { spark.visible = false; });
  }

  function bankFor(side) {
    return side === RIGHT ? rightBank : leftBank;
  }

  function setDirectionMarker(show) {
    sign.marker.visible = mode === 'game' && Boolean(direction) && show;
  }

  function moveFrog(destination, onLand, type) {
    movement = {
      from: new THREE.Vector3().copy(frog.root.position),
      destination,
      onLand,
      type,
      touchedDown: false,
      start: time,
      length: reducedMotion ? .34 : type === 'bank' ? .62 : .70,
    };
  }

  function setStart(side, showMarker = false, onReady) {
    direction = side;
    restingPad = -1;
    movement = null;
    reaction = null;
    clearReward();
    ripples.forEach(({ ripple }) => { ripple.visible = false; });
    neutral.visible = mode === 'game' && side === null;
    setDirectionMarker(showMarker);
    if (side) {
      const bank = bankFor(side);
      sign.marker.position.set(bank.position.x, .08, ROW_Z - .40);
      sign.marker.scale.x = side === RIGHT ? -1 : 1;
      const destination = { x: bank.position.x, y: DECK_Y, z: ROW_Z };
      if (onReady && !reducedMotion) {
        moveFrog(destination, onReady, 'bank');
      } else {
        frogHome = destination;
        placeFrog();
        onReady?.();
      }
    } else {
      frogHome = mode === 'menu'
        ? { x: 0, y: .34, z: -.05 }
        : { x: 0, y: .07, z: -.39 };
      placeFrog();
    }
  }

  function setPadStates(states) {
    pads.forEach((pad, index) => {
      pad.state = states[index] ?? 'IDLE';
      pad.color.setHex(PAD_COLORS[pad.state] ?? PAD_COLORS.IDLE);
      pad.ring.visible = Boolean(RING_COLORS[pad.state]);
      if (pad.ring.visible) pad.ringMat.color.setHex(RING_COLORS[pad.state]);
    });
  }

  function setRound(nextCount) {
    count = nextCount;
    const step = Math.min(2.24, 10.16 / Math.max(1, count - 1));
    pads.forEach((pad, index) => {
      const { root, shadow, deck } = pad;
      const x = (index - (count - 1) / 2) * step;
      root.position.set(x, .06, ROW_Z);
      shadow.position.x = x;
      root.visible = shadow.visible = mode === 'game' && index < count;
      deck.position.y = 0;
      pad.landing = -10;
    });
    const bankX = (count - 1) / 2 * step + 1.49;
    leftBank.position.set(-bankX, 0, ROW_Z);
    rightBank.position.set(bankX, 0, ROW_Z);
    leftBank.visible = rightBank.visible = mode === 'game';
    setPadStates([]);
    setStart(null);
  }

  function setMode(nextMode) {
    mode = nextMode;
    center.root.visible = mode === 'menu';
    centerFlowers.visible = mode === 'menu';
    center.root.scale.set(1.82, 1.25, 1.82);
    frog.root.scale.setScalar(mode === 'menu' ? 1.68 : .91);
    setRound(count);
    resize();
  }

  function emitRipple(x, z) {
    for (let index = 0; index < (reducedMotion ? 1 : 2); index++) {
      const effect = ripples[rippleCursor++ % ripples.length];
      effect.ripple.position.set(x, -.089, z);
      effect.ripple.visible = true;
      effect.ripple.scale.setScalar(.78);
      effect.start = time + index * .15;
    }
  }

  function jumpTo(index, onLand) {
    if (movement || index < 0 || index >= count) return;
    moveFrog({ x: pads[index].root.position.x, y: DECK_Y, z: ROW_Z }, onLand, index);
  }

  function celebrate(index) {
    const x = pads[index].root.position.x;
    reward = { start: time, x };
    prizeFlower.position.set(x + (x > 0 ? -.55 : .55), .18, ROW_Z + .15);
    prizeFlower.scale.setScalar(.06);
    prizeFlower.visible = true;
    star.visible = true;
  }

  function react(kind) {
    reaction = { kind, start: time };
  }

  const smooth = (p) => p * p * (3 - 2 * p);
  function updateMotion() {
    const horizontal = direction === RIGHT ? -1 : 1;
    let bodyScale = 0;
    let footCurl = 0;
    let heightOverDeck = 0;
    let turn = 0;
    if (movement) {
      const position = Math.min(1, Math.max(0, (time - movement.start) / movement.length));
      const prep = reducedMotion ? .10 : .19;
      const flightEnd = .87;
      const air = Math.min(1, Math.max(0, (position - prep) / (flightEnd - prep)));
      const { from, destination } = movement;
      placeFrog();
      frog.root.position.set(
        THREE.MathUtils.lerp(from.x, destination.x, air),
        THREE.MathUtils.lerp(from.y, destination.y, air),
        THREE.MathUtils.lerp(from.z, destination.z, air),
      );
      const curve = 4 * air * (1 - air);
      heightOverDeck = (reducedMotion ? .20 : movement.type === 'bank' ? .97 : 1.14) * curve;
      frog.root.position.y += heightOverDeck;
      turn = reducedMotion ? 0 : Math.sign(destination.x - from.x) * .50 * Math.sin(Math.PI * air);
      if (position < prep) {
        bodyScale = -.18 * smooth(position / prep);
        footCurl = .28 * smooth(position / prep);
      } else if (position < flightEnd) {
        const push = 1 - smooth(Math.min(1, air * 6));
        bodyScale = .10 * curve - .18 * push;
        footCurl = Math.sin(air * Math.PI) * -.54 + .28 * push;
      } else {
        bodyScale = -.135 * (1 - (position - flightEnd) / (1 - flightEnd));
        const { type, touchedDown } = movement;
        if (type !== 'bank') {
          if (!touchedDown) {
            pads[type].landing = time;
            movement.touchedDown = true;
            emitRipple(destination.x, destination.z);
          }
          frog.root.position.y += pads[type].deck.position.y;
        }
      }
      if (position === 1) {
        const { destination: landing, onLand, type } = movement;
        movement = null;
        frogHome = landing;
        restingPad = type === 'bank' ? -1 : type;
        placeFrog();
        onLand?.();
      }
    } else {
      placeFrog();
      if (reward && !reducedMotion) {
        const t = time - reward.start - .12;
        if (t > 0 && t < .76) {
          heightOverDeck = Math.sin(Math.PI * t / .76) * .58;
          frog.root.position.y += heightOverDeck;
          footCurl = -.30 * Math.sin(Math.PI * t / .76);
          turn = Math.sin(Math.PI * 2 * t / .76) * .22;
        }
      } else if (mode === 'menu' && !reducedMotion) {
        const period = time % 6.5;
        if (period > 1.55 && period < 2.2) {
          heightOverDeck = Math.sin(Math.PI * (period - 1.55) / .65) * .31;
          frog.root.position.y += heightOverDeck;
          footCurl = -.30;
        }
      }
    }
    const idle = reducedMotion ? 0 : Math.sin(time * 3.2) * .028;
    frog.body.scale.set(1 - bodyScale * .39, 1 + bodyScale + idle, 1 - bodyScale * .23);
    frog.root.rotation.y = direction ? horizontal * .20 + turn : -.09 + turn;
    const thinking = reaction?.kind === 'think' && time - reaction.start < .75;
    const encouraging = reaction?.kind === 'encourage' && time - reaction.start < .96;
    const waving = mode === 'menu' ? time % 6.5 < 1.25 : encouraging;
    frog.head.rotation.z = thinking ? .16 : 0;
    const lookout = reducedMotion ? 0 : Math.sin(time * .69) * .105;
    frog.head.rotation.y = thinking ? horizontal * -.23 : lookout;
    const blink = !reducedMotion && time % 4.2 > 4.06;
    frog.eyes.forEach((eye) => { eye.scale.y = blink ? .105 : 1; });
    frog.arms[0].rotation.z = waving && !reducedMotion ? -2.33 + Math.sin(time * 15) * .25 : -.34;
    frog.arms[1].rotation.z = .34;
    frog.feet.forEach((foot) => { foot.rotation.x = footCurl; });
    frogShadow.position.set(frog.root.position.x, Math.max(0, frog.root.position.y - heightOverDeck) + .008, frog.root.position.z);
    frogShadow.scale.set(mode === 'menu' ? 1.1 : .66, 1, mode === 'menu' ? .84 : .47);
    shadowMat.uniforms.alpha.value = .24 / (1 + heightOverDeck * 2.5);
  }

  function updatePads() {
    const ambient = reducedMotion ? 0 : time;
    pads.forEach((pad, index) => {
      if (index >= count) return;
      const t = time - pad.landing;
      const dip = !reducedMotion && t < .35 ? -Math.sin(Math.PI * t / .35) * .088 : 0;
      pad.deck.position.y = (reducedMotion ? 0 : Math.sin(ambient * 1.71 + index * .71) * .022) + dip;
      pad.mat.color.lerp(pad.color, .23);
      const emphasized = pad.state === 'NEXT_TO_COUNT';
      pad.ringMat.opacity = emphasized ? .79 + Math.sin(ambient * 3.5) * .16 : .72;
      pad.ring.scale.setScalar(emphasized ? .99 + Math.sin(ambient * 3.5) * .036 : .99);
    });
    if (!reducedMotion) sign.flag.rotation.y = Math.sin(time * 2.1) * .13;
  }

  function updateEffects() {
    ripples.forEach(({ ripple, start, mat }) => {
      if (!ripple.visible) return;
      const age = time - start;
      ripple.visible = age < .8;
      ripple.scale.setScalar(.80 + Math.max(0, age) * .96);
      mat.opacity = age < 0 ? 0 : (1 - age / .8) * .74;
    });
    if (!reward) return;
    const age = time - reward.start;
    const bloom = reducedMotion ? 1 : smooth(Math.min(1, age * 2.6));
    prizeFlower.scale.setScalar(.06 + bloom * .66);
    const height = reducedMotion ? 1.35 : .34 + 1.7 * smooth(Math.min(1, age * .93));
    const starOffset = reward.x < 0 ? -.81 : .81;
    star.position.set(reward.x + starOffset * bloom, height + .53, ROW_Z + .1);
    star.scale.setScalar((reducedMotion ? 1 : Math.min(1, age * 3.5)) * .32);
    star.rotation.y = reducedMotion ? 0 : Math.sin(age * 2.5) * .55;
    if (reducedMotion) return;
    sparks.forEach((spark, index) => {
      const t = Math.max(0, age - index * .035);
      const angle = index * 2.39;
      spark.visible = t > 0 && t < 1.35;
      if (!spark.visible) return;
      spark.position.set(reward.x + Math.cos(angle) * t * 1.19,
        .40 + 2.15 * t - t * t * .89 + Math.sin(angle) * .35, ROW_Z + Math.sin(angle) * t);
      spark.scale.setScalar(Math.sin(Math.PI * t / 1.35) * .11);
      spark.rotation.set(0, t * 4, angle + t);
    });
  }

  function tick(now) {
    if (lastTick !== undefined && !paused) time += Math.min(.06, (now - lastTick) / 1000);
    lastTick = now;
    if (width && height && !paused) {
      environment.update(reducedMotion ? 0 : time);
      updatePads();
      updateMotion();
      updateEffects();
      renderer.render(scene, camera);
    }
    frame = requestAnimationFrame(tick);
  }

  function project(x, y, z, radius) {
    scratch.set(x, y, z).project(camera);
    const scale = width / (camera.right - camera.left);
    return {
      x: (scratch.x + 1) * width / 2,
      y: (1 - scratch.y) * height / 2,
      width: radius * 2 * scale,
      height: radius * 1.44 * scale,
    };
  }

  setMode('menu');
  frame = requestAnimationFrame(tick);
  return {
    setRound,
    setMode,
    setPadStates,
    setStart,
    setDirectionMarker,
    jumpTo,
    celebrate,
    react,
    setPaused(value) { paused = value; },
    projectPad(index) {
      return project(pads[index].root.position.x, DECK_Y, ROW_Z, PAD_RADIUS);
    },
    projectStart(side) {
      return project(bankFor(side).position.x, DECK_Y, ROW_Z, .76);
    },
    dispose() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resources.forEach((resource) => resource.dispose());
      renderer.dispose();
    },
  };
}
