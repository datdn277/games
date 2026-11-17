import { OrthographicCamera, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createCameraRig } from '../src/camera.js';

function makeCamera(width = 950, height = 520) {
  const camera = new OrthographicCamera();
  const rig = createCameraRig(camera);
  rig.setLayout([{ minX: -2, maxX: 2, minY: 0, maxY: 3, minZ: -1, maxZ: 2 }], false);
  rig.resize(width, height);
  const screen = (x = 0, y = 0, z = 0) => new Vector3(x, y, z).project(camera);
  return { rig, screen };
}

describe('orthographic exploration camera', () => {
  it.each([[950, 520], [375, 610]])('holds +X right and −Z up at %i × %i', (width, height) => {
    const { rig, screen } = makeCamera(width, height);
    rig.setView('top', { immediate: true });
    expect(screen(1).x).toBeGreaterThan(screen().x);
    expect(screen(0, 0, -1).y).toBeGreaterThan(screen().y);
    expect(screen(1, 2, -1).x).toBeCloseTo(screen(1, 0, -1).x);
    expect(screen(1, 2, -1).y).toBeCloseTo(screen(1, 0, -1).y);
  });

  it('supports intermediate slider poses and keeps the same top orientation after orbiting', () => {
    const { rig, screen } = makeCamera();
    rig.orbit(Math.PI);
    rig.setElevation(.5);
    expect(rig.elevation()).toBeCloseTo(.5);
    rig.setElevation(1);
    expect(screen(1).x).toBeGreaterThan(screen().x);
    expect(screen(0, 0, -1).y).toBeGreaterThan(screen().y);
    rig.setElevation(0);
    expect(rig.elevation()).toBeCloseTo(0);
  });

  it('only completes the most recent transition when the scene changes its target', () => {
    const { rig } = makeCamera();
    const stale = vi.fn();
    const complete = vi.fn();
    rig.setView('top', { onDone: stale });
    rig.step(.2);
    expect(rig.isTransitioning()).toBe(true);
    rig.setView('front', { onDone: complete });
    for (let frame = 0; frame < 15; frame += 1) rig.step(.1);
    expect(stale).not.toHaveBeenCalled();
    expect(complete).toHaveBeenCalledTimes(1);
    expect(rig.isTransitioning()).toBe(false);
    expect(rig.getPose().mode).toBe('front');
  });
});
