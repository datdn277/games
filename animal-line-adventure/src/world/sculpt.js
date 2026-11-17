import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function createSculptor() {
  const resources = new Set();
  const materials = new Map();
  const geometries = new Map();

  function own(resource) {
    resources.add(resource);
    return resource;
  }

  function cachedGeometry(key, create) {
    if (!geometries.has(key)) geometries.set(key, own(create()));
    return geometries.get(key);
  }

  function paint(color, finish = 'matte') {
    const key = color + ':' + finish;
    if (!materials.has(key)) {
      const material = finish === 'flat'
        ? new THREE.MeshBasicMaterial({ color })
        : new THREE.MeshStandardMaterial({ color, roughness: finish === 'gloss' ? 0.32 : 0.84 });
      materials.set(key, own(material));
    }
    return materials.get(key);
  }

  function mesh(parent, geometry, color, x = 0, y = 0, z = 0, finish) {
    const object = new THREE.Mesh(geometry, typeof color === 'object' ? color : paint(color, finish));
    object.position.set(x, y, z);
    parent.add(object);
    return object;
  }

  function ball(parent, color, x, y, z, rx, ry, rz, finish) {
    const geom = cachedGeometry('ball', () => new THREE.SphereGeometry(1, 20, 12));
    const object = mesh(parent, geom, color, x, y, z, finish);
    object.scale.set(rx, ry, rz);
    return object;
  }

  function box(parent, color, x, y, z, width, height, depth, square = false) {
    const geom = square
      ? cachedGeometry('box', () => new THREE.BoxGeometry(1, 1, 1))
      : cachedGeometry('rounded cube', () => new RoundedBoxGeometry(1, 1, 1, 2, 0.14));
    const object = mesh(parent, geom, color, x, y, z);
    object.scale.set(width, height, depth);
    return object;
  }

  function cylinder(parent, color, x, y, z, rx, height, rz = rx, taper = 1) {
    const geom = cachedGeometry('cylinder:' + taper, () => new THREE.CylinderGeometry(taper, 1, 1, 18));
    const object = mesh(parent, geom, color, x, y, z);
    object.scale.set(rx, height, rz);
    return object;
  }

  function disc(parent, color, x, y, z, rx, ry, depth = 0.08) {
    const object = cylinder(parent, color, x, y, z, rx, depth, ry);
    object.rotation.x = Math.PI / 2;
    return object;
  }

  function tube(parent, color, points, radius = 0.018) {
    const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
    const geometry = own(new THREE.TubeGeometry(curve, points.length * 2, radius, 6, false));
    return mesh(parent, geometry, color);
  }

  function relief(parent, color, points, depth = 0.08, bevel = 0.035) {
    const shape = new THREE.Shape();
    shape.moveTo(...points[0]);
    points.slice(1).forEach(point => shape.lineTo(...point));
    shape.closePath();
    return mesh(parent, own(new THREE.ExtrudeGeometry(shape, {
      depth, bevelEnabled: Boolean(bevel), bevelSize: bevel, bevelThickness: bevel,
      bevelSegments: 2, steps: 1,
    })), color);
  }

  // Merge only rigid details. The articulated joints stay separate.
  function bake(group) {
    group.updateMatrixWorld(true);
    const inverse = group.matrixWorld.clone().invert();
    const batches = new Map();
    const absorbed = [];
    group.traverse(object => {
      if (!object.isMesh || Array.isArray(object.material)) return;
      const key = [object.material.id, object.castShadow, object.receiveShadow].join(':');
      const batch = batches.get(key) ?? { geometry: [], source: object };
      const copy = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
      copy.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld));
      batch.geometry.push(copy);
      batches.set(key, batch);
      absorbed.push(object);
    });
    for (const object of absorbed) object.removeFromParent();
    for (const { geometry, source } of batches.values()) {
      const merged = own(mergeGeometries(geometry));
      for (const copy of geometry) copy.dispose();
      const object = mesh(group, merged, source.material);
      object.castShadow = source.castShadow;
      object.receiveShadow = source.receiveShadow;
    }
  }

  return {
    own, paint, mesh, ball, box, cylinder, disc, tube, relief, bake,
    dispose() {
      for (const resource of resources) resource.dispose();
      resources.clear();
      materials.clear();
      geometries.clear();
    },
  };
}

export const starPoints = (radius = 1) => Array.from({ length: 10 }, (_, index) => {
  const angle = Math.PI / 2 - index * Math.PI / 5;
  const length = index % 2 ? radius * 0.48 : radius;
  return [Math.cos(angle) * length, Math.sin(angle) * length];
});

export function pivot(parent, x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  parent.add(group);
  return group;
}
