import { Euler, Quaternion, Vector3 } from 'three';

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const ease = (value) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};
const blend = (from, to, ratio) => from + (to - from) * ratio;
const neutral = {
  x: 0, y: 0, air: 0, body: 0, head: 0, nod: 0, turn: 0, breath: 1, blink: 1,
  leftArm: 0.27, rightArm: -0.27,
  leftSwing: -0.14, rightSwing: -0.14,
  leftElbow: 0, rightElbow: 0,
  leftBend: -0.23, rightBend: -0.23,
  leftHand: 0, rightHand: 0,
  leftLeg: 0.035, rightLeg: -0.035,
  leftKnee: 0.03, rightKnee: 0.03, leftShoe: 0, rightShoe: 0,
  leftLift: 0, rightLift: 0,
};

const poseKeys = Object.keys(neutral);
const durations = {
  waveLeft: 1.65, waveRight: 1.65,
  stepLeft: 1.62, stepRight: 1.62,
  leanLeft: 1.5, leanRight: 1.5,
  clap: 0.95, happy: 1.42, encourage: 1.26,
};

export class MimoAnimator {
  constructor(mimo, reducedMotion = false) {
    this.mimo = mimo;
    this.reducedMotion = reducedMotion;
    this.applied = { ...neutral };
    this.from = { ...neutral };
    this.target = { ...neutral };
    this.time = 0;
    this.ankleOffset = new Vector3();
    this.shoeRotation = new Euler();
    this.shoeOrientation = new Quaternion();
    this.play('idle');
  }

  play(name, { duration, hold = false } = {}) {
    this.name = name in durations ? name : 'idle';
    this.duration = Number.isFinite(duration) && duration > 0 ? duration : durations[name] ?? 1;
    this.hold = hold;
    this.elapsed = 0;
    Object.assign(this.from, this.applied);
  }

  update(delta, pulse = 0) {
    this.elapsed += delta;
    this.time += delta;
    const t = this.elapsed / this.duration;
    const pose = this.target;
    const motion = this.reducedMotion ? 0.28 : 1;
    const cycle = Math.sin(this.time * 3.2);
    const slow = Math.sin(this.time * 1.7);
    const blinkPhase = (this.time + 1.4) % 4.45;
    Object.assign(pose, neutral);
    pose.breath += slow * 0.019 * motion;
    pose.y = (-Math.abs(cycle) * 0.016 - pulse * 0.014) * motion;
    pose.nod = slow * 0.027 * motion;
    pose.turn = cycle * 0.023 * motion;
    pose.leftArm += slow * 0.024 * motion;
    pose.rightArm += slow * 0.024 * motion;
    pose.blink = 1 - Math.max(0, 1 - Math.abs(blinkPhase - 4.22) / 0.082) * 0.92;

    const group = this.name.replace(/(?:Left|Right)$/, '');
    const side = this.name.endsWith('Left') ? 'left' : 'right';
    const other = side === 'left' ? 'right' : 'left';
    const sign = side === 'left' ? 1 : -1;
    const exit = this.hold ? 1 : 1 - ease((t - 0.74) / 0.26);
    const amount = ease(t / 0.28) * exit;

    switch (group) {
      case 'wave': {
        const wiggleTime = Math.min(1, t);
        const wiggle = Math.sin(wiggleTime * Math.PI * 7) * 0.22 * motion;
        pose[`${side}Arm`] += sign * 1.78 * amount;
        pose[`${side}Elbow`] = sign * (0.50 + wiggle) * amount;
        pose[`${side}Swing`] -= 0.16 * amount;
        pose[`${side}Hand`] = sign * wiggle * amount;
        pose.body = -sign * 0.1 * amount;
        pose.head = -sign * 0.13 * amount;
        pose.turn = sign * 0.135 * amount;
        break;
      }
      case 'step': {
        const reach = ease(t / 0.24);
        const transfer = ease((t - 0.15) / 0.43);
        const lift = Math.sin(Math.PI * clamp(t / 0.48)) * exit;
        const bringAlong = Math.sin(Math.PI * clamp((t - 0.32) / 0.34)) * exit;
        pose.x = sign * 0.9 * transfer * exit;
        pose.y += (0.075 * lift + 0.06 * bringAlong) * motion;
        pose.body = -sign * 0.15 * reach * exit;
        pose.head = sign * 0.11 * reach * exit;
        pose[`${side}Leg`] += sign * (0.71 * reach - 0.45 * transfer) * exit;
        pose[`${other}Leg`] -= sign * 0.41 * transfer * exit;
        pose[`${side}Knee`] = -0.39 * lift;
        pose[`${other}Knee`] = -0.36 * bringAlong;
        pose[`${side}Lift`] = 0.19 * lift * motion;
        pose[`${other}Lift`] = 0.135 * bringAlong * motion;
        pose[`${side}Shoe`] = lift * 0.28;
        pose[`${side}Arm`] += sign * 0.39 * reach * exit;
        pose[`${other}Arm`] -= sign * 0.24 * transfer * exit;
        break;
      }
      case 'lean':
        pose.x = sign * 0.21 * amount;
        pose.body = -sign * 0.34 * amount;
        pose.head = -sign * 0.13 * amount;
        pose.turn = sign * 0.13 * amount;
        pose[`${side}Arm`] += sign * 0.56 * amount;
        pose[`${other}Arm`] -= sign * 0.39 * amount;
        pose[`${other}Knee`] = 0.13 * amount;
        break;
      case 'clap': {
        const clap = (0.65 + Math.sin(clamp(t) * Math.PI * 4 - 0.85) * 0.35) * amount;
        pose.leftSwing = -0.14 - 0.98 * amount;
        pose.rightSwing = pose.leftSwing;
        pose.leftArm = 0.27 - 0.52 * clap;
        pose.rightArm = -pose.leftArm;
        pose.leftBend = -0.23 - 0.48 * amount;
        pose.rightBend = pose.leftBend;
        pose.leftElbow = -0.82 * clap;
        pose.rightElbow = -pose.leftElbow;
        pose.nod += clap * 0.13;
        break;
      }
      case 'happy': {
        const progress = this.hold ? t % 1 : clamp(t);
        const jump = Math.max(0, Math.sin(progress * Math.PI * 2)) * (this.hold ? 1 : exit);
        const otherJump = Math.max(0, Math.sin((progress - 0.49) * Math.PI * 2));
        const spread = this.hold ? 0.65 + jump * 0.35 : amount;
        pose.y = (jump * 0.69 + otherJump * 0.12) * motion;
        pose.air = pose.y;
        pose.body = Math.sin(progress * Math.PI * 2) * 0.11 * motion;
        pose.head = -pose.body * 0.73;
        pose.leftArm += 1.47 * spread;
        pose.rightArm -= 1.47 * spread;
        pose.leftElbow = 0.35 * spread;
        pose.rightElbow = -pose.leftElbow;
        pose.leftLeg += jump * 0.24;
        pose.rightLeg -= jump * 0.24;
        pose.leftKnee = jump * 0.2;
        pose.rightKnee = -jump * 0.21;
        break;
      }
      case 'encourage':
        pose.head = 0.25 * amount;
        pose.nod = Math.sin(clamp(t) * Math.PI * 3) * 0.12 * amount;
        pose.turn = -0.09 * amount;
        pose.body = -0.09 * amount;
        pose.leftArm += 0.34 * amount;
        pose.rightArm -= 0.34 * amount;
        pose.leftBend -= 0.62 * amount;
        pose.rightBend -= 0.62 * amount;
        break;
      default:
        break;
    }

    const transition = ease(this.elapsed / 0.19);
    for (const key of poseKeys) {
      this.applied[key] = blend(this.from[key], pose[key], transition);
    }
    this.apply(this.applied);
  }

  apply(pose) {
    const { root, body, torso, head, left, right, eyeGroups } = this.mimo;
    root.position.set(pose.x * Math.cos(root.rotation.y), 0.012 + pose.y, -pose.x * Math.sin(root.rotation.y));
    body.rotation.z = pose.body;
    torso.scale.y = pose.breath;
    head.rotation.set(pose.nod, pose.turn, pose.head);
    for (const eye of eyeGroups) eye.scale.y = pose.blink;
    for (const [limb, side] of [[left, 'left'], [right, 'right']]) {
      limb.upperArm.rotation.set(pose[`${side}Swing`], 0, pose[`${side}Arm`]);
      limb.forearm.rotation.set(pose[`${side}Bend`], 0, pose[`${side}Elbow`]);
      limb.paw.rotation.z = pose[`${side}Hand`];
      limb.leg.rotation.set(pose[`${side}Knee`], 0, pose[`${side}Leg`]);
      this.ankleOffset.copy(limb.foot.position).applyQuaternion(limb.leg.quaternion);
      // Keep the planted shoe level through weight shifts and bend the leg above it.
      limb.leg.position.y = 0.283 - this.ankleOffset.y - pose.y + pose.air + pose[`${side}Lift`];
      this.shoeRotation.set(pose[`${side}Shoe`], 0, 0);
      this.shoeOrientation.setFromEuler(this.shoeRotation);
      limb.foot.quaternion.copy(limb.leg.quaternion).invert().multiply(this.shoeOrientation);
    }
  }
}
