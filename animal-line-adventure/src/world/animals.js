import * as THREE from 'three';
import { pivot, starPoints } from './sculpt.js';

const COATS = {
  cat: { fur: 0xf4b66f, shade: 0xd7864c, cream: 0xffe4bd, ear: 0xf093a1, eyes: 0x584452 },
  bear: { fur: 0xa97059, shade: 0x895a4c, cream: 0xe8b590, ear: 0xcf927c, eyes: 0x473747 },
  rabbit: { fur: 0xe3d0ed, shade: 0xbd9fda, cream: 0xfff1f4, ear: 0xef9cbe, eyes: 0x6a497d },
  frog: { fur: 0x87d27e, shade: 0x5eb963, cream: 0xe3ef9d, ear: 0xa6df82, eyes: 0x3c605a },
  panda: { fur: 0xf7f4ef, shade: 0x48516d, cream: 0xfff9ea, ear: 0x75748b, eyes: 0x3e4158 },
  fox: { fur: 0xe98850, shade: 0xbb6545, cream: 0xffedd1, ear: 0xe8a59c, eyes: 0x5e3b48 },
  mimo: { fur: 0xbe8a65, shade: 0x935d4e, cream: 0xf6cb9d, ear: 0xe39f8c, eyes: 0x533940 },
};

const FINCH = 0xf6a6ac;
const TRIANGLE = [[-0.23, -0.16], [0.25, -0.18], [0.09, 0.3], [-0.04, 0.33]];

function makeEars(kit, head, type, coat) {
  for (const side of [-1, 1]) {
    if (type === 'cat' || type === 'fox') {
      const outer = pivot(head, side * 0.43, 0.46, 0.0);
      outer.rotation.z = -side * 0.2;
      const ear = kit.relief(outer, type === 'fox' ? coat.shade : coat.fur, TRIANGLE, 0.13, 0.06);
      const inner = kit.relief(outer, coat.ear, TRIANGLE, 0.025, 0.026);
      if (type === 'fox') ear.scale.y = 1.18;
      inner.scale.set(0.69, 0.71, 1);
      inner.position.set(0, -0.015, 0.18);
    } else if (type === 'rabbit') {
      const ear = pivot(head, side * 0.29, 0.61, -0.015);
      ear.rotation.z = -side * 0.18;
      kit.ball(ear, coat.fur, 0, 0.13, 0, 0.19, 0.42, 0.155);
      kit.ball(ear, coat.ear, 0, 0.17, 0.1, 0.103, 0.31, 0.075);
    } else if (type !== 'frog') {
      const outer = kit.ball(head, type === 'panda' ? coat.shade : coat.fur,
        side * 0.47, 0.44, -0.02, 0.25, 0.24, 0.18);
      outer.rotation.z = side * 0.17;
      kit.ball(head, coat.ear, side * 0.49, 0.47, 0.112, 0.137, 0.135, 0.068);
    }
  }
}

function makeFace(kit, head, type, coat) {
  const form = pivot(head, 0, 0, 0);
  const eyes = [];
  const frog = type === 'frog';
  const fox = type === 'fox';
  kit.ball(form, coat.fur, 0, 0, 0, frog ? 0.67 : 0.63, frog ? 0.47 : 0.56, 0.48);
  makeEars(kit, form, type, coat);

  if (frog) {
    for (const side of [-1, 1]) {
      kit.ball(form, coat.fur, side * 0.38, 0.32, 0.02, 0.28, 0.31, 0.26);
      kit.ball(form, coat.cream, side * 0.12, -0.22, 0.35, 0.29, 0.21, 0.16);
      kit.ball(form, coat.shade, side * 0.08, -0.096, 0.479, 0.026, 0.02, 0.02);
    }
  } else {
    if (fox) {
      kit.ball(form, coat.cream, -0.21, -0.22, 0.32, 0.34, 0.205, 0.20).rotation.z = -0.2;
      kit.ball(form, coat.cream, 0.21, -0.22, 0.32, 0.34, 0.205, 0.20).rotation.z = 0.2;
    } else if (type === 'cat') {
      for (const side of [-1, 1]) {
        kit.ball(form, coat.cream, side * 0.107, -0.20, 0.41, 0.165, 0.143, 0.125);
        for (let line = 0; line < 2; line++) {
          const y = -0.18 - line * 0.057;
          kit.tube(form, coat.shade, [[side * 0.39, y, 0.368],
            [side * 0.57, y + 0.016 - line * 0.04, 0.387],
            [side * 0.68, y + 0.036 - line * 0.066, 0.379]], 0.014);
        }
      }
    } else {
      kit.ball(form, coat.cream, 0, -0.22, 0.38, 0.32, 0.198, 0.162);
    }
    kit.ball(form, type === 'cat' || type === 'rabbit' ? 0xc47886 : coat.eyes,
      0, -0.13, 0.526, 0.087, 0.061, 0.045, 'gloss');
  }

  const eyeX = frog ? 0.38 : 0.246;
  const eyeY = frog ? 0.335 : 0.074;
  const eyeZ = frog ? 0.246 : 0.422;
  for (const side of [-1, 1]) {
    if (type === 'panda') {
      kit.ball(form, coat.shade, side * eyeX, eyeY - 0.028, 0.397, 0.218, 0.217, 0.084)
        .rotation.z = side * 0.29;
    }
    kit.ball(form, frog ? 0xebac93 : FINCH, side * (frog ? 0.49 : 0.39), -0.161,
      frog ? 0.313 : 0.355, 0.09, 0.047, 0.029).rotation.y = side * 0.31;
    const eye = pivot(head, side * eyeX, eyeY, eyeZ);
    kit.ball(eye, 0xfffafd, 0, 0, 0, 0.117, 0.153, 0.076);
    kit.ball(eye, coat.eyes, side * -0.008, 0, 0.05, 0.084, 0.116, 0.049, 'gloss');
    kit.ball(eye, 0xffffff, -0.025, 0.045, 0.093, 0.031, 0.039, 0.013, 'flat');
    kit.ball(eye, 0xffefe8, 0.028, -0.033, 0.094, 0.014, 0.018, 0.008, 'flat');
    kit.bake(eye);
    eyes.push(eye);
    if (type !== 'panda' && !frog) {
      kit.tube(form, coat.shade, [[side * 0.168, 0.259, 0.422], [side * 0.242, 0.275, 0.395],
        [side * 0.313, 0.25, 0.36]], 0.019);
    }
  }

  const lipColor = frog ? 0x548d56 : coat.eyes;
  const smile = frog
    ? [[-0.197, -0.159, 0.494], [-0.113, -0.229, 0.503], [0, -0.247, 0.503],
      [0.113, -0.229, 0.503], [0.197, -0.159, 0.494]]
    : [[-0.13, -0.227, 0.508], [-0.067, -0.258, 0.539], [0, -0.216, 0.544],
      [0.067, -0.258, 0.539], [0.13, -0.227, 0.508]];
  kit.tube(form, lipColor, smile, 0.018);
  if (type === 'rabbit') kit.box(form, 0xffffff, 0, -0.276, 0.511, 0.086, 0.067, 0.07);
  if (type === 'cat') {
    for (const side of [-1, 0, 1]) {
      const mark = kit.ball(form, coat.shade, side * 0.1, 0.423 - Math.abs(side) * 0.015,
        0.328, 0.025, 0.086, 0.017);
      mark.rotation.z = -side * 0.15;
    }
  }
  if (type === 'mimo') makeConductorHat(kit, form);
  kit.bake(form);
  return eyes;
}

function makeConductorHat(kit, head) {
  const hat = pivot(head, 0, 0.535, 0.03);
  hat.rotation.z = -0.10;
  kit.cylinder(hat, 0x37597e, 0, 0.036, 0, 0.45, 0.21, 0.355, 0.87);
  kit.cylinder(hat, 0x486cb3, 0, 0.15, -0.012, 0.47, 0.13, 0.37);
  kit.ball(hat, 0x334a71, 0, -0.045, 0.265, 0.378, 0.07, 0.23);
  kit.box(hat, 0xffcc73, 0, 0.028, 0.335, 0.48, 0.072, 0.049);
  kit.disc(hat, 0xfbd57b, 0, 0.143, 0.355, 0.10, 0.10, 0.072);
  const star = kit.relief(hat, 0xe78b4c, starPoints(0.061), 0.029, 0.008);
  star.position.set(0, 0.144, 0.39);
}

export function makeAnimal(kit, type) {
  const coat = COATS[type];
  const root = new THREE.Group();
  const rig = pivot(root, 0, 0, 0);
  const body = pivot(rig, 0, 0, 0);
  const head = pivot(rig, 0, type === 'frog' ? 1.37 : 1.48, 0.048);
  const arms = [];
  const tail = pivot(rig, 0, 0.38, -0.28);

  kit.ball(body, type === 'panda' ? coat.shade : coat.fur, 0, 0.64, 0, 0.472, 0.525, 0.388);
  kit.ball(body, coat.cream, 0, 0.595, 0.274, 0.329, 0.377, 0.176);
  for (const side of [-1, 1]) {
    const darkPaw = type === 'panda' || type === 'fox';
    const foot = kit.ball(body, darkPaw ? coat.shade : coat.fur, side * 0.256,
      0.155, 0.217, type === 'frog' ? 0.252 : 0.202, 0.145, 0.266);
    foot.rotation.y = side * 0.15;
    kit.ball(body, type === 'panda' ? 0xb19aaa : coat.cream,
      side * 0.265, 0.148, 0.413, 0.109, 0.069, 0.065);

    const arm = pivot(rig, side * 0.411, 0.798, 0.026);
    kit.ball(arm, darkPaw ? coat.shade : coat.fur, side * 0.043, -0.145, 0.017, 0.149, 0.267, 0.135);
    kit.ball(arm, darkPaw ? coat.fur : coat.cream, side * 0.049, -0.315, 0.056, 0.089, 0.09, 0.088);
    kit.bake(arm);
    arms.push(arm);
  }

  if (type === 'fox') {
    const brush = kit.ball(tail, coat.fur, 0.44, 0.14, -0.13, 0.49, 0.245, 0.22);
    brush.rotation.z = 0.58;
    const tip = kit.ball(tail, coat.cream, 0.75, 0.35, -0.128, 0.24, 0.19, 0.196);
    tip.rotation.z = 0.58;
  } else if (type === 'cat') {
    kit.tube(tail, coat.fur, [[0, 0, 0], [-0.24, 0.05, -0.11], [-0.55, 0.27, -0.18],
      [-0.61, 0.57, -0.20], [-0.52, 0.71, -0.18]], 0.108);
    kit.ball(tail, coat.shade, -0.52, 0.71, -0.18, 0.104, 0.11, 0.106);
  } else {
    kit.ball(tail, coat.cream, 0, 0.07, -0.10, 0.19, 0.17, 0.17);
  }

  if (type === 'mimo') {
    kit.ball(body, 0x578a8b, 0, 0.59, 0.27, 0.341, 0.378, 0.177);
    kit.ball(body, 0xed806e, 0, 0.961, 0.25, 0.404, 0.099, 0.245);
    const scarf = kit.relief(body, 0xe87466, [[-0.17, 0.08], [0.16, 0.08], [0, -0.22]], 0.05);
    scarf.position.set(0.06, 0.881, 0.43);
    kit.disc(body, 0xfbc96f, -0.152, 0.551, 0.423, 0.054, 0.054);
    kit.disc(body, 0xfbc96f, -0.152, 0.405, 0.399, 0.048, 0.048);
  }
  kit.bake(body);
  kit.bake(tail);
  const eyes = makeFace(kit, head, type, coat);

  return {
    root, rig, head, arms, tail, eyes,
    phase: Object.keys(COATS).indexOf(type) * 0.87 + 0.2,
    reaction: { type: '', start: -10 },
  };
}

export function poseAnimal(animal, time, { reduced, wave = false } = {}) {
  const { phase, reaction } = animal;
  const since = time - reaction.start;
  const count = reaction.type === 'count' && since < 0.50;
  const correct = reaction.type === 'correct' && since < 1.35;
  const wrong = reaction.type === 'wrong' && since < 0.38;
  const idle = reduced ? 0 : Math.sin(time * 2.23 + phase);
  const hop = reduced ? 0 : count
    ? 0.25 * Math.sin(Math.PI * since / 0.50)
    : correct
      ? 0.35 * Math.abs(Math.sin(Math.PI * since / 0.65)) * (1 - Math.min(1, since / 1.4))
      : 0;

  animal.rig.position.y = 0.032 * idle + hop;
  animal.rig.rotation.z = wrong && !reduced
    ? 0.12 * Math.sin(since * 24) * (1 - since / 0.38) : idle * 0.026;
  animal.head.rotation.z = idle * 0.045;
  animal.tail.rotation.y = idle * 0.26;

  const blinkTime = (time + phase * 1.13) % 4.15;
  const squint = !reduced && blinkTime < 0.15 ? Math.abs(1 - blinkTime / 0.075) : 1;
  for (const eye of animal.eyes) eye.scale.y = Math.max(squint, 0.11);

  animal.arms[0].rotation.z = -0.15 - idle * 0.05;
  animal.arms[1].rotation.z = (wave || correct) && !reduced
    ? 1.84 + Math.sin(time * 8.3 + phase) * 0.43 : 0.17 + idle * 0.07;
}
