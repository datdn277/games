import { MathUtils, Matrix4, Vector3 } from 'three';

const TAU = Math.PI * 2;
const RIGHT_ANGLE = Math.PI / 2;
const isoPitch = MathUtils.degToRad(37);
const isoAzimuth = MathUtils.degToRad(32);
const presets = {
  isometric: { pitch: isoPitch, azimuth: isoAzimuth },
  front: { pitch: 0, azimuth: 0 },
  left: { pitch: 0, azimuth: -RIGHT_ANGLE },
  right: { pitch: 0, azimuth: RIGHT_ANGLE },
  top: { pitch: RIGHT_ANGLE, azimuth: 0 },
  orbit: { pitch: isoPitch, azimuth: isoAzimuth },
};

export function elevationForPitch(pitch) {
  return MathUtils.clamp((pitch - isoPitch) / (RIGHT_ANGLE - isoPitch), 0, 1);
}

function signedAngle(angle) {
  return ((angle + Math.PI) % TAU + TAU) % TAU - Math.PI;
}

function normalizeView(value) {
  return typeof value === 'string' ? value.toLowerCase().replace(/_view$/, '').replace('free_orbit', 'orbit') : '';
}

const easing = (fraction) => fraction * fraction * (3 - 2 * fraction);

export function createCameraRig(camera, { reducedMotion = false } = {}) {
  const right = new Vector3();
  const back = new Vector3();
  const up = new Vector3();
  const basis = new Matrix4();
  const target = new Vector3();
  const pose = { mode: 'isometric', ...presets.isometric, zoom: 1 };
  let width = 1;
  let height = 1;
  let extents = [];
  let menu = false;
  let motion = null;
  let sliderHeading = isoAzimuth;
  let fromSlider = false;

  function apply() {
    const y = Math.sin(pose.pitch);
    const horizontal = Math.cos(pose.pitch);
    const sin = Math.sin(pose.azimuth);
    const cos = Math.cos(pose.azimuth);
    right.set(cos, 0, -sin);
    back.set(horizontal * sin, y, horizontal * cos);
    up.crossVectors(back, right);
    basis.makeBasis(right, up, back);
    camera.quaternion.setFromRotationMatrix(basis);
    camera.up.copy(up);

    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;
    for (const { minX, maxX, minY, maxY, minZ, maxZ } of extents) {
      for (const x of [minX, maxX]) {
        for (const z of [minZ, maxZ]) {
          const u = right.x * x + right.z * z;
          const level = up.x * x + up.z * z;
          minU = Math.min(minU, u);
          maxU = Math.max(maxU, u);
          minV = Math.min(minV, level + up.y * minY);
          maxV = Math.max(maxV, level + up.y * maxY);
        }
      }
    }
    const centerU = extents.length ? (minU + maxU) / 2 : 0;
    const centerV = extents.length ? (minV + maxV) / 2 : 0;
    target.copy(right).multiplyScalar(centerU).addScaledVector(up, centerV);
    camera.position.copy(target).addScaledVector(back, 18);
    const aspect = width / height;
    const frameWidth = Math.max(menu ? 7.17 : 4.75, extents.length ? maxU - minU + 1.04 : 0);
    const frameHeight = Math.max(menu ? 4.84 : 3.55, extents.length ? maxV - minV + .94 : 0);
    const span = Math.max(frameHeight, frameWidth / aspect) / pose.zoom;
    camera.left = -span * aspect / 2;
    camera.right = span * aspect / 2;
    camera.top = span / 2;
    camera.bottom = -span / 2;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }

  return {
    setLayout(nextExtents, isMenu) {
      extents = nextExtents;
      menu = isMenu;
      apply();
    },
    resize(nextWidth, nextHeight) {
      width = nextWidth;
      height = nextHeight;
      apply();
    },
    setView(view, { immediate = false, onDone } = {}) {
      const mode = normalizeView(view);
      const goal = presets[mode];
      if (!goal) return false;
      fromSlider = false;
      pose.mode = mode;
      motion = null;
      const turn = signedAngle(goal.azimuth - pose.azimuth);
      if (immediate || reducedMotion || (Math.abs(turn) < .0001 && Math.abs(goal.pitch - pose.pitch) < .0001)) {
        Object.assign(pose, goal);
        apply();
        onDone?.();
      } else {
        motion = { fromPitch: pose.pitch, fromAzimuth: pose.azimuth, turn, goal, time: 0, onDone };
      }
      return true;
    },
    setElevation(value) {
      if (!Number.isFinite(value)) return false;
      const elevation = MathUtils.clamp(value, 0, 1);
      motion = null;
      if (!fromSlider) {
        const candidate = pose.mode === 'isometric' || pose.mode === 'orbit' ? pose.azimuth : isoAzimuth;
        sliderHeading = signedAngle(candidate);
        fromSlider = true;
      }
      pose.pitch = MathUtils.lerp(isoPitch, RIGHT_ANGLE, elevation);
      pose.azimuth = sliderHeading * (1 - easing(elevation));
      pose.mode = elevation === 1 ? 'top' : elevation === 0 ? 'isometric' : 'orbit';
      apply();
      return true;
    },
    orbit(delta, vertical = 0) {
      if (!Number.isFinite(delta) || !Number.isFinite(vertical) || motion || pose.pitch === RIGHT_ANGLE) return false;
      fromSlider = false;
      pose.mode = 'orbit';
      pose.azimuth = signedAngle(pose.azimuth + delta);
      pose.pitch = MathUtils.clamp(pose.pitch + vertical, MathUtils.degToRad(10), MathUtils.degToRad(78));
      apply();
      return true;
    },
    zoom(factor) {
      if (!Number.isFinite(factor) || factor <= 0) return;
      pose.zoom = MathUtils.clamp(pose.zoom * factor, .84, 1.48);
      apply();
    },
    resetZoom() {
      pose.zoom = 1;
      apply();
    },
    getPose() { return { ...pose, elevation: elevationForPitch(pose.pitch), transitioning: Boolean(motion) }; },
    isTransitioning() { return Boolean(motion); },
    elevation() { return elevationForPitch(pose.pitch); },
    cancelTransition() { motion = null; },
    step(delta) {
      if (!motion) return;
      motion.time += delta;
      const fraction = Math.min(1, motion.time / .86);
      if (fraction >= 1) {
        const { onDone, goal } = motion;
        motion = null;
        Object.assign(pose, goal);
        apply();
        onDone?.();
      } else {
        const amount = easing(fraction);
        pose.pitch = MathUtils.lerp(motion.fromPitch, motion.goal.pitch, amount);
        pose.azimuth = motion.fromAzimuth + motion.turn * amount;
        apply();
      }
    },
  };
}
