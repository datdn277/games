import * as THREE from 'three';

export function enamel(color, roughness = 0.58) {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

export function shapes() {
  const ball = new THREE.SphereGeometry(1, 24, 16);
  return {
    ellipsoid(parent, material, x, y, z, width, height, depth) {
      const mesh = new THREE.Mesh(ball, material);
      mesh.position.set(x, y, z);
      mesh.scale.set(width, height, depth);
      parent.add(mesh);
      return mesh;
    },
    mount(parent, name, x = 0, y = 0, z = 0) {
      const group = new THREE.Group();
      group.name = name;
      group.position.set(x, y, z);
      parent.add(group);
      return group;
    },
  };
}

export function extrude(shape, thickness = 0.12, bevel = 0.04) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 3,
    curveSegments: 12,
    steps: 1,
  });
  geometry.translate(0, 0, -thickness / 2);
  return geometry;
}

export function starGeometry() {
  const shape = new THREE.Shape();
  for (let point = 0; point < 10; point += 1) {
    const theta = Math.PI / 2 + point * Math.PI / 5;
    const radius = point % 2 === 0 ? 1 : 0.5;
    const x = radius * Math.cos(theta);
    const y = radius * Math.sin(theta);
    if (point === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return extrude(shape, 0.18, 0.095);
}

export function noteGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0.14, -0.65);
  shape.bezierCurveTo(0.11, -1.05, -0.85, -1.00, -0.73, -0.54);
  shape.bezierCurveTo(-0.66, -0.3, -0.28, -0.16, -0.08, -0.3);
  shape.lineTo(-0.08, 0.7);
  shape.quadraticCurveTo(-0.08, 0.79, 0.01, 0.81);
  shape.lineTo(0.61, 0.97);
  shape.quadraticCurveTo(0.75, 0.99, 0.75, 0.86);
  shape.lineTo(0.75, 0.65);
  shape.quadraticCurveTo(0.75, 0.53, 0.65, 0.51);
  shape.lineTo(0.14, 0.37);
  shape.closePath();
  return extrude(shape, 0.16, 0.055);
}

export function solid(parent, geometry, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

export function stroke(parent, material, points, radius) {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
  );
  return solid(parent, new THREE.TubeGeometry(curve, 14, radius, 6), material);
}

export function shadowTexture() {
  const size = 64;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const radius = Math.hypot((x + 0.5) / size - 0.5, (y + 0.5) / size - 0.5) * 2;
      const alpha = Math.max(0, (Math.exp(-3.5 * radius * radius) - Math.exp(-3.5)) / 0.97);
      const index = (y * size + x) * 4;
      pixels[index] = 255;
      pixels[index + 1] = 255;
      pixels[index + 2] = 255;
      pixels[index + 3] = Math.round(alpha * 255);
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export function contactShadow(parent, texture, width, depth, opacity, x, y, z) {
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    color: 0x57409a,
    transparent: true,
    depthWrite: false,
    opacity,
  });
  const shadow = solid(parent, new THREE.PlaneGeometry(width, depth), material, x, y, z);
  shadow.rotation.x = -Math.PI / 2;
  return shadow;
}
