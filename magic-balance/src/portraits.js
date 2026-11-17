import * as THREE from 'three';
import { createAnimalFactory } from './animals.js';

export function createAnimalPortraits(size = 128) {
  let renderer;
  let factory;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(size, size, false);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xdac7df, 2.5));
    const key = new THREE.DirectionalLight(0xffecd6, 3.3);
    key.position.set(-4, 7, 6);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xb9e4ff, 1.25);
    fill.position.set(2, 2, -5);
    scene.add(fill);

    factory = createAnimalFactory();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 12);
    const bounds = new THREE.Box3();
    const extent = new THREE.Vector3();
    const center = new THREE.Vector3();
    const portraits = {};

    for (const kind of ['dog', 'fox', 'buffalo', 'mimo']) {
      const { group } = factory.create(kind);
      group.rotation.y = -.10;
      scene.add(group);
      bounds.setFromObject(group).getSize(extent);
      bounds.getCenter(center);
      const frame = Math.max(extent.x, extent.y) * .60;
      camera.left = camera.bottom = -frame;
      camera.right = camera.top = frame;
      camera.position.set(.85, center.y + .83, 5);
      camera.lookAt(center.x, center.y, center.z);
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      portraits[kind] = renderer.domElement.toDataURL('image/png');
      scene.remove(group);
    }
    return portraits;
  } catch {
    return {};
  } finally {
    factory?.dispose();
    renderer?.dispose();
    renderer?.forceContextLoss();
  }
}
