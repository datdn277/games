import * as THREE from 'three';

const curve = (points) => new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));

export function makeFroggy({ ball, material, resources }) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const skin = material(0x87d53b, { roughness: .43 });
  const leg = material(0x66bc32, { roughness: .47 });
  const belly = material(0xffefb7);
  const whites = material(0xfffcdf, { roughness: .28 });
  const pupils = material(0x223c44, { roughness: .2 });
  const cheek = material(0xffa69a);
  const smile = material(0x365b37);
  const orange = material(0xff9c45);
  const flap = material(0xffc375);
  const strap = material(0xe88138);
  const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
  resources.add(shine);
  const line = (parent, points, radius, mat) => {
    const geometry = new THREE.TubeGeometry(curve(points), 16, radius, 8, false);
    resources.add(geometry);
    const mesh = new THREE.Mesh(geometry, mat);
    parent.add(mesh);
    return mesh;
  };

  ball(body, skin, [0, .59, -.04], [.51, .55, .39]);
  ball(body, belly, [0, .53, .24], [.38, .40, .21]);
  const pack = ball(body, orange, [.03, .60, -.36], [.47, .44, .26]);
  pack.rotation.z = -.13;
  ball(body, flap, [.06, .78, -.50], [.40, .25, .18]);
  ball(body, strap, [.40, .37, -.35], [.15, .19, .16]);
  line(body, [[-.38, .88, -.28], [-.43, .75, .09], [-.39, .57, .21], [-.29, .32, .17]], .052, strap);
  line(body, [[.38, .88, -.28], [.43, .75, .09], [.39, .57, .21], [.29, .32, .17]], .052, strap);
  line(body, [[-.12, .95, -.49], [-.09, 1.04, -.51], [.09, 1.04, -.51], [.14, .94, -.49]], .043, strap);

  const head = new THREE.Group();
  head.position.set(0, 1.01, .10);
  body.add(head);
  ball(head, skin, [0, 0, .05], [.69, .46, .52]);
  const eyes = [];
  const arms = [];
  const feet = [];
  for (const side of [-1, 1]) {
    ball(head, skin, [.38 * side, .34, .055], [.30, .33, .29]);
    const eye = new THREE.Group();
    eye.position.set(.365 * side, .345, .248);
    head.add(eye);
    eyes.push(eye);
    ball(eye, whites, [0, 0, 0], [.236, .253, .151]);
    ball(eye, pupils, [-.017 * side, .005, .12], [.134, .159, .068]);
    ball(eye, shine, [-.058, .074, .172], [.047, .050, .021]);
    ball(eye, shine, [.031, -.05, .178], [.020, .022, .012]);
    const blush = ball(head, cheek, [.475 * side, -.11, .401], [.115, .073, .040]);
    blush.rotation.y = .45 * side;
    ball(head, smile, [.119 * side, .031, .565], [.021, .016, .012]);

    const arm = new THREE.Group();
    arm.position.set(.40 * side, .70, .13);
    arm.rotation.z = .34 * side;
    body.add(arm);
    ball(arm, skin, [0, -.19, 0], [.148, .29, .135]);
    for (const toe of [-1, 0, 1]) {
      ball(arm, skin, [toe * .066, -.36, .047 + Math.abs(toe) * .016], [.048, .085, .057]);
    }
    arms.push(arm);

    const foot = new THREE.Group();
    foot.position.set(side * .43, .20, -.04);
    body.add(foot);
    const thigh = ball(foot, leg, [side * .034, .09, -.06], [.255, .27, .27]);
    thigh.rotation.z = -.38 * side;
    ball(foot, skin, [side * .11, -.108, .15], [.212, .108, .26]);
    for (const toe of [-1, 0, 1]) {
      ball(foot, skin, [side * .10 + toe * .11, -.116, .32 - Math.abs(toe) * .042], [.073, .073, .135]);
    }
    feet.push(foot);
  }
  line(head, [[-.433, -.045, .447], [-.334, -.126, .495], [-.18, -.19, .535],
    [0, -.208, .532], [.18, -.19, .535], [.334, -.126, .495], [.433, -.045, .447]], .026, smile);
  return { root, body, head, eyes, arms, feet };
}
