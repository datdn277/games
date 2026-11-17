import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const TAU = Math.PI * 2;

export function createLabArt() {
  const resources = new Set();
  const geometryCache = new Map();
  const materialCache = new Map();
  const sphere = new THREE.SphereGeometry(1, 20, 14);
  resources.add(sphere);

  function geometry(key, create) {
    if (!geometryCache.has(key)) {
      const value = create();
      geometryCache.set(key, value);
      resources.add(value);
    }
    return geometryCache.get(key);
  }

  function material(color, properties = {}) {
    const key = [new THREE.Color(color).getHexString(), JSON.stringify(properties)].join(':');
    if (!materialCache.has(key)) {
      const value = new THREE.MeshStandardMaterial({ color, roughness: .58, ...properties });
      materialCache.set(key, value);
      resources.add(value);
    }
    return materialCache.get(key);
  }

  function mesh(parent, shape, surface, position = [0, 0, 0]) {
    const object = new THREE.Mesh(shape, surface);
    object.position.set(...position);
    parent.add(object);
    return object;
  }

  function ball(parent, surface, position, scale) {
    const object = mesh(parent, sphere, surface, position);
    object.scale.set(...scale);
    return object;
  }

  function block(parent, surface, position, size, radius = .08) {
    const [x, y, z] = size;
    const shape = geometry(`box-${size}-${radius}`, () => new RoundedBoxGeometry(x, y, z, 2, radius));
    return mesh(parent, shape, surface, position);
  }

  function cylinder(parent, surface, position, radius, height, bottom = radius) {
    const shape = geometry(`cylinder-${radius}-${height}-${bottom}`,
      () => new THREE.CylinderGeometry(radius, bottom, height, 28, 1));
    return mesh(parent, shape, surface, position);
  }

  function ring(parent, surface, position, radius, thickness) {
    const shape = geometry(`ring-${radius}-${thickness}`,
      () => new THREE.TorusGeometry(radius, thickness, 8, 52));
    return mesh(parent, shape, surface, position);
  }

  function star(parent, surface, position, scale = 1) {
    const shape = geometry('star', () => {
      const points = new THREE.Shape();
      for (let index = 0; index < 10; index++) {
        const angle = TAU / 4 + TAU * index / 10;
        const radius = index % 2 === 0 ? 1 : .53;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (index === 0) points.moveTo(x, y);
        else points.lineTo(x, y);
      }
      points.closePath();
      return new THREE.ExtrudeGeometry(points, {
        depth: .17, bevelEnabled: true, bevelSize: .085, bevelThickness: .055, bevelSegments: 2,
      });
    });
    const ornament = mesh(parent, shape, surface, position);
    ornament.scale.setScalar(scale);
    return ornament;
  }

  const shadowShape = geometry('shadow', () => {
    const value = new THREE.PlaneGeometry(2, 2);
    value.rotateX(-Math.PI / 2);
    return value;
  });
  const shadowInk = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { strength: { value: .31 }, tint: { value: new THREE.Color(0x514150) } },
    vertexShader: `
      varying vec2 xy;
      void main() {
        xy = uv * 2.0 - 1.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 xy;
      uniform float strength;
      uniform vec3 tint;
      void main() {
        float opacity = pow(1.0 - smoothstep(0.0, 1.0, length(xy)), 1.35);
        gl_FragColor = vec4(tint, opacity * strength);
        #include <colorspace_fragment>
      }
    `,
  });
  resources.add(shadowInk);
  function shadow(parent, position, scale) {
    const spot = mesh(parent, shadowShape, shadowInk, position);
    spot.scale.set(scale[0], 1, scale[1]);
    return spot;
  }

  return {
    resources, geometry, material, mesh, ball, block, cylinder, ring, star, shadow,
    dispose() { resources.forEach((resource) => resource.dispose()); },
  };
}

function archShape(width, height) {
  const side = width / 2;
  const shoulder = height - side;
  const shape = new THREE.Shape();
  shape.moveTo(-side, 0);
  shape.lineTo(side, 0);
  shape.lineTo(side, shoulder);
  shape.absarc(0, shoulder, side, 0, Math.PI, false);
  shape.closePath();
  return shape;
}

function windowTexture(art) {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 448;
  const ctx = canvas.getContext('2d');
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#81c9e9');
  sky.addColorStop(.72, '#d0f3f7');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const sun = ctx.createRadialGradient(241, 111, 10, 241, 111, 113);
  sun.addColorStop(0, '#fff9bb');
  sun.addColorStop(.38, '#fff8ca');
  sun.addColorStop(1, '#fff8ca00');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ecf7f5';
  for (const [x, y, a, b] of [[97, 128, 40, 17], [65, 137, 42, 14], [134, 141, 43, 13], [270, 183, 36, 13], [304, 192, 43, 13]]) {
    ctx.beginPath();
    ctx.ellipse(x, y, a, b, 0, 0, TAU);
    ctx.fill();
  }
  for (const [color, y, shift] of [['#a3d9ce', 260, 140], ['#8bcfbc', 310, 35], ['#74b8a1', 366, 108]]) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, y + 20);
    ctx.bezierCurveTo(shift, y - 100, 208, y + 50, 396, y - 30);
    ctx.lineTo(396, 450);
    ctx.lineTo(0, 450);
    ctx.closePath();
    ctx.fill();
  }
  const trees = [[25, 389, 69], [78, 389, 49], [334, 391, 77], [369, 415, 87], [299, 418, 43]];
  for (const [x, y, height] of trees) {
    ctx.fillStyle = x % 2 ? '#529e87' : '#62ac94';
    ctx.beginPath();
    ctx.moveTo(x, y - height);
    ctx.lineTo(x + height * .26, y);
    ctx.lineTo(x - height * .26, y);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  art.resources.add(texture);
  return texture;
}

function makeWindow(parent, art) {
  const { material, block, mesh } = art;
  const root = new THREE.Group();
  root.position.set(4.37, 1.20, -3.11);
  root.scale.setScalar(.90);
  parent.add(root);
  const outer = new THREE.ExtrudeGeometry(archShape(3.44, 4.03), {
    depth: .11, bevelEnabled: true, bevelSize: .14, bevelThickness: .11, bevelSegments: 3, curveSegments: 28,
  });
  const glass = new THREE.ShapeGeometry(archShape(3.02, 3.72), 30);
  const uv = glass.attributes.uv;
  for (let index = 0; index < uv.count; index++) uv.setXY(index, uv.getX(index) / 3.02 + .5, uv.getY(index) / 3.72);
  art.resources.add(outer);
  art.resources.add(glass);
  mesh(root, outer, material(0xb1a7d2, { roughness: .73 }), [.06, -.09, -.12]);
  mesh(root, outer, material(0xffe6b9), [0, 0, 0]);
  const landscape = new THREE.MeshBasicMaterial({ map: windowTexture(art), toneMapped: false });
  art.resources.add(landscape);
  mesh(root, glass, landscape, [0, .10, .243]);
  const trim = material(0xfff1d2, { roughness: .66 });
  block(root, trim, [0, .01, .275], [3.65, .17, .54]);
  block(root, trim, [0, 1.12, .25], [3.03, .075, .12], .03);
  block(root, trim, [0, 2.03, .25], [.074, 3.53, .12], .028);
  block(root, material(0xe5bc90), [0, -.16, .22], [2.83, .08, .20], .035);
}

function chalkTexture(art) {
  const canvas = document.createElement('canvas');
  canvas.width = 430;
  canvas.height = 225;
  const ctx = canvas.getContext('2d');
  ctx.lineWidth = 7;
  ctx.strokeStyle = '#d4efcf';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const line = (positions) => {
    ctx.beginPath();
    ctx.moveTo(...positions[0]);
    positions.slice(1).forEach((point) => ctx.lineTo(...point));
    ctx.stroke();
  };
  line([[82, 77], [325, 77]]);
  line([[200, 74], [200, 172]]);
  line([[167, 176], [233, 176]]);
  line([[106, 79], [70, 138], [144, 138], [106, 79]]);
  line([[302, 79], [264, 138], [339, 138], [302, 79]]);
  ctx.strokeStyle = '#fbdf9c';
  ctx.lineWidth = 5;
  line([[363, 45], [372, 27], [380, 45], [400, 48], [385, 62], [389, 81], [372, 71], [355, 81], [359, 62], [345, 48], [363, 45]]);
  line([[54, 176], [65, 176]]);
  line([[59, 170], [59, 182]]);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  art.resources.add(texture);
  return texture;
}

function makeBlackboard(parent, art) {
  const { block, material, mesh } = art;
  const root = new THREE.Group();
  root.position.set(-4.16, 3.87, -2.94);
  root.scale.setScalar(.94);
  parent.add(root);
  block(root, material(0xa995b1), [.07, -.09, -.13], [3.55, 1.87, .14], .16);
  block(root, material(0xd09566), [0, 0, 0], [3.57, 1.90, .24], .16);
  block(root, material(0x376d66), [0, 0, .14], [3.31, 1.61, .13], .11);
  const chalk = new THREE.MeshBasicMaterial({ map: chalkTexture(art), transparent: true, depthWrite: false, toneMapped: false });
  art.resources.add(chalk);
  mesh(root, art.geometry('chalk-mural', () => new THREE.PlaneGeometry(3.02, 1.57)), chalk, [0, 0, .21]);
  block(root, material(0xb77e50), [0, -.94, .21], [2.74, .15, .39], .065);
  block(root, material(0xf7ecdd), [.46, -.833, .35], [.30, .063, .072], .02).rotation.y = -.13;
  block(root, material(0xf9c094), [.83, -.833, .36], [.24, .063, .068], .02).rotation.y = .23;
}

function bottle(parent, art, x, y, z, scale, color, rounded = true) {
  const { material, ball, cylinder, ring } = art;
  const root = new THREE.Group();
  parent.add(root);
  root.position.set(x, y, z);
  root.scale.setScalar(scale);
  const tint = material(color, { roughness: .25, metalness: .02 });
  const bright = material(new THREE.Color(color).lerp(new THREE.Color(0xffffff), .38), { roughness: .34 });
  if (rounded) {
    ball(root, tint, [0, .29, 0], [.27, .285, .26]);
  } else {
    cylinder(root, tint, [0, .24, 0], .215, .44, .24);
    ball(root, bright, [0, .44, 0], [.216, .12, .214]);
  }
  cylinder(root, bright, [0, .57, 0], .092, .24, .106);
  ring(root, bright, [0, .64, 0], .093, .027).rotation.x = Math.PI / 2;
  cylinder(root, material(0xa16c4f), [0, .713, 0], .087, .12, .096);
  const shine = ball(root, material(0xfff9ed), [-.123, .345, .207], [.033, .086, .024]);
  shine.rotation.z = -.43;
}

function books(parent, art, x, y, z) {
  for (const [index, color, w, h] of [[0, 0x7e8dd9, .21, .54], [1, 0xdf929e, .18, .66], [2, 0xe9c084, .23, .46], [3, 0x70b4ac, .22, .73]]) {
    const book = new THREE.Group();
    parent.add(book);
    book.position.set(x + index * .235, y + h / 2, z);
    book.rotation.z = index === 3 ? -.19 : .022 * index;
    art.block(book, art.material(color), [0, 0, 0], [w, h, .36], .026);
    art.block(book, art.material(0xffefd7), [0, 0, .14], [w * .69, h * .82, .105], .014);
    art.block(book, art.material(color), [0, 0, .20], [w * .99, h * .87, .05], .014);
    art.block(book, art.material(0xffe9c5), [0, h * .21, .233], [w * .65, .042, .019], .008);
  }
}

export function makeLaboratory(scene, art) {
  const { material, geometry, mesh, block, ball, star, shadow } = art;
  const wall = new THREE.ShaderMaterial({
    uniforms: {
      bottom: { value: new THREE.Color(0xc3c2e8) },
      top: { value: new THREE.Color(0xe7dcf3) },
      glow: { value: new THREE.Color(0xffeee0) },
    },
    vertexShader: `
      varying vec2 xy;
      void main() {
        xy = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 xy;
      uniform vec3 bottom;
      uniform vec3 top;
      uniform vec3 glow;
      void main() {
        vec3 base = mix(bottom, top, smoothstep(-3.2, 2.8, xy.y));
        float light = .75 * (1.0 - smoothstep(.5, 8.2, length((xy - vec2(2., 2.)) * vec2(1., 1.42))));
        gl_FragColor = vec4(mix(base, glow, light), 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  art.resources.add(wall);
  mesh(scene, geometry('wall', () => new THREE.PlaneGeometry(55, 22)), wall, [0, 3.40, -3.42]);
  block(scene, material(0xa8bfd2), [0, .14, -3.36], [36, 1.47, .14], .04);
  block(scene, material(0xc4cfec), [0, .91, -3.22], [36, .16, .27], .06);
  const fluting = material(0xb8cddd);
  for (let i = -14; i <= 14; i++) block(scene, fluting, [i * .65, .22, -3.26], [.037, 1.17, .035], .012);

  makeWindow(scene, art);
  makeBlackboard(scene, art);
  const shelf = new THREE.Group();
  scene.add(shelf);
  shelf.position.set(-4.75, 2.13, -2.49);
  block(shelf, material(0xb98972), [0, -.18, -.19], [2.79, .19, .31], .055);
  block(shelf, material(0xf0bb8c), [0, 0, 0], [3.09, .18, .72], .06);
  for (const x of [-1.04, 1.04]) {
    block(shelf, material(0xc5969a), [x, -.27, -.24], [.15, .53, .26], .05);
  }
  books(shelf, art, -1.11, .09, .035);
  bottle(shelf, art, .49, .09, .06, .82, 0x77c9b2);
  bottle(shelf, art, .98, .09, .06, .63, 0xeb94b9, false);

  const wallGold = material(0xe6b17a);
  star(scene, wallGold, [-1.66, 4.88, -3.19], .25).rotation.z = -.14;
  star(scene, material(0xcaa7d7), [1.69, 4.60, -3.16], .18).rotation.z = .11;
  star(scene, material(0x79b4ac), [.98, 5.13, -3.21], .12).rotation.z = -.19;
  star(scene, material(0xf1acc8), [-2.17, 5.36, -3.20], .10);

  const woodTop = material(0xedbc87, { roughness: .71 });
  const woodEdge = material(0xd9a77f, { roughness: .69 });
  const bench = new THREE.Group();
  scene.add(bench);
  const benchWidth = 30;
  block(bench, woodEdge, [0, -.20, -.29], [benchWidth, .43, 7.17], .13);
  block(bench, woodTop, [0, .031, -.30], [benchWidth, .27, 7.20], .10);
  block(bench, material(0x728eb0), [0, -.65, 2.83], [benchWidth, .54, .11], .04);
  block(bench, material(0x8eadda), [0, -.48, 2.89], [benchWidth, .115, .12], .04);
  for (const x of [-6.9, -3.4, 3.4, 6.9]) {
    block(bench, material(0x60799e), [x, -.68, 2.91], [.079, .37, .085], .026);
  }
  // Sparse fine wood grain stays behind the pieces and preserves a quiet backdrop.
  const grainSurface = material(0xc8916b, { transparent: true, opacity: .28, depthWrite: false });
  for (let index = 0; index < 20; index++) {
    const z = -3.45 + index * .334;
    const center = Math.sin(index * 3.61) * 3.12;
    const length = 3.1 + (1 + Math.cos(index * 2.13)) * 3.34;
    ball(bench, grainSurface, [center, .169, z], [length, .0035, .009 + index % 3 * .006]);
  }
  for (const [x, z, color, scale] of [[-4.32, -1.08, 0xb1a0e2, .88], [-4.93, -.72, 0xe7a0a4, 1.15], [5.24, -.97, 0x87cabe, .84]]) {
    shadow(bench, [x, .175, z], [.47, .42]);
    bottle(bench, art, x, .17, z, scale, color);
  }

  const flecks = new THREE.Group();
  scene.add(flecks);
  const dust = material(0xfff2c8, { emissive: 0xffdbab, emissiveIntensity: .35 });
  const bits = Array.from({ length: 7 }, (_, index) => {
    const x = (index - 3) * 1.08 + Math.sin(index * 3.14) * .44;
    const y = 2.5 + (index % 3) * .81;
    const mesh = ball(flecks, dust, [x, y, -1.8], [.026, .026, .026]);
    return { mesh, y, index };
  });
  return {
    update(time) {
      for (const { mesh, y, index } of bits) {
        mesh.position.y = y + Math.sin(time * .58 + index * 2) * .14;
        mesh.scale.setScalar(.026 + .008 * Math.sin(time * .65 + index));
      }
    },
  };
}
