import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

function mergePlaced(
  geometries: THREE.BufferGeometry[],
  transforms: THREE.Matrix4[],
): THREE.BufferGeometry {
  const placed = geometries.map((geometry, index) => {
    const clone = geometry.clone();
    const transform = transforms[index];
    if (transform) clone.applyMatrix4(transform);
    return clone;
  });
  const merged = mergeGeometries(placed, false);
  placed.forEach((geometry) => geometry.dispose());
  geometries.forEach((geometry) => geometry.dispose());
  if (!merged) throw new Error("Không thể tạo geometry cho hàng rào.");
  return merged;
}

function translation(x: number, y: number, z: number): THREE.Matrix4 {
  return new THREE.Matrix4().makeTranslation(x, y, z);
}

function compose(
  x: number,
  y: number,
  z: number,
  scaleX = 1,
  scaleY = 1,
  scaleZ = 1,
): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion(),
    new THREE.Vector3(scaleX, scaleY, scaleZ),
  );
}

function createPicketGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.075, 0);
  shape.lineTo(0.075, 0);
  shape.lineTo(0.075, 0.36);
  shape.lineTo(0, 0.48);
  shape.lineTo(-0.075, 0.36);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.075,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.012,
    bevelThickness: 0.012,
  });
}

/** A low, camera-facing garden fence with an organic hedge silhouette. */
export class Obstacle extends THREE.Group {
  constructor(variant = 0) {
    super();
    this.name = "garden-fence";
    this.rotation.y = ((variant % 3) - 1) * 0.012;

    const soilMaterial = new THREE.MeshStandardMaterial({
      color: 0x74513a,
      roughness: 0.92,
    });
    const woodMaterial = new THREE.MeshStandardMaterial({
      color: variant % 2 === 0 ? 0xc77a43 : 0xb96c3d,
      roughness: 0.72,
      metalness: 0.02,
    });
    const woodDarkMaterial = new THREE.MeshStandardMaterial({
      color: 0x8f4f31,
      roughness: 0.84,
    });
    const hedgeMaterial = new THREE.MeshStandardMaterial({
      color: variant % 2 === 0 ? 0x4f9a50 : 0x589f4d,
      roughness: 0.82,
    });
    const leafMaterial = new THREE.MeshStandardMaterial({
      color: 0x78b95a,
      roughness: 0.78,
    });

    const planter = new THREE.Mesh(new RoundedBoxGeometry(0.88, 0.16, 0.68, 3, 0.055), soilMaterial);
    planter.position.y = 0.17;
    planter.castShadow = true;
    planter.receiveShadow = true;
    this.add(planter);

    const railGeometry = mergePlaced(
      [new THREE.BoxGeometry(0.8, 0.075, 0.075), new THREE.BoxGeometry(0.8, 0.075, 0.075)],
      [translation(0, 0.4, 0.22), translation(0, 0.61, 0.22)],
    );
    const rails = new THREE.Mesh(railGeometry, woodDarkMaterial);
    rails.castShadow = true;
    this.add(rails);

    const postGeometry = mergePlaced(
      [
        new THREE.CylinderGeometry(0.064, 0.078, 0.67, 8),
        new THREE.CylinderGeometry(0.064, 0.078, 0.67, 8),
        new THREE.ConeGeometry(0.09, 0.13, 8),
        new THREE.ConeGeometry(0.09, 0.13, 8),
      ],
      [
        translation(-0.39, 0.49, 0.2),
        translation(0.39, 0.49, 0.2),
        translation(-0.39, 0.89, 0.2),
        translation(0.39, 0.89, 0.2),
      ],
    );
    const posts = new THREE.Mesh(postGeometry, woodDarkMaterial);
    posts.castShadow = true;
    this.add(posts);

    const picketXs = [-0.27, -0.09, 0.09, 0.27];
    const picketGeometry = mergePlaced(
      picketXs.map(() => createPicketGeometry()),
      picketXs.map((x, index) => translation(x, 0.26 + (index % 2) * 0.018, 0.25)),
    );
    const pickets = new THREE.Mesh(picketGeometry, woodMaterial);
    pickets.castShadow = true;
    this.add(pickets);

    const hedgeOffsets = [
      [-0.29, 0.58, -0.08, 1, 0.86, 1],
      [-0.08, 0.68, -0.1, 1.05, 0.92, 1],
      [0.16, 0.64, -0.07, 1.08, 0.88, 1],
      [0.34, 0.56, -0.06, 0.88, 0.76, 0.9],
    ] as const;
    const hedgeGeometry = mergePlaced(
      hedgeOffsets.map(() => new THREE.DodecahedronGeometry(0.265, 1)),
      hedgeOffsets.map(([x, y, z, sx, sy, sz]) => compose(x, y, z, sx, sy, sz)),
    );
    const hedge = new THREE.Mesh(hedgeGeometry, hedgeMaterial);
    hedge.castShadow = true;
    this.add(hedge);

    const leavesGeometry = mergePlaced(
      [new THREE.SphereGeometry(0.075, 8, 6), new THREE.SphereGeometry(0.065, 8, 6)],
      [compose(-0.18, 0.54, 0.33, 1.45, 0.55, 0.75), compose(0.2, 0.71, 0.33, 1.35, 0.52, 0.72)],
    );
    const leaves = new THREE.Mesh(leavesGeometry, leafMaterial);
    leaves.rotation.z = variant % 2 === 0 ? -0.35 : 0.28;
    leaves.castShadow = true;
    this.add(leaves);

    if (variant % 3 === 0) {
      const petalMaterial = new THREE.MeshStandardMaterial({
        color: variant % 2 === 0 ? 0xffd45c : 0xff91a5,
        roughness: 0.68,
      });
      const centerMaterial = new THREE.MeshStandardMaterial({ color: 0xf0822f, roughness: 0.72 });
      const blossom = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 7), petalMaterial);
      blossom.scale.set(1.35, 0.52, 1.35);
      blossom.position.set(0.2, 0.76, 0.37);
      blossom.castShadow = true;
      this.add(blossom);
      const center = new THREE.Mesh(new THREE.SphereGeometry(0.029, 8, 6), centerMaterial);
      center.position.set(0.2, 0.765, 0.435);
      this.add(center);
    }
  }
}
