import assert from 'node:assert/strict';
import test from 'node:test';
import { Group, Vector3 } from 'three';
import { makeMimo } from '../src/scene/Mimo.js';
import { MimoAnimator } from '../src/scene/MimoAnimator.js';

function rearFacingMimo() {
  const mimo = makeMimo(new Group());
  mimo.root.rotation.y = Math.PI;
  return { mimo, animator: new MimoAnimator(mimo) };
}

function animate(animator, name, elapsed) {
  animator.play(name, { duration: 1.8, hold: true });
  for (let frame = 0; frame < Math.ceil(elapsed * 60); frame++) animator.update(1 / 60);
}

const worldPosition = part => part.getWorldPosition(new Vector3());

test('Mimo raises the anatomical arm on the matching screen side', () => {
  for (const [name, side, other, sign] of [
    ['waveLeft', 'left', 'right', -1],
    ['waveRight', 'right', 'left', 1],
  ]) {
    const { mimo, animator } = rearFacingMimo();
    animate(animator, name, 2);
    const lifted = worldPosition(mimo[side].paw);
    const down = worldPosition(mimo[other].paw);
    assert.ok(lifted.x * sign > 0.5);
    assert.ok(lifted.y > down.y + 0.6);
  }
});

test('lateral steps and leans move toward their matching screen side', () => {
  for (const [suffix, sign] of [['Left', -1], ['Right', 1]]) {
    const { mimo, animator } = rearFacingMimo();
    animate(animator, 'step' + suffix, 2);
    assert.ok(worldPosition(mimo.root).x * sign > 0.7);
    animate(animator, 'lean' + suffix, 1.2);
    assert.ok(worldPosition(mimo.head).x * sign > 0.55);
  }
});
