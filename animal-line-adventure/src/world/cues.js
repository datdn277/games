import * as THREE from 'three';
import { pivot, starPoints } from './sculpt.js';
import { PLATFORM_TOP } from './scenery.js';

const ARROW = [
  [-1.38, -0.09], [0.62, -0.09], [0.62, -0.23], [1.46, 0], [0.62, 0.23],
  [0.62, 0.09], [-1.38, 0.09],
];

export function makeCues(kit, scene) {
  const flag = pivot(scene, 0, PLATFORM_TOP, 1.0);
  kit.cylinder(flag, 0xc88d68, 0, 0.035, 0, 0.16, 0.10);
  kit.cylinder(flag, 0xe9bb78, 0, 0.73, 0, 0.039, 1.41);
  kit.ball(flag, 0xffd67f, 0, 1.46, 0, 0.075, 0.075, 0.075);
  const cloth = pivot(flag, 0.07, 1.34, 0.01);
  kit.relief(cloth, 0xec846c, [[0, 0.02], [0.53, -0.05], [0.40, -0.19],
    [0.49, -0.31], [0, -0.32]], 0.036, 0.013);
  const stamp = kit.relief(cloth, 0xffe09b, starPoints(0.079), 0.011, 0.005);
  stamp.position.set(0.19, -0.15, 0.052);
  kit.bake(cloth);

  const arrow = pivot(scene, 0, PLATFORM_TOP + 0.08, 2.62);
  const arrowMaterial = kit.own(new THREE.MeshBasicMaterial({
    color: 0xffd377, transparent: true, opacity: 1, depthWrite: false,
  }));
  const borderMaterial = kit.own(new THREE.MeshBasicMaterial({
    color: 0xb77662, transparent: true, opacity: 1, depthWrite: false,
  }));
  kit.relief(arrow, borderMaterial, ARROW, 0.018, 0.022).scale.set(1.075, 1.27, 1);
  kit.relief(arrow, arrowMaterial, ARROW, 0.023, 0.019).position.z = 0.025;
  arrow.rotation.x = -0.32;
  flag.visible = false;
  arrow.visible = false;
  return { flag, cloth, arrow, arrowMaterial, borderMaterial };
}

export function makeFootMark(kit, root, index) {
  const group = pivot(root, 0, 0.008, 0.03);
  const contact = kit.own(new THREE.MeshBasicMaterial({
    color: 0xa86850, transparent: true, opacity: 0.24,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1,
  }));
  const glow = kit.own(new THREE.MeshBasicMaterial({
    color: 0xffe5a3, transparent: true, opacity: 0,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1,
  }));
  const disc = kit.mesh(group, kit.own(new THREE.CircleGeometry(1, 28)), contact);
  disc.rotation.x = -Math.PI / 2;
  disc.scale.set(0.69, 0.44, 1);
  const ring = kit.mesh(group, kit.own(new THREE.RingGeometry(0.82, 1, 36)), glow);
  ring.rotation.x = -Math.PI / 2;
  ring.scale.set(0.85, 0.53, 1);
  ring.position.y = 0.01;
  ring.visible = false;
  return { ring, glow, phase: index * 0.2 };
}

export function poseFootMark(mark, time, highlight, since, reduced) {
  const active = since >= 0 && since < 0.68;
  mark.ring.visible = highlight || active;
  if (!mark.ring.visible) return;
  const pulse = reduced ? 0 : Math.sin(time * 4.5 + mark.phase);
  const size = active && !reduced ? 1 + since * 0.23 : 1;
  mark.ring.scale.set(0.86 * size, 0.54 * size, 1);
  mark.glow.opacity = active ? 0.83 * (1 - since / 0.68) : 0.65 + pulse * 0.17;
}

export function makeStars(kit, scene) {
  const group = pivot(scene, 0, 0, 0);
  const geometry = kit.relief(group, 0xffd277, starPoints(0.16), 0.04, 0.018).geometry;
  group.clear();
  const tones = [0xffcf6e, 0xffe6a1, 0xffaeb8, 0xfff2c6];
  const stars = Array.from({ length: 12 }, (_, index) => {
    const material = kit.own(new THREE.MeshBasicMaterial({
      color: tones[index % tones.length], transparent: true, depthWrite: false, opacity: 0,
    }));
    const star = kit.mesh(group, geometry, material);
    star.visible = false;
    return { star, start: -9, x: 0, y: 0, z: 0, phase: index * 2.39996 };
  });
  return {
    emit(time, x, y, z, count) {
      for (let index = 0; index < count; index++) {
        Object.assign(stars[index], { start: time, x, y, z });
      }
    },
    clear() {
      for (const entry of stars) entry.start = -9;
    },
    animate(time, reduced) {
      for (const entry of stars) {
        const { star, phase } = entry;
        const age = time - entry.start;
        star.visible = age >= 0 && age < 0.92;
        if (!star.visible) continue;
        const drift = reduced ? 0.23 : age * 0.86;
        star.position.set(entry.x + Math.cos(phase) * drift,
          entry.y + (reduced ? 0.2 : age * 1.31) + Math.sin(phase) * drift * 0.51, entry.z);
        star.rotation.z = reduced ? phase : phase + age * 2.4;
        star.scale.setScalar(0.71 + 0.31 * Math.sin(phase * 5));
        star.material.opacity = Math.min(1, (0.92 - age) * 2.7);
      }
    },
  };
}
