import * as THREE from 'three';
import { block, ellipsoid, plastic } from './shapes.js';

function curvedSmile(parent, material) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.145, 1.51, 0.671),
    new THREE.Vector3(-0.083, 1.445, 0.699),
    new THREE.Vector3(0, 1.434, 0.708),
    new THREE.Vector3(0.083, 1.445, 0.699),
    new THREE.Vector3(0.145, 1.51, 0.671),
  ]);
  parent.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 15, 0.023, 7, false), material));
}

export function createMimo(star) {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  group.name = 'Mimo';

  const fur = plastic('#bd7548', 0.84);
  const biscuit = plastic('#ffe0ac', 0.85);
  const cocoa = plastic('#4d3040', 0.55);
  const cream = plastic('#fff6eb', 0.41);
  const blush = plastic('#f59993', 0.91);
  const bandana = plastic('#7bcfb7', 0.77);
  const badge = plastic('#ffe08a', 0.48);

  ellipsoid(body, fur, 0, 0.65, 0, 0.54, 0.58, 0.41);
  ellipsoid(body, biscuit, 0, 0.66, 0.25, 0.40, 0.43, 0.23);
  ellipsoid(body, fur, 0, 1.63, 0, 0.70, 0.64, 0.55);
  for (const side of [-1, 1]) {
    const ear = ellipsoid(body, fur, side * 0.54, 2.10, -0.046, 0.275, 0.269, 0.195);
    ear.rotation.z = -side * 0.23;
    ellipsoid(body, biscuit, side * 0.55, 2.105, 0.103, 0.162, 0.151, 0.078);

    const leg = ellipsoid(body, fur, side * 0.31, 0.18, 0.17, 0.23, 0.20, 0.285);
    leg.rotation.z = -side * 0.15;
    ellipsoid(body, biscuit, side * 0.31, 0.15, 0.36, 0.155, 0.125, 0.108);

    const cheek = ellipsoid(body, blush, side * 0.45, 1.51, 0.421, 0.125, 0.065, 0.048);
    cheek.rotation.y = side * 0.57;
  }
  ellipsoid(body, biscuit, 0, 1.48, 0.441, 0.316, 0.232, 0.251);
  ellipsoid(body, cocoa, 0, 1.57, 0.654, 0.123, 0.075, 0.069);
  ellipsoid(body, plastic('#9d655a'), 0.032, 1.603, 0.708, 0.046, 0.017, 0.013);
  curvedSmile(body, cocoa);

  const eyes = [-1, 1].map((side) => {
    const eye = new THREE.Group();
    eye.position.set(side * 0.254, 1.77, 0.47);
    eye.rotation.y = side * 0.21;
    ellipsoid(eye, cocoa, 0, 0, 0, 0.084, 0.113, 0.052);
    ellipsoid(eye, cream, -0.018, 0.037, 0.044, 0.025, 0.031, 0.014);
    ellipsoid(eye, cream, 0.029, -0.035, 0.044, 0.011, 0.013, 0.011);
    body.add(eye);
    return eye;
  });

  const scarf = ellipsoid(body, bandana, 0, 1.12, 0.035, 0.53, 0.13, 0.441);
  scarf.rotation.z = -0.06;
  const scarfTip = block(body, bandana, 0.42, 0.30, 0.19, 0.12, 0.22, 1.025, 0.414);
  scarfTip.rotation.z = -0.31;
  const brooch = new THREE.Mesh(star, badge);
  brooch.scale.setScalar(0.127);
  brooch.position.set(0.213, 1.049, 0.525);
  brooch.rotation.z = -0.24;
  body.add(brooch);

  const arms = [-1, 1].map((side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.43, 0.88, 0);
    ellipsoid(shoulder, fur, side * 0.14, -0.19, 0.087, 0.19, 0.34, 0.19).rotation.z = side * 0.36;
    ellipsoid(shoulder, biscuit, side * 0.20, -0.27, 0.218, 0.125, 0.135, 0.079);
    body.add(shoulder);
    return shoulder;
  });

  function animate(time, presentation, response, responseAge, reducedMotion, stepAge) {
    const reward = response === 'correct' || response === 'complete';
    const jumping = !reducedMotion && reward && responseAge < 1.05;
    const bouncing = jumping ? 0.48 * Math.abs(Math.sin(Math.PI * 2 * responseAge / 1.05)) : 0;
    const idle = reducedMotion ? 0 : Math.sin(time * 2.35);
    const stepping = !presentation && !reducedMotion && stepAge < 0.34
      ? Math.sin(Math.PI * stepAge / 0.34) : 0;
    body.position.x = -0.07 * stepping;
    body.position.y = Math.max(0, 0.017 * idle) + bouncing + 0.19 * stepping;
    body.rotation.z = jumping ? 0.11 * Math.sin(time * 13) : -0.025 * idle + 0.13 * stepping;
    body.rotation.y = 0.12 + 0.055 * idle;
    const blink = !reducedMotion ? Math.pow(Math.max(0, Math.cos((time + 1.5) * 1.7)), 130) : 0;
    for (const eye of eyes) eye.scale.y = 1 - 0.9 * blink;
    arms[0].rotation.z = jumping ? -1.15 - 0.22 * Math.cos(time * 8) : 0.14 + idle * 0.07;
    arms[1].rotation.z = jumping || presentation ? 1.91 + 0.22 * idle : -0.14 + idle * 0.07;
    arms[1].rotation.x = presentation ? -0.40 : -0.08;
  }

  return { group, animate };
}
