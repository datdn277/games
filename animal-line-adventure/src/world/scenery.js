import * as THREE from 'three';
import { pivot, starPoints } from './sculpt.js';

export const PLATFORM_TOP = 0.36;
const GROUND = 0xb7e4b0;
const SOIL_Y = -0.25;

function seeded(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
}

export function skyBackdrop(kit) {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#9ed9f7');
  gradient.addColorStop(0.66, '#d9f2f4');
  gradient.addColorStop(1, '#e9f6dd');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 4, 256);
  const texture = kit.own(new THREE.CanvasTexture(canvas));
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeCloud(kit, region, x, y, z, scale) {
  const cloud = pivot(region, x, y, z);
  cloud.scale.setScalar(scale);
  kit.ball(cloud, 0xfaffff, -0.5, 0.0, 0.02, 0.69, 0.32, 0.37);
  kit.ball(cloud, 0xffffff, -0.055, 0.235, 0, 0.62, 0.48, 0.45);
  kit.ball(cloud, 0xfafcfc, 0.51, 0.106, 0.06, 0.67, 0.33, 0.38);
}

function makeTree(kit, region, x, y, z, scale, color, pine = false) {
  const tree = pivot(region, x, y, z);
  tree.scale.setScalar(scale);
  kit.cylinder(tree, 0xae745c, 0, 0.6, 0, 0.17, 1.45, 0.15, 0.66);
  if (pine) {
    for (let tier = 0; tier < 3; tier++) {
      const width = 0.79 - tier * 0.17;
      const cone = kit.cylinder(tree, color, 0, 1.0 + tier * 0.53, 0, width,
        0.99, width, 0.19);
      kit.ball(tree, color, 0, cone.position.y + 0.44, 0, width * 0.2, 0.16, width * 0.2);
    }
  } else {
    kit.ball(tree, color, 0, 1.60, 0, 0.82, 0.97, 0.66);
    kit.ball(tree, color, -0.48, 1.25, 0.056, 0.55, 0.63, 0.53);
    kit.ball(tree, color, 0.51, 1.46, 0.02, 0.54, 0.68, 0.50);
  }
}

function landscape(kit, environment) {
  const ground = pivot(environment, 0, 0, 0);
  kit.box(ground, GROUND, 0, SOIL_Y - 0.14, 2.85, 124, 0.22, 34.3, true);
  kit.ball(ground, 0x9cdbbd, -13, -0.76, -16.1, 18, 2.0, 5.35);
  kit.ball(ground, 0x94d6ce, 6, -0.73, -18.3, 16, 2.00, 5.5);
  kit.ball(ground, 0xade0b9, 16, -0.68, -16.8, 13, 1.88, 5.3);
  kit.ball(ground, 0xa1dba5, -12.1, -0.68, -11.3, 13, 2.0, 5.2);
  kit.ball(ground, 0xa9dfa7, 11, -0.65, -10.7, 13, 1.97, 4.6);
  const r = seeded(6873);
  for (let idx = 0; idx < 21; idx++) {
    const x = -22 + idx * 2.2 + (r() - 0.5) * 1.9;
    makeTree(kit, ground, x, 0.10 + r() * 0.37, -10 - r() * 3.5,
      0.55 + r() * 0.76, idx % 3 ? 0x8acaab : 0x90cfb7, idx % 3 !== 1);
  }
  [
    [-10, -3.1, 1.35, 0x65bb8d, true],
    [-8.0, -6.7, 1.18, 0x73c89d, false],
    [-6.3, -5.4, 0.8, 0x77c496, true],
    [6.0, -7.1, 1.6, 0x69c19a, true],
    [7.6, -5.8, 1.09, 0x7ac79a, false],
    [9.5, -3.2, 1.3, 0x75c798, true],
    [12, -3.4, 0.92, 0x67b68f, false],
  ].forEach(([x, z, scale, color, pine]) => makeTree(kit, ground, x, SOIL_Y, z, scale, color, pine));

  makeCloud(kit, ground, -9.3, 4.35, -9, 1.35);
  makeCloud(kit, ground, -3.85, 3.36, -7.9, 0.85);
  makeCloud(kit, ground, 2.66, 3.64, -8.7, 0.86);
  makeCloud(kit, ground, 7.85, 3.5, -8, 1.45);
  makeCloud(kit, ground, 14.8, 4.83, -9.2, 1.1);

  for (let idx = 0; idx < 33; idx++) {
    const x = (r() - 0.5) * 26;
    const z = idx < 23 ? 3.55 + r() * 3.1 : -4.9 - r() * 3.3;
    const size = 0.58 + r() * 0.66;
    const growth = pivot(ground, x, SOIL_Y + 0.12, z);
    growth.scale.setScalar(size);
    kit.ball(growth, 0x76be87, 0, 0.075, 0, 0.25, 0.092, 0.14);
    if (idx % 2) continue;
    const petals = [0xffd380, 0xe98e9d, 0xfff7d6][idx % 3];
    kit.cylinder(growth, 0x65ad74, 0, 0.20, 0, 0.022, 0.30, 0.022, 0.78);
    for (let p = 0; p < 5; p++) {
      const angle = p * Math.PI * 0.4;
      kit.ball(growth, petals, Math.cos(angle) * 0.065, 0.35, Math.sin(angle) * 0.064,
        0.05, 0.03, 0.05);
    }
    kit.ball(growth, 0xeeb76a, 0, 0.373, 0, 0.048, 0.04, 0.048);
  }
  kit.bake(ground);
}

function stationSign(kit, parent) {
  const sign = pivot(parent, 0, 2.48, 1.69);
  kit.box(sign, 0xa27056, 0, 0, -0.05, 3.26, 0.76, 0.29);
  kit.box(sign, 0xffcf7a, 0, 0, 0.09, 3.09, 0.64, 0.15);
  kit.box(sign, 0xfff4d5, 0, 0, 0.165, 2.92, 0.54, 0.08);
  const canvas = document.createElement('canvas');
  canvas.width = 924;
  canvas.height = 160;
  const context = canvas.getContext('2d');
  context.fillStyle = '#463d38';
  context.font = '900 100px system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('GA CẦU VỒNG', 462, 88, 780);
  const map = kit.own(new THREE.CanvasTexture(canvas));
  map.colorSpace = THREE.SRGBColorSpace;
  const textMat = kit.own(new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: 0.45 }));
  kit.mesh(sign, kit.own(new THREE.PlaneGeometry(2.35, 0.405)), textMat, 0, 0.012, 0.212);
  for (const x of [-1.27, 1.27]) {
    const star = kit.relief(sign, 0xe68f59, starPoints(0.092), 0.02, 0.008);
    star.position.set(x, 0, 0.207);
  }
}

function pavilion(kit, environment) {
  const station = pivot(environment, 0.4, 0, -5.55);
  kit.box(station, 0xd5a175, 0, 0.06, 0.25, 5.29, 0.34, 2.30);
  kit.box(station, 0xdcb98a, 0, 1.02, -0.54, 4.62, 1.92, 0.28);
  kit.box(station, 0xf6d9a1, 0, 2.22, 0.53, 4.95, 0.34, 1.61);
  for (const x of [-2.15, 2.15]) {
    kit.box(station, 0xb28363, x, 1.25, 0.83, 0.27, 2.25, 0.29);
    kit.box(station, 0xfae0ad, x, 0.25, 0.83, 0.37, 0.28, 0.42);
    kit.box(station, 0xfae0ad, x, 2.16, 0.83, 0.38, 0.18, 0.45);
  }
  for (const x of [-1.29, 1.29]) {
    kit.box(station, 0xac8359, x, 1.45, -0.369, 1.3, 1.21, 0.16);
    kit.box(station, 0x6facb4, x, 1.45, -0.274, 1.015, 0.93, 0.13);
    kit.box(station, 0xaddbd6, x + 0.15, 1.61, -0.198, 0.39, 0.37, 0.04);
    kit.box(station, 0xf4d9a9, x, 1.45, -0.205, 0.075, 0.94, 0.055);
    kit.box(station, 0xf4d9a9, x, 1.45, -0.201, 1.02, 0.081, 0.055);
  }
  kit.box(station, 0x90b8a3, 0, 0.975, -0.268, 0.94, 1.73, 0.22);
  kit.ball(station, 0xfbd17a, 0.29, 0.87, -0.127, 0.068, 0.068, 0.05);

  for (const side of [-1, 1]) {
    const surface = kit.box(station, 0xdb8275, 0, 2.69, side * 0.58 + 0.22, 5.57, 0.25, 1.64);
    surface.rotation.x = side * 0.36;
    for (let index = 0; index < 12; index++) {
      const tile = kit.box(station, index % 2 ? 0xe99983 : 0xea9f8a,
        -2.53 + index * 0.46, 2.825, side * 0.57 + 0.22, 0.37, 0.13, 1.57);
      tile.rotation.x = side * 0.36;
    }
  }
  kit.box(station, 0xcb756d, 0, 3.02, 0.23, 5.56, 0.18, 0.36);
  stationSign(kit, station);

  for (const x of [-3.76, 4.19]) {
    const lantern = pivot(station, x, 0, 0.85);
    kit.cylinder(lantern, 0x9d7458, 0, 1.22, 0, 0.083, 2.62);
    kit.box(lantern, 0xa67a5a, 0, 0.13, 0, 0.34, 0.22, 0.35);
    kit.box(lantern, 0xffe2a5, 0, 2.53, 0, 0.27, 0.41, 0.27);
    kit.cylinder(lantern, 0xa87460, 0, 2.79, 0, 0.24, 0.20, 0.24, 0.34);
  }

  const bench = pivot(station, 4.12, 0, 1.2);
  kit.box(bench, 0xdca574, 0, 0.47, 0.03, 1.69, 0.16, 0.55);
  kit.box(bench, 0xe6b587, 0, 0.73, -0.25, 1.72, 0.35, 0.13);
  [-0.63, 0.63].forEach(x => {
    kit.box(bench, 0xad7c59, x, 0.21, 0, 0.15, 0.51, 0.41);
    kit.box(bench, 0xad7c59, x, 0.52, -0.26, 0.13, 0.83, 0.11);
  });
  kit.bake(station);
}

function makeBunting(kit, environment) {
  const bunting = pivot(environment, 0, 0, -4.3);
  const flagColors = [0xe69498, 0xf4ca79, 0x83cac2, 0xa7aaed];
  for (const side of [-1, 1]) {
    const nodes = Array.from({ length: 9 }, (_, idx) => {
      const t = idx / 8;
      return [side * (2.4 + t * 5.8), 3.08 + t * 0.29 - 0.38 * Math.sin(t * Math.PI), 0];
    });
    kit.tube(bunting, 0xb28b6e, nodes, 0.017);
    for (let index = 1; index < nodes.length - 1; index++) {
      const flag = kit.relief(bunting, flagColors[index % flagColors.length],
        [[-0.15, 0.04], [0.15, 0.04], [-0.017, -0.31]], 0.024, 0.022);
      flag.position.set(...nodes[index]);
      flag.rotation.z = (index - 4) * side * 0.031;
    }
  }
  kit.bake(bunting);
}

function makeBalloons(kit, environment) {
  const balloons = pivot(environment, 6.34, 0.26, 1.35);
  [
    [-0.40, 2.13, -0.12, 0xe99ebd],
    [0.16, 2.59, -0.20, 0xf8cc79],
    [0.47, 2.21, 0.02, 0xb7a4e8],
  ].forEach(([x, y, z, color]) => {
    kit.ball(balloons, color, x, y, z, 0.28, 0.37, 0.24, 'gloss');
    kit.cylinder(balloons, color, x, y - 0.335, z, 0.06, 0.12, 0.06, 0.6);
    kit.tube(balloons, 0xa48575, [[0, 0, 0], [x * 0.49, y * 0.45, z * 0.4], [x, y - 0.36, z]],
      0.012);
  });
  kit.bake(balloons);
}

function makePlatform(kit, environment) {
  const platform = pivot(environment, 0, 0, 0);
  kit.box(platform, 0xb98361, 0, 0.04, 1.39, 16.7, 0.43, 3.83);
  const wood = [0xe4b185, 0xeab68a, 0xe8b488, 0xe7af84];
  for (let i = 0; i < 7; i++) {
    const z = -0.29 + i * 0.53;
    kit.box(platform, wood[i % wood.length], 0, 0.261, z, 16.7, 0.193, 0.515);
    for (let j = 0; j < 3; j++) {
      const x = -6.55 + j * 5.5 + (i % 2 ? 0.49 : 0);
      kit.box(platform, 0xd19970, x, 0.354, z + 0.01, 0.015, 0.023, 0.43, true);
    }
  }
  kit.box(platform, 0xeac098, 0, 0.164, 3.31, 16.83, 0.24, 0.17);
  kit.box(platform, 0xcf9b78, 0, -0.042, 3.3, 16.84, 0.16, 0.18);
  for (let i = 0; i < 14; i++) {
    const x = -7.82 + i * 1.2;
    kit.disc(platform, 0xc7906e, x, 0.161, 3.4, 0.031, 0.027, 0.015);
  }
  kit.bake(platform);
}

function makeTracks(kit, environment) {
  const tracks = pivot(environment, 0, 0, -2.13);
  kit.box(tracks, 0xc4ac8d, 0, -0.19, 0, 56, 0.16, 2.05);
  for (let x = -21; x <= 21; x += 0.58) {
    kit.box(tracks, 0xa97560, x, -0.096, 0, 0.24, 0.14, 1.57);
  }
  for (const z of [-0.55, 0.55]) kit.box(tracks, 0x897e85, 0, 0.008, z, 52, 0.105, 0.12);
  kit.bake(tracks);
}

export function makeStation(kit, scene) {
  const environment = pivot(scene, 0, 0, 0);
  landscape(kit, environment);
  makeTracks(kit, environment);
  pavilion(kit, environment);
  makeBunting(kit, environment);
  makePlatform(kit, environment);
  makeBalloons(kit, environment);
  return environment;
}
