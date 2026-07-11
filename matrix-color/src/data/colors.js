export const PALETTE = Object.freeze([
  { id: "red", label: "Đỏ", speechLabel: "đỏ", hex: "#F15B5B", symbol: "●" },
  { id: "blue", label: "Xanh dương", speechLabel: "xanh dương", hex: "#4D96FF", symbol: "◆" },
  { id: "yellow", label: "Vàng", speechLabel: "vàng", hex: "#FFD93D", symbol: "▲" },
  { id: "green", label: "Xanh lá", speechLabel: "xanh lá", hex: "#6BCB77", symbol: "■" },
  { id: "orange", label: "Cam", speechLabel: "cam", hex: "#FF9F45", symbol: "✦" },
  { id: "purple", label: "Tím", speechLabel: "tím", hex: "#9D76C1", symbol: "⬟" }
]);

export const COLOR_BY_ID = Object.freeze(Object.fromEntries(PALETTE.map((color) => [color.id, color])));
