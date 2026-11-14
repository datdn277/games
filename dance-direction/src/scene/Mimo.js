import { enamel, shapes, solid, starGeometry, stroke } from './geometry.js';

export function makeMimo(parent, star = starGeometry(), primitives = shapes()) {
  const { ellipsoid, mount } = primitives;
  const fur = enamel(0xe68f42, 0.72);
  const golden = enamel(0xf7ae58, 0.74);
  const honey = enamel(0xffcc86, 0.8);
  const snout = enamel(0xffdfaa, 0.83);
  const innerEar = enamel(0xf3a67b, 0.81);
  const cheek = enamel(0xf38b86, 0.75);
  const deepFur = enamel(0xb85e37, 0.78);
  const chocolate = enamel(0x462a3c, 0.42);
  const eyes = enamel(0x321c34, 0.28);
  const sugar = enamel(0xfff7ec, 0.44);
  const violet = enamel(0x7754ce, 0.72);
  const lining = enamel(0xa987f5, 0.72);
  const plum = enamel(0x503498, 0.7);
  const paleLavender = enamel(0xdcc6ff, 0.74);
  const lilacWhite = enamel(0xf1e7ff, 0.73);
  const badge = enamel(0xffcd62, 0.52);

  const root = mount(parent, 'Mimo');
  const body = mount(root, 'WaistPivot', 0, 0.84);
  const upperBody = mount(body, 'UpperBody', 0, -0.84);
  const torso = mount(upperBody, 'Torso', 0, 0.9);
  ellipsoid(torso, golden, 0, 0.30, 0, 0.71, 0.76, 0.52);
  ellipsoid(torso, honey, 0, 0.49, 0.31, 0.48, 0.49, 0.29);
  ellipsoid(torso, violet, 0, 0.015, 0, 0.744, 0.588, 0.585);
  ellipsoid(torso, violet, 0, 0.36, 0.392, 0.519, 0.448, 0.21);
  ellipsoid(torso, violet, 0, 0.31, -0.476, 0.475, 0.389, 0.151);
  ellipsoid(torso, lining, 0, 0.32, 0.552, 0.35, 0.235, 0.055);
  ellipsoid(torso, paleLavender, 0, 0.34, 0.578, 0.319, 0.198, 0.041);
  ellipsoid(torso, lining, 0, 0.298, -0.627, 0.34, 0.24, 0.044);
  ellipsoid(torso, golden, 0, -0.22, -0.57, 0.216, 0.211, 0.198);
  ellipsoid(torso, honey, 0, -0.2, -0.73, 0.143, 0.135, 0.049);

  for (const side of [-1, 1]) {
    const x = side * 0.38;
    ellipsoid(torso, lining, x, 0.58, 0.358, 0.101, 0.393, 0.122).rotation.x = -0.4;
    ellipsoid(torso, lining, x, 0.597, -0.405, 0.099, 0.38, 0.109).rotation.x = 0.31;
    ellipsoid(torso, badge, x, 0.464, 0.5, 0.075, 0.075, 0.04);
    ellipsoid(torso, sugar, x - 0.018, 0.49, 0.536, 0.017, 0.014, 0.009);
    const pocket = ellipsoid(torso, plum, side * 0.484, -0.07, 0.359, 0.131, 0.024, 0.035);
    pocket.rotation.z = side * 0.56;
  }

  const frontBadge = solid(torso, star, badge, 0, 0.34, 0.626);
  frontBadge.scale.setScalar(0.155);
  frontBadge.rotation.z = -0.11;
  const backBadge = solid(torso, star, sugar, 0, 0.39, -0.671);
  backBadge.scale.setScalar(0.199);
  backBadge.rotation.y = Math.PI;
  backBadge.rotation.z = 0.12;

  const head = mount(upperBody, 'Head', 0, 1.91, 0.016);
  ellipsoid(head, golden, 0, 0.49, 0, 0.9, 0.82, 0.72);
  for (const side of [-1, 1]) {
    const ear = mount(head, side < 0 ? 'RightEar' : 'LeftEar', side * 0.652, 1.06, -0.035);
    ear.rotation.z = -side * 0.29;
    ear.rotation.y = side * 0.17;
    ellipsoid(ear, fur, 0, 0, 0, 0.345, 0.36, 0.235);
    ellipsoid(ear, golden, 0, 0.019, 0.075, 0.319, 0.33, 0.189);
    ellipsoid(ear, innerEar, 0, 0.017, 0.22, 0.222, 0.231, 0.059);
    ellipsoid(ear, cheek, 0, -0.027, 0.259, 0.139, 0.138, 0.023);
  }
  ellipsoid(head, golden, -0.14, 1.224, -0.047, 0.135, 0.263, 0.159).rotation.z = 0.63;
  ellipsoid(head, golden, 0.05, 1.254, -0.072, 0.138, 0.23, 0.145).rotation.z = -0.13;
  ellipsoid(head, fur, 0.204, 1.225, -0.079, 0.125, 0.17, 0.13).rotation.z = -0.42;

  const eyeGroups = [];
  for (const side of [-1, 1]) {
    const eye = mount(head, side < 0 ? 'RightEye' : 'LeftEye', side * 0.326, 0.663, 0.611);
    eye.rotation.y = side * 0.185;
    eye.rotation.z = side * 0.055;
    ellipsoid(eye, deepFur, 0, 0, 0, 0.139, 0.187, 0.064);
    ellipsoid(eye, eyes, 0, 0.005, 0.029, 0.121, 0.168, 0.058);
    ellipsoid(eye, sugar, -0.035, 0.054, 0.077, 0.047, 0.055, 0.016);
    ellipsoid(eye, sugar, 0.042, -0.05, 0.078, 0.019, 0.022, 0.01);
    eyeGroups.push(eye);

    const brow = ellipsoid(head, deepFur, side * 0.34, 0.904, 0.53, 0.105, 0.028, 0.035);
    brow.rotation.y = side * 0.3;
    brow.rotation.z = -side * 0.25;

    const blush = ellipsoid(head, cheek, side * 0.568, 0.354, 0.49, 0.156, 0.086, 0.045);
    blush.rotation.y = side * 0.47;
    blush.rotation.z = -side * 0.14;
  }

  ellipsoid(head, honey, 0, 0.232, 0.565, 0.472, 0.354, 0.273);
  ellipsoid(head, snout, 0, 0.242, 0.622, 0.403, 0.281, 0.243);
  ellipsoid(head, chocolate, 0, 0.353, 0.847, 0.147, 0.094, 0.069);
  ellipsoid(head, enamel(0x865353), -0.034, 0.388, 0.901, 0.055, 0.018, 0.011);
  ellipsoid(head, chocolate, 0, 0.168, 0.86, 0.125, 0.078, 0.029);
  ellipsoid(head, cheek, 0.015, 0.131, 0.886, 0.066, 0.031, 0.01);
  stroke(head, chocolate, [[-0.156, 0.221, 0.833], [-0.104, 0.176, 0.873], [0, 0.209, 0.894], [0.104, 0.177, 0.873], [0.16, 0.221, 0.831]], 0.014);
  stroke(head, chocolate, [[0, 0.297, 0.907], [0, 0.244, 0.887], [0, 0.208, 0.894]], 0.012);

  const limbs = {};
  for (const [label, sign] of [['Left', 1], ['Right', -1]]) {
    const upperArm = mount(upperBody, `${label}UpperArm`, sign * 0.576, 1.541, -0.014);
    ellipsoid(upperArm, golden, 0, -0.19, 0, 0.245, 0.397, 0.258);
    ellipsoid(upperArm, lining, 0, -0.095, 0.016, 0.25, 0.167, 0.265);
    const forearm = mount(upperArm, `${label}Forearm`, 0, -0.438, 0.013);
    ellipsoid(forearm, golden, 0, -0.16, 0, 0.205, 0.339, 0.212);
    const paw = mount(forearm, `${label}Paw`, 0, -0.345, 0.013);
    ellipsoid(paw, honey, 0, -0.03, 0, 0.189, 0.201, 0.168);
    ellipsoid(paw, honey, -sign * 0.105, 0.012, 0.06, 0.104, 0.119, 0.092).rotation.z = -sign * 0.36;
    ellipsoid(paw, innerEar, 0.022 * sign, -0.063, 0.148, 0.094, 0.101, 0.023);
    for (const toe of [-1, 0, 1]) {
      ellipsoid(paw, innerEar, toe * 0.067, -0.153 + Math.abs(toe) * 0.012, 0.115, 0.026, 0.025, 0.016);
    }

    const leg = mount(root, `${label}Leg`, sign * 0.331, 0.79, 0.024);
    ellipsoid(leg, violet, 0, -0.127, -0.013, 0.274, 0.402, 0.269);
    ellipsoid(leg, lining, 0, -0.293, 0.008, 0.261, 0.108, 0.26);
    const foot = mount(leg, `${label}Foot`, 0, -0.507, 0.098);
    ellipsoid(foot, paleLavender, 0, -0.094, 0.091, 0.275, 0.159, 0.396);
    ellipsoid(foot, lilacWhite, 0, -0.102, 0.112, 0.267, 0.122, 0.395);
    ellipsoid(foot, lining, 0, -0.018, 0.074, 0.246, 0.137, 0.366);
    ellipsoid(foot, sugar, 0, -0.011, 0.309, 0.216, 0.113, 0.145);
    for (const lace of [0.103, 0.172, 0.241]) {
      ellipsoid(foot, lilacWhite, 0, 0.106 - (lace - 0.103) * 0.22, lace, 0.127, 0.017, 0.026);
    }
    limbs[label.toLowerCase()] = { upperArm, forearm, paw, leg, foot };
  }

  root.traverse((child) => {
    if (child.isMesh) child.castShadow = true;
  });

  return { root, body, torso, head, eyeGroups, ...limbs };
}
