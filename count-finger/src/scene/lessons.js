import * as THREE from 'three';
import { block, ellipsoid, makeSprite, plastic, textTexture } from './shapes.js';

const ramp = new THREE.BoxGeometry(0.68, 0.20, 0.64);
const tileSize = 0.73;

function cylinder(parent, material, radius, height, x, y, z, radiusBottom = radius) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radiusBottom, height, 24), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

export function createNumberLine(star, starMaterial) {
  const group = new THREE.Group();
  group.name = 'Đường số';
  group.position.set(0, 0.01, 1.63);
  const trackMaterial = plastic('#d2b5f1');
  const lowerColors = ['#b79ce8', '#87c2ae', '#dbac6d'];
  const bases = lowerColors.map((color) => plastic(color));
  const tops = ['#ecdfff', '#c8f0df', '#ffe8a6'].map((color) => plastic(color));
  const selectedBase = plastic('#c99537');
  const selectedTop = plastic('#ffda76', 0.43);
  const track = block(group, trackMaterial, 8.00, 0.07, 0.16, 0.035, 0, -0.095, 0);
  const stepGeometry = new THREE.CylinderGeometry(0.29, 0.315, 0.21, 24);
  const plateGeometry = new THREE.CylinderGeometry(0.275, 0.29, 0.048, 24);

  const tiles = Array.from({ length: 11 }, (_, n) => {
    const tile = new THREE.Group();
    tile.position.x = (n - 5) * tileSize;
    const materialIndex = n % bases.length;
    const base = new THREE.Mesh(stepGeometry, bases[materialIndex]);
    tile.add(base);
    const plate = new THREE.Mesh(plateGeometry, tops[materialIndex]);
    plate.position.y = 0.12;
    tile.add(plate);
    const number = makeSprite(textTexture(n, { textColor: '#4b365d' }), 0.58);
    number.position.set(0, 0.29, 0.16);
    tile.add(number);
    group.add(tile);
    return { tile, base, plate, materialIndex };
  });

  const cursor = new THREE.Mesh(star, starMaterial);
  cursor.scale.setScalar(0.27);
  cursor.position.set(0, 0.67, 0.09);
  group.add(cursor);
  let active = -1;
  let pending = 0;
  let startX = 0;
  let startY = 0.67;
  let movedAt = 0;

  function reset() {
    active = -1;
  }

  function animate(time, state, reducedMotion) {
    group.visible = state.screen === 'play' && state.showLine;
    if (!group.visible) return;
    const current = state.lineValue;
    const targetX = (current - 5) * tileSize;
    const stair = state.level === 3;
    const previous = active;
    const targetY = 0.65 + (stair ? current * 0.053 : 0);
    if (active !== current) {
      pending = current;
      startX = previous < 0 ? targetX : cursor.position.x;
      startY = previous < 0 ? targetY : cursor.position.y;
      movedAt = previous < 0 ? -1 : time;
      active = current;
      for (const [index, tile] of tiles.entries()) {
        const selected = index === current;
        tile.base.material = selected ? selectedBase : bases[tile.materialIndex];
        tile.plate.material = selected ? selectedTop : tops[tile.materialIndex];
      }
    }

    for (const [index, { tile }] of tiles.entries()) {
      tile.position.y = stair ? index * 0.053 : 0;
    }
    track.visible = !stair;
    const move = reducedMotion ? 1 : Math.min(1, Math.max(0, (time - movedAt) / 0.28));
    cursor.position.x = THREE.MathUtils.lerp(startX, (pending - 5) * tileSize, move);
    cursor.position.y = THREE.MathUtils.lerp(startY, targetY, move) +
      (reducedMotion ? 0 : 0.17 * Math.sin(move * Math.PI) + 0.054 * Math.sin(time * 4.3));
    cursor.rotation.y = reducedMotion ? 0 : 0.22 * Math.sin(time * 3.4);
    cursor.rotation.z = -0.09;
  }

  function dispose() {
    for (const material of [...bases, ...tops, selectedBase, selectedTop]) material.dispose();
  }

  return { group, animate, reset, dispose };
}

export function createMilestone(star, starMaterial) {
  const group = new THREE.Group();
  group.name = 'Phần thưởng của màn chơi';
  const bridge = new THREE.Group();
  const stair = new THREE.Group();
  const castle = new THREE.Group();
  group.add(bridge, stair, castle);

  const stone = plastic('#b6a1e5');
  const lavender = plastic('#9c84e7');
  const mint = plastic('#8ecfbf');
  const coral = plastic('#eea6be');
  const pale = plastic('#e8d9ff');
  const golden = plastic('#ffd286');

  ellipsoid(bridge, plastic('#a0d7f1'), 0, -0.014, 0, 1.41, 0.07, 0.83);
  ellipsoid(bridge, plastic('#b8eff9'), 0.13, 0.02, 0.10, 1.13, 0.041, 0.63);
  const sections = Array.from({ length: 8 }, (_, index) => {
    const section = new THREE.Group();
    const x = (index - 3.5) * 0.217;
    const height = 0.16 + 0.28 * Math.sin(index * Math.PI / 7);
    section.position.set(x, height, 0);
    const board = new THREE.Mesh(ramp, index % 2 === 0 ? golden : pale);
    board.scale.set(0.34, 0.63, 1.15);
    board.rotation.z = 0.25 * Math.cos(index * Math.PI / 7);
    section.add(board);
    for (const z of [-0.33, 0.33]) {
      ellipsoid(section, lavender, 0, 0.12, z, 0.054, 0.16, 0.055);
    }
    bridge.add(section);
    return section;
  });
  for (const side of [-1, 1]) {
    ellipsoid(bridge, mint, side * 1.07, 0.05, 0, 0.34, 0.11, 0.55);
  }

  const stairs = Array.from({ length: 11 }, (_, index) => {
    const step = new THREE.Group();
    const height = 0.14 + 0.091 * index;
    block(step, stone, 0.19, height, 0.61, 0.038, 0, height / 2, 0);
    block(step, index % 2 === 0 ? pale : mint, 0.205, 0.065, 0.64, 0.027, 0, height, 0);
    step.position.x = (index - 5) * 0.192;
    stair.add(step);
    return step;
  });
  const stairStar = new THREE.Mesh(star, starMaterial);
  stairStar.scale.setScalar(0.15);
  stair.add(stairStar);
  let lastStep = null;
  const stepStart = new THREE.Vector3();
  let stepTime = -10;

  block(castle, pale, 2.13, 0.16, 1.02, 0.07, 0, 0.05, 0);
  const castleBody = block(castle, lavender, 1.08, 0.97, 0.78, 0.16, 0, 0.55, -0.08);
  const doorBottom = block(castle, stone, 0.36, 0.35, 0.11, 0.04, 0, 0.25, 0.326);
  const doorTop = ellipsoid(castle, stone, 0, 0.42, 0.326, 0.18, 0.18, 0.055);
  const flag = new THREE.Group();
  cylinder(flag, golden, 0.028, 0.48, 0, 1.40, -0.05);
  const flagStar = new THREE.Mesh(star, starMaterial);
  flagStar.scale.setScalar(0.21);
  flagStar.position.set(0.035, 1.71, -0.05);
  flag.add(flagStar);
  castle.add(flag);
  const turrets = [-1, 1].map((side) => {
    const turret = new THREE.Group();
    const x = side * 0.68;
    cylinder(turret, pale, 0.28, 0.99, x, 0.56, 0.14);
    cylinder(turret, coral, 0.05, 0.50, x, 1.23, 0.14, 0.36);
    ellipsoid(turret, golden, x, 1.495, 0.14, 0.076, 0.08, 0.076);
    block(turret, stone, 0.14, 0.23, 0.06, 0.058, x, 0.70, 0.397);
    castle.add(turret);
    return turret;
  });

  function animate(time, state, reducedMotion) {
    const menu = state.screen === 'menu' || state.screen === 'levels';
    bridge.visible = !menu && state.level === 2;
    stair.visible = !menu && state.level === 3;
    castle.visible = menu || state.level === 4;
    if (bridge.visible) {
      for (const [index, section] of sections.entries()) {
        section.visible = index < Math.round(state.progress * sections.length);
      }
    }
    if (stair.visible) {
      const { lineValue, questionId } = state;
      const targetX = stairs[lineValue].position.x;
      const targetY = 0.36 + lineValue * 0.091;
      if (!lastStep || lastStep.questionId !== questionId) {
        stepStart.set(targetX, targetY, 0.11);
        stepTime = -10;
      } else if (lastStep.value !== lineValue) {
        stepStart.copy(stairStar.position);
        stepTime = time;
      }
      lastStep = { questionId, value: lineValue };
      const move = reducedMotion ? 1 : Math.min(1, (time - stepTime) / 0.24);
      const hop = reducedMotion ? 0 : 0.13 * Math.sin(move * Math.PI);
      stairStar.position.set(THREE.MathUtils.lerp(stepStart.x, targetX, move),
        THREE.MathUtils.lerp(stepStart.y, targetY, move) + hop, 0.11);
    } else {
      lastStep = null;
    }
    if (castle.visible) {
      castleBody.visible = doorBottom.visible = doorTop.visible = menu || state.progress >= 0.2;
      turrets[0].visible = menu || state.progress >= 0.45;
      turrets[1].visible = menu || state.progress >= 0.70;
      flag.visible = menu || state.progress >= 1;
      flagStar.rotation.y = reducedMotion ? 0 : 0.30 * Math.sin(time * 2);
    }
  }

  return { group, animate };
}
