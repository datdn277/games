import type { Lesson } from "./Lesson";

export const bishopLessons: Lesson[] = [
  {
    id: "bishop-tutorial", piece: "bishop", title: "Làm quen với quân Tượng",
    instruction: "Xem Tượng biểu diễn đường chéo", voiceInstruction: "Đây là quân Tượng. Tượng chỉ đi theo đường chéo.",
    objective: "tutorial", boardSize: { rows: 6, cols: 6 }, startPosition: { row: 4, col: 1 }, targets: [{ row: 2, col: 3 }], blockers: [],
    hints: ["Nhìn bốn đường chéo sáng lên nhé!", "Tượng luôn ở trên ô cùng màu."], showValidMovesInitially: true,
  },
  {
    id: "bishop-reach-01", piece: "bishop", title: "Đường chéo gần",
    instruction: "Đưa Tượng đến ngôi sao", voiceInstruction: "Hãy đưa quân Tượng đến ngôi sao ở đường chéo gần.",
    objective: "reach-target", boardSize: { rows: 6, cols: 6 }, startPosition: { row: 4, col: 1 }, targets: [{ row: 3, col: 2 }], blockers: [],
    hints: ["Tượng đi theo đường chéo.", "Ngôi sao chéo lên bên phải.", "Chọn ngôi sao gần Tượng."], showValidMovesInitially: true,
  },
  {
    id: "bishop-reach-02", piece: "bishop", title: "Đường chéo xa",
    instruction: "Tìm ngôi sao trên đường chéo", voiceInstruction: "Tượng có thể đi nhiều ô trên cùng đường chéo.",
    objective: "reach-target", boardSize: { rows: 6, cols: 6 }, startPosition: { row: 5, col: 0 }, targets: [{ row: 1, col: 4 }], blockers: [],
    hints: ["Tượng đi chéo được nhiều ô.", "Theo dải ô cùng màu lên bên phải.", "Ngôi sao ở cuối đường chéo."], showValidMovesInitially: false,
  },
  {
    id: "bishop-not-straight", piece: "bishop", title: "Không đi ngang",
    instruction: "Chọn tất cả ô Tượng có thể đi", voiceInstruction: "Ngôi sao cùng hàng không nằm trên đường chéo. Hãy tìm các ô hợp lệ.",
    objective: "select-valid-squares", boardSize: { rows: 6, cols: 6 }, startPosition: { row: 3, col: 2 }, targets: [{ row: 3, col: 5 }], blockers: [],
    hints: ["Tượng không đi ngang hoặc dọc.", "Tìm bốn đường chéo.", "Chọn các ô cùng màu với ô của Tượng."], showValidMovesInitially: false,
  },
  {
    id: "bishop-blocked", piece: "bishop", title: "Tượng gặp cây",
    instruction: "Tìm ô Tượng có thể đến", voiceInstruction: "Tượng không thể nhảy qua cây. Hãy chọn tất cả ô hợp lệ.",
    objective: "select-valid-squares", boardSize: { rows: 6, cols: 6 }, startPosition: { row: 4, col: 1 }, targets: [{ row: 1, col: 4 }], blockers: [{ row: 2, col: 3 }],
    hints: ["Tượng phải dừng trước cây.", "Ô sau cây không thể đến.", "Kiểm tra cả bốn đường chéo."], showValidMovesInitially: false,
  },
  {
    id: "bishop-select", piece: "bishop", title: "Bậc thầy đường chéo",
    instruction: "Chọn tất cả ô Tượng có thể đi", voiceInstruction: "Hãy chọn tất cả ô Tượng có thể đi. Các ô ấy luôn cùng màu với ô bắt đầu.",
    objective: "select-valid-squares", boardSize: { rows: 6, cols: 6 }, startPosition: { row: 3, col: 3 }, targets: [], blockers: [{ row: 1, col: 1 }, { row: 5, col: 5 }],
    hints: ["Tìm bốn đường chéo.", "Dừng trước vật cản.", "Các ô hợp lệ cùng màu với ô của Tượng."], showValidMovesInitially: false,
  },
];
