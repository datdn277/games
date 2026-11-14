import * as THREE from 'three';
import { contactShadow, enamel, extrude, shapes, solid, stroke } from './geometry.js';

const palette = [0xf5bbec, 0xffcfad, 0xffe68c, 0xa7e6d1, 0x9fdbfa, 0xbda9f6];
const floorPalette = [0xffd4e4, 0xd6cbfa, 0xc0dcff, 0xc1eddf, 0xffe9be, 0xe8c8f0];
const smooth = (radius, tube, arc = Math.PI * 2) => new THREE.TorusGeometry(radius, tube, 10, 72, arc);

function horizontalRing(parent, radius, tube, material, y) {
  const ring = solid(parent, smooth(radius, tube), material, 0, y);
  ring.rotation.x = -Math.PI / 2;
  return ring;
}

function roundProfile(points) {
  return new THREE.LatheGeometry(points.map(([radius, y]) => new THREE.Vector2(radius, y)), 100);
}

function makePlatform(parent, shadow, star, note) {
  const disk = solid(parent, roundProfile([
    [0, -0.49], [3.17, -0.49], [3.32, -0.46], [3.39, -0.39],
    [3.41, -0.33], [3.41, -0.19], [3.39, -0.09], [3.34, 0],
    [3.26, 0.023], [0, 0.023],
  ]), enamel(0xb395ee, 0.43));
  disk.receiveShadow = true;

  const lip = solid(parent, roundProfile([
    [3.365, -0.28], [3.419, -0.27], [3.432, -0.25], [3.432, -0.16],
    [3.42, -0.13], [3.39, -0.123], [3.35, -0.123],
  ]), enamel(0xe7d2fa, 0.45));
  lip.receiveShadow = true;
  const rim = horizontalRing(parent, 3.256, 0.045, enamel(0xfff1fa, 0.40), 0.05);
  rim.receiveShadow = true;

  const floor = solid(parent, new THREE.CircleGeometry(3.26, 80), enamel(0xf9e5fa), 0, 0.03);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;

  const tiles = [];
  const width = 0.781;
  const spacing = 0.82;
  const contour = [];
  function roundedTile(x, z) {
    const a = width / 2;
    const b = a - 0.061;
    const outline = [
      [x - b, z - a], [x + b, z - a], [x + a, z - b], [x + a, z + b],
      [x + b, z + a], [x - b, z + a], [x - a, z + b], [x - a, z - b],
    ];
    contour.length = 0;
    for (let index = 0; index < outline.length; index += 1) {
      const v = outline[index];
      const next = outline[(index + 1) % outline.length];
      for (let step = 0; step < 4; step += 1) {
        const p = step / 4;
        const px = v[0] + (next[0] - v[0]) * p;
        const pz = v[1] + (next[1] - v[1]) * p;
        const radius = Math.max(1, Math.hypot(px, pz) / 3.18);
        contour.push(new THREE.Vector2(px / radius, -pz / radius));
      }
    }
    const tile = new THREE.Shape(contour);
    tile.closePath();
    return new THREE.ShapeGeometry(tile);
  }

  for (let row = -4; row <= 4; row += 1) {
    for (let column = -4; column <= 4; column += 1) {
      if (Math.hypot(Math.max(0, Math.abs(row) * spacing - 0.40), Math.max(0, Math.abs(column) * spacing - 0.40)) > 3.12) continue;
      const tileIndex = (Math.abs(row * 13 + column * 9 + row * column * 5) + 10) % floorPalette.length;
      const material = enamel(floorPalette[tileIndex], 0.65);
      material.emissive.setHex(floorPalette[tileIndex]);
      material.emissiveIntensity = 0.015;
      const tile = solid(parent, roundedTile(column * spacing, row * spacing), material, 0, 0.042);
      tile.rotation.x = -Math.PI / 2;
      tile.receiveShadow = true;
      tiles.push({ tile, row, column, tint: tileIndex });
    }
  }

  const markings = [
    [star, -2.04, 0.40, 0.17, 0.26], [note, 1.73, -1.21, 0.2, 0.35],
    [star, 1.48, 1.68, 0.165, -0.25], [note, -1.43, -1.59, 0.16, -0.29],
    [star, -1.22, 1.95, 0.14, 0.15], [star, 0.79, -2.06, 0.18, 0.27],
  ];
  const decal = enamel(0xfff6f9, 0.75);
  for (const [geometry, x, z, scale, rotate] of markings) {
    const mark = solid(parent, geometry, decal, x, 0.056, z);
    mark.rotation.set(-Math.PI / 2, 0, rotate);
    mark.scale.set(scale, scale, 0.019);
  }

  const ring = horizontalRing(parent, 3.14, 0.012, new THREE.MeshBasicMaterial({
    color: 0xffffff, opacity: 0.5, transparent: true, depthWrite: false,
  }), 0.06);

  const dots = new THREE.Group();
  dots.position.y = 0.073;
  parent.add(dots);
  const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xfff7fc, transparent: true, opacity: 0.75 });
  const dotGeometry = new THREE.CircleGeometry(0.032, 10);
  for (let index = 0; index < 14; index += 1) {
    const angle = index * Math.PI * 2 / 14;
    const dot = solid(dots, dotGeometry, dotMaterial, 3.06 * Math.cos(angle), 0, 3.06 * Math.sin(angle));
    dot.rotation.x = -Math.PI / 2;
  }

  const leftFloor = new THREE.MeshBasicMaterial({ color: 0xe45b9c, transparent: true, opacity: 0, depthWrite: false });
  const rightFloor = new THREE.MeshBasicMaterial({ color: 0x5c65f5, transparent: true, opacity: 0, depthWrite: false });
  const cueGeometry = new THREE.CircleGeometry(0.367, 36);
  const arrowPath = new THREE.Shape();
  arrowPath.moveTo(-0.18, -0.033);
  arrowPath.lineTo(0.03, -0.033);
  arrowPath.lineTo(0.03, -0.103);
  arrowPath.lineTo(0.18, 0);
  arrowPath.lineTo(0.03, 0.103);
  arrowPath.lineTo(0.03, 0.033);
  arrowPath.lineTo(-0.18, 0.033);
  arrowPath.closePath();
  const arrowGeometry = new THREE.ShapeGeometry(arrowPath);
  const guides = [leftFloor, rightFloor].map((material, index) => {
    const x = index === 0 ? -1.64 : 1.64;
    const dot = solid(parent, cueGeometry, material, x, 0.071, 0);
    dot.rotation.x = -Math.PI / 2;
    const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xfffcff, transparent: true, opacity: 0, depthWrite: false });
    const arrow = solid(parent, arrowGeometry, arrowMaterial, x, 0.076, 0);
    arrow.rotation.set(-Math.PI / 2, 0, index === 0 ? Math.PI : 0);
    return { dot, arrow };
  });

  const actorShadow = contactShadow(parent, shadow, 2.72, 1.78, 0.3, 0, 0.074, 0.12);
  return { tiles, ring, dots, dotMaterial, guides, actorShadow };
}

function makeCloud(primitives, parent, x, y, z, scale, turn = 0) {
  const { mount, ellipsoid } = primitives;
  const cloud = mount(parent, 'Cloud', x, y, z);
  const pearl = enamel(0xfff7ff, 0.86);
  ellipsoid(cloud, pearl, 0, 0, 0, 1.04, 0.29, 0.38);
  ellipsoid(cloud, pearl, -0.61, 0.095, 0.03, 0.45, 0.33, 0.33);
  ellipsoid(cloud, pearl, -0.23, 0.27, 0.015, 0.49, 0.48, 0.42);
  ellipsoid(cloud, pearl, 0.25, 0.23, -0.025, 0.44, 0.36, 0.35);
  ellipsoid(cloud, pearl, 0.65, 0.031, 0, 0.404, 0.287, 0.33);
  cloud.scale.setScalar(scale);
  cloud.rotation.y = turn;
  return cloud;
}

function makeBalloon(primitives, parent, x, y, z, scale, color, side, ribbon, highlight) {
  const { mount, ellipsoid } = primitives;
  const balloon = mount(parent, 'Balloon', x, y, z);
  const latex = enamel(color, 0.46);
  ellipsoid(balloon, latex, 0, 0, 0, 0.31, 0.407, 0.25);
  ellipsoid(balloon, latex, 0, -0.359, 0, 0.146, 0.087, 0.126);
  const glint = ellipsoid(balloon, highlight, -0.143, 0.153, 0.197, 0.061, 0.104, 0.014);
  glint.rotation.z = -0.43;
  glint.rotation.y = -0.29;
  const knot = solid(balloon, new THREE.ConeGeometry(0.083, 0.105, 10), latex, 0, -0.43);
  knot.rotation.x = Math.PI;
  stroke(balloon, ribbon, [[0, -0.463, 0], [side * 0.045, -0.68, -0.01], [-side * 0.067, -0.85, 0], [-side * 0.043, -1.07, 0.01], [side * 0.097, -1.27, 0.01]], 0.013);
  balloon.scale.setScalar(scale);
  balloon.rotation.z = side * 0.12;
  return balloon;
}

function makeSpeaker(primitives, parent, shadow, x, z, rotate, scale) {
  const { mount, ellipsoid } = primitives;
  const speaker = mount(parent, 'FestivalSpeaker', x, -0.2, z);
  speaker.rotation.y = rotate;
  speaker.scale.setScalar(scale);
  const shell = enamel(0x8d71d9, 0.61);
  const red = enamel(0xf9adce, 0.66);
  const accent = enamel(0xd4baf5, 0.62);
  const dark = enamel(0x6451a5, 0.73);
  const base = new THREE.Shape();
  base.moveTo(-0.38, 0.07);
  base.lineTo(0.38, 0.07);
  base.quadraticCurveTo(0.46, 0.07, 0.46, 0.18);
  base.lineTo(0.46, 1.24);
  base.quadraticCurveTo(0.46, 1.34, 0.36, 1.34);
  base.lineTo(-0.38, 1.34);
  base.quadraticCurveTo(-0.46, 1.34, -0.46, 1.24);
  base.lineTo(-0.46, 0.18);
  base.quadraticCurveTo(-0.46, 0.07, -0.38, 0.07);
  solid(speaker, extrude(base, 0.49, 0.064), shell);
  for (const [size, y] of [[0.167, 1.055], [0.302, 0.52]]) {
    ellipsoid(speaker, accent, 0, y, 0.294, size * 1.065, size * 1.065, 0.06);
    ellipsoid(speaker, dark, 0, y, 0.333, size * 0.81, size * 0.81, 0.037);
    ellipsoid(speaker, shell, 0, y, 0.353, size * 0.67, size * 0.67, 0.035);
    ellipsoid(speaker, red, 0, y, 0.372, size * 0.235, size * 0.235, 0.028);
    solid(speaker, smooth(size * 0.52, 0.009), accent, 0, y, 0.381);
  }
  contactShadow(parent, shadow, 1.68 * scale, 1.14 * scale, 0.17, x, -0.53, z);
}

function makeBunting(parent) {
  const yAt = (t) => 4.62 + (t - 0.5) ** 2 * 3.1;
  const xAt = (t) => (t - 0.5) * 9.6;
  const z = -3.74;
  const rope = enamel(0xc6a5e7, 0.74);
  stroke(parent, rope, Array.from({ length: 9 }, (_, i) => [xAt(i / 8), yAt(i / 8), z]), 0.015);
  const flags = new THREE.Shape();
  flags.moveTo(-0.14, 0);
  flags.lineTo(0.14, 0);
  flags.quadraticCurveTo(0.066, -0.16, -0.008, -0.24);
  flags.quadraticCurveTo(-0.041, -0.277, -0.062, -0.239);
  flags.closePath();
  const mesh = extrude(flags, 0.022, 0.012);
  const cloth = palette.map((color) => enamel(color, 0.86));
  for (let i = 1; i < 23; i += 1) {
    const t = i / 23;
    const flag = solid(parent, mesh, cloth[(i + 1) % cloth.length], xAt(t), yAt(t), z);
    flag.rotation.y = Math.sin(i * 2.2) * 0.18;
    flag.rotation.z = (t - 0.5) * 0.59 - 0.11;
  }
}

export function makeFestival(scene, shadow, star, note, primitives = shapes()) {
  const { mount, ellipsoid } = primitives;
  const festival = mount(scene, 'RainbowFestival');
  contactShadow(festival, shadow, 9.3, 7.6, 0.28, 0, -0.545, 0.48);
  const platform = makePlatform(festival, shadow, star, note);

  const rainbow = mount(festival, 'Rainbow', 0, 1.17, -2.89);
  const rainbowColors = [0xf9a4ca, 0xffc0b0, 0xffe4ad, 0xace8d6, 0xa5dbfb, 0xb89ef4];
  for (let index = 0; index < rainbowColors.length; index += 1) {
    solid(rainbow, smooth(3.55 - index * 0.248, 0.143, Math.PI), enamel(rainbowColors[index], 0.65));
  }
  makeCloud(primitives, festival, -3.0, 1.184, -2.728, 0.75, -0.26);
  makeCloud(primitives, festival, 3.03, 1.09, -2.65, 0.86, 0.27);
  makeCloud(primitives, festival, -5.1, 3.01, -4.71, 0.73, 0.15);
  makeCloud(primitives, festival, 4.62, 3.65, -4.15, 0.82, -0.3);
  makeCloud(primitives, festival, -2.29, 4.31, -5.62, 0.61);
  makeBunting(festival);
  makeSpeaker(primitives, festival, shadow, -2.91, 0.03, 0.17, 0.93);
  makeSpeaker(primitives, festival, shadow, 2.96, -0.09, -0.19, 0.99);

  const ribbon = enamel(0xc5a8ec, 0.8);
  const highlight = enamel(0xffe8f8, 0.55);
  const balloons = [
    makeBalloon(primitives, festival, -3.96, 2.11, -1.3, 1.01, 0xeeb4ff, -1, ribbon, highlight),
    makeBalloon(primitives, festival, -3.51, 2.69, -1.55, 0.88, 0xf8bacc, 1, ribbon, highlight),
    makeBalloon(primitives, festival, -3.22, 2.03, -1.9, 0.72, 0xffdca2, 1, ribbon, highlight),
    makeBalloon(primitives, festival, 3.78, 2.03, -1.29, 1.06, 0xf9a9ca, 1, ribbon, highlight),
    makeBalloon(primitives, festival, 3.44, 2.6, -1.69, 0.77, 0xb7a7ef, -1, ribbon, highlight),
    makeBalloon(primitives, festival, 3.98, 2.8, -1.95, 0.76, 0xffd596, 1, ribbon, highlight),
  ].map((object, index) => ({ object, index, y: object.position.y, angle: object.rotation.z }));

  const decorations = [
    [star, -2.72, 3.33, -1.18, 0.23, -0.25, 0xffd77f],
    [note, -2.02, 2.32, -0.99, 0.23, 0.35, 0xb284f9],
    [star, 2.57, 3.66, -1.79, 0.255, 0.14, 0xffdc85],
    [note, 2.28, 2.45, -0.86, 0.29, -0.21, 0xf691c4],
    [star, -4.18, 4.17, -4.2, 0.2, 0.1, 0xecc5fa],
    [note, 3.65, 4.67, -4.1, 0.21, 0.22, 0xf7bae6],
    [star, 3.58, 0.78, 0.18, 0.185, 0.42, 0xffd18c],
    [star, -3.73, 0.74, -0.15, 0.135, -0.13, 0xe9baff],
  ].map(([geometry, x, y, z, scale, tilt, color], index) => {
    const object = solid(festival, geometry, enamel(color, 0.55), x, y, z);
    object.scale.setScalar(scale);
    object.rotation.set(0.16, index % 2 === 0 ? -0.23 : 0.26, tilt);
    return { object, index, y, angle: tilt };
  });

  const puffColors = [0xffd3e4, 0xf9d5a7, 0xc0b0f2, 0xc9eadf];
  const puffs = puffColors.map((color) => enamel(color, 0.73));
  const balls = [
    [-3.79, 0.19, 0.115, 0.21], [-3.43, 0.36, 0.068, 0.115], [-3.92, 0.62, 0.019, 0.077],
    [3.7, 0.15, 0.07, 0.19], [3.91, 0.42, 0.02, 0.12], [3.53, 0.39, 0.09, 0.115],
    [-2.97, 0.22, 2.23, 0.092], [3.25, 0.1, 2.13, 0.085],
  ];
  balls.forEach(([x, y, z, size], i) => ellipsoid(festival, puffs[i % puffs.length], x, y, z, size, size, size));

  return { festival, platform, decorations, balloons };
}

const themes = [
  floorPalette,
  [0xb9ebdf, 0xd9e3fe, 0xb1e7e4, 0xbce8cc, 0xf5e5bf, 0xb8ddf1],
  [0xffc9df, 0xecc4f8, 0xe4ccfa, 0xf8d5f0, 0xffddba, 0xffe1ea],
  [0xffcadb, 0xe3cef8, 0xcadfff, 0xc2ecd9, 0xffe4af, 0xecc6ed],
];

export class FestivalLights {
  constructor(environment, reducedMotion) {
    this.environment = environment;
    this.reducedMotion = reducedMotion;
    this.time = 0;
    this.direction = null;
    this.colors = floorPalette.map((color) => new THREE.Color(color));
    this.target = this.colors;
  }

  setTheme(theme) {
    const named = { mint: 1, pink: 2, rainbow: 3 };
    const colors = themes[named[theme] ?? theme] ?? themes[0];
    this.target = colors.map((color) => new THREE.Color(color));
  }

  setPrompt(direction) {
    this.direction = direction;
  }

  update(delta, beat, mover) {
    this.time += delta;
    const { platform, decorations, balloons } = this.environment;
    const wave = 0.5 + 0.5 * Math.sin(this.time * 2.2);
    const motion = this.reducedMotion ? 0.1 : 1;
    for (let index = 0; index < this.colors.length; index += 1) {
      this.colors[index].lerp(this.target[index], 1 - Math.exp(-delta * 3.2));
    }
    for (const { tile, row, column, tint } of platform.tiles) {
      tile.material.color.copy(this.colors[tint]);
      tile.material.emissive.copy(this.colors[tint]);
      tile.material.emissiveIntensity = 0.015 + motion * beat * (0.027 + 0.022 * (Math.sin(this.time * 2 - row * 0.72 + column * 0.83) + 1));
    }
    platform.dots.rotation.y = this.time * 0.18 * motion;
    platform.ring.material.opacity = 0.42 + wave * 0.16 * motion;
    platform.dotMaterial.opacity = 0.57 + beat * 0.15 * motion;
    for (let index = 0; index < platform.guides.length; index += 1) {
      const { dot, arrow } = platform.guides[index];
      dot.visible = arrow.visible = this.direction === (index === 0 ? 'left' : 'right');
      dot.material.opacity = 0.38 + wave * 0.11 * motion;
      arrow.material.opacity = 0.92;
    }
    platform.actorShadow.position.x = mover.position.x;
    platform.actorShadow.position.z = mover.position.z + 0.12;
    platform.actorShadow.material.opacity = 0.32 - Math.max(0, mover.position.y) * 0.24;
    for (const { object, index, y, angle } of decorations) {
      const phase = this.time * (1.3 + index * 0.055) + index;
      object.position.y = y + Math.sin(phase) * 0.12 * motion;
      object.rotation.z = angle + Math.sin(phase * 0.77) * 0.09 * motion;
    }
    for (const { object, index, y, angle } of balloons) {
      const phase = this.time * 0.75 + index * 1.3;
      object.position.y = y + Math.sin(phase) * 0.1 * motion;
      object.rotation.z = angle + Math.cos(phase) * 0.09 * motion;
    }
  }
}
