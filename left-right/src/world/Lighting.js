import * as THREE from 'three';

export function addLighting(scene, lowQuality = false) {
  const sky = new THREE.HemisphereLight('#f5fbff', '#e0cddc', 2.05);
  scene.add(sky);

  const sun = new THREE.DirectionalLight('#fff5e6', 1.35);
  sun.position.set(-3.8, 8.6, 5.8);
  sun.target.position.set(0, 0.1, -0.7);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(lowQuality ? 1024 : 2048);
  Object.assign(sun.shadow.camera, {
    left: -8,
    right: 8,
    top: 6.5,
    bottom: -6.5,
    near: 0.5,
    far: 23,
  });
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = 0.032;
  sun.shadow.radius = lowQuality ? 3 : 5;
  scene.add(sun, sun.target);

  const fill = new THREE.DirectionalLight('#e4f6ff', 0.59);
  fill.position.set(5, 3.8, 1.2);
  scene.add(fill);
}
