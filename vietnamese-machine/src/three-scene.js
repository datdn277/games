import { drawToneIcon } from "./tone-icons.js";

let THREE;

const COLORS = [0x4c8de8, 0xf29a38, 0x8b65c5];

export async function createMachineScene(canvas) {
  try {
    THREE = await import("three");
  } catch (error) {
    console.warn("Three.js chưa sẵn sàng, game tiếp tục ở chế độ 2D.", error);
    canvas.hidden = true;
    return {
      updateParts() {},
      celebrate() {},
      shake() {},
      dispose() {}
    };
  }
  const prefersReducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0.15, 8.2);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x7d8794, 2.7));
  const keyLight = new THREE.DirectionalLight(0xffffff, 4.2);
  keyLight.position.set(3, 5, 6);
  scene.add(keyLight);

  const group = new THREE.Group();
  group.rotation.x = -0.08;
  scene.add(group);

  const geometry = new THREE.BoxGeometry(1.55, 1.04, 0.38, 2, 2, 1);
  const blocks = COLORS.map((color, index) => {
    const mesh = new THREE.Mesh(geometry, createMaterials(color, "?"));
    mesh.position.x = (index - 1) * 1.82;
    mesh.rotation.y = (index - 1) * -0.06;
    mesh.userData.baseY = index === 1 ? 0.08 : 0;
    group.add(mesh);
    return mesh;
  });

  const shadowMaterial = new THREE.MeshBasicMaterial({
    color: 0x22334d,
    transparent: true,
    opacity: 0.11,
    depthWrite: false
  });
  const shadowGeometry = new THREE.CircleGeometry(0.74, 36);
  const shadows = blocks.map((block) => {
    const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial.clone());
    shadow.scale.set(1.2, 0.28, 1);
    shadow.position.set(block.position.x, -0.79, -0.12);
    group.add(shadow);
    return shadow;
  });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(10, 10);
  let hovered = null;
  let effect = null;
  let effectStartedAt = 0;
  let animationFrame = 0;

  function updateParts(parts) {
    const activeCount = parts.length === 2 ? 2 : 3;
    const positions = activeCount === 2 ? [-0.95, 0.95] : [-1.82, 0, 1.82];

    blocks.forEach((block, index) => {
      const visible = index < activeCount;
      block.visible = visible;
      shadows[index].visible = visible;
      if (!visible) return;

      block.position.x = positions[index];
      block.rotation.y = activeCount === 2 ? (index === 0 ? 0.04 : -0.04) : (index - 1) * -0.06;
      block.userData.baseY = activeCount === 2 ? (index === 0 ? 0 : 0.06) : (index === 1 ? 0.08 : 0);
      shadows[index].position.x = positions[index];
      block.material.forEach((material) => material.dispose());
      block.material = createMaterials(COLORS[index], displayPart(parts[index]));
    });
  }

  function celebrate() {
    effect = "celebrate";
    effectStartedAt = performance.now();
  }

  function shake() {
    effect = "shake";
    effectStartedAt = performance.now();
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
  }

  function onPointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function animate(now) {
    resize();
    raycaster.setFromCamera(pointer, camera);
    hovered = raycaster.intersectObjects(blocks, false)[0]?.object ?? null;

    const elapsed = now * 0.001;
    blocks.forEach((block, index) => {
      if (!block.visible) return;
      const hoverLift = hovered === block ? 0.16 : 0;
      const float = prefersReducedMotion ? 0 : Math.sin(elapsed * 1.7 + index) * 0.035;
      block.position.y += (block.userData.baseY + hoverLift + float - block.position.y) * 0.12;
      if (!prefersReducedMotion) block.rotation.z = Math.sin(elapsed * 0.7 + index) * 0.018;
      block.scale.lerp(new THREE.Vector3(hovered === block ? 1.04 : 1, hovered === block ? 1.04 : 1, 1), 0.14);
    });

    group.position.x = 0;
    group.rotation.z = 0;
    if (effect) {
      const age = (now - effectStartedAt) / 1000;
      if (effect === "shake" && age < 0.5 && !prefersReducedMotion) {
        group.position.x = Math.sin(age * 58) * (0.12 * (1 - age * 2));
      } else if (effect === "celebrate" && age < 0.9) {
        const pulse = prefersReducedMotion ? 1 : 1 + Math.sin(age * Math.PI * 4) * 0.055 * (1 - age);
        group.scale.setScalar(pulse);
        blocks.forEach((block) => {
          block.material[4].emissive?.setHex(0xffd968);
          block.material[4].emissiveIntensity = Math.max(0, 0.55 * (1 - age));
        });
      } else {
        group.scale.setScalar(1);
        blocks.forEach((block) => {
          block.material[4].emissive?.setHex(0x000000);
          block.material[4].emissiveIntensity = 0;
        });
        effect = null;
      }
    }

    renderer.render(scene, camera);
    animationFrame = requestAnimationFrame(animate);
  }

  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerleave", () => pointer.set(10, 10));
  animationFrame = requestAnimationFrame(animate);

  return {
    updateParts,
    celebrate,
    shake,
    dispose() {
      cancelAnimationFrame(animationFrame);
      canvas.removeEventListener("pointermove", onPointerMove);
      geometry.dispose();
      shadowGeometry.dispose();
      renderer.dispose();
    }
  };
}

function createMaterials(color, label) {
  const sideColor = new THREE.Color(color).multiplyScalar(0.72);
  const topColor = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.25);
  const texture = createLabelTexture(color, label);
  return [
    new THREE.MeshStandardMaterial({ color: sideColor, roughness: 0.58 }),
    new THREE.MeshStandardMaterial({ color: sideColor, roughness: 0.58 }),
    new THREE.MeshStandardMaterial({ color: topColor, roughness: 0.5 }),
    new THREE.MeshStandardMaterial({ color: sideColor, roughness: 0.62 }),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.45, emissive: 0x000000 }),
    new THREE.MeshStandardMaterial({ color: sideColor, roughness: 0.58 })
  ];
}

function createLabelTexture(color, label) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 320;
  const context = canvas.getContext("2d");
  const hex = `#${new THREE.Color(color).getHexString()}`;
  context.fillStyle = hex;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(255,255,255,.16)";
  context.fillRect(0, 0, canvas.width, 22);
  if (typeof label === "object" && label?.tone) {
    drawToneIcon(context, label.tone, { x: canvas.width / 2, y: canvas.height / 2 + 4, size: 190 });
  } else {
    context.fillStyle = "#ffffff";
    context.font = `900 ${label.length > 6 ? 78 : label.length > 3 ? 104 : 144}px Arial, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, canvas.width / 2, canvas.height / 2 + 6, canvas.width - 48);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function displayPart(part) {
  if (typeof part === "object" && part && "tone" in part) return part.tone ? part : "?";
  if (part === "") return "∅";
  if (part === null || part === undefined) return "?";
  return part;
}
