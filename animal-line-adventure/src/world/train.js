import * as THREE from 'three';
import { pivot, starPoints } from './sculpt.js';

const GOLD = 0xf1c879;
const DARK = 0x5b5267;
const CREAM = 0xffe7bd;

function wheel(kit, parent, x, y, z, radius) {
  const wheel = pivot(parent, x, y, z);
  kit.disc(wheel, DARK, 0, 0, 0, radius, radius, 0.213);
  kit.disc(wheel, 0xbb7767, 0, 0, 0.117, radius * 0.81, radius * 0.81, 0.062);
  kit.disc(wheel, GOLD, 0, 0, 0.158, radius * 0.35, radius * 0.35, 0.06);
  for (let i = 0; i < 5; i++) {
    const angle = i * Math.PI * 0.4;
    const spoke = kit.box(wheel, 0xe39e77, Math.cos(angle) * radius * 0.54,
      Math.sin(angle) * radius * 0.54, 0.145, radius * 0.42, 0.052, 0.033);
    spoke.rotation.z = angle;
  }
  kit.bake(wheel);
  return wheel;
}

function chassis(kit, parent, length, color, wheels, big = false) {
  kit.box(parent, 0xb46760, 0, 0.44, 0, length, 0.21, 1.26);
  kit.box(parent, color, 0, 0.57, 0, length - 0.07, 0.115, 1.27);
  const span = length * 0.29;
  for (const x of [-span, span]) {
    for (const z of [-0.58, 0.58]) {
      const radius = big && x < 0 ? 0.37 : 0.255;
      wheels.push(wheel(kit, parent, x, radius + 0.01, z, radius));
    }
  }
}

function coach(kit, train, wheels, x, color, top, mode) {
  const car = pivot(train, x, 0, 0);
  const shell = pivot(car, 0, 0, 0);
  chassis(kit, shell, 2.27, color, []);
  // The separate wheel groups can rotate without moving the coach body.
  for (const wheelGroup of shell.children.filter(child => child.isGroup)) {
    car.attach(wheelGroup);
    wheels.push(wheelGroup);
  }
  const pane = mode === 'open' ? 0x9ab992 : 0x8ab7c7;
  const height = mode === 'open' ? 0.56 : 1.05;
  const y = 0.62 + height * 0.5;
  kit.box(shell, color, 0, y, 0, 2.06, height, 1.13);
  kit.box(shell, top, 0, 0.61 + height, 0, 2.14, 0.128, 1.20);
  for (const xOffset of [-0.58, 0, 0.58]) {
    kit.box(shell, CREAM, xOffset, y + 0.076, 0.577, 0.422, height * 0.48, 0.07);
    kit.box(shell, pane, xOffset, y + 0.076, 0.614, 0.316, height * 0.34, 0.044);
    if (mode !== 'open') {
      kit.box(shell, 0xbfe0d9, xOffset - 0.073, y + 0.133, 0.637,
        0.115, 0.15, 0.018);
    }
  }
  kit.box(shell, CREAM, 0, 0.66, 0.60, 1.89, 0.066, 0.06);
  kit.box(shell, DARK, 1.18, 0.47, 0, 0.54, 0.103, 0.17);
  kit.bake(shell);
}

export function makeTrain(kit, scene) {
  const train = pivot(scene, 0, 0.015, -2.13);
  const engine = pivot(train, 3.84, 0, 0);
  const shell = pivot(engine, 0, 0, 0);
  const wheels = [];
  chassis(kit, shell, 2.66, 0xf4ae71, [], true);
  for (const wheelGroup of shell.children.filter(child => child.isGroup)) {
    engine.attach(wheelGroup);
    wheels.push(wheelGroup);
  }

  kit.box(shell, 0xe38976, -0.62, 1.12, 0, 1.02, 1.13, 1.08);
  kit.box(shell, 0xb96566, -0.62, 1.74, 0, 1.26, 0.18, 1.32);
  kit.ball(shell, 0xe29479, -0.62, 1.78, 0, 0.64, 0.13, 0.66);
  kit.box(shell, CREAM, -0.62, 1.27, 0.55, 0.73, 0.66, 0.076);
  kit.box(shell, 0x88b7c7, -0.62, 1.27, 0.586, 0.57, 0.5, 0.055);
  kit.box(shell, 0xbfe7dd, -0.76, 1.38, 0.617, 0.225, 0.158, 0.022);
  kit.box(shell, GOLD, -0.62, 0.903, 0.589, 0.85, 0.11, 0.081);

  const body = kit.cylinder(shell, 0x77bfa7, 0.36, 1.025, 0, 0.42, 1.40);
  body.rotation.z = Math.PI / 2;
  for (const x of [-0.16, 0.75, 1.04]) {
    kit.cylinder(shell, x === 1.04 ? 0xc86661 : GOLD, x, 1.027, 0, 0.435, 0.095)
      .rotation.z = Math.PI / 2;
  }
  kit.cylinder(shell, 0xd57a68, 0.758, 1.451, 0, 0.115, 0.44, 0.115, 1.43);
  kit.cylinder(shell, 0xbf6e62, 0.758, 1.664, 0, 0.19, 0.11);
  kit.cylinder(shell, 0x8b5b5b, 0.758, 1.72, 0, 0.135, 0.02);
  kit.ball(shell, GOLD, 0.241, 1.456, 0, 0.122, 0.12, 0.122);
  kit.disc(shell, GOLD, 0.29, 1.05, 0.404, 0.196, 0.195, 0.071);
  const emblem = kit.relief(shell, 0xbb7359, starPoints(0.122), 0.019, 0.008);
  emblem.position.set(0.29, 1.05, 0.449);
  kit.box(shell, 0xaf6c63, 1.20, 0.305, 0, 0.55, 0.21, 1.22);
  for (const z of [-0.48, 0, 0.48]) {
    const bar = kit.box(shell, 0xf1ab79, 1.35, 0.265, z, 0.10, 0.19, 0.13);
    bar.rotation.z = -0.28;
  }
  kit.bake(shell);

  coach(kit, train, wheels, 1.13, 0x97cbbb, 0x75a997, 'closed');
  coach(kit, train, wheels, -1.32, 0xc1a9db, 0x9b8cc1, 'open');
  coach(kit, train, wheels, -3.77, 0xefa5a1, 0xde8988, 'closed');
  coach(kit, train, wheels, -6.22, 0xf3c77c, 0xe4a865, 'open');

  const steam = pivot(scene, 0, 0, 0);
  const puffs = Array.from({ length: 7 }, () => {
    const material = kit.own(new THREE.MeshStandardMaterial({
      color: 0xfff7ec, transparent: true, opacity: 0, depthWrite: false,
    }));
    return kit.ball(steam, material, 0, 0, 0, 0.2, 0.20, 0.15);
  });
  return { train, wheels, puffs };
}

export function animateTrain({ train, wheels, puffs }, time, resultAge, reduced, menu) {
  const departure = resultAge >= 0.27;
  const travel = Math.max(0, resultAge - 0.27);
  train.position.x = reduced ? 0 : departure
    ? Math.min(26, travel * travel * 1.22)
    : menu ? Math.sin(time * 0.82) * 0.15 : 0;
  for (const wheel of wheels) wheel.rotation.z = -train.position.x * 3.7;
  for (let index = 0; index < puffs.length; index++) {
    const puff = puffs[index];
    const speed = departure ? 1.45 : 0.38;
    const age = (time * speed + index / puffs.length) % 1;
    const vx = departure ? 2 : 0.42;
    const show = !reduced && (!departure || travel < 4.7) && (departure || index < 4);
    puff.visible = show;
    if (!show) continue;
    puff.position.set(train.position.x + 4.60 - age * vx, 1.77 + age * 1.38, -2.16);
    const size = 0.11 + age * 0.25;
    puff.scale.set(size * 1.23, size, size);
    puff.material.opacity = 0.52 * (1 - age);
  }
}
