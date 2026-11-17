import * as THREE from 'three';

const deg = Math.PI / 180;
const tau = Math.PI * 2;

export function makeLotus(assets, color = 0xf489bb) {
  const { ball, material } = assets;
  const outer = material(color);
  const inner = material(new THREE.Color(color).lerp(new THREE.Color(0xfff3f0), .40));
  const gold = material(0xffd967);
  const flower = new THREE.Group();
  for (const [count, spread, y, mat] of [[9, .30, .12, outer], [7, .20, .19, inner]]) {
    for (let index = 0; index < count; index++) {
      const angle = (index + y) * tau / count;
      const petal = new THREE.Group();
      petal.position.set(Math.cos(angle) * spread, y, Math.sin(angle) * spread);
      petal.rotation.y = -angle;
      const mesh = ball(petal, mat, [0, 0, 0], [.29, .055, .115]);
      mesh.rotation.z = y * 3.5;
      flower.add(petal);
    }
  }
  ball(flower, gold, [0, .16, 0], [.15, .096, .15]);
  for (let index = 0; index < 5; index++) {
    const angle = index * tau / 5;
    ball(flower, gold, [Math.cos(angle) * .095, .244, Math.sin(angle) * .095], [.033, .029, .033]);
  }
  return flower;
}

export function plant(assets, scale = 1) {
  const { ball, material, cylinder } = assets;
  const cluster = new THREE.Group();
  const blades = [0x52bb8a, 0x70ca91, 0x86d497, 0x9ad781].map((color) => material(color));
  const stalk = material(0x79bc7d);
  const brown = material(0xae7856);
  for (let index = 0; index < 7; index++) {
    const side = index - 3;
    const length = .32 + Math.sin(index * 2.1) * .12;
    const leaf = ball(cluster, blades[index % blades.length], [side * .098, length * .86, .06 * (index % 3)], [.073, length, .037]);
    leaf.rotation.z = -.13 * side;
    leaf.rotation.x = Math.sin(index) * .28;
  }
  if (scale > .8) {
    for (const [x, height, z] of [[-.15, 1.1, -.07], [.12, .87, -.15]]) {
      cylinder(cluster, stalk, .022, .033, height, [x, height / 2, z]);
      ball(cluster, brown, [x, height * .96, z], [.062, .17, .056]);
      ball(cluster, stalk, [x, height * 1.10, z], [.017, .07, .017]);
    }
  }
  cluster.scale.setScalar(scale);
  return cluster;
}

function makeWater(assets) {
  const { resources } = assets;
  const world = new THREE.PlaneGeometry(160, 45);
  world.rotateX(-Math.PI / 2);
  resources.add(world);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      nearColor: { value: new THREE.Color(0x70d6e9) },
      midColor: { value: new THREE.Color(0x8bdff0) },
      farColor: { value: new THREE.Color(0xc6edf4) },
    },
    vertexShader: `
      varying vec2 worldXZ;
      void main() {
        worldXZ = (modelMatrix * vec4(position, 1.0)).xz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 nearColor;
      uniform vec3 midColor;
      uniform vec3 farColor;
      varying vec2 worldXZ;
      void main() {
        vec2 p = worldXZ;
        float distance = smoothstep(0.0, 15.0, -p.y);
        float shore = smoothstep(-3.0, 15.0, p.y);
        vec3 color = mix(mix(midColor, nearColor, shore), farColor, distance);
        float wave = sin(p.y * 3.0 + sin(p.x * 1.15) * .71 + time * .65);
        float light = sin(p.x * 1.8 + p.y * 1.5 - time * .87);
        float shining = smoothstep(.987, 1., wave) * smoothstep(.53, .98, light);
        float wider = sin(p.y * 1.5 - time * .48 + sin(p.x * .58) * .96);
        color *= 1.0 + .017 * wave + .027 * wider;
        color = mix(color, vec3(.92, .98, 1.0), shining * (1.0 - distance * .6) * .55);
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  resources.add(material);
  const water = new THREE.Mesh(world, material);
  water.position.set(0, -.11, 10.6);
  return water;
}

function batchScenery(scene, roots, animated, resources) {
  const batches = new Map();
  function collect(node) {
    if (animated.has(node)) return;
    if (node.isMesh && !node.material.transparent && !node.material.isShaderMaterial) {
      const key = node.geometry.uuid + node.material.uuid;
      const batch = batches.get(key) ?? [];
      batch.push(node);
      batches.set(key, batch);
    }
    node.children.forEach(collect);
  }
  scene.updateMatrixWorld(true);
  roots.forEach(collect);
  batches.forEach((meshes) => {
    if (meshes.length < 2) return;
    const { geometry, material } = meshes[0];
    const instances = new THREE.InstancedMesh(geometry, material, meshes.length);
    meshes.forEach((mesh, index) => {
      instances.setMatrixAt(index, mesh.matrixWorld);
      mesh.removeFromParent();
    });
    instances.computeBoundingSphere();
    scene.add(instances);
    resources.add(instances);
  });
}

export function makeEnvironment(scene, assets) {
  const fromChild = scene.children.length;
  const { ball, material, resources, oval, cylinder } = assets;
  const water = makeWater(assets);
  scene.add(water);
  const clouds = [];
  const animatedPlants = [];
  const fish = [];
  const dragonflies = [];

  // The low mint hills and floating clouds give the pond several layers of depth.
  const hills = [0xa4dbca, 0xb6e4d5, 0x9ed9c2, 0xb8e7d4].map((color) => material(color));
  for (let index = 0; index < 13; index++) {
    const x = (index - 6) * 3.15;
    ball(scene, hills[index % 4], [x, -.65, -12.3 + Math.sin(index * 1.3) * 1.2],
      [3.5 + Math.cos(index * .9), 1.55 + Math.cos(index * 1.9) * .54, 1.7]);
  }

  const cloudWhite = material(0xffffff, { roughness: 1 });
  const cloudBlue = material(0xe8f5ff);
  for (const [x, y, z, size] of [[-6.4, 1.72, -7.6, .81], [6.5, 1.45, -7.4, .75],
    [3.12, 1.92, -7.8, .55], [-14, 3.5, -9.4, .89], [13, 2.7, -9.1, 1.1]]) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.scale.setScalar(size);
    ball(group, cloudBlue, [0, -.15, -.12], [1.35, .45, .53]);
    ball(group, cloudWhite, [0, .03, 0], [1.28, .42, .62]);
    ball(group, cloudWhite, [-.66, .17, .05], [.69, .49, .55]);
    ball(group, cloudWhite, [-.06, .34, 0], [.73, .65, .63]);
    ball(group, cloudWhite, [.61, .12, 0], [.66, .42, .51]);
    scene.add(group);
    clouds.push({ group, x });
  }

  const rainbow = new THREE.Group();
  const rainbowColors = [0xffa6a8, 0xffc28d, 0xffe59d, 0xacdf9a, 0x8ed7f4, 0xc2aaf4];
  rainbowColors.forEach((color, index) => {
    const geometry = new THREE.TorusGeometry(4.64 - index * .255, .136, 9, 60, Math.PI);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .84 });
    resources.add(geometry);
    resources.add(mat);
    rainbow.add(new THREE.Mesh(geometry, mat));
  });
  rainbow.position.set(-.65, -.78, -8.55);
  rainbow.scale.set(.79, .44, 1);
  scene.add(rainbow);

  const dirt = material(0xdfb996);
  const top = material(0x91d7a1);
  const foam = new THREE.MeshBasicMaterial({ color: 0xbaf1e2, transparent: true, opacity: .7, depthWrite: false });
  resources.add(foam);
  const rocks = [0xb3b8d1, 0xccaecb, 0xc4c7db, 0xa8c8cd].map((color) => material(color));
  const stone = (x, z, size, index, y = .01) => {
    const pebble = ball(scene, rocks[index % rocks.length], [x, y, z], [size, size * .51, size * .74]);
    pebble.rotation.set(.17, index * .71, Math.sin(index) * .2);
  };
  const flowerColors = [0xef9dbd, 0xffc17b, 0xf3a5d2, 0xe1b4f4];
  for (const [island, [x, z, sx, sz]] of [[-9.65, 4.55, 3.38, 1.7], [9.5, 4.7, 3.03, 1.8],
    [-8.55, -5.9, 3.07, 1.31], [7.65, -7.35, 3.75, 1.44],
    [-12.12, -.45, 2.38, 1.55], [13.7, -.7, 2.5, 1.5]].entries()) {
    oval(scene, foam, [x, -.087, z], [sx + .14, sz + .13]);
    ball(scene, dirt, [x, -.12, z], [sx, .31, sz]);
    ball(scene, top, [x, .05, z - .048], [sx * .99, .36, sz * .96]);
    for (let index = 0; index < 5; index++) {
      const angle = index * 1.74 + island + .5;
      const sprig = plant(assets, index % 3 === 0 ? 1.02 : .66);
      sprig.position.set(x + Math.cos(angle) * sx * .73, .22, z + Math.sin(angle) * sz * .65);
      sprig.rotation.y = angle;
      scene.add(sprig);
      if (index === 0) animatedPlants.push(sprig);
      stone(x + Math.cos(angle + 1) * sx * .9, z + Math.sin(angle + 1) * sz * .88, .19 + index * .057, index + island, .052);
      if (index % 2 === 0) {
        const flower = makeLotus(assets, flowerColors[(island + index) % flowerColors.length]);
        flower.position.set(x + Math.cos(angle + 1) * sx * .50, .30, z + Math.sin(angle + 1) * sz * .55);
        flower.scale.setScalar(.44 + (index % 3) * .086);
        scene.add(flower);
      }
    }
  }

  for (const [index, [x, z, scale]] of [[-5.4, -4.6, .9], [-6.1, -5.35, .66], [4.85, -4.47, .77],
    [5.45, -4.95, .53], [-7.7, 3.3, .81], [7.65, 3.58, .78], [7.97, 3.08, .45]].entries()) {
    const flower = makeLotus(assets, flowerColors[index % flowerColors.length]);
    flower.position.set(x, .015, z);
    flower.scale.setScalar(scale);
    scene.add(flower);
  }

  const wood = [0xe3b080, 0xe8bd93, 0xdca67b, 0xefc39a].map((color) => material(color));
  const rail = material(0xc99167);
  const bridge = new THREE.Group();
  bridge.position.set(5.8, .04, -7.53);
  bridge.rotation.y = -.23;
  const board = new THREE.BoxGeometry(.292, .14, 1.35, 1, 1, 1);
  resources.add(board);
  for (let step = 0; step < 13; step++) {
    const x = (step - 6) * .29;
    const plank = new THREE.Mesh(board, wood[step % wood.length]);
    plank.position.set(x, .73 - x * x * .19, 0);
    plank.rotation.z = Math.atan(-.38 * x);
    bridge.add(plank);
  }
  for (const z of [-.59, .59]) {
    const span = new THREE.CatmullRomCurve3([-1.78, -.92, 0, .92, 1.78].map((x) =>
      new THREE.Vector3(x, 1.20 - x * x * .19, z)));
    const geometry = new THREE.TubeGeometry(span, 21, .051, 7, false);
    resources.add(geometry);
    bridge.add(new THREE.Mesh(geometry, rail));
    for (const x of [-1.69, -.86, 0, .86, 1.69]) {
      cylinder(bridge, rail, .065, .079, .55, [x, .95 - x * x * .19, z]);
      ball(bridge, wood[1], [x, 1.23 - x * x * .19, z], [.082, .069, .082]);
    }
  }
  scene.add(bridge);

  const fishMaterial = material(0xffb184);
  const fishTail = material(0xf7bc99);
  for (const [x, z, size] of [[-3.0, 4.4, .88], [3.0, 4.9, .77], [.9, -3.1, .64]]) {
    const swimmer = new THREE.Group();
    swimmer.position.set(x, -.062, z);
    swimmer.scale.setScalar(size);
    ball(swimmer, fishMaterial, [0, 0, 0], [.31, .078, .117]);
    const tail = new THREE.Group();
    tail.position.x = -.27;
    swimmer.add(tail);
    for (const side of [-1, 1]) {
      const fin = ball(tail, fishTail, [-.09, 0, side * .085], [.15, .021, .055]);
      fin.rotation.y = side * .63;
    }
    scene.add(swimmer);
    fish.push({ swimmer, tail, x, z });
  }

  const insect = material(0x8872ad);
  const wings = new THREE.MeshBasicMaterial({ color: 0xf5fcff, transparent: true, opacity: .67, depthWrite: false });
  resources.add(wings);
  for (const [x, y, z] of [[-5.7, 1.47, -3.95], [4.4, 1.42, -3.35]]) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    ball(group, insect, [0, 0, 0], [.058, .049, .25]);
    ball(group, insect, [0, .019, .21], [.074, .076, .070]);
    const wingPairs = [];
    for (const side of [-1, 1]) {
      const pair = new THREE.Group();
      group.add(pair);
      const front = ball(pair, wings, [side * .185, 0, .047], [.235, .016, .070]);
      front.rotation.y = side * -.16;
      const back = ball(pair, wings, [side * .164, 0, -.065], [.202, .016, .063]);
      back.rotation.y = side * .22;
      wingPairs.push(pair);
    }
    scene.add(group);
    dragonflies.push({ group, wingPairs, x, y, z });
  }

  batchScenery(scene, scene.children.slice(fromChild), new Set([
    ...clouds.map(({ group }) => group),
    ...fish.map(({ swimmer }) => swimmer),
    ...dragonflies.map(({ group }) => group),
    ...animatedPlants,
  ]), resources);

  function update(time) {
    water.material.uniforms.time.value = time;
    clouds.forEach(({ group, x }, index) => { group.position.x = x + Math.sin(time * .09 + index) * .32; });
    animatedPlants.forEach((sprig, index) => { sprig.rotation.z = Math.sin(time * 1.4 + index) * 2.7 * deg; });
    fish.forEach(({ swimmer, tail, x, z }, index) => {
      const t = time * .5 + index * 2;
      swimmer.position.x = x + Math.sin(t) * .92;
      swimmer.position.z = z + Math.cos(t) * .40;
      swimmer.rotation.y = Math.atan2(.40 * Math.sin(t), .92 * Math.cos(t));
      tail.rotation.y = Math.sin(time * 11 + index) * .4;
    });
    dragonflies.forEach(({ group, wingPairs, x, y, z }, index) => {
      const t = time * .77 + index * 3;
      group.position.set(x + Math.sin(t) * .47, y + Math.cos(t * 1.2) * .19, z + Math.sin(t * .7) * .35);
      group.rotation.y = Math.sin(t * .65) * .71;
      wingPairs.forEach((pair, side) => { pair.rotation.z = Math.sin(time * 21) * (side ? .47 : -.47); });
    });
  }

  return { update };
}
