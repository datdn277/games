import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export { toyNames } from './toyNames.js';

const geometries = new Map();
const materials = new Map();
const models = new Map();
const cream = '#fff3dd';
const ink = '#302b44';
const mint = '#49cdb2';
const blue = '#50b5ed';
const peach = '#ff946f';
const pink = '#f57da5';
const purple = '#9673df';
const yellow = '#ffd34f';

function geometry(key, build) {
  if (!geometries.has(key)) geometries.set(key, build());
  return geometries.get(key);
}

function material(color, roughness = 0.48) {
  const key = `${color}:${roughness}`;
  if (!materials.has(key)) {
    materials.set(key, new THREE.MeshStandardMaterial({
      color: color || '#ffffff', roughness, vertexColors: !color,
    }));
  }
  return materials.get(key);
}

function mesh(group, shape, color, position, { scale, rotation, shadow = true, roughness } = {}) {
  const part = new THREE.Mesh(shape, material(color, roughness));
  part.position.set(...position);
  if (scale) part.scale.set(...scale);
  if (rotation) part.rotation.set(...rotation);
  part.castShadow = shadow;
  group.add(part);
  return part;
}

function ellipsoid(group, color, position, scale, options) {
  return mesh(group, geometry('sphere', () => new THREE.SphereGeometry(1, 20, 14)),
    color, position, { ...options, scale });
}

function box(group, color, position, [width, height, depth], radius, options) {
  const shape = geometry(`box:${width}:${height}:${depth}:${radius}`,
    () => new RoundedBoxGeometry(width, height, depth, 2, radius));
  return mesh(group, shape, color, position, options);
}

function cylinder(group, color, position, scale, options) {
  return mesh(group, geometry('cylinder', () => new THREE.CylinderGeometry(1, 1, 1, 20)),
    color, position, { ...options, scale });
}

function ring(group, color, position, radius, tube, options) {
  const shape = geometry(`ring:${radius}:${tube}`, () => new THREE.TorusGeometry(radius, tube, 8, 24));
  return mesh(group, shape, color, position, options);
}

function profile(points) {
  return new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), 28);
}

function smoothSeam(normals, first, last) {
  const normal = new THREE.Vector3().fromBufferAttribute(normals, first);
  normal.add(new THREE.Vector3().fromBufferAttribute(normals, last)).normalize();
  normals.setXYZ(first, normal.x, normal.y, normal.z);
  normals.setXYZ(last, normal.x, normal.y, normal.z);
}

function ornament(group, color, kind, position, scale = 1) {
  const emblem = geometry(`ornament:${kind}`, () => {
    const shape = new THREE.Shape();
    if (kind === 'heart') {
      shape.moveTo(0, -0.46);
      shape.bezierCurveTo(-0.12, -0.29, -0.72, 0.02, -0.49, 0.33);
      shape.bezierCurveTo(-0.35, 0.54, -0.12, 0.44, 0, 0.26);
      shape.bezierCurveTo(0.12, 0.44, 0.35, 0.54, 0.49, 0.33);
      shape.bezierCurveTo(0.72, 0.02, 0.12, -0.29, 0, -0.46);
    } else if (kind === 'drop') {
      shape.moveTo(0, 0.52);
      shape.bezierCurveTo(0.09, 0.30, 0.46, -0.02, 0.43, -0.23);
      shape.bezierCurveTo(0.38, -0.61, -0.38, -0.61, -0.43, -0.23);
      shape.bezierCurveTo(-0.46, -0.02, -0.09, 0.30, 0, 0.52);
    } else {
      for (let i = 0; i < 10; i++) {
        const angle = Math.PI / 2 + i * Math.PI / 5;
        const radius = i % 2 ? 0.24 : 0.5;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
    }
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.045, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 2, curveSegments: 8,
    });
  });
  return mesh(group, emblem, color, position, { scale: [scale, scale, scale], shadow: false });
}

function beachBallGeometry() {
  const colors = [peach, yellow, blue, cream, mint, pink];
  const angle = 2 * Math.PI / colors.length;
  const panels = colors.map((color, i) => {
    const panel = new THREE.SphereGeometry(0.55, 6, 20, i * angle, angle);
    const tint = new THREE.Color(color);
    const count = panel.attributes.position.count;
    const values = new Float32Array(count * 3);
    for (let index = 0; index < count; index++) tint.toArray(values, index * 3);
    panel.setAttribute('color', new THREE.BufferAttribute(values, 3));
    return panel;
  });
  const shape = mergeGeometries(panels);
  panels.forEach((panel) => panel.dispose());
  return shape;
}

function ball(group) {
  mesh(group, geometry('beachBall', beachBallGeometry), null, [0, 0.55, 0], {
    rotation: [0.83, -0.44, -0.31], roughness: 0.32,
  });
}

function car(group) {
  box(group, peach, [0, 0.35, 0], [0.83, 0.36, 1.12], 0.16);
  box(group, '#f96959', [0, 0.34, 0.05], [0.85, 0.17, 1.13], 0.08);
  box(group, peach, [0, 0.61, -0.12], [0.72, 0.39, 0.67], 0.17);
  box(group, '#77c9e9', [0, 0.62, 0.195], [0.54, 0.22, 0.06], 0.032, { shadow: false });
  for (const side of [-1, 1]) {
    box(group, '#86d3ec', [side * 0.345, 0.62, -0.1], [0.06, 0.22, 0.43], 0.027, { shadow: false });
    ellipsoid(group, cream, [side * 0.26, 0.37, 0.565], [0.093, 0.067, 0.036], { shadow: false });
    for (const axle of [-0.35, 0.35]) {
      const wheelRotation = [0, 0, Math.PI / 2];
      cylinder(group, '#51455c', [side * 0.398, 0.19, axle], [0.19, 0.17, 0.19], { rotation: wheelRotation });
      cylinder(group, '#ffe2a5', [side * 0.492, 0.19, axle], [0.108, 0.028, 0.108], { rotation: wheelRotation, shadow: false });
    }
  }
  box(group, cream, [0, 0.25, 0.557], [0.51, 0.075, 0.07], 0.034, { shadow: false });
  group.rotation.y = -0.5;
}

function gift(group) {
  box(group, purple, [0, 0.405, 0], [0.86, 0.81, 0.76], 0.08);
  box(group, '#b393f4', [0, 0.756, 0], [0.94, 0.23, 0.83], 0.085);
  box(group, yellow, [0, 0.39, 0.383], [0.19, 0.77, 0.032], 0.016, { shadow: false });
  box(group, yellow, [0, 0.76, 0.412], [0.20, 0.21, 0.045], 0.018, { shadow: false });
  box(group, yellow, [0, 0.873, 0], [0.20, 0.045, 0.79], 0.018, { shadow: false });
  box(group, yellow, [0, 0.873, 0], [0.90, 0.045, 0.19], 0.018, { shadow: false });
  for (const side of [-1, 1]) {
    ring(group, yellow, [side * 0.16, 0.98, 0], 0.135, 0.052, {
      rotation: [0.44, 0, side * 0.4], scale: [1.31, 0.68, 1],
    });
  }
  ellipsoid(group, '#ffeb89', [0, 0.96, 0.026], [0.1, 0.088, 0.095]);
  group.rotation.y = -0.19;
}

function teddy(group) {
  const lilac = '#ab8ae1';
  const paw = '#e8bdef';
  ellipsoid(group, lilac, [0, 0.35, 0], [0.29, 0.34, 0.22]);
  ellipsoid(group, paw, [0, 0.35, 0.18], [0.19, 0.22, 0.067], { shadow: false });
  for (const side of [-1, 1]) {
    ellipsoid(group, lilac, [side * 0.29, 0.39, 0.028], [0.13, 0.23, 0.125], { rotation: [0, 0, side * 0.42] });
    ellipsoid(group, lilac, [side * 0.20, 0.15, 0.19], [0.15, 0.15, 0.17]);
    ellipsoid(group, paw, [side * 0.20, 0.14, 0.32], [0.112, 0.106, 0.052], { shadow: false });
    ellipsoid(group, lilac, [side * 0.25, 1.07, -0.026], [0.154, 0.156, 0.112]);
    ellipsoid(group, paw, [side * 0.25, 1.07, 0.057], [0.101, 0.106, 0.048], { shadow: false });
  }
  ellipsoid(group, lilac, [0, 0.85, 0.01], [0.345, 0.325, 0.278]);
  ellipsoid(group, cream, [0, 0.775, 0.242], [0.175, 0.122, 0.075], { shadow: false });
  ellipsoid(group, ink, [0, 0.81, 0.309], [0.054, 0.036, 0.03], { shadow: false });
  for (const side of [-1, 1]) {
    ellipsoid(group, ink, [side * 0.132, 0.917, 0.256], [0.036, 0.048, 0.021], { shadow: false });
    ellipsoid(group, '#ffffff', [side * 0.132 - 0.009, 0.931, 0.274], [0.01, 0.012, 0.006], { shadow: false });
    ellipsoid(group, mint, [side * 0.074, 0.555, 0.231], [0.085, 0.045, 0.034], {
      rotation: [0, 0, side * 0.25], shadow: false,
    });
  }
  ellipsoid(group, '#39af97', [0, 0.551, 0.255], [0.037, 0.041, 0.025], { shadow: false });
}

function blocks(group) {
  const pieces = [
    { color: mint, mark: 'heart', x: -0.29, y: 0.245, z: 0.06, angle: -0.07 },
    { color: purple, mark: 'drop', x: 0.26, y: 0.245, z: -0.04, angle: 0.12 },
    { color: peach, mark: 'star', x: -0.09, y: 0.735, z: -0.02, angle: -0.10 },
  ];
  for (const piece of pieces) {
    const block = new THREE.Group();
    block.position.set(piece.x, piece.y, piece.z);
    block.rotation.y = piece.angle;
    group.add(block);
    box(block, piece.color, [0, 0, 0], [0.50, 0.49, 0.49], 0.075);
    ornament(block, cream, piece.mark, [0, 0, 0.246], 0.28);
  }
  group.rotation.y = 0.13;
}

function plane(group) {
  ellipsoid(group, blue, [0, 0.39, 0.015], [0.225, 0.213, 0.60]);
  ellipsoid(group, '#b3ecf4', [0, 0.555, 0.035], [0.155, 0.15, 0.264]);
  ellipsoid(group, yellow, [0, 0.345, 0.07], [0.63, 0.07, 0.21]);
  ellipsoid(group, yellow, [0, 0.44, -0.47], [0.32, 0.042, 0.10]);
  ellipsoid(group, peach, [0, 0.55, -0.47], [0.047, 0.185, 0.15], { rotation: [-0.40, 0, 0] });
  ellipsoid(group, cream, [0, 0.395, 0.555], [0.172, 0.17, 0.11]);
  ellipsoid(group, '#f06768', [0, 0.395, 0.654], [0.285, 0.053, 0.033], { rotation: [0, 0, -0.5] });
  ellipsoid(group, yellow, [0, 0.395, 0.684], [0.087, 0.087, 0.06]);
  for (const side of [-1, 1]) {
    ellipsoid(group, '#51455c', [side * 0.18, 0.105, 0.14], [0.059, 0.105, 0.105]);
  }
  group.rotation.y = 0.44;
}

function doll(group) {
  const skin = '#e9a375';
  const hair = '#704158';
  const dress = geometry('doll dress', () => profile([
    [0, 0.36], [0.238, 0.36], [0.31, 0.41], [0.27, 0.50], [0.19, 0.66], [0.158, 0.775], [0.07, 0.81], [0, 0.81],
  ]));
  mesh(group, dress, pink, [0, 0, 0]);
  box(group, cream, [0, 0.59, 0.196], [0.19, 0.08, 0.05], 0.025, { shadow: false });
  for (const side of [-1, 1]) {
    ellipsoid(group, skin, [side * 0.235, 0.62, 0.018], [0.064, 0.157, 0.065], { rotation: [0, 0, side * 0.31] });
    ellipsoid(group, skin, [side * 0.103, 0.285, 0.015], [0.067, 0.156, 0.065]);
    ellipsoid(group, purple, [side * 0.113, 0.077, 0.07], [0.093, 0.077, 0.138]);
    ellipsoid(group, hair, [side * 0.283, 1.01, -0.036], [0.12, 0.18, 0.102], { rotation: [0, 0, side * 0.24] });
    ellipsoid(group, yellow, [side * 0.279, 1.09, 0.035], [0.065, 0.065, 0.046], { shadow: false });
  }
  ellipsoid(group, hair, [0, 1.058, -0.029], [0.286, 0.266, 0.227]);
  ellipsoid(group, skin, [0, 1.005, 0.082], [0.238, 0.223, 0.192]);
  ellipsoid(group, hair, [-0.097, 1.199, 0.139], [0.192, 0.092, 0.096], { rotation: [0, 0, 0.38], shadow: false });
  for (const side of [-1, 1]) {
    ellipsoid(group, ink, [side * 0.078, 1.036, 0.258], [0.022, 0.035, 0.015], { shadow: false });
    ellipsoid(group, '#dd7c78', [side * 0.127, 0.984, 0.242], [0.040, 0.026, 0.016], { shadow: false });
  }
  ellipsoid(group, '#9e5065', [0, 0.97, 0.271], [0.047, 0.02, 0.01], { shadow: false });
}

function apple(group) {
  const shape = geometry('apple', () => {
    const points = [
      [0, 0.04], [0.16, 0.012], [0.29, 0.055], [0.41, 0.185], [0.49, 0.36], [0.49, 0.55],
      [0.45, 0.69], [0.35, 0.78], [0.24, 0.802], [0.12, 0.77], [0.055, 0.71], [0, 0.702],
    ];
    const outline = new THREE.SplineCurve(points.map(([x, y]) => new THREE.Vector2(x, y))).getPoints(32);
    const segments = 36;
    const appleShape = new THREE.LatheGeometry(outline, segments);
    const pos = appleShape.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const radius = Math.hypot(x, z);
      const lobes = Math.cos(Math.atan2(z, x) * 5) * Math.min(1, radius * 6);
      const scale = 1 + lobes * 0.06;
      pos.setXYZ(i, x * scale, pos.getY(i) + lobes * 0.014, z * scale);
    }
    appleShape.computeVertexNormals();
    for (let i = 0; i < outline.length; i++) {
      smoothSeam(appleShape.attributes.normal, i, i + segments * outline.length);
    }
    return appleShape;
  });
  mesh(group, shape, '#ec5267', [0, 0, 0], { roughness: 0.33 });
  cylinder(group, '#87533c', [0.025, 0.833, 0.004], [0.035, 0.23, 0.032], { rotation: [0, 0, -0.23] });
  ellipsoid(group, '#67b65c', [0.17, 0.914, 0.01], [0.193, 0.063, 0.10], { rotation: [0.35, -0.28, 0.38] });
}

function backpack(group) {
  box(group, '#54bede', [0, 0.527, 0], [0.83, 1.05, 0.53], 0.22);
  box(group, blue, [0, 0.542, -0.10], [0.86, 1.02, 0.43], 0.21);
  ring(group, purple, [0, 1.02, -0.05], 0.144, 0.041, { scale: [1, 0.84, 1] });
  box(group, purple, [0, 0.332, 0.25], [0.62, 0.43, 0.24], 0.11);
  box(group, '#c6a5f5', [0, 0.445, 0.353], [0.51, 0.043, 0.037], 0.017, { shadow: false });
  box(group, yellow, [0.177, 0.417, 0.377], [0.051, 0.103, 0.039], 0.017, { shadow: false });
  ornament(group, cream, 'star', [0, 0.70, 0.275], 0.26);
  for (const side of [-1, 1]) {
    box(group, '#507dd2', [side * 0.305, 0.45, -0.288], [0.13, 0.72, 0.18], 0.061, {
      rotation: [0, 0, -side * 0.22],
    });
  }
  group.rotation.y = -0.16;
}

function pencilCase(group) {
  box(group, '#ff9bb3', [0, 0.26, 0], [1.16, 0.52, 0.52], 0.235);
  box(group, pink, [0, 0.16, 0.015], [1.12, 0.32, 0.49], 0.154);
  box(group, cream, [0, 0.323, 0.24], [0.99, 0.055, 0.057], 0.025, { shadow: false });
  box(group, purple, [0.37, 0.31, 0.281], [0.08, 0.13, 0.052], 0.025, { shadow: false });
  ornament(group, cream, 'heart', [-0.12, 0.17, 0.252], 0.20);
  const pencil = new THREE.Group();
  pencil.position.set(-0.085, 0.585, 0.125);
  pencil.rotation.set(-0.08, 0.04, 1.30);
  group.add(pencil);
  cylinder(pencil, yellow, [0, 0, 0], [0.058, 0.66, 0.058]);
  cylinder(pencil, '#e77a98', [0, -0.36, 0], [0.058, 0.088, 0.058], { shadow: false });
  const tip = geometry('pencil tip', () => new THREE.ConeGeometry(0.059, 0.16, 12));
  mesh(pencil, tip, '#ffe3ad', [0, 0.405, 0], { shadow: false });
  ellipsoid(pencil, ink, [0, 0.466, 0], [0.022, 0.023, 0.022], { shadow: false });
  group.rotation.y = -0.13;
}

function milk(group) {
  box(group, '#8ad5f3', [0, 0.44, 0], [0.66, 0.88, 0.57], 0.046);
  box(group, cream, [0, 0.52, 0.278], [0.6, 0.56, 0.065], 0.027, { shadow: false });
  ornament(group, blue, 'drop', [0, 0.56, 0.315], 0.30);
  box(group, '#73bfe4', [0, 0.39, 0.318], [0.23, 0.029, 0.014], 0.007, { shadow: false });
  const top = geometry('milk fold', () => {
    const fold = new THREE.Shape();
    fold.moveTo(-0.315, 0);
    fold.lineTo(-0.15, 0.245);
    fold.lineTo(0.15, 0.245);
    fold.lineTo(0.315, 0);
    fold.closePath();
    return new THREE.ExtrudeGeometry(fold, {
      depth: 0.514, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 2,
    });
  });
  mesh(group, top, cream, [0, 0.86, -0.257]);
  box(group, '#60b4e4', [0, 1.113, 0], [0.32, 0.075, 0.54], 0.028);
  group.rotation.y = -0.16;
}

function bread(group) {
  ellipsoid(group, '#df9854', [0, 0.33, 0], [0.60, 0.33, 0.34]);
  ellipsoid(group, '#f5b861', [0, 0.398, 0], [0.581, 0.286, 0.327]);
  for (const [x, y] of [[-0.29, 0.615], [-0.018, 0.659], [0.26, 0.631]]) {
    ellipsoid(group, '#ffda94', [x, y - 0.03, 0.13], [0.046, 0.056, 0.15], {
      rotation: [0.55, -0.43, -0.23], shadow: false,
    });
  }
  group.rotation.y = -0.31;
}

function banana(group) {
  const shape = geometry('banana', () => {
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.54, 0.48, 0),
      new THREE.Vector3(-0.27, 0.23, 0),
      new THREE.Vector3(0.05, 0.17, 0),
      new THREE.Vector3(0.37, 0.33, 0),
      new THREE.Vector3(0.53, 0.64, 0),
    ]);
    const segments = 32;
    const sides = 16;
    const curved = new THREE.TubeGeometry(path, segments, 1, sides);
    const positions = curved.attributes.position;
    const center = new THREE.Vector3();
    const offset = new THREE.Vector3();
    for (let row = 0; row <= segments; row++) {
      const t = row / segments;
      const thickness = 0.17 * Math.sin(Math.PI * t) ** 0.65;
      path.getPointAt(t, center);
      for (let col = 0; col <= sides; col++) {
        const index = row * (sides + 1) + col;
        const ridge = 1 + 0.05 * Math.cos(8 * Math.PI * col / sides);
        offset.fromBufferAttribute(positions, index).sub(center).multiplyScalar(thickness * ridge);
        positions.setXYZ(index, center.x + offset.x, center.y + offset.y, center.z + offset.z);
      }
    }
    curved.computeVertexNormals();
    for (let row = 0; row <= segments; row++) {
      const first = row * (sides + 1);
      smoothSeam(curved.attributes.normal, first, first + sides);
    }
    return curved;
  });
  mesh(group, shape, '#ffc83c', [0, 0, 0], { roughness: 0.38 });
  ellipsoid(group, '#b18747', [-0.524, 0.468, 0], [0.041, 0.044, 0.048], { shadow: false });
  ellipsoid(group, '#99ac4a', [0.516, 0.629, 0], [0.057, 0.11, 0.069], {
    rotation: [0, 0, -0.34],
  });
  group.rotation.y = 0.1;
}

const builders = { ball, car, gift, teddy, blocks, plane, doll, apple, backpack, pencilCase, milk, bread, banana };

function bakeModel(type) {
  const source = new THREE.Group();
  builders[type](source);
  source.updateMatrixWorld(true);

  const batches = new Map();
  source.traverse((part) => {
    if (!part.isMesh) return;
    const { color, roughness } = part.material;
    const { castShadow } = part;
    const key = `${roughness}:${castShadow}`;
    if (!batches.has(key)) batches.set(key, { shapes: [], roughness, castShadow });

    const shape = part.geometry.clone().applyMatrix4(part.matrixWorld);
    const count = shape.attributes.position.count;
    if (!shape.index) shape.setIndex(Array.from({ length: count }, (_, i) => i));
    if (!shape.hasAttribute('color')) {
      const tint = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) color.toArray(tint, i * 3);
      shape.setAttribute('color', new THREE.BufferAttribute(tint, 3));
    }
    batches.get(key).shapes.push(shape);
  });

  const model = new THREE.Group();
  model.name = type;
  for (const [key, { shapes, roughness, castShadow }] of batches) {
    const merged = geometry(`model:${type}:${key}`, () => mergeGeometries(shapes));
    mesh(model, merged, null, [0, 0, 0], { roughness, shadow: castShadow });
    shapes.forEach((shape) => shape.dispose());
  }
  return model;
}

export function createToy(type) {
  if (!Object.hasOwn(builders, type)) throw new RangeError(`Unknown toy: ${type}`);
  if (!models.has(type)) models.set(type, bakeModel(type));
  return models.get(type).clone();
}

// Round changes remove groups. Dispose these shared assets when tearing down the scene.
export function disposeToyAssets() {
  geometries.forEach((asset) => asset.dispose());
  materials.forEach((asset) => asset.dispose());
  geometries.clear();
  materials.clear();
  models.clear();
}
