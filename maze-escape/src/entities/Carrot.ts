import * as THREE from "three";

export class Carrot extends THREE.Group {
  readonly itemId: string;
  private readonly startY = 0.38;
  private collected = false;

  constructor(itemId: string) {
    super();
    this.itemId = itemId;
    this.name = `carrot-${itemId}`;
    const orange = new THREE.MeshStandardMaterial({
      color: 0xff782f,
      roughness: 0.6,
      emissive: 0x7a2100,
      emissiveIntensity: 0.08,
    });
    const green = new THREE.MeshStandardMaterial({ color: 0x55a846, roughness: 0.72 });
    const root = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.5, 14), orange);
    root.rotation.z = Math.PI;
    root.position.y = 0.02;
    root.castShadow = true;
    this.add(root);
    for (const rotation of [-0.55, 0, 0.55]) {
      const leaf = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.18, 3, 6), green);
      leaf.position.y = 0.33;
      leaf.rotation.z = rotation;
      this.add(leaf);
    }
    const glow = new THREE.PointLight(0xffb765, 0.5, 1.7, 2);
    glow.position.y = 0.2;
    this.add(glow);
    this.position.y = this.startY;
  }

  setCollected(collected: boolean): void {
    this.collected = collected;
    this.visible = !collected;
    if (!collected) {
      this.scale.setScalar(1);
      this.position.y = this.startY;
    }
  }

  update(elapsed: number, offset: number): void {
    if (this.collected || !this.visible) return;
    this.rotation.y = elapsed * 1.7 + offset;
    this.position.y = this.startY + Math.sin(elapsed * 3 + offset) * 0.06;
  }
}
