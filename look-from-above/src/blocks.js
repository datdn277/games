import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { getColumns } from './projection.js';

export const CUBE_SIZE = .958;
const COLORS = { WHITE: 0xfff1db, DARK: 0x4f5b86 };
const SIZE_HALF = CUBE_SIZE / 2;
const centerY = (level) => level + .485;

function colorFor(value) {
  return COLORS[value] ?? COLORS.WHITE;
}

function softShadow() {
  const size = 32;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const distance = Math.hypot((x + .5) / 16 - 1, (y + .5) / 16 - 1);
      pixels[offset] = 142;
      pixels[offset + 1] = 105;
      pixels[offset + 2] = 92;
      pixels[offset + 3] = Math.round(Math.max(0, 1 - distance) ** 1.52 * 130);
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function frontLabel() {
  const surface = document.createElement('canvas');
  surface.width = 320;
  surface.height = 84;
  const pen = surface.getContext('2d');
  pen.fillStyle = '#547e7b';
  pen.beginPath();
  pen.roundRect(7, 8, 306, 66, 26);
  pen.fill();
  pen.fillStyle = '#f5ffe9';
  pen.textAlign = 'center';
  pen.textBaseline = 'middle';
  pen.font = '900 30px system-ui, sans-serif';
  pen.fillText('PHÍA TRƯỚC', 143, 45);
  pen.beginPath();
  pen.moveTo(259, 32);
  pen.lineTo(283, 32);
  pen.lineTo(271, 54);
  pen.closePath();
  pen.fill();
  const texture = new THREE.CanvasTexture(surface);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function squareMarker() {
  // A real polygon border stays legible on mobile, where WebGL line widths are fixed.
  const shape = new THREE.Shape();
  shape.moveTo(-.462, -.462).lineTo(.462, -.462).lineTo(.462, .462).lineTo(-.462, .462).lineTo(-.462, -.462);
  const inside = new THREE.Path();
  inside.moveTo(-.415, -.415).lineTo(-.415, .415).lineTo(.415, .415).lineTo(.415, -.415).lineTo(-.415, -.415);
  shape.holes.push(inside);
  return new THREE.ShapeGeometry(shape);
}

function normalForFace(face) {
  if (face === 'top') return [0, 1, 0];
  if (face === 'front') return [0, 0, 1];
  return [1, 0, 0];
}

function toneGeometry(base, top, side) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', base.getAttribute('position'));
  geometry.setAttribute('normal', base.getAttribute('normal'));
  geometry.setAttribute('uv', base.getAttribute('uv'));
  if (base.index) geometry.setIndex(base.index);
  const colors = new Float32Array(base.getAttribute('position').count * 3);
  const source = new THREE.Color();
  const shades = [.84, .91, 1, .64, .92, .77];
  for (const group of base.groups) {
    const face = group.materialIndex;
    source.setHex(colorFor(face === 2 ? top : side)).multiplyScalar(shades[face]);
    for (let vertex = group.start; vertex < group.start + group.count; vertex += 1) {
      colors.set([source.r, source.g, source.b], vertex * 3);
    }
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

export function createBlocks() {
  const group = new THREE.Group();
  const baseGeometry = new RoundedBoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE, 2, .072);
  const toneVariants = new Map();
  const solid = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .56 });
  const ghost = new THREE.MeshStandardMaterial({
    vertexColors: true, transparent: true, opacity: .32, depthWrite: false, roughness: .7,
  });
  const boardMaterial = new THREE.MeshStandardMaterial({ color: 0xf2cc9d, roughness: .73 });
  const boardTeaching = new THREE.MeshStandardMaterial({ color: 0xc1d7e3, roughness: .78 });
  const boardGeometry = new RoundedBoxGeometry(1, .205, 1, 1, .054);
  const board = new THREE.Mesh(boardGeometry, boardMaterial);
  group.add(board);
  const rim = new THREE.Mesh(boardGeometry, boardTeaching);
  group.add(rim);
  const grid = new THREE.Group();
  group.add(grid);
  const marker = new THREE.Mesh(new THREE.PlaneGeometry(1.68, .44), new THREE.MeshBasicMaterial({
    map: frontLabel(), transparent: true, depthWrite: false, toneMapped: false,
  }));
  marker.rotation.x = -Math.PI / 2;
  group.add(marker);
  const tileGeo = new THREE.PlaneGeometry(.966, .966);
  const tileMaterial = new THREE.MeshStandardMaterial({ color: 0xcde2ed, roughness: .92 });
  const tileOddMaterial = new THREE.MeshStandardMaterial({ color: 0xbed7e4, roughness: .92 });
  const shadowGeo = new THREE.PlaneGeometry(1.34, 1.31);
  const shadowMaterial = new THREE.MeshBasicMaterial({ map: softShadow(), transparent: true, depthWrite: false });
  const glowGeometry = squareMarker();
  const gold = new THREE.MeshBasicMaterial({ color: 0xffd55f, transparent: true, opacity: .97, toneMapped: false });
  const turquoise = new THREE.MeshBasicMaterial({ color: 0x37bda3, transparent: true, opacity: .88, toneMapped: false });
  const lilac = new THREE.MeshBasicMaterial({ color: 0xec9ff2, transparent: true, opacity: .99, toneMapped: false });
  const edgesGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(CUBE_SIZE + .013, CUBE_SIZE + .013, CUBE_SIZE + .013));
  const ghostEdgeMaterial = new THREE.LineBasicMaterial({ color: 0xb88eca, transparent: true, opacity: .84, depthWrite: false });
  const selection = new THREE.Mesh(glowGeometry, gold);
  selection.visible = false;
  group.add(selection);
  const cellMarker = new THREE.Mesh(glowGeometry, turquoise);
  cellMarker.rotation.x = -Math.PI / 2;
  cellMarker.visible = false;
  group.add(cellMarker);

  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const ray = new THREE.Raycaster();
  const rayPointer = new THREE.Vector2();
  const floorPoint = new THREE.Vector3();
  const normalVector = new THREE.Vector3();
  const forward = new THREE.Vector3(0, 0, 1);
  const records = new Map();
  const shadows = new Map();
  let cubeMeshes = [];
  let columns = [];
  let bounds;
  let highlighted = {};
  let xray = false;
  let inspection = null;
  let hitAxis = null;

  function materialGeometry(cube) {
    const key = `${cube.topColor}:${cube.sideColor}`;
    if (!toneVariants.has(key)) toneVariants.set(key, toneGeometry(baseGeometry, cube.topColor, cube.sideColor));
    return toneVariants.get(key);
  }

  function clearGrid() {
    for (const child of [...grid.children]) child.removeFromParent();
  }

  function setBounds(next) {
    if (bounds && Object.keys(next).every((key) => bounds[key] === next[key])) return;
    bounds = { ...next };
    const { minX, maxX, minZ, maxZ } = bounds;
    const width = maxX - minX + 1;
    const depth = maxZ - minZ + 1;
    const middleX = (minX + maxX) / 2;
    const middleZ = (minZ + maxZ) / 2;
    board.scale.set(width + .39, 1, depth + .66);
    board.position.set(middleX, -.158, middleZ + .105);
    rim.scale.set(width + .19, .44, depth + .49);
    rim.position.set(middleX, -.050, middleZ + .105);
    marker.position.set(middleX, -.001, maxZ + .592);
    clearGrid();
    for (let z = minZ; z <= maxZ; z += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const tile = new THREE.Mesh(tileGeo, (x - minX + z - minZ) % 2 === 0 ? tileMaterial : tileOddMaterial);
        tile.rotation.x = -Math.PI / 2;
        tile.position.set(x, -.002, z);
        grid.add(tile);
      }
    }
  }

  function makeRecord(cube) {
    const mesh = new THREE.Mesh(materialGeometry(cube), solid);
    mesh.userData.id = cube.id;
    const topOutline = new THREE.Mesh(glowGeometry, turquoise);
    topOutline.rotation.x = -Math.PI / 2;
    topOutline.visible = false;
    mesh.add(topOutline);
    topOutline.position.y = SIZE_HALF + .006;
    const ghostEdges = new THREE.LineSegments(edgesGeo, ghostEdgeMaterial);
    ghostEdges.visible = false;
    mesh.add(ghostEdges);
    group.add(mesh);
    return { mesh, topOutline, ghostEdges, cube };
  }

  function setSelection() {
    const active = records.get(highlighted.id);
    selection.visible = Boolean(active);
    if (active) {
      const face = highlighted.face ?? 'top';
      const [x, y, z] = hitAxis?.id === active.cube.id && hitAxis.face === face
        ? hitAxis.normal : normalForFace(face);
      normalVector.set(x, y, z);
      selection.quaternion.setFromUnitVectors(forward, normalVector);
      selection.position.copy(active.mesh.position).addScaledVector(normalVector, SIZE_HALF + .018);
    }
    cellMarker.visible = Boolean(highlighted.cell);
    if (highlighted.cell) {
      cellMarker.position.set(highlighted.cell.x, .008, highlighted.cell.z);
    }
  }

  function applyHighlights() {
    for (const { x, z, visible, hidden } of columns) {
      const inspect = xray && hidden.length > 0 && (!inspection || (inspection.x === x && inspection.z === z));
      const bottom = hidden.reduce((lowest, cube) => !lowest || cube.y < lowest.y ? cube : lowest, null);
      for (const cube of [visible, ...hidden]) {
        const record = records.get(cube.id);
        const transparent = inspect && cube !== bottom;
        record.mesh.material = transparent ? ghost : solid;
        record.ghostEdges.visible = transparent;
        record.topOutline.visible = inspect && cube === bottom ||
          highlighted.visibleTops && cube === visible ||
          highlighted.hidden && cube !== visible;
        record.topOutline.material = inspect && cube === bottom || cube !== visible ? lilac : turquoise;
      }
    }
    setSelection();
  }

  return {
    group,
    setBoard(cubes, nextBounds) {
      setBounds(nextBounds);
      const incoming = new Set(cubes.map(({ id }) => id));
      for (const [id, record] of records) {
        if (incoming.has(id)) continue;
        record.mesh.removeFromParent();
        records.delete(id);
      }
      for (const cube of cubes) {
        let record = records.get(cube.id);
        if (!record) {
          record = makeRecord(cube);
          records.set(cube.id, record);
        }
        record.cube = cube;
        record.mesh.position.set(cube.x, centerY(cube.y), cube.z);
        record.mesh.geometry = materialGeometry(cube);
      }
      cubeMeshes = [...records.values()].map(({ mesh }) => mesh);
      columns = getColumns(cubes);
      const keep = new Set();
      for (const { x, z } of columns) {
        const key = `${x}:${z}`;
        keep.add(key);
        if (!shadows.has(key)) {
          const shadow = new THREE.Mesh(shadowGeo, shadowMaterial);
          shadow.rotation.x = -Math.PI / 2;
          shadow.position.set(x + .023, .003, z + .073);
          shadows.set(key, shadow);
          group.add(shadow);
        }
      }
      for (const [key, shadow] of shadows) {
        if (keep.has(key)) continue;
        shadow.removeFromParent();
        shadows.delete(key);
      }
      applyHighlights();
    },
    setHighlights(options) {
      highlighted = options;
      applyHighlights();
    },
    setXRay(enabled, column) {
      xray = Boolean(enabled);
      inspection = column;
      applyHighlights();
    },
    setGrid(enabled) { grid.visible = Boolean(enabled); },
    hit(clientX, clientY, canvas, camera) {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      const x = (clientX - rect.x) / rect.width;
      const y = (clientY - rect.y) / rect.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) return null;
      rayPointer.set(x * 2 - 1, 1 - y * 2);
      group.updateMatrixWorld();
      ray.setFromCamera(rayPointer, camera);
      const hit = ray.intersectObjects(cubeMeshes, false)[0];
      if (hit) {
        const { cube } = records.get(hit.object.userData.id);
        const normal = hit.face.normal;
        const nx = Math.abs(normal.x);
        const ny = Math.abs(normal.y);
        const nz = Math.abs(normal.z);
        const isTop = camera.position.y > 15 && Math.abs(camera.up.y) < .001 || normal.y > Math.max(nx, nz);
        const face = isTop ? 'top' : normal.z > nx ? 'front' : 'side';
        const axis = isTop ? [0, 1, 0] : nz > nx ? [0, 0, Math.sign(normal.z)] : [Math.sign(normal.x) || 1, 0, 0];
        hitAxis = { id: cube.id, face, normal: axis };
        return { id: cube.id, face, x: cube.x, y: cube.y, z: cube.z };
      }
      if (!bounds || !ray.ray.intersectPlane(floor, floorPoint)) return null;
      const cellX = Math.round(floorPoint.x);
      const cellZ = Math.round(floorPoint.z);
      if (cellX < bounds.minX || cellX > bounds.maxX || cellZ < bounds.minZ || cellZ > bounds.maxZ) return null;
      return { id: null, face: 'grid', x: cellX, y: 0, z: cellZ };
    },
    dispose() {
      for (const geometry of toneVariants.values()) geometry.dispose();
      for (const geometry of [baseGeometry, boardGeometry, tileGeo, shadowGeo, glowGeometry, edgesGeo, marker.geometry]) geometry.dispose();
      for (const material of [solid, ghost, boardMaterial, boardTeaching, tileMaterial, tileOddMaterial, shadowMaterial, gold, turquoise, lilac, ghostEdgeMaterial, marker.material]) material.dispose();
      marker.material.map.dispose();
      shadowMaterial.map.dispose();
    },
  };
}
