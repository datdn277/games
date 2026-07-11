import * as THREE from "three";

const textureCache = new Map();

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

export function createItemTexture(item, { missing = false } = {}) {
  const key = missing ? "missing" : `${item.id}:${item.symbol}:${item.color}`;
  if (textureCache.has(key)) return textureCache.get(key);
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = "#fffdf5";
  roundedRect(ctx, 12, 12, 232, 232, 38);
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = missing ? "#ff9f43" : "#74543b";
  ctx.setLineDash(missing ? [18, 12] : []);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (missing) {
    ctx.fillStyle = "#ff8a2a";
    ctx.font = "900 150px Arial Rounded MT Bold, sans-serif";
    ctx.fillText("?", 128, 137);
  } else if (item.kind === "shape") {
    ctx.fillStyle = item.color;
    ctx.strokeStyle = "#503b2f";
    ctx.lineWidth = 7;
    ctx.font = "900 150px Arial, sans-serif";
    ctx.fillText(item.symbol, 128, 135);
    ctx.strokeText(item.symbol, 128, 135);
  } else if (item.kind === "color") {
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(128, 117, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#503b2f";
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.fillStyle = item.id === "yellow" ? "#503b2f" : "white";
    ctx.font = "900 52px Arial Rounded MT Bold, sans-serif";
    ctx.fillText(item.marker, 128, 121);
    ctx.fillStyle = "#503b2f";
    ctx.font = "700 24px Arial, sans-serif";
    ctx.fillText(item.label, 128, 218);
  } else {
    ctx.font = "142px Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif";
    ctx.fillText(item.symbol, 128, 132);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  textureCache.set(key, texture);
  return texture;
}

export class TrainCar {
  constructor(item, { missing = false, index = 0 } = {}) {
    this.item = item;
    this.index = index;
    this.missing = missing;
    this.group = new THREE.Group();
    this.group.userData.trainCar = this;
    this.bodyMaterial = new THREE.MeshStandardMaterial({
      color: missing ? "#ffe7a3" : ["#63c7b2", "#7db7ff", "#f6a75b", "#bd8cf5"][index % 4],
      roughness: 0.62,
      metalness: 0.02,
      transparent: missing,
      opacity: missing ? 0.78 : 1,
      emissive: new THREE.Color("#000000"),
      emissiveIntensity: 0,
    });
    this.build();
  }

  build() {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.56, 1.38, 0.94), this.bodyMaterial);
    body.position.y = 1.18;
    body.castShadow = true;
    body.receiveShadow = true;
    this.group.add(body);
    this.body = body;

    const rim = new THREE.Mesh(
      new THREE.BoxGeometry(1.44, 1.18, 0.07),
      new THREE.MeshStandardMaterial({ color: "#fff7df", roughness: 0.8 }),
    );
    rim.position.set(0, 1.25, 0.51);
    this.group.add(rim);

    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(1.34, 1.04),
      new THREE.MeshBasicMaterial({ map: createItemTexture(this.item, { missing: this.missing }), transparent: true }),
    );
    face.position.set(0, 1.25, 0.552);
    this.group.add(face);
    this.face = face;

    const wheelMaterial = new THREE.MeshStandardMaterial({ color: "#4a3a36", roughness: 0.55 });
    this.wheels = [];
    [-0.5, 0.5].forEach((x) => {
      [-0.38, 0.38].forEach((z) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.16, 18), wheelMaterial);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(x, 0.47, z);
        wheel.castShadow = true;
        this.group.add(wheel);
        this.wheels.push(wheel);
      });
    });

    const couplerMaterial = new THREE.MeshStandardMaterial({ color: "#765849" });
    const coupler = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.13, 0.15), couplerMaterial);
    coupler.position.set(0.92, 0.78, 0);
    this.group.add(coupler);
  }

  setItem(item) {
    this.item = item;
    this.missing = false;
    this.bodyMaterial.transparent = false;
    this.bodyMaterial.opacity = 1;
    this.bodyMaterial.color.set(["#63c7b2", "#7db7ff", "#f6a75b", "#bd8cf5"][this.index % 4]);
    this.face.material.map = createItemTexture(item);
    this.face.material.needsUpdate = true;
  }

  setHighlight(active, color = "#ffd93d") {
    this.bodyMaterial.emissive.set(active ? color : "#000000");
    this.bodyMaterial.emissiveIntensity = active ? 0.55 : 0;
  }

  tick(time, moving = false) {
    this.wheels.forEach((wheel) => { wheel.rotation.z += moving ? 0.16 : 0; });
    if (!moving) this.group.rotation.z = Math.sin(time * 0.0018 + this.index * 0.7) * 0.008;
  }
}
