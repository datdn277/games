import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { block, ellipsoid, makeSprite, plastic, textTexture } from './shapes.js';

const fingers = [
  { x: -0.66, y: 2.50, lengths: [0.61, 0.48, 0.36], radius: 0.237, spread: 0.13 },
  { x: -0.14, y: 2.60, lengths: [0.69, 0.57, 0.38], radius: 0.248, spread: 0.025 },
  { x: 0.40, y: 2.54, lengths: [0.63, 0.46, 0.35], radius: 0.232, spread: -0.11 },
  { x: 0.89, y: 2.39, lengths: [0.52, 0.35, 0.30], radius: 0.202, spread: -0.225 },
  { x: -0.98, y: 1.84, lengths: [0.38, 0.40, 0.25], radius: 0.255, spread: 0.88, thumb: true },
];

const peach = new THREE.Color('#ffb675');
const cream = new THREE.Color('#ffe4aa');
const yellow = new THREE.Color('#ffce59');
const mint = new THREE.Color('#99edd8');
const teal = new THREE.Color('#4bd8be');

function palmGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.51, 0.99);
  shape.bezierCurveTo(-0.85, 1.09, -1.09, 1.56, -1.07, 1.93);
  shape.bezierCurveTo(-1.06, 2.31, -0.94, 2.64, -0.59, 2.73);
  shape.bezierCurveTo(-0.20, 2.86, 0.65, 2.79, 0.93, 2.59);
  shape.bezierCurveTo(1.22, 2.39, 1.07, 1.75, 0.94, 1.43);
  shape.bezierCurveTo(0.84, 1.16, 0.54, 0.94, 0.43, 0.94);
  shape.bezierCurveTo(0.27, 0.89, -0.31, 0.89, -0.51, 0.99);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.39, bevelSize: 0.20, bevelThickness: 0.23, bevelSegments: 5, steps: 1, curveSegments: 14,
  });
  geometry.translate(0, 0, -0.22);
  geometry.deleteAttribute('normal');
  geometry.deleteAttribute('uv');
  const smooth = mergeVertices(geometry);
  smooth.computeVertexNormals();
  geometry.dispose();
  return smooth;
}

function makeFinger(parent, descriptor, id, dotTexture) {
  const { x, y, radius, lengths, spread, thumb } = descriptor;
  const root = new THREE.Group();
  root.position.set(x, y, 0);
  parent.add(root);

  const material = plastic(peach, 0.42);
  material.side = THREE.DoubleSide;
  const accent = plastic('#ffd9a4', 0.46);
  const metal = plastic('#ef9d67', 0.66);
  const joints = [];
  const surfaces = [];
  let parentJoint = root;
  const hitSurfaces = new THREE.Group();
  const hitMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, visible: false });
  hitSurfaces.position.set(0, 0, 0);
  root.add(hitSurfaces);
  const generous = 0.245;
  const hitHeight = lengths.reduce((sum, length) => sum + length, 0) + 0.30;
  const hitArea = new THREE.Mesh(new THREE.BoxGeometry(generous * 2, hitHeight, 0.65), hitMaterial);
  hitArea.position.y = hitHeight / 2 - 0.05;
  hitArea.userData.fingerId = id;
  hitSurfaces.add(hitArea);

  for (const [index, length] of lengths.entries()) {
    const joint = new THREE.Group();
    joint.position.y = index === 0 ? 0 : lengths[index - 1];
    parentJoint.add(joint);
    joints.push(joint);
    const segmentRadius = radius * (1 - index * 0.095);
    if (index > 0) {
      const hinge = ellipsoid(joint, metal, 0, 0, 0, segmentRadius * 0.91, segmentRadius, segmentRadius * 0.87);
      hinge.userData.fingerId = id;
      surfaces.push(hinge);
    }
    const shell = new THREE.Mesh(
      new THREE.CapsuleGeometry(segmentRadius, Math.max(0.02, length - segmentRadius), 6, 14),
      material,
    );
    shell.position.y = length * (index === 2 ? 0.51 : 0.49);
    shell.scale.z = 0.92;
    shell.userData.fingerId = id;
    joint.add(shell);
    surfaces.push(shell);
    if (index === 2) {
      ellipsoid(joint, accent, 0, length * 0.62, segmentRadius * 0.77,
        segmentRadius * 0.67, segmentRadius * 0.84, segmentRadius * 0.25);
    }
    parentJoint = joint;
  }

  const tip = new THREE.Object3D();
  tip.position.set(0, lengths[2] * 0.60, radius * 0.72);
  parentJoint.add(tip);
  const badge = makeSprite(dotTexture, 0.63);
  badge.userData.fingerId = id;
  badge.renderOrder = 3;
  badge.material.depthTest = false;
  badge.visible = false;

  return {
    id, spread, thumb, root, joints, tip, badge, material, accent, surfaces, hitArea,
    folded: 0, wasRaised: false, opensAt: 0, tapTime: -10, lastValue: undefined,
  };
}

export function createHand(star) {
  const group = new THREE.Group();
  group.name = 'Bàn tay robot';
  const rig = new THREE.Group();
  group.add(rig);
  const lilac = plastic('#a28aef', 0.47);
  const paleLilac = plastic('#d6c5ff', 0.39);
  const plum = plastic('#7d63d5', 0.50);
  const meringue = plastic('#ffe6ae', 0.51);
  const palm = new THREE.Mesh(palmGeometry(), plastic('#ffb879', 0.46));
  rig.add(palm);

  ellipsoid(rig, plastic('#ffc889', 0.48), 0.01, 1.94, 0.17, 0.92, 0.73, 0.31);
  block(rig, paleLilac, 1.33, 0.51, 0.88, 0.22, 0, 0.72, -0.04);
  block(rig, plum, 1.58, 0.36, 1.01, 0.17, 0, 0.965, -0.04);
  block(rig, lilac, 1.61, 0.45, 1.05, 0.20, 0, 0.88, 0.015);
  block(rig, paleLilac, 1.04, 0.23, 0.17, 0.09, 0, 0.89, 0.51);
  ellipsoid(rig, plastic('#78dcc8', 0.38), -0.22, 0.89, 0.614, 0.085, 0.055, 0.026);
  ellipsoid(rig, meringue, 0.0, 0.89, 0.614, 0.085, 0.055, 0.026);
  ellipsoid(rig, plastic('#f3a4cd', 0.40), 0.22, 0.89, 0.614, 0.085, 0.055, 0.026);

  const badge = new THREE.Mesh(star, meringue);
  badge.position.set(0.06, 1.95, 0.473);
  badge.rotation.z = -0.14;
  badge.scale.setScalar(0.38);
  rig.add(badge);
  ellipsoid(rig, plastic('#efab6f'), -0.52, 1.53, 0.398, 0.07, 0.07, 0.024);
  ellipsoid(rig, plastic('#efab6f'), 0.53, 1.53, 0.398, 0.07, 0.07, 0.024);

  const hint = textTexture('✦', { textColor: '#845719', badgeColor: '#fff1b0', rimColor: '#eeb259' });
  const counts = Array.from({ length: 11 }, (_, value) => textTexture(value, {
    textColor: '#25504a', badgeColor: '#dcfff1', rimColor: '#70c8b2',
  }));
  const digits = fingers.map((descriptor, id) => makeFinger(rig, descriptor, id, hint));
  for (const digit of digits) group.add(digit.badge);
  const tipPosition = new THREE.Vector3();

  function animate(time, delta, state, reducedMotion) {
    const presentation = state.screen !== 'play';
    const count = presentation ? 5 : state.raised;
    const scale = presentation ? 1.10 : 1.0;
    const tilt = presentation ? -0.095 + (reducedMotion ? 0 : Math.sin(time * 1.7) * 0.065) : 0;
    const lift = presentation && !reducedMotion ? Math.sin(time * 1.8) * 0.06 : 0;
    rig.position.set(presentation ? 0.19 : 0, 0.01 + lift, 0.18);
    rig.rotation.set(presentation ? -0.055 : -0.06, presentation ? -0.13 : 0.035, tilt);
    rig.scale.setScalar(scale);
    const ease = reducedMotion ? 1 : 1 - Math.exp(-delta * 11);

    for (const finger of digits) {
      const raised = finger.id < count;
      const counted = Object.hasOwn(state.counts, finger.id);
      const next = !presentation && raised && !counted && state.next === finger.id && state.interactive;
      const value = counted ? state.counts[finger.id] : undefined;
      if (raised !== finger.wasRaised) {
        finger.opensAt = time + (raised && !reducedMotion ? finger.id * 0.052 : 0);
        finger.wasRaised = raised;
      }
      const opening = raised && time >= finger.opensAt;
      finger.folded = THREE.MathUtils.lerp(finger.folded, opening ? 0 : 1, ease);
      const tapAge = time - finger.tapTime;
      const tapBend = !reducedMotion && tapAge < 0.32 ? 0.31 * Math.sin((tapAge / 0.32) * Math.PI) : 0;
      const wiggle = presentation && !reducedMotion ? Math.sin(time * 2.4 + finger.id * 0.52) * 0.045 : 0;

      finger.root.rotation.z = THREE.MathUtils.lerp(finger.spread, finger.thumb ? -0.32 : finger.spread * 0.31, finger.folded) + wiggle;
      const [base, middle, tipJoint] = finger.joints;
      base.rotation.x = finger.folded * (finger.thumb ? 1.07 : 1.54) + tapBend;
      middle.rotation.x = finger.folded * (finger.thumb ? 0.61 : 0.94) + tapBend * 0.5;
      tipJoint.rotation.x = finger.folded * 0.65 - 0.10;

      const goal = counted ? teal : next ? yellow : peach;
      finger.material.color.lerp(goal, ease);
      finger.accent.color.lerp(counted ? mint : cream, ease);
      finger.material.emissive.copy(goal);
      finger.material.emissiveIntensity = counted ? 0.055 : next
        ? (reducedMotion ? 0.09 : 0.11 + 0.045 * Math.sin(time * 5))
        : 0;
      finger.badge.visible = !presentation && raised && (counted || next);
      if (!finger.badge.visible) continue;
      if (finger.lastValue !== value) {
        finger.badge.material.map = value === undefined ? hint : counts[value];
        finger.lastValue = value;
      }
      finger.tip.getWorldPosition(tipPosition);
      group.worldToLocal(tipPosition);
      finger.badge.position.copy(tipPosition);
      const pop = counted && !reducedMotion && tapAge < 0.30
        ? 0.18 * Math.sin((tapAge / 0.30) * Math.PI) : 0;
      finger.badge.position.y += finger.thumb ? 0.54 + pop : 0.64 + pop;
      finger.badge.position.z += 0.52;
      const badgeSize = (finger.thumb ? 0.55 : 0.57) + pop;
      finger.badge.scale.set(badgeSize, badgeSize, 1);
    }
  }

  function dispose() {
    hint.dispose();
    for (const texture of counts) texture.dispose();
  }

  return { group, digits, animate, dispose };
}
