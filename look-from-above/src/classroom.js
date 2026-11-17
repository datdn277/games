import * as THREE from 'three';
import { createStudioGeometry } from './studio-geometry.js';

function mapleGrain(art) {
  const size = 128;
  const pixels = new Uint8Array(size * size * 4);
  const maple = [230, 180, 123];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const longWave = Math.sin(x / 35 + .25 * Math.sin(y * .13));
      const fiber = Math.sin(y * .47 + longWave * .95) + .36 * Math.sin(y * 1.47 + x / 33);
      const grain = fiber * 3.7 + Math.cos(y * .09 + x * .065) * 2.1;
      const offset = (y * size + x) * 4;
      maple.forEach((base, index) => { pixels[offset + index] = base + grain; });
      pixels[offset + 3] = 255;
    }
  }
  const map = art.own(new THREE.DataTexture(pixels, size, size));
  map.colorSpace = THREE.SRGBColorSpace;
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.generateMipmaps = true;
  map.needsUpdate = true;
  return map;
}

function windowScene(parent, art) {
  const { block, group, oval, mesh, surface } = art;
  const window = group(parent, 4.25, 3.42, -4.60);
  const frame = surface(0xffe9bb);
  const gold = surface(0xe5ac79);
  block(window, surface(0x95b4c2), [.04, -.08, -.04], [3.52, 3.54, .16], .25);
  block(window, gold, [0, 0, .07], [3.53, 3.58, .30], .20);
  block(window, frame, [0, 0, .19], [3.39, 3.43, .20], .18);
  const glass = block(window, surface(0x93d8ed), [0, .002, .29], [3.08, 3.10, .07], .037);
  glass.material = art.own(new THREE.MeshBasicMaterial({ color: 0x9cdef2, toneMapped: false }));
  const pastelSky = art.own(new THREE.MeshBasicMaterial({ color: 0xe6f8f2, toneMapped: false }));
  const sun = art.own(new THREE.MeshBasicMaterial({ color: 0xffe69c, toneMapped: false }));
  oval(window, sun, [.84, .89, .35], [.28, .28, .035]);

  for (const [x, y, s] of [[-.94, .85, .50], [-.59, .25, .43], [1.04, .34, .39]]) {
    oval(window, pastelSky, [x, y, .36], [s, .059, .042]);
    oval(window, pastelSky, [x + s * .20, y + .067, .36], [s * .46, .106, .05]);
    oval(window, pastelSky, [x - s * .31, y + .044, .369], [s * .43, .074, .053]);
  }

  const ridge = (height, shift) => {
    const path = new THREE.Shape();
    path.moveTo(-1.515, -1.51);
    path.lineTo(1.515, -1.51);
    path.lineTo(1.515, height);
    path.bezierCurveTo(.94, height + .30, .55 + shift, height + .50, .05, height + .33);
    path.bezierCurveTo(-.51, height + .20, -.88 + shift, height - .08, -1.515, height + .14);
    path.closePath();
    return new THREE.ShapeGeometry(path, 17);
  };
  for (const [color, y, offset, index] of [[0x9ad3cd, -.39, 0, 0], [0x71c0b2, -.77, -.23, 1], [0x72afac, -1.10, .38, 2]]) {
    mesh(window, art.own(ridge(y, offset)), art.own(new THREE.MeshBasicMaterial({ color, toneMapped: false })),
      [0, 0, .375 + index * .013]);
  }
  block(window, frame, [0, 0, .416], [.085, 3.10, .10], .023);
  block(window, frame, [0, -.238, .416], [3.11, .077, .10], .023);
  block(window, frame, [0, -1.775, .335], [3.70, .18, .49], .068);
}

function diagramBoard(parent, art) {
  const { block, group, star, surface, tube } = art;
  const chalk = group(parent, -3.77, 3.72, -4.51);
  const trim = surface(0xc39268);
  const dark = surface(0x577e75);
  const yellow = surface(0xf9df9e);
  const white = surface(0xf4f4d5);
  block(chalk, surface(0x9eaabc), [.035, -.08, -.125], [4.39, 2.38, .19], .15);
  block(chalk, trim, [0, 0, .004], [4.37, 2.38, .22], .15);
  block(chalk, dark, [0, .019, .121], [4.03, 2.06, .072], .10);
  block(chalk, trim, [0, -1.111, .174], [3.80, .13, .32], .05);
  block(chalk, white, [1.28, -1.029, .218], [.23, .062, .063], .02).rotation.y = -.31;
  block(chalk, yellow, [1.56, -1.028, .22], [.19, .054, .057], .02).rotation.y = .22;

  const vertices = [[-.64, .68], [-.10, .37], [-.10, -.24], [-.64, -.56], [-1.18, -.23], [-1.18, .37], [-.64, .02]];
  const links = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [1, 6], [5, 6], [6, 3]];
  for (const [first, second] of links) tube(chalk, white, [...vertices[first], .169], [...vertices[second], .169], .024);
  tube(chalk, yellow, [.16, .12, .174], [.51, .12, .174], .026);
  tube(chalk, yellow, [.38, .26, .174], [.51, .12, .174], .026);
  tube(chalk, yellow, [.38, -.02, .174], [.51, .12, .174], .026);
  for (const [x, y] of [[.80, .37], [1.175, .37], [1.175, -.02]]) {
    block(chalk, yellow, [x, y, .167], [.307, .31, .032], .027);
  }
  star(chalk, white, [1.665, .611, .168], .096, 4);
}

function shelves(parent, art) {
  const { group, block, surface, oval } = art;
  const shelf = group(parent, -4.39, 1.81, -4.25);
  const wood = surface(0xc18b60);
  const linen = surface(0xffe9be);
  block(shelf, wood, [0, -.05, 0], [2.84, .15, .66], .043);
  for (const x of [-1.04, 1.04]) block(shelf, wood, [x, -.28, -.12], [.12, .46, .23], .045);
  const bookColors = [0xa399d3, 0xe4a97e, 0x79beb4, 0xecadbc, 0x9dcde4];
  for (let index = 0; index < bookColors.length; index += 1) {
    const height = [.57, .72, .61, .49, .67][index];
    const book = group(shelf, -1.07 + index * .245, height * .5 + .03, .025);
    const binding = surface(bookColors[index]);
    book.rotation.z = index === 4 ? -.22 : index === 0 ? .063 : 0;
    block(book, binding, [0, 0, 0], [.20, height, .34], .030);
    block(book, linen, [0, 0, .166], [.123, height * .83, .028], .013);
    block(book, binding, [0, height * .14, .186], [.125, .055, .019], .006);
  }
  const toy = group(shelf, .82, .017, .014);
  toy.rotation.z = .03;
  const cart = surface(0xe5aa76);
  block(toy, cart, [0, .11, 0], [.61, .20, .45], .08);
  oval(toy, surface(0xa28bbb), [-.18, .072, .22], [.081, .081, .037]);
  oval(toy, surface(0xa28bbb), [.18, .072, .22], [.081, .081, .037]);
  block(toy, surface(0xffdda2), [-.11, .275, -.018], [.22, .24, .26], .038);
  block(toy, surface(0x9fcbbe), [.139, .256, .008], [.197, .20, .24], .034);
}

function deskProps(parent, art) {
  const { block, disc, oval, group, surface } = art;
  const pot = group(parent, -4.54, -.151, -1.80);
  disc(pot, surface(0xc98b97), [0, .069, 0], .325, .125, .28);
  disc(pot, surface(0xe0a2a1), [0, .224, 0], .281, .33, .246);
  disc(pot, surface(0xa6817c), [0, .387, 0], .253, .043, .225);
  disc(pot, surface(0xe5aeaa), [0, .369, 0], .291, .095, .25);
  const mud = disc(pot, surface(0x987e77), [0, .423, 0], .237, .016, .209);
  mud.receiveShadow = true;
  const foliage = [0x75b29c, 0x8cc5a2, 0xb0cc9e, 0x6fa9a3, 0x9dd0af];
  for (let index = 0; index < foliage.length; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const height = [.395, .445, .535, .32, .488][index];
    const leaf = oval(pot, surface(foliage[index]),
      [side * (.065 + index * .022), .329 + height * .812, .035 * (index - 2)],
      [.081, height * .67, .042]);
    leaf.rotation.z = side * -(.50 + index * .11);
  }

  const samples = group(parent, 4.63, -.149, -2.20);
  for (const [x, y, z, color, angle] of [
    [0, .234, .10, 0xb4a5d9, .36], [-.47, .181, -.16, 0xf5c5a0, -.24], [.44, .161, -.17, 0x91cdbf, -.15],
  ]) {
    const size = y * 1.96;
    block(samples, surface(color), [x, y, z], [size, size, size], .047).rotation.y = angle;
  }
  return { pot, samples };
}

export function createClassroom({ reducedMotion = false } = {}) {
  const art = createStudioGeometry();
  const { group, block, mesh, surface, shape, star, tube } = art;
  const root = new THREE.Group();
  root.name = 'Toy workshop';
  const wall = surface(0xdbe8ee);
  const tea = surface(0xb6d6cc);
  const seafoam = surface(0xc8e0d5);
  const boardEdge = surface(0x82b4aa);
  const timber = surface(0xc78f68);
  const paleTimber = surface(0xe2b185);
  const floor = surface(0xeedfc7);
  block(root, floor, [0, -2.80, 1.55], [34, .24, 29], .04).receiveShadow = true;
  block(root, wall, [0, 1.76, -4.94], [32, 9.0, .23], .055);
  block(root, seafoam, [0, -.599, -4.797], [32, 4.22, .16], .025);
  block(root, tea, [0, 1.48, -4.677], [31.8, .145, .16], .039);
  block(root, boardEdge, [0, -2.55, -4.671], [31.8, .19, .16], .044);
  const seams = new THREE.InstancedMesh(shape('wall-seam', () => new THREE.BoxGeometry(.040, 3.79, .055)), tea, 20);
  const transform = new THREE.Matrix4();
  for (let index = 0; index < seams.count; index += 1) {
    transform.makeTranslation((index - 9.5) * 1.21, -.537, -4.694);
    seams.setMatrixAt(index, transform);
  }
  root.add(seams);

  for (const side of [-1, 1]) {
    for (const z of [-3.51, 4.21]) block(root, timber, [side * 5.63, -1.53, z], [.37, 2.34, .39], .088);
  }
  block(root, boardEdge, [0, -.598, 4.21], [12.66, .46, .23], .059);
  block(root, timber, [0, -.45, .249], [13.49, .26, 9.66], .102);
  block(root, paleTimber, [0, -.345, .249], [13.81, .28, 9.99], .113);
  const wood = art.own(new THREE.MeshStandardMaterial({ map: mapleGrain(art), roughness: .79 }));
  block(root, wood, [0, -.268, .249], [13.69, .237, 9.95], .095).receiveShadow = true;

  const details = group(root);
  windowScene(details, art);
  diagramBoard(details, art);
  shelves(details, art);
  const { pot, samples } = deskProps(details, art);
  const starShades = [surface(0xffd78d), surface(0xd2bce8), surface(0xc0dfcc), surface(0xf2bdac)];
  const ornaments = [[-.98, 5.33, -.18, .225], [1.11, 4.89, .45, .132], [.28, 4.38, .28, .173], [-.19, 5.67, -.16, .092]].map(([x, y, r, s], index) => {
    const item = star(details, starShades[index], [x, y, -4.61], s);
    item.rotation.z = r;
    if (s > .15) tube(details, surface(0xb2b8c0), [x, y + s, -4.63], [x, y + .72, -4.63], .012);
    return { item, base: r, offset: index };
  });

  return {
    group: root,
    update(time) {
      if (reducedMotion || !details.visible) return;
      for (const { item, base, offset } of ornaments) {
        item.rotation.z = base + Math.sin(time * 1.15 + offset) * .063;
        item.rotation.y = Math.cos(time * .95 + offset) * .17;
      }
    },
    setMode(mode) { samples.visible = mode === 'menu'; },
    setTop(progress) {
      pot.visible = progress < .82;
      details.visible = progress < .90;
    },
    dispose: art.dispose,
  };
}
