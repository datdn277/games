import * as THREE from 'three';
import { createStudioGeometry } from './studio-geometry.js';

export function createBobo({ reducedMotion = false } = {}) {
  const art = createStudioGeometry();
  const { surface, oval, disc, torus, star, group } = art;
  const root = new THREE.Group();
  root.name = 'Bobo';
  const model = group(root);
  const head = group(model, 0, 1.34, -.005);
  const honey = surface(0xca8b56);
  const toast = surface(0xaf744b);
  const sienna = surface(0xd49a63);
  const soft = surface(0xf4ca91);
  const cream = surface(0xffe7b8);
  const white = surface(0xfff6e4);
  const ink = surface(0x2f2d44, .32);
  const hazel = surface(0x995e3c, .40);
  const rose = surface(0xed9091);
  const golden = surface(0xe99c38, .47);
  const sunny = surface(0xffcc63, .45);
  const scarf = surface(0x589eab);
  const sky = surface(0x99dce2);

  const body = oval(model, honey, [0, .64, 0], [.55, .58, .45]);
  body.castShadow = true;
  oval(model, cream, [0, .55, .29], [.435, .415, .22]);
  oval(model, soft, [0, .51, -.31], [.28, .14, .32]).rotation.x = .52;
  for (const [x, y, tilt] of [[-.15, .62, .24], [.15, .62, -.24], [0, .42, 0]]) {
    const feather = oval(model, soft, [x, y, .496], [.078, .032, .026]);
    feather.rotation.z = tilt;
  }
  for (const side of [-1, 1]) {
    for (const toe of [-1, 0, 1]) {
      const foot = oval(model, golden, [side * .23 + toe * .084, .10, .244 + (toe === 0 ? .035 : 0)], [.071, .075, .15]);
      foot.rotation.y = -.13 * toe;
    }
  }
  disc(model, scarf, [0, .98, .04], .365, .144, .38).rotation.z = .08;
  const bandanaTip = oval(model, sky, [.16, .89, .382], [.117, .20, .063]);
  bandanaTip.rotation.z = .53;
  oval(model, scarf, [.039, .972, .39], [.092, .078, .062]);
  star(model, sunny, [.052, .974, .451], .048, 4);

  const wings = [-1, 1].map((side) => {
    const wing = group(model, side * .44, .87, -.025);
    const palm = oval(wing, toast, [side * .13, -.23, 0], [.187, .335, .22]);
    palm.rotation.z = side * .22;
    palm.castShadow = true;
    const shoulder = oval(wing, sienna, [side * .075, -.17, .104], [.144, .237, .136]);
    shoulder.rotation.z = side * .27;
    for (let i = 0; i < 3; i += 1) {
      const feather = oval(wing, i === 0 ? sienna : honey,
        [side * (.135 + i * .052), -.33 + i * .055, .116 - i * .013],
        [.072, .165 - i * .016, .088]);
      feather.rotation.z = side * .37;
    }
    return wing;
  });

  const skull = oval(head, honey, [0, 0, 0], [.687, .561, .476]);
  skull.castShadow = true;
  for (const side of [-1, 1]) {
    const tuft = oval(head, toast, [side * .493, .347, -.052], [.165, .196, .156]);
    tuft.rotation.z = side * -.47;
    oval(head, sienna, [side * .524, .362, .046], [.104, .138, .098]).rotation.z = side * -.38;
    const cheekMask = oval(head, cream, [side * .284, -.079, .351], [.365, .329, .193]);
    cheekMask.rotation.z = side * -.125;
    const cheek = oval(head, rose, [side * .465, -.188, .461], [.104, .060, .035]);
    cheek.rotation.z = -side * .19;
    oval(head, soft, [side * .491, -.167, .479], [.038, .015, .018]).rotation.z = -side * .16;
  }

  const eyes = [-1, 1].map((side) => {
    const socket = group(head, side * .269, .056, .49);
    socket.rotation.y = side * .114;
    oval(socket, soft, [0, 0, 0], [.225, .234, .078]);
    const eye = group(socket, 0, .008, .036);
    oval(eye, white, [0, 0, 0], [.207, .215, .070]);
    const iris = group(eye, 0, -.011, .060);
    oval(iris, hazel, [0, 0, 0], [.137, .152, .027]);
    oval(iris, ink, [0, .011, .019], [.108, .124, .023]);
    oval(iris, white, [-.043, .068, .033], [.043, .045, .013]);
    oval(iris, sky, [.046, -.053, .034], [.019, .020, .008]);
    const eyebrow = oval(head, toast, [side * .281, .306, .445], [.122, .040, .035]);
    eyebrow.rotation.z = side * -.19;
    return { eye, iris, eyebrow, side };
  });
  const beak = oval(head, golden, [0, -.112, .531], [.147, .128, .145]);
  beak.rotation.x = .16;
  const beakTop = oval(head, sunny, [0, -.079, .587], [.119, .084, .111]);
  beakTop.rotation.x = .17;
  oval(head, surface(0x996448), [0, -.224, .495], [.075, .022, .025]);

  const hat = group(head, .037, .443, -.007);
  hat.rotation.z = -.092;
  const sand = surface(0xe4ba78);
  const lightSand = surface(0xffdc98);
  const brim = disc(hat, sand, [0, .028, .018], .592, .056, .485);
  brim.rotation.x = -.045;
  oval(hat, lightSand, [0, .070, .009], [.573, .052, .479]);
  const crown = oval(hat, sand, [0, .171, -.01], [.414, .311, .341]);
  crown.castShadow = true;
  oval(hat, lightSand, [-.065, .276, .025], [.306, .208, .278]);
  const band = torus(hat, scarf, [0, .102, -.005], .397, .334);
  band.rotation.x = Math.PI / 2;
  disc(hat, scarf, [0, .124, -.009], .410, .056, .346);
  const compass = group(hat, 0, .169, .335);
  oval(compass, golden, [0, 0, 0], [.098, .096, .049]);
  oval(compass, white, [0, 0, .039], [.067, .067, .019]);
  const pointer = star(compass, scarf, [0, 0, .055], .047, 4);
  pointer.rotation.z = -.35;

  function animate(time, mood = 'idle') {
    const t = reducedMotion ? 0 : time;
    const flying = mood === 'fly' || mood === 'flying';
    const bright = mood === 'happy' || mood === 'celebrate' || mood === 'encourage';
    const thinking = mood === 'thinking' || mood === 'think';
    const pointing = mood === 'point' || mood === 'pointing';
    const waving = mood === 'wave' || mood === 'waving';
    const bounce = reducedMotion ? 0 : flying ? .32 + .115 * Math.sin(t * 10) : bright ? Math.max(0, Math.sin(t * 11)) * .13 : .018 * Math.sin(t * 2.35);
    model.position.y = bounce;
    model.rotation.x = flying ? -.13 : 0;
    model.rotation.z = flying && !reducedMotion ? Math.sin(t * 4) * .10 : 0;
    head.rotation.z = thinking ? .13 : pointing ? -.12 : .036 * Math.sin(t * 2.1);
    head.rotation.y = pointing ? -.25 : thinking ? .11 : .046 * Math.sin(t * 1.3);
    head.rotation.x = flying ? -.10 : 0;
    const blinking = !reducedMotion && (t + .85) % 4.3 < .15;
    for (const { eye, iris, eyebrow, side } of eyes) {
      eye.scale.y = blinking ? .1 : bright ? .93 : 1;
      iris.position.x = pointing ? -.039 : thinking ? .022 : Math.sin(t * 1.2) * .008;
      iris.position.y = thinking ? .021 : -.012;
      eyebrow.rotation.z = side * (thinking ? .24 : -.18);
    }
    for (const [index, wing] of wings.entries()) {
      const side = index === 0 ? -1 : 1;
      wing.rotation.z = flying ? side * (1.05 + .49 * Math.sin(t * 16.4))
        : pointing && side < 0 ? -1.31
        : waving && side > 0 ? 1.11 + .32 * Math.sin(t * 10)
        : bright ? side * (.49 + .20 * Math.sin(t * 8))
        : side * (.035 + .046 * Math.sin(t * 2.15));
      wing.rotation.x = flying ? -.24 : waving && side > 0 ? -.40 : -.02;
    }
  }

  return { group: root, animate, dispose: art.dispose };
}
