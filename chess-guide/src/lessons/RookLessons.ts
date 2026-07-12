import type { Lesson } from "./Lesson";

export const rookLessons: Lesson[] = [
  {
    id: "rook-tutorial", piece: "rook", title: "Làm quen với quân Xe",
    instruction: "Xem Xe biểu diễn đường thẳng", voiceInstruction: "Đây là quân Xe. Xe đi theo đường thẳng: lên, xuống, sang trái hoặc sang phải.",
    objective: "tutorial", boardSize: { rows: 6, cols: 6 }, startPosition: { row: 4, col: 1 }, targets: [{ row: 1, col: 1 }], blockers: [],
    hints: ["Nhìn hàng và cột sáng lên nhé!", "Xe luôn đi trên một đường thẳng."], showValidMovesInitially: true,
  },
  {
    id: "rook-reach-01", piece: "rook", title: "Xe đi ngang",
    instruction: "Đưa quân Xe đến ngôi sao", voiceInstruction: "Hãy đưa quân Xe đến ngôi sao. Ngôi sao nằm cùng hàng với Xe.",
    objective: "reach-target", boardSize: { rows: 6, cols: 6 }, startPosition: { row: 4, col: 1 }, targets: [{ row: 4, col: 4 }], blockers: [],
    hints: ["Xe đi theo đường thẳng.", "Ngôi sao nằm cùng hàng với Xe.", "Chọn ngôi sao ở bên phải."], showValidMovesInitially: true,
  },
  {
    id: "rook-reach-02", piece: "rook", title: "Xe đi dọc",
    instruction: "Tìm đường thẳng đến ngôi sao", voiceInstruction: "Hãy đưa Xe đến ngôi sao ở cùng cột.",
    objective: "reach-target", boardSize: { rows: 6, cols: 6 }, startPosition: { row: 5, col: 3 }, targets: [{ row: 1, col: 3 }], blockers: [],
    hints: ["Xe đi thẳng lên hoặc xuống.", "Nhìn ô cùng cột.", "Chọn ngôi sao phía trên."], showValidMovesInitially: false,
  },
  {
    id: "rook-not-diagonal", piece: "rook", title: "Không phải đường chéo",
    instruction: "Chọn tất cả ô Xe có thể đi đến", voiceInstruction: "Ngôi sao nằm chéo nên Xe không thể đến trực tiếp. Hãy chọn tất cả ô Xe có thể đi.",
    objective: "select-valid-squares", boardSize: { rows: 6, cols: 6 }, startPosition: { row: 3, col: 2 }, targets: [{ row: 1, col: 4 }], blockers: [],
    hints: ["Xe không đi đường chéo.", "Tìm các ô cùng hàng và cùng cột.", "Hàng và cột của Xe là đáp án."], showValidMovesInitially: false,
  },
  {
    id: "rook-blocked", piece: "rook", title: "Xe gặp hòn đá",
    instruction: "Đưa Xe đến ngôi sao mà không qua đá", voiceInstruction: "Xe không thể nhảy qua hòn đá. Hãy chọn một ô hợp lệ.",
    objective: "reach-target", boardSize: { rows: 6, cols: 6 }, startPosition: { row: 4, col: 2 }, targets: [{ row: 4, col: 5 }, { row: 1, col: 2 }], blockers: [{ row: 4, col: 4 }],
    hints: ["Xe không nhảy qua vật cản.", "Một ngôi sao đang bị hòn đá chắn.", "Ngôi sao phía trên có đường đi thẳng."], showValidMovesInitially: false,
  },
  {
    id: "rook-select", piece: "rook", title: "Bậc thầy đường thẳng",
    instruction: "Chọn tất cả ô Xe có thể đi đến", voiceInstruction: "Hãy chọn tất cả ô quân Xe có thể đi đến. Nhớ dừng trước vật cản.",
    objective: "select-valid-squares", boardSize: { rows: 6, cols: 6 }, startPosition: { row: 3, col: 3 }, targets: [], blockers: [{ row: 3, col: 0 }, { row: 1, col: 3 }],
    hints: ["Xe đi ngang và dọc.", "Dừng lại trước mỗi vật cản.", "Các ô cùng hàng và cột đang chờ con."], showValidMovesInitially: false,
  },
];
