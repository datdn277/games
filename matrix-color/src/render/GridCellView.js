import * as THREE from "three";
import { COLOR_BY_ID } from "../data/colors.js";

const TEXTURE_CACHE = new Map();

function makeTextTexture(text, color = "#ffffff", stroke = "rgba(30,35,55,.34)") {
  const key = `${text}:${color}:${stroke}`;
  if (TEXTURE_CACHE.has(key)) return TEXTURE_CACHE.get(key);
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 160;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, 160, 160);
  context.font = "900 88px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineWidth = 12;
  context.strokeStyle = stroke;
  context.strokeText(text, 80, 84);
  context.fillStyle = color;
  context.fillText(text, 80, 84);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  TEXTURE_CACHE.set(key, texture);
  return texture;
}

function makeSprite(text, color, scale = 0.36) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeTextTexture(text, color),
    transparent: true,
    depthTest: false,
    depthWrite: false
  }));
  sprite.position.y = 0.2;
  sprite.scale.setScalar(scale);
  sprite.renderOrder = 10;
  return sprite;
}

export class GridCellView {
  constructor({ row, column, position }) {
    this.row = row;
    this.column = column;
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.userData.cell = this;

    this.material = new THREE.MeshStandardMaterial({
      color: "#fffdf7",
      roughness: 0.72,
      metalness: 0,
      emissive: "#fffdf7",
      emissiveIntensity: 0.02
    });
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.16, 0.94), this.material);
    this.mesh.position.y = 0.08;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.userData.cell = this;
    this.group.add(this.mesh);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(this.mesh.geometry, 22),
      new THREE.LineBasicMaterial({ color: "#c9c4d7", transparent: true, opacity: 0.72 })
    );
    edges.position.copy(this.mesh.position);
    this.group.add(edges);

    this.symbol = makeSprite("●", "#ffffff", 0.31);
    this.symbol.visible = false;
    this.tick = makeSprite("✓", "#ffffff", 0.29);
    this.tick.position.set(0.27, 0.24, -0.28);
    this.tick.visible = false;
    this.warning = makeSprite("?", "#8b4c18", 0.34);
    this.warning.visible = false;
    this.group.add(this.symbol, this.tick, this.warning);

    this.hintRing = new THREE.Mesh(
      new THREE.RingGeometry(0.39, 0.46, 32),
      new THREE.MeshBasicMaterial({ color: "#ffbf2f", transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthTest: false })
    );
    this.hintRing.rotation.x = -Math.PI / 2;
    this.hintRing.position.y = 0.185;
    this.hintRing.visible = false;
    this.hintRing.renderOrder = 9;
    this.group.add(this.hintRing);
    this.colorId = null;
  }

  setColor(colorId, { tick = false } = {}) {
    this.colorId = colorId ?? null;
    const color = colorId ? COLOR_BY_ID[colorId] : null;
    this.material.color.set(color?.hex ?? "#fffdf7");
    this.material.emissive.set(color?.hex ?? "#fffdf7");
    this.material.emissiveIntensity = color ? 0.09 : 0.02;
    if (color) {
      this.symbol.material.map = makeTextTexture(color.symbol, "#ffffff");
      this.symbol.material.needsUpdate = true;
      this.symbol.visible = true;
    } else {
      this.symbol.visible = false;
    }
    this.tick.visible = Boolean(tick && colorId);
    this.warning.visible = false;
  }

  setHint(mode = "none") {
    this.hintRing.visible = mode === "target" || mode === "focus";
    this.hintRing.material.color.set(mode === "focus" ? "#7468df" : "#ffbf2f");
    this.material.emissiveIntensity = mode === "line" ? 0.28 : (this.colorId ? 0.09 : 0.02);
  }

  setWarning(visible) {
    this.warning.visible = visible;
  }

  setTick(visible) {
    this.tick.visible = Boolean(visible && this.colorId);
  }
}
