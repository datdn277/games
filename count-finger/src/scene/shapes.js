import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const ball = new THREE.SphereGeometry(1, 24, 16);

export function plastic(color, roughness = 0.58) {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

export function ellipsoid(parent, material, x, y, z, width, height, depth) {
  const mesh = new THREE.Mesh(ball, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(width, height, depth);
  parent.add(mesh);
  return mesh;
}

export function block(parent, material, width, height, depth, radius, x, y, z) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, 2, radius), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

export function starGeometry() {
  const shape = new THREE.Shape();
  for (let point = 0; point < 10; point += 1) {
    const angle = Math.PI / 2 + (point * Math.PI) / 5;
    const radius = point % 2 === 0 ? 1 : 0.51;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (point === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.14,
    bevelSize: 0.095,
    bevelThickness: 0.085,
    bevelSegments: 3,
    steps: 1,
  });
  geometry.translate(0, 0, -0.07);
  return geometry;
}

export function textTexture(text, { textColor = '#43306e', badgeColor, rimColor } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 192;
  const context = canvas.getContext('2d');
  if (badgeColor) {
    context.fillStyle = rimColor;
    context.beginPath();
    context.arc(96, 99, 86, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = badgeColor;
    context.beginPath();
    context.arc(96, 94, 76, 0, Math.PI * 2);
    context.fill();
  }
  context.fillStyle = textColor;
  context.font = '900 114px system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, 96, 100, 165);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function makeSprite(texture, width, height = width) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture, transparent: true, depthWrite: false, toneMapped: false,
  }));
  sprite.scale.set(width, height, 1);
  return sprite;
}

export function softContact(width, depth, opacity, texture) {
  const material = new THREE.MeshBasicMaterial({
    color: '#665582',
    transparent: true,
    opacity,
    map: texture,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

export function contactTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  const glow = context.createRadialGradient(32, 32, 0, 32, 32, 31);
  glow.addColorStop(0, 'rgba(255,255,255,0.85)');
  glow.addColorStop(0.35, 'rgba(255,255,255,0.7)');
  glow.addColorStop(0.72, 'rgba(255,255,255,0.21)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}
