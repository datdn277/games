import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const sphere = new THREE.SphereGeometry(1, 24, 16);
const smallSphere = new THREE.SphereGeometry(1, 12, 8);
const box = new THREE.BoxGeometry(1, 1, 1);

export function matte(color, roughness = 0.82) {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

export function mesh(parent, geometry, material, x, y, z, casts = true) {
  const part = new THREE.Mesh(geometry, material);
  part.position.set(x, y, z);
  part.castShadow = casts;
  part.receiveShadow = true;
  parent.add(part);
  return part;
}

export function oval(parent, material, x, y, z, sx, sy, sz, casts = true) {
  const geometry = Math.max(sx, sy, sz) < 0.3 ? smallSphere : sphere;
  const part = mesh(parent, geometry, material, x, y, z, casts);
  part.scale.set(sx, sy, sz);
  return part;
}

export function block(parent, material, x, y, z, w, h, d, casts = true) {
  const part = mesh(parent, box, material, x, y, z, casts);
  part.scale.set(w, h, d);
  return part;
}

export function rounded(parent, material, x, y, z, w, h, d, radius, casts = true) {
  const segments = Math.min(w, h, d) < 0.15 ? 1 : 2;
  const geometry = new RoundedBoxGeometry(w, h, d, segments, radius);
  return mesh(parent, geometry, material, x, y, z, casts);
}

export function tube(parent, material, points, radius, casts = false, segments = 16) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  return mesh(parent, new THREE.TubeGeometry(curve, segments, radius, 5, false), material, 0, 0, 0, casts);
}

export function batchStaticMeshes(root) {
  root.updateWorldMatrix(true, true);
  const worldToRoot = root.matrixWorld.clone().invert();
  const localTransform = new THREE.Matrix4();
  const groups = new Map();
  const sourceGeometries = new Set();
  root.traverse((part) => {
    if (!part.isMesh) return;
    const key = [part.material.uuid, part.castShadow, part.receiveShadow].join('/');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(part);
    sourceGeometries.add(part.geometry);
  });

  for (const parts of groups.values()) {
    const mergedInputs = parts.map((part) => {
      const geometry = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry.clone();
      localTransform.multiplyMatrices(worldToRoot, part.matrixWorld);
      return geometry.applyMatrix4(localTransform);
    });
    const merged = new THREE.Mesh(mergeGeometries(mergedInputs), parts[0].material);
    merged.castShadow = parts[0].castShadow;
    merged.receiveShadow = parts[0].receiveShadow;
    parts.forEach((part) => part.removeFromParent());
    mergedInputs.forEach((geometry) => geometry.dispose());
    root.add(merged);
  }
  sourceGeometries.delete(sphere);
  sourceGeometries.delete(smallSphere);
  sourceGeometries.delete(box);
  sourceGeometries.forEach((geometry) => geometry.dispose());
}
