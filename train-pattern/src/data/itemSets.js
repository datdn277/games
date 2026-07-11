export const itemSets = {
  fruit: {
    label: "Trái cây",
    items: [
      { id: "apple", label: "Táo", speechLabel: "quả táo", symbol: "🍎", kind: "symbol", color: "#f15b5b" },
      { id: "banana", label: "Chuối", speechLabel: "quả chuối", symbol: "🍌", kind: "symbol", color: "#ffd93d" },
      { id: "grape", label: "Nho", speechLabel: "chùm nho", symbol: "🍇", kind: "symbol", color: "#9867c5" },
      { id: "orange", label: "Cam", speechLabel: "quả cam", symbol: "🍊", kind: "symbol", color: "#ff9f43" },
    ],
  },
  shape: {
    label: "Hình học",
    items: [
      { id: "circle", label: "Hình tròn", speechLabel: "hình tròn", symbol: "●", shape: "circle", kind: "shape", color: "#f15b5b" },
      { id: "square", label: "Hình vuông", speechLabel: "hình vuông", symbol: "■", shape: "square", kind: "shape", color: "#4d96ff" },
      { id: "triangle", label: "Hình tam giác", speechLabel: "hình tam giác", symbol: "▲", shape: "triangle", kind: "shape", color: "#ffd93d" },
      { id: "star", label: "Ngôi sao", speechLabel: "ngôi sao", symbol: "★", shape: "star", kind: "shape", color: "#9b5de5" },
    ],
  },
  color: {
    label: "Màu sắc",
    items: [
      { id: "red", label: "Đỏ", speechLabel: "màu đỏ", symbol: "●", kind: "color", color: "#f15b5b", marker: "1" },
      { id: "blue", label: "Xanh dương", speechLabel: "màu xanh dương", symbol: "◆", kind: "color", color: "#4d96ff", marker: "2" },
      { id: "yellow", label: "Vàng", speechLabel: "màu vàng", symbol: "▲", kind: "color", color: "#ffd93d", marker: "3" },
      { id: "green", label: "Xanh lá", speechLabel: "màu xanh lá", symbol: "■", kind: "color", color: "#6bcb77", marker: "4" },
    ],
  },
};

export function getAllItems() {
  return Object.values(itemSets).flatMap((set) => set.items);
}
