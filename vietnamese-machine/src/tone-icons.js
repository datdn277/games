const ICONS = {
  ngang: {
    paths: ["M10 21 H30"],
    circles: []
  },
  sắc: {
    paths: ["M12 28 L29 11"],
    circles: []
  },
  huyền: {
    paths: ["M11 11 L28 28"],
    circles: []
  },
  hỏi: {
    paths: ["M11 14 C14 7 28 7 29 15 C30 21 24 23 20 24 C17 25 16 28 17 31"],
    circles: []
  },
  ngã: {
    paths: ["M7 23 C11 12 17 29 22 20 C26 12 30 14 33 18"],
    circles: []
  },
  nặng: {
    paths: [],
    circles: [{ cx: 20, cy: 24, r: 5 }]
  }
};

export const TONE_TEXT_SYMBOLS = {
  ngang: "—",
  sắc: "ˊ",
  huyền: "ˋ",
  hỏi: "ˀ",
  ngã: "˜",
  nặng: "•"
};

export function toneIconMarkup(tone) {
  const icon = ICONS[tone] ?? ICONS.ngang;
  const paths = icon.paths
    .map((path) => `<path d="${path}" />`)
    .join("");
  const circles = icon.circles
    .map(({ cx, cy, r }) => `<circle cx="${cx}" cy="${cy}" r="${r}" />`)
    .join("");
  return `<svg class="tone-icon" viewBox="0 0 40 40" aria-hidden="true" focusable="false">${paths}${circles}</svg>`;
}

export function drawToneIcon(context, tone, options = {}) {
  const icon = ICONS[tone] ?? ICONS.ngang;
  const size = options.size ?? 176;
  const centerX = options.x ?? 256;
  const centerY = options.y ?? 160;
  const scale = size / 40;

  context.save();
  context.translate(centerX - size / 2, centerY - size / 2);
  context.scale(scale, scale);
  context.strokeStyle = options.color ?? "#ffffff";
  context.fillStyle = options.color ?? "#ffffff";
  context.lineWidth = 4;
  context.lineCap = "round";
  context.lineJoin = "round";
  icon.paths.forEach((path) => context.stroke(new Path2D(path)));
  icon.circles.forEach(({ cx, cy, r }) => {
    context.beginPath();
    context.arc(cx, cy, r, 0, Math.PI * 2);
    context.fill();
  });
  context.restore();
}
