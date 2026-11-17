import { afterEach, expect, it, vi } from 'vitest';
import { createBlocks } from '../src/blocks.js';
import { COLORS, getTopView } from '../src/projection.js';

afterEach(() => vi.unstubAllGlobals());

it('restores the original Three.js cube materials when X-ray is switched off', () => {
  const brush = Object.fromEntries(
    ['beginPath', 'roundRect', 'fill', 'fillText', 'moveTo', 'lineTo', 'closePath'].map((name) => [name, () => {}]),
  );
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => brush }) });

  const cubes = [
    { id: 'lower', x: 0, y: 0, z: 0, topColor: COLORS.WHITE },
    { id: 'upper', x: 0, y: 1, z: 0, topColor: COLORS.DARK },
    { id: 'other', x: 1, y: 0, z: 0, topColor: COLORS.DARK },
  ];
  const bounds = { minX: 0, maxX: 1, minZ: 0, maxZ: 0 };
  const initial = structuredClone(cubes);
  const blocks = createBlocks();
  try {
    blocks.setBoard(cubes, bounds);
    const mesh = (id) => blocks.group.children.find((child) => child.userData.id === id);
    const original = mesh('upper').material;
    const coordinates = mesh('upper').position.clone();

    blocks.setXRay(true, { x: 0, z: 0 });
    expect(mesh('upper').material.transparent).toBe(true);
    expect(mesh('upper').material.opacity).toBeLessThan(1);
    expect(mesh('lower').material.transparent).toBe(false);
    expect(mesh('other').material.transparent).toBe(false);
    expect(getTopView(cubes, bounds)).toEqual([[COLORS.DARK, COLORS.DARK]]);

    blocks.setXRay(false);
    expect(mesh('upper').material).toBe(original);
    expect(mesh('upper').position.equals(coordinates)).toBe(true);
    expect(cubes).toEqual(initial);
  } finally {
    blocks.dispose();
  }
});
