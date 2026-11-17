import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const COAT = {
  dog: { main: 0xe3a657, light: 0xffe6aa, dark: 0xb16d47, rose: 0xf6928c },
  fox: { main: 0xed864c, light: 0xffe8bf, dark: 0x984b42, rose: 0xf1a2a3 },
  buffalo: { main: 0x72728d, light: 0xac9aae, dark: 0x484b66, rose: 0xd88ba2 },
  mimo: { main: 0xc9905e, light: 0xffdfae, dark: 0x986345, rose: 0xee9a8e },
};
const INK = 0x302d45;
const EYE_WHITE = 0xfff6e4;
const WHITE = 0xf8fffb;
const UP = new THREE.Vector3(0, 1, 0);

export function createAnimalFactory() {
  const materials = new Map();
  const geometries = new Map();
  const baked = new Map();
  const sphere = new THREE.SphereGeometry(1, 20, 14);
  const ring = new THREE.TorusGeometry(1, .16, 8, 28);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 16);

  function material(color) {
    if (!materials.has(color)) {
      materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .63 }));
    }
    return materials.get(color);
  }

  function mesh(parent, geometry, shade, x, y, z, sx = 1, sy = 1, sz = 1) {
    const item = new THREE.Mesh(geometry, material(shade));
    item.position.set(x, y, z);
    item.scale.set(sx, sy, sz);
    item.castShadow = true;
    parent.add(item);
    return item;
  }

  function ball(parent, shade, x, y, z, sx, sy = sx, sz = sx) {
    return mesh(parent, sphere, shade, x, y, z, sx, sy, sz);
  }

  function group(parent, x = 0, y = 0, z = 0) {
    const node = new THREE.Group();
    node.position.set(x, y, z);
    parent.add(node);
    return node;
  }

  function loft(parent, key, shade, points, radiusStart, radiusEnd, tip = null) {
    if (!geometries.has(key)) {
      const spine = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
      const segments = 14;
      const sides = 10;
      const { normals, binormals } = spine.computeFrenetFrames(segments, false);
      const positions = [];
      const indices = [];
      for (let step = 0; step <= segments; step += 1) {
        const fraction = step / segments;
        const radius = tip
          ? fraction < tip.from
            ? THREE.MathUtils.lerp(radiusStart, tip.radius, fraction / tip.from)
            : THREE.MathUtils.lerp(tip.radius, radiusEnd, (fraction - tip.from) / (1 - tip.from))
          : THREE.MathUtils.lerp(radiusStart, radiusEnd, fraction);
        const point = spine.getPointAt(fraction);
        for (let side = 0; side < sides; side += 1) {
          const angle = side / sides * Math.PI * 2;
          const offset = point.clone()
            .addScaledVector(normals[step], Math.cos(angle) * radius)
            .addScaledVector(binormals[step], Math.sin(angle) * radius);
          positions.push(offset.x, offset.y, offset.z);
          if (step === segments) continue;
          const a = step * sides + side;
          const b = step * sides + (side + 1) % sides;
          indices.push(a, b, a + sides, b, b + sides, a + sides);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      if (tip) {
        const split = Math.round(segments * tip.from) * sides * 6;
        geometry.addGroup(0, split, 0);
        geometry.addGroup(split, indices.length - split, 1);
      }
      geometries.set(key, geometry);
    }
    const result = mesh(parent, geometries.get(key), shade, 0, 0, 0);
    if (tip) result.material = [result.material, material(tip.shade)];
    return result;
  }

  function ear(parent, key, shade, depth, sx = 1, sy = 1) {
    if (!geometries.has(key)) {
      const shape = new THREE.Shape();
      shape.moveTo(-.125, .005);
      shape.bezierCurveTo(-.174, .091, -.158, .239, -.128, .336);
      shape.bezierCurveTo(-.112, .394, -.081, .412, -.035, .367);
      shape.bezierCurveTo(.027, .316, .118, .208, .154, .065);
      shape.bezierCurveTo(.18, -.016, -.08, -.058, -.125, .005);
      const rounded = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        curveSegments: 10,
        bevelSize: .022,
        bevelThickness: .025,
      });
      geometries.set(key, rounded);
    }
    return mesh(parent, geometries.get(key), shade, 0, 0, 0, sx, sy, 1);
  }

  function limb(parent, shade, from, to, radius) {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const delta = end.clone().sub(start);
    const middle = start.addScaledVector(delta, .5);
    const shape = ball(parent, shade, middle.x, middle.y, middle.z, radius, delta.length() / 2 + radius * .8, radius);
    shape.quaternion.setFromUnitVectors(UP, delta.normalize());
    return shape;
  }

  function eyes(head, x, y, z, radius = .109) {
    return [-1, 1].map((side) => {
      const eye = group(head, side * x, y, z);
      eye.rotation.y = side * .13;
      ball(eye, EYE_WHITE, 0, 0, 0, radius, radius * 1.12, radius * .61);
      ball(eye, INK, -side * .015, -.005, radius * .48, radius * .68, radius * .79, radius * .43);
      ball(eye, WHITE, -.026, .033, radius * .87, radius * .25, radius * .28, radius * .115);
      ball(eye, 0xdbe6e6, .022, -.034, radius * .87, radius * .11);
      return eye;
    });
  }

  function smile(head, key, x, y, z, width, shade = INK) {
    loft(head, key, shade, [
      [x - width / 2, y, z - .012],
      [x - width / 4, y - .028, z + .004],
      [x, y - .033, z + .014],
      [x + width / 4, y - .027, z + .004],
      [x + width / 2, y, z - .012],
    ], .009, .009);
  }

  function dog(body, head) {
    const { main, light, dark, rose } = COAT.dog;
    ball(body, main, 0, .34, -.08, .35, .31, .35);
    ball(body, light, 0, .374, .15, .231, .266, .145);
    for (const side of [-1, 1]) {
      ball(body, main, side * .25, .145, -.189, .145, .145, .175);
      ball(body, dark, side * .25, .09, -.083, .145, .09, .17);
      ball(body, main, side * .149, .17, .16, .102, .157, .111);
      ball(body, light, side * .15, .071, .236, .122, .071, .146);
    }
    const tail = group(body, .24, .298, -.306);
    loft(tail, 'dog-tail', dark, [[0, 0, 0], [.17, .085, -.085], [.23, .22, -.11], [.185, .33, -.08]], .089, .008);
    const collar = mesh(body, cylinder, 0x60b7b5, 0, .557, .027, .235, .071, .197);
    collar.rotation.x = .057;
    ball(body, 0xffdb73, 0, .496, .228, .084, .08, .026);
    ball(body, 0xf5bc69, 0, .491, .249, .045, .046, .009);
    ball(head, main, 0, .025, 0, .399, .35, .301);
    ball(head, light, -.169, .091, .229, .146, .153, .087);
    for (const side of [-1, 1]) {
      const flap = ball(head, dark, side * .354, -.025, -.019, .134, .247, .145);
      flap.rotation.z = side * .306;
      const satin = ball(head, 0xd18d63, side * .384, -.041, .089, .084, .165, .044);
      satin.rotation.z = side * .283;
      ball(head, rose, side * .246, -.121, .235, .049, .025, .026);
    }
    ball(head, light, 0, -.106, .228, .211, .143, .151);
    ball(head, INK, 0, -.077, .357, .083, .052, .045);
    ball(head, 0xfff0d3, -.02, -.055, .387, .024, .011, .006);
    smile(head, 'dog-smile', 0, -.155, .35, .193);
    const lids = eyes(head, .146, .075, .237, .099);
    return { lids, tail };
  }

  function fox(body, head) {
    const { main, light, dark, rose } = COAT.fox;
    ball(body, main, 0, .311, -.079, .315, .287, .295);
    ball(body, light, 0, .345, .154, .207, .229, .141);
    for (const side of [-1, 1]) {
      ball(body, main, side * .235, .144, -.119, .127, .144, .151);
      ball(body, dark, side * .228, .067, -.03, .128, .067, .158);
      ball(body, main, side * .128, .159, .133, .083, .147, .098);
      ball(body, dark, side * .13, .069, .204, .091, .069, .129);
    }
    const tail = group(body, .22, .233, -.229);
    loft(tail, 'fox-tail', main, [
      [0, 0, 0], [.12, .034, -.117], [.33, .147, -.18], [.43, .281, -.14],
      [.467, .41, -.093], [.424, .522, -.018],
    ], .119, .009, { shade: light, radius: .146, from: .66 });
    ball(head, main, 0, -.005, 0, .365, .318, .272);
    for (const side of [-1, 1]) {
      const triangle = group(head, side * .244, .178, -.004);
      triangle.rotation.y = side * .11;
      triangle.rotation.z = side * -.188;
      triangle.scale.x = -side;
      ear(triangle, 'fox-ear', dark, .085);
      const lining = ear(triangle, 'fox-lining', rose, .015, .64, .73);
      lining.position.set(-.004, .026, .087);
      const cheek = ball(head, light, side * .199, -.097, .142, .209, .107, .122);
      cheek.rotation.z = side * .28;
      ball(head, main, side * .305, -.014, .071, .112, .087, .071).rotation.z = side * .43;
      ball(head, rose, side * .234, -.098, .257, .043, .024, .02);
    }
    ball(head, light, 0, -.116, .237, .167, .102, .137);
    ball(head, INK, 0, -.079, .355, .062, .041, .039);
    ball(head, 0xffead0, -.015, -.064, .386, .017, .009, .005);
    smile(head, 'fox-smile', 0, -.156, .334, .14);
    return { lids: eyes(head, .144, .069, .213, .091), tail };
  }

  function buffalo(body, head) {
    const { main, light, dark, rose } = COAT.buffalo;
    ball(body, main, 0, .328, -.128, .39, .328, .361);
    ball(body, 0x8a859d, 0, .296, .128, .25, .234, .18);
    for (const side of [-1, 1]) {
      ball(body, main, side * .279, .158, -.244, .144, .164, .156);
      ball(body, dark, side * .287, .076, -.19, .146, .076, .169);
      ball(body, main, side * .18, .169, .123, .116, .154, .124);
      ball(body, dark, side * .181, .075, .184, .132, .075, .143);
      ball(body, 0x66687e, side * .183, .09, .308, .031, .033, .015);
    }
    const tail = group(body, -.27, .26, -.377);
    loft(tail, 'buffalo-tail', dark, [[0, 0, 0], [-.118, .039, -.076], [-.204, .138, -.057], [-.221, .221, -.01]], .045, .04);
    ball(tail, dark, -.224, .229, -.008, .069, .073, .055);
    ball(head, main, 0, .017, -.022, .428, .331, .322);
    for (const side of [-1, 1]) {
      const outerEar = ball(head, dark, side * .439, .02, -.029, .179, .098, .129);
      outerEar.rotation.z = -side * .314;
      const innerEar = ball(head, rose, side * .455, .024, .069, .113, .057, .031);
      innerEar.rotation.z = -side * .314;
      loft(head, `buffalo-horn-${side}`, 0xffe2ab, [
        [side * .322, .194, -.055],
        [side * .489, .218, -.062],
        [side * .631, .326, -.059],
        [side * .669, .473, -.024],
        [side * .63, .542, .026],
      ], .11, .006);
      ball(head, 0xedbca4, side * .317, -.122, .192, .039, .024, .026);
    }
    ball(head, dark, -.065, .265, .119, .145, .099, .165).rotation.z = -.442;
    ball(head, 0x66677f, .07, .244, .142, .141, .086, .132).rotation.z = -.318;
    ball(head, light, 0, -.129, .233, .298, .161, .17);
    ball(head, dark, -.103, -.09, .381, .041, .028, .019).rotation.z = -.21;
    ball(head, dark, .103, -.09, .381, .041, .028, .019).rotation.z = .21;
    smile(head, 'buffalo-smile', 0, -.192, .376, .175, 0x634b65);
    return { lids: eyes(head, .171, .052, .224, .106), tail };
  }

  function mimo(body, head) {
    const { main, light, dark, rose } = COAT.mimo;
    const mint = 0x65b9b4;
    const ivory = 0xfff6e8;
    const coatShade = 0xd9e8e8;
    ball(body, main, -.23, .177, -.073, .205, .177, .251);
    ball(body, main, .23, .177, -.073, .205, .177, .251);
    for (const side of [-1, 1]) {
      ball(body, dark, side * .23, .127, .149, .234, .127, .271);
      ball(body, light, side * .231, .105, .318, .141, .08, .061);
    }
    ball(body, ivory, 0, .655, -.026, .503, .539, .32);
    ball(body, mint, 0, .728, .218, .275, .398, .139);
    const front = ball(body, 0x8dd2bc, 0, .644, .319, .199, .19, .063);
    front.rotation.x = -.084;
    for (const side of [-1, 1]) {
      limb(body, ivory, [side * .285, 1.036, .111], [side * .138, .7, .343], .125);
      limb(body, coatShade, [side * .343, .921, .195], [side * .193, .716, .305], .05);
      ball(body, ivory, side * .273, .552, .219, .209, .331, .14).rotation.z = side * -.14;
    }
    const pocket = ball(body, 0xe3eeee, -.289, .631, .356, .113, .082, .023);
    pocket.rotation.z = -.094;
    const pencil = mesh(body, cylinder, 0xffcb61, -.272, .733, .35, .017, .15, .017);
    pencil.rotation.z = -.196;
    ball(body, 0xee9a97, -.257, .804, .35, .018);
    ball(body, 0xffde80, .08, .994, .34, .089, .055, .023).rotation.z = .22;
    ball(body, 0xffcf65, -.08, .994, .34, .089, .055, .023).rotation.z = -.22;
    ball(body, 0xe88f56, 0, .992, .364, .048);
    const arms = [-1, 1].map((side) => {
      const shoulder = group(body, side * .424, .887, .024);
      limb(shoulder, ivory, [0, 0, 0], [side * .13, -.288, .075], .128);
      ball(shoulder, coatShade, side * .127, -.268, .076, .124, .078, .128);
      ball(shoulder, main, side * .143, -.372, .104, .115, .127, .1);
      ball(shoulder, main, side * .073, -.372, .156, .054, .063, .052);
      return shoulder;
    });
    ball(head, main, 0, .003, -.01, .555, .475, .42);
    for (const side of [-1, 1]) {
      ball(head, dark, side * .461, .313, -.075, .221, .215, .135);
      ball(head, main, side * .451, .315, -.006, .207, .202, .104);
      ball(head, light, side * .463, .32, .078, .126, .114, .034);
      ball(head, rose, side * .306, -.127, .315, .084, .042, .032);
    }
    ball(head, light, 0, -.117, .331, .253, .176, .153);
    ball(head, INK, 0, -.075, .465, .089, .052, .039);
    ball(head, 0xffeaca, -.022, -.058, .494, .019, .01, .009);
    smile(head, 'mimo-smile', 0, -.172, .463, .193);
    const lids = eyes(head, .197, .064, .35, .12);

    // Rounded amber safety goggles rest on the forehead, above the eyes.
    const meshGoggles = group(head, 0, .278, .324);
    meshGoggles.rotation.x = -.26;
    for (const side of [-1, 1]) {
      ball(meshGoggles, 0xa5dae6, side * .154, 0, .01, .12, .09, .031);
      mesh(meshGoggles, ring, 0xeab464, side * .154, 0, .022, .121, .092, .1);
      ball(meshGoggles, 0xebfcff, side * .154 - .036, .026, .039, .024, .014, .005);
      limb(meshGoggles, 0xb18254, [side * .27, .01, .005], [side * .365, .002, -.105], .026);
    }
    limb(meshGoggles, 0xf5bf67, [-.038, .007, .01], [.038, .007, .01], .029);
    return { lids, arms };
  }

  const builders = { dog, fox, buffalo, mimo };

  function compact(node, key) {
    const directMeshes = node.children.filter((child) => child.isMesh && !Array.isArray(child.material));
    if (!directMeshes.length) return;
    const batches = new Map();
    directMeshes.forEach((modelPart) => {
      const { geometry, material: shade } = modelPart;
      const attributes = Object.keys(geometry.attributes).join('.');
      const identifier = `${shade.uuid}:${attributes}:${Boolean(geometry.index)}`;
      if (!batches.has(identifier)) batches.set(identifier, []);
      batches.get(identifier).push(modelPart);
    });
    let batchIndex = 0;
    for (const parts of batches.values()) {
      const cacheKey = `${key}:${batchIndex++}`;
      if (parts.length === 1) continue;
      if (!baked.has(cacheKey)) {
        const arranged = parts.map((part) => {
          part.updateMatrix();
          return part.geometry.clone().applyMatrix4(part.matrix);
        });
        baked.set(cacheKey, mergeGeometries(arranged));
        arranged.forEach((geometry) => geometry.dispose());
      }
      const geometry = baked.get(cacheKey);
      if (!geometry) continue;
      const combined = new THREE.Mesh(geometry, parts[0].material);
      combined.castShadow = true;
      for (const part of parts) node.remove(part);
      node.add(combined);
    }
  }

  function create(kind) {
    const build = builders[kind];
    if (!build) throw new RangeError(`Unknown toy: ${kind}`);
    const root = new THREE.Group();
    root.name = kind;
    const body = group(root);
    const head = group(body, 0, kind === 'mimo' ? 1.44 : .695, .087);
    const { lids, tail, arms } = build(body, head);
    body.traverse((node) => {
      if (!node.isGroup) return;
      node.userData.batchKey = node.parent?.userData.batchKey
        ? `${node.parent.userData.batchKey}.${node.parent.children.indexOf(node)}`
        : kind;
    });
    const groups = [];
    body.traverse((node) => { if (node.isGroup) groups.push(node); });
    groups.forEach((node) => compact(node, node.userData.batchKey));

    function animate(time = 0, mood = 'idle') {
      const moment = time + (kind === 'fox' ? .73 : kind === 'buffalo' ? 1.34 : 0);
      const isHappy = mood === 'happy';
      const blink = time > 0 && moment % 4.17 > 3.98 ? .11 : 1;
      body.scale.y = 1 + Math.sin(moment * 3) * .016;
      body.position.y = isHappy ? Math.max(0, Math.sin(time * 8)) * .11 : 0;
      head.rotation.y = mood === 'point' ? -.28 : Math.sin(moment * 1.14) * .04;
      head.rotation.z = mood === 'thinking' ? -.15 : .026 * Math.sin(moment * 2);
      lids.forEach((lid) => { lid.scale.y = blink; });
      if (tail) tail.rotation.y = Math.sin(moment * (isHappy ? 9 : 3.8)) * (isHappy ? .25 : .095);
      if (arms) {
        const wave = mood === 'wave' || mood === 'encourage';
        arms[0].rotation.z = wave ? -1.82 + Math.sin(time * 11) * .28 : isHappy ? -.82 : -.1;
        arms[1].rotation.z = mood === 'point' ? 1.28 : isHappy ? .82 : .11;
      }
    }

    return {
      group: root,
      animate,
      reset() { animate(0); },
    };
  }

  function dispose() {
    [sphere, ring, cylinder, ...geometries.values(), ...baked.values()]
      .forEach((geometry) => geometry?.dispose());
    materials.forEach((shade) => shade.dispose());
  }

  return { create, dispose };
}
