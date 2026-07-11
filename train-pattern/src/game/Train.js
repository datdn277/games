import * as THREE from "three";
import { TrainCar } from "./TrainCar.js";

const CAR_SPACING = 1.72;
const FIRST_CAR_X = 2.1;

function material(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.58, metalness: 0.03 });
}

export class Train {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.cars = [];
    this.moving = false;
    this.smoke = [];
    scene.add(this.group);
  }

  build(level) {
    this.disposeChildren();
    this.level = level;
    this.locomotive = this.createLocomotive();
    this.group.add(this.locomotive);
    level.visibleSequence.forEach((item, index) => {
      const car = new TrainCar(item, { missing: item === null, index });
      car.group.position.x = FIRST_CAR_X + index * CAR_SPACING;
      this.group.add(car.group);
      this.cars.push(car);
    });
    const bounds = new THREE.Box3().setFromObject(this.group);
    this.width = bounds.max.x - bounds.min.x;
    this.group.position.set(-(bounds.min.x + bounds.max.x) / 2, -0.6, 0);
    this.startX = this.group.position.x;
    return this.width;
  }

  createLocomotive() {
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.48, 1.1), material("#e7534f"));
    base.position.y = 0.75;
    base.castShadow = true;
    group.add(base);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.45, 1.0), material("#ef6d5f"));
    cabin.position.set(-0.42, 1.52, 0);
    cabin.castShadow = true;
    group.add(cabin);
    const windowMaterial = material("#bde9ff");
    const windowMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.52), windowMaterial);
    windowMesh.position.set(-0.42, 1.72, 0.506);
    group.add(windowMesh);
    const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 1.4, 24), material("#ff9f43"));
    boiler.rotation.z = Math.PI / 2;
    boiler.position.set(0.73, 1.35, 0);
    boiler.castShadow = true;
    group.add(boiler);
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 0.85, 18), material("#59443c"));
    chimney.position.set(0.92, 2.05, 0);
    group.add(chimney);
    this.chimney = chimney;
    this.locoWheels = [];
    [-0.65, 0.63].forEach((x) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.2, 22), material("#493a35"));
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.4, 0.52);
      wheel.castShadow = true;
      group.add(wheel);
      this.locoWheels.push(wheel);
    });
    return group;
  }

  fillMissing(item) {
    this.cars[this.level.missingIndex]?.setItem(item);
  }

  highlightGroups(groups) {
    this.clearHighlights();
    groups.forEach((indices, groupIndex) => {
      const color = ["#ffd93d", "#76e0c2", "#d6a4ff"][groupIndex % 3];
      indices.forEach((index) => this.cars[index]?.setHighlight(true, color));
    });
  }

  clearHighlights() {
    this.cars.forEach((car) => car.setHighlight(false));
  }

  getMissingWorldPosition(target = new THREE.Vector3()) {
    const car = this.cars[this.level.missingIndex];
    return car.group.getWorldPosition(target).add(new THREE.Vector3(0, 1.2, 0.6));
  }

  setDropGlow(active) {
    const car = this.cars[this.level?.missingIndex];
    car?.setHighlight(active, "#ff9f43");
  }

  emitSmoke() {
    if (!this.chimney || this.smoke.length > 16) return;
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.16 + Math.random() * 0.1, 10, 8),
      new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.65, depthWrite: false }),
    );
    this.chimney.getWorldPosition(puff.position);
    puff.position.y += 0.48;
    puff.userData.birth = performance.now();
    this.scene.add(puff);
    this.smoke.push(puff);
  }

  tick(time) {
    this.cars.forEach((car) => car.tick(time, this.moving));
    this.locoWheels?.forEach((wheel) => { wheel.rotation.z += this.moving ? 0.2 : 0; });
    if (this.locomotive && !this.moving) this.locomotive.position.y = Math.sin(time * 0.0024) * 0.035;
    this.smoke = this.smoke.filter((puff) => {
      const age = time - puff.userData.birth;
      puff.position.y += 0.008;
      puff.position.x -= 0.003;
      puff.scale.setScalar(1 + age / 900);
      puff.material.opacity = Math.max(0, 0.65 - age / 1300);
      if (age > 900) {
        this.scene.remove(puff);
        puff.geometry.dispose();
        puff.material.dispose();
        return false;
      }
      return true;
    });
  }

  disposeChildren() {
    this.cars = [];
    while (this.group.children.length) {
      const child = this.group.children.pop();
      child.traverse((object) => {
        object.geometry?.dispose();
        if (Array.isArray(object.material)) object.material.forEach((entry) => entry.dispose());
        else object.material?.dispose();
      });
    }
    this.group.position.x = 0;
  }
}
