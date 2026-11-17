import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function createStudioGeometry() {
  const geometries = new Map();
  const materials = new Map();
  const owned = new Set();

  function shape(key, create) {
    if (!geometries.has(key)) geometries.set(key, create());
    return geometries.get(key);
  }

  function surface(color, roughness = .67) {
    const key = `${color}:${roughness}`;
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness }));
    return materials.get(key);
  }

  function mesh(parent, geometry, material, position) {
    const item = new THREE.Mesh(geometry, material);
    item.position.set(...position);
    parent.add(item);
    return item;
  }

  function group(parent, x = 0, y = 0, z = 0) {
    const result = new THREE.Group();
    result.position.set(x, y, z);
    parent.add(result);
    return result;
  }

  const sphere = shape('sphere', () => new THREE.SphereGeometry(1, 20, 14));
  const cylinder = shape('cylinder', () => new THREE.CylinderGeometry(1, 1, 1, 28));
  const ring = shape('ring', () => new THREE.TorusGeometry(1, .10, 8, 32));

  function oval(parent, material, position, size) {
    const item = mesh(parent, sphere, material, position);
    item.scale.set(...size);
    return item;
  }

  function disc(parent, material, position, radius, height, depth = radius) {
    const item = mesh(parent, cylinder, material, position);
    item.scale.set(radius, height, depth);
    return item;
  }

  function torus(parent, material, position, width, height) {
    const item = mesh(parent, ring, material, position);
    item.scale.set(width, height, .25);
    return item;
  }

  function block(parent, material, position, size, radius = .06) {
    const geometry = shape(`block:${size.join(':')}:${radius}`,
      () => new RoundedBoxGeometry(...size, 2, radius));
    return mesh(parent, geometry, material, position);
  }

  function star(parent, material, position, size, points = 5) {
    const geometry = shape(`star:${points}`, () => {
      const outline = new THREE.Shape();
      for (let index = 0; index < points * 2; index += 1) {
        const angle = Math.PI / 2 + Math.PI * index / points;
        const radius = index % 2 === 0 ? 1 : .48;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (index === 0) outline.moveTo(x, y);
        else outline.lineTo(x, y);
      }
      outline.closePath();
      return new THREE.ExtrudeGeometry(outline, {
        depth: .13, bevelEnabled: true, bevelSize: .055, bevelThickness: .045, bevelSegments: 2,
      });
    });
    const item = mesh(parent, geometry, material, position);
    item.scale.setScalar(size);
    return item;
  }

  function tube(parent, material, from, to, radius) {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const delta = end.clone().sub(start);
    const item = disc(parent, material, start.addScaledVector(delta, .5).toArray(), radius, delta.length());
    item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    return item;
  }

  return {
    shape, surface, group, oval, block, disc, torus, star, tube, mesh,
    own(resource) { owned.add(resource); return resource; },
    dispose() {
      for (const resource of [...geometries.values(), ...materials.values(), ...owned]) {
        resource.dispose();
      }
    },
  };
}
