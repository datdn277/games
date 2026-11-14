import * as THREE from "three";

export class Burrow extends THREE.Group {
  private readonly door: THREE.Mesh;
  private readonly halo: THREE.Mesh;

  constructor() {
    super();
    this.name = "burrow";
    const earth = new THREE.MeshStandardMaterial({ color: 0xa66a45, roughness: 0.95 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x3e2a25, roughness: 0.9 });
    const stone = new THREE.MeshStandardMaterial({ color: 0xd69c61, roughness: 0.9 });
    const mound = new THREE.Mesh(new THREE.SphereGeometry(0.48, 20, 14), earth);
    mound.scale.set(1.25, 0.75, 0.82);
    mound.position.y = 0.32;
    mound.castShadow = true;
    this.add(mound);
    this.door = new THREE.Mesh(new THREE.CircleGeometry(0.24, 20), dark);
    this.door.position.set(0, 0.3, 0.38);
    this.add(this.door);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.055, 8, 24, Math.PI), stone);
    rim.position.set(0, 0.3, 0.39);
    rim.rotation.z = Math.PI;
    this.add(rim);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd86a,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.halo = new THREE.Mesh(new THREE.RingGeometry(0.38, 0.48, 32), haloMaterial);
    this.halo.rotation.x = -Math.PI / 2;
    this.halo.position.y = 0.04;
    this.add(this.halo);
  }

  setOpen(open: boolean): void {
    this.door.scale.y = open ? 1.18 : 0.72;
    const material = this.halo.material;
    if (material instanceof THREE.MeshBasicMaterial) {
      material.color.set(open ? 0xffd44d : 0xe6aa68);
      material.opacity = open ? 0.65 : 0.24;
    }
  }

  update(elapsed: number): void {
    this.halo.rotation.z = elapsed * 0.25;
  }
}
