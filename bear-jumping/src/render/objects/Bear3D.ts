import * as THREE from 'three';
import type { Direction, GridCell, RunOutcomeKind } from '../../game/types';
import { AnimationController, easeInOutSine } from '../AnimationController';
import { getCellCenter, TILE_TOP_Y } from '../coordinates';

const DIRECTION_ROTATION: Readonly<Record<Direction, number>> = {
  up: 0,
  right: -Math.PI / 2,
  down: Math.PI,
  left: Math.PI / 2,
};

export class Bear3D {
  readonly root = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly headPivot = new THREE.Group();
  private readonly leftArmPivot = new THREE.Group();
  private readonly rightArmPivot = new THREE.Group();
  private readonly leftLegPivot = new THREE.Group();
  private readonly rightLegPivot = new THREE.Group();
  private readonly shadow: THREE.Mesh;
  private readonly geometries = new Set<THREE.BufferGeometry>();
  private readonly materials = new Set<THREE.Material>();
  private readonly startPosition = new THREE.Vector3();
  private readonly endPosition = new THREE.Vector3();
  private idleTime = 0;
  private externallyAnimating = false;

  constructor() {
    this.root.name = 'BearRoot';
    this.body.name = 'BearBody';
    this.root.add(this.body);

    const fur = this.material(new THREE.MeshStandardMaterial({ color: 0x9a5c34, roughness: 0.88 }));
    const lightFur = this.material(new THREE.MeshStandardMaterial({ color: 0xe9b77f, roughness: 0.9 }));
    const dark = this.material(new THREE.MeshStandardMaterial({ color: 0x34221d, roughness: 0.8 }));
    const cheek = this.material(new THREE.MeshStandardMaterial({ color: 0xe88977, roughness: 0.9 }));
    const shadowMaterial = this.material(
      new THREE.MeshBasicMaterial({ color: 0x173d2e, transparent: true, opacity: 0.23, depthWrite: false }),
    );

    this.shadow = new THREE.Mesh(this.geometry(new THREE.CircleGeometry(0.42, 28)), shadowMaterial);
    this.shadow.name = 'Shadow';
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.012;
    this.root.add(this.shadow);

    const torso = this.mesh(new THREE.CapsuleGeometry(0.37, 0.48, 5, 12), fur);
    torso.name = 'Torso';
    torso.position.y = 0.87;
    torso.scale.z = 0.86;
    this.body.add(torso);

    this.headPivot.position.y = 1.38;
    this.body.add(this.headPivot);
    const head = this.mesh(new THREE.SphereGeometry(0.43, 18, 14), fur);
    head.name = 'Head';
    this.headPivot.add(head);

    const earGeometry = this.geometry(new THREE.SphereGeometry(0.16, 12, 10));
    const earLeft = this.mesh(earGeometry, fur);
    const earRight = this.mesh(earGeometry, fur);
    earLeft.position.set(-0.29, 0.29, 0);
    earRight.position.set(0.29, 0.29, 0);
    this.headPivot.add(earLeft, earRight);

    const muzzle = this.mesh(new THREE.SphereGeometry(0.23, 14, 10), lightFur);
    muzzle.position.set(0, -0.08, -0.34);
    muzzle.scale.set(1.1, 0.72, 0.55);
    this.headPivot.add(muzzle);

    const nose = this.mesh(new THREE.SphereGeometry(0.07, 10, 8), dark);
    nose.position.set(0, -0.02, -0.47);
    nose.scale.z = 0.5;
    this.headPivot.add(nose);

    const eyeGeometry = this.geometry(new THREE.SphereGeometry(0.045, 9, 7));
    for (const x of [-0.16, 0.16]) {
      const eye = this.mesh(eyeGeometry, dark);
      eye.position.set(x, 0.1, -0.38);
      this.headPivot.add(eye);
    }
    const cheekGeometry = this.geometry(new THREE.SphereGeometry(0.055, 9, 7));
    for (const x of [-0.27, 0.27]) {
      const cheekMesh = this.mesh(cheekGeometry, cheek);
      cheekMesh.position.set(x, -0.08, -0.35);
      cheekMesh.scale.z = 0.4;
      this.headPivot.add(cheekMesh);
    }

    this.buildLimb(this.leftArmPivot, -0.42, 1.08, -0.03, fur, 'LeftArm');
    this.buildLimb(this.rightArmPivot, 0.42, 1.08, -0.03, fur, 'RightArm');
    this.buildLimb(this.leftLegPivot, -0.2, 0.48, 0, dark, 'LeftLeg');
    this.buildLimb(this.rightLegPivot, 0.2, 0.48, 0, dark, 'RightLeg');

    this.setCell({ row: 0, col: 0 });
  }

  private geometry<T extends THREE.BufferGeometry>(geometry: T): T {
    this.geometries.add(geometry);
    return geometry;
  }

  private material<T extends THREE.Material>(material: T): T {
    this.materials.add(material);
    return material;
  }

  private mesh(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private buildLimb(
    pivot: THREE.Group,
    x: number,
    y: number,
    z: number,
    material: THREE.Material,
    name: string,
  ): void {
    pivot.position.set(x, y, z);
    pivot.name = `${name}Pivot`;
    const limb = this.mesh(this.geometry(new THREE.CapsuleGeometry(0.11, 0.36, 4, 8)), material);
    limb.name = name;
    limb.position.y = -0.24;
    pivot.add(limb);
    this.body.add(pivot);
  }

  setCell(cell: GridCell): void {
    const position = getCellCenter(cell, this.startPosition);
    this.root.position.set(position.x, TILE_TOP_Y + 0.01, position.z);
    this.resetPose();
  }

  async moveTo(
    from: GridCell,
    to: GridCell,
    direction: Direction,
    totalDurationMs: number,
    animationController: AnimationController,
    reducedMotion: boolean,
  ): Promise<boolean> {
    this.externallyAnimating = true;
    const turnDuration = Math.min(0.18, totalDurationMs / 1000 * 0.28);
    const targetRotation = DIRECTION_ROTATION[direction];
    const startingRotation = this.root.rotation.y;
    const shortestDelta = Math.atan2(
      Math.sin(targetRotation - startingRotation),
      Math.cos(targetRotation - startingRotation),
    );

    const turned = await animationController.play(turnDuration, (progress) => {
      this.root.rotation.y = startingRotation + shortestDelta * progress;
      this.body.rotation.z = Math.sin(progress * Math.PI) * (reducedMotion ? 0.015 : 0.045);
    }, easeInOutSine);
    if (!turned) return this.finishInterrupted();

    getCellCenter(from, this.startPosition);
    getCellCenter(to, this.endPosition);
    const moveDuration = Math.max(0.12, totalDurationMs / 1000 - turnDuration);
    const moved = await animationController.play(moveDuration, (progress) => {
      this.root.position.x = THREE.MathUtils.lerp(this.startPosition.x, this.endPosition.x, progress);
      this.root.position.z = THREE.MathUtils.lerp(this.startPosition.z, this.endPosition.z, progress);
      const stride = Math.sin(progress * Math.PI * 2);
      const swing = stride * (reducedMotion ? 0.16 : 0.52);
      this.leftArmPivot.rotation.x = swing;
      this.rightArmPivot.rotation.x = -swing;
      this.leftLegPivot.rotation.x = -swing * 0.72;
      this.rightLegPivot.rotation.x = swing * 0.72;
      const bounce = Math.abs(Math.sin(progress * Math.PI * 2)) * (reducedMotion ? 0.025 : 0.09);
      this.body.position.y = bounce;
      const shadowScale = 1 - bounce * 0.65;
      this.shadow.scale.set(shadowScale, shadowScale, 1);
    }, easeInOutSine);

    this.externallyAnimating = false;
    this.resetPose();
    return moved;
  }

  async reactToProblem(
    kind: Exclude<RunOutcomeKind, 'success'>,
    animationController: AnimationController,
    reducedMotion: boolean,
  ): Promise<boolean> {
    this.externallyAnimating = true;
    const completed = await animationController.play(reducedMotion ? 0.28 : 0.5, (progress) => {
      const wave = Math.sin(progress * Math.PI * 2);
      if (kind === 'missing-command') {
        this.headPivot.rotation.z = wave * (reducedMotion ? 0.08 : 0.22);
        this.headPivot.rotation.x = Math.sin(progress * Math.PI) * 0.12;
      } else {
        this.body.position.x = wave * (reducedMotion ? 0.02 : 0.07);
        this.body.rotation.z = wave * (reducedMotion ? 0.025 : 0.08);
      }
    }, easeInOutSine);
    this.externallyAnimating = false;
    this.resetPose();
    return completed;
  }

  async celebrate(animationController: AnimationController, reducedMotion: boolean): Promise<boolean> {
    this.externallyAnimating = true;
    const completed = await animationController.play(reducedMotion ? 0.55 : 1.05, (progress) => {
      const jump = Math.abs(Math.sin(progress * Math.PI * 2)) * (reducedMotion ? 0.08 : 0.3);
      this.body.position.y = jump;
      this.leftArmPivot.rotation.z = -Math.sin(progress * Math.PI) * 2.1;
      this.rightArmPivot.rotation.z = Math.sin(progress * Math.PI) * 2.1;
      this.body.rotation.y = Math.sin(progress * Math.PI * 2) * (reducedMotion ? 0.08 : 0.22);
      const shadowScale = 1 - jump * 0.75;
      this.shadow.scale.set(shadowScale, shadowScale, 1);
    }, easeInOutSine);
    this.externallyAnimating = false;
    this.resetPose();
    return completed;
  }

  update(delta: number): void {
    if (this.externallyAnimating) return;
    this.idleTime += delta;
    this.body.position.y = Math.sin(this.idleTime * 2.1) * 0.012;
    this.headPivot.rotation.y = Math.sin(this.idleTime * 0.8) * 0.025;
  }

  private finishInterrupted(): false {
    this.externallyAnimating = false;
    this.resetPose();
    return false;
  }

  private resetPose(): void {
    this.body.position.set(0, 0, 0);
    this.body.rotation.set(0, 0, 0);
    this.headPivot.rotation.set(0, 0, 0);
    this.leftArmPivot.rotation.set(0, 0, 0);
    this.rightArmPivot.rotation.set(0, 0, 0);
    this.leftLegPivot.rotation.set(0, 0, 0);
    this.rightLegPivot.rotation.set(0, 0, 0);
    this.shadow.scale.set(1, 1, 1);
  }

  dispose(): void {
    this.geometries.forEach((geometry) => geometry.dispose());
    this.materials.forEach((material) => material.dispose());
  }
}
