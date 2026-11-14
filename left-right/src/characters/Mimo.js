import * as THREE from 'three';
import { batchStaticMeshes, matte, mesh, oval, rounded, tube } from '../world/Shapes.js';

const honey = matte('#edab68');
const earPink = matte('#e9987a');
const oat = matte('#ffe0ac');
const cheek = matte('#f6a393');
const eyeWhite = matte('#fff9ee', 0.51);
const iris = matte('#6d3c31', 0.42);
const pupil = matte('#30212c', 0.38);
const nose = matte('#693932', 0.54);
const noseShine = matte('#af6550', 0.42);
const lavender = matte('#9e82e9');
const cuff = matte('#b69cf6');
const pocket = matte('#b89bf0');
const badge = matte('#eb7969');
const thread = matte('#fbd993');

function extrudedShape(shape, depth, bevel) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    steps: 1,
    curveSegments: 10,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function heartGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.11);
  shape.bezierCurveTo(-0.05, -0.06, -0.15, 0, -0.15, 0.075);
  shape.bezierCurveTo(-0.15, 0.155, -0.035, 0.175, 0, 0.095);
  shape.bezierCurveTo(0.035, 0.175, 0.15, 0.155, 0.15, 0.075);
  shape.bezierCurveTo(0.15, 0, 0.05, -0.06, 0, -0.11);
  return extrudedShape(shape, 0.025, 0.012);
}

function noseGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.13, 0.045);
  shape.bezierCurveTo(-0.13, 0.105, 0.13, 0.105, 0.13, 0.045);
  shape.bezierCurveTo(0.13, 0.003, 0.036, -0.07, 0, -0.07);
  shape.bezierCurveTo(-0.036, -0.07, -0.13, 0.003, -0.13, 0.045);
  return extrudedShape(shape, 0.036, 0.028);
}

function buildTorso(parent) {
  const torso = new THREE.Group();
  oval(torso, honey, 0, 0.91, 0, 0.61, 0.64, 0.46);
  oval(torso, lavender, 0, 0.62, 0.017, 0.59, 0.43, 0.448);
  rounded(torso, lavender, 0, 0.86, 0.327, 0.77, 0.55, 0.23, 0.11);
  rounded(torso, pocket, 0, 0.745, 0.455, 0.43, 0.31, 0.069, 0.074, false);
  const heart = mesh(torso, heartGeometry(), badge, 0, 0.725, 0.501, false);
  heart.scale.setScalar(0.68);

  for (const side of [-1, 1]) {
    const foot = oval(torso, honey, side * 0.36, 0.207, 0.19, 0.312, 0.207, 0.352);
    foot.rotation.y = side * 0.15;
    const pawPad = oval(torso, oat, side * 0.384, 0.163, 0.497, 0.151, 0.092, 0.061, false);
    pawPad.rotation.x = 0.21;
    pawPad.rotation.y = side * 0.13;
    oval(torso, lavender, side * 0.29, 0.365, 0.06, 0.25, 0.23, 0.305);
    oval(torso, cuff, side * 0.322, 0.306, 0.165, 0.258, 0.079, 0.228);
    const strap = rounded(torso, lavender, side * 0.31, 1.124, 0.272, 0.176, 0.515, 0.125, 0.062);
    strap.rotation.x = -0.43;
    strap.rotation.z = side * -0.17;
    oval(torso, thread, side * 0.298, 1.035, 0.421, 0.06, 0.06, 0.026, false);
    oval(torso, badge, side * 0.298, 1.035, 0.447, 0.017, 0.017, 0.006, false);
  }

  batchStaticMeshes(torso);
  parent.add(torso);
}

function buildEye(side, head) {
  const eye = new THREE.Group();
  oval(eye, eyeWhite, 0, 0, 0.022, 0.157, 0.184, 0.067, false);
  oval(eye, iris, -side * 0.018, -0.006, 0.079, 0.102, 0.129, 0.052, false);
  oval(eye, pupil, -side * 0.018, -0.007, 0.116, 0.074, 0.104, 0.027, false);
  oval(eye, eyeWhite, -0.05, 0.043, 0.137, 0.032, 0.036, 0.011, false);
  oval(eye, eyeWhite, 0.021, -0.043, 0.14, 0.014, 0.017, 0.007, false);
  batchStaticMeshes(eye);
  eye.position.set(side * 0.282, 0.16, 0.637);
  eye.rotation.y = side * 0.24;
  head.add(eye);
  return eye;
}

function buildHead(parent) {
  const head = new THREE.Group();
  head.position.set(0, 1.76, 0.008);
  const parts = new THREE.Group();

  oval(parts, honey, 0, 0, 0, 0.813, 0.719, 0.652);
  for (const side of [-1, 1]) {
    oval(parts, honey, side * 0.61, 0.511, -0.047, 0.271, 0.268, 0.195);
    oval(parts, earPink, side * 0.624, 0.524, 0.104, 0.172, 0.171, 0.065, false);
    oval(parts, oat, side * 0.612, 0.514, 0.155, 0.103, 0.099, 0.023, false);

    const blush = oval(parts, cheek, side * 0.499, -0.126, 0.509, 0.133, 0.071, 0.033, false);
    blush.rotation.y = side * 0.48;
    for (let index = 0; index < 3; index++) {
      const x = side * (0.453 + index * 0.043);
      oval(parts, oat, x, -0.117 - 0.017 * (index % 2), 0.559 - index * 0.021, 0.016, 0.017, 0.011, false);
    }

    const brow = oval(parts, nose, side * 0.298, 0.392, 0.543, 0.11, 0.025, 0.018, false);
    brow.rotation.z = side * -0.13;
    brow.rotation.y = side * 0.29;
  }

  oval(parts, oat, 0, -0.208, 0.568, 0.386, 0.289, 0.216, false);
  mesh(parts, noseGeometry(), nose, 0, -0.073, 0.78, false);
  oval(parts, noseShine, -0.043, -0.028, 0.823, 0.051, 0.016, 0.008, false);
  tube(parts, nose, [
    [-0.171, -0.235, 0.753], [-0.099, -0.284, 0.776], [0, -0.303, 0.781],
    [0.099, -0.284, 0.776], [0.171, -0.235, 0.753],
  ], 0.017);
  tube(parts, nose, [
    [0, -0.134, 0.793], [0, -0.212, 0.793], [0, -0.299, 0.781],
  ], 0.015);
  batchStaticMeshes(parts);
  head.add(parts);
  parent.add(head);
  return head;
}

function buildArm(side, parent) {
  const arm = new THREE.Group();
  arm.position.set(side * 0.487, 1.113, 0.015);
  oval(arm, honey, side * 0.077, -0.2, 0.02, 0.218, 0.343, 0.214);
  oval(arm, honey, side * 0.123, -0.412, 0.08, 0.211, 0.231, 0.207);
  oval(arm, oat, side * 0.128, -0.435, 0.244, 0.121, 0.134, 0.056, false);
  for (let index = -1; index <= 1; index++) {
    oval(arm, oat, side * 0.128 + index * 0.069, -0.284 - Math.abs(index) * 0.016, 0.246, 0.03, 0.034, 0.02, false);
  }
  batchStaticMeshes(arm);
  parent.add(arm);
  return arm;
}

export class Mimo {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Mimo';
    this.body = new THREE.Group();
    this.group.add(this.body);
    buildTorso(this.body);
    this.head = buildHead(this.body);
    this.eyes = [-1, 1].map((side) => buildEye(side, this.head));
    this.arms = [-1, 1].map((side) => buildArm(side, this.body));
    this.arms[0].rotation.z = -0.28;
    this.arms[1].rotation.z = 0.28;
    this.group.traverse((part) => {
      if (part.isMesh && !part.castShadow) part.receiveShadow = false;
    });
  }

  animate(time, mood = 'idle', elapsed = 0, reducedMotion = false) {
    const motion = reducedMotion ? 0 : 1;
    const breath = Math.sin(time * 2.4) * motion;
    const wave = mood === 'wave'
      ? Math.min(elapsed * 5, 1, Math.max(0, (2.2 - elapsed) * 3)) * motion
      : 0;
    const happy = mood === 'happy' ? Math.sin(Math.PI * Math.min(elapsed / 0.82, 1)) * motion : 0;
    const thinking = mood === 'thinking' ? 1 : 0;
    const encourage = mood === 'encourage' ? Math.sin(Math.PI * Math.min(elapsed / 0.85, 1)) * motion : 0;

    this.body.position.y = 0.33 * happy;
    this.body.scale.set(1 - 0.009 * breath, 1 + 0.013 * breath, 1 - 0.009 * breath);
    this.head.rotation.z = 0.026 * breath + 0.16 * thinking + 0.064 * Math.sin(elapsed * 9) * encourage;
    this.head.rotation.x = 0.013 * breath - 0.12 * happy + 0.09 * encourage;
    this.arms[0].rotation.z = -0.28 + 0.032 * breath - 0.92 * happy - 0.32 * encourage;
    this.arms[1].rotation.z = 0.28 + 0.032 * breath + 0.92 * happy + (1.98 + 0.27 * Math.sin(elapsed * 14)) * wave;
    this.arms[1].rotation.x = -0.36 * wave - 0.11 * thinking;

    const blinkTime = (time + 1.7) % 4.9;
    const blink = blinkTime < 0.16 ? Math.sin(blinkTime / 0.16 * Math.PI) : 0;
    for (const eye of this.eyes) eye.scale.y = 1 - 0.95 * blink * motion;
  }
}
