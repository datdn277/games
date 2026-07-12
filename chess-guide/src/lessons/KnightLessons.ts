import type { Lesson } from "./Lesson";

export const knightLessons: Lesson[] = [
  {
    id: "knight-tutorial", piece: "knight", title: "Làm quen với quân Mã",
    instruction: "Xem Mã nhảy hình chữ L", voiceInstruction: "Đây là quân Mã. Mã đi theo hình chữ L và có thể nhảy qua vật cản.",
    objective: "tutorial", boardSize: { rows: 6, cols: 6 }, startPosition: { row: 4, col: 1 }, targets: [{ row: 2, col: 2 }], blockers: [],
    hints: ["Hai ô rồi rẽ sang một ô.", "Dấu chân tạo thành chữ L."], showValidMovesInitially: true,
  },
  {
    id: "knight-reach-01", piece: "knight", title: "Cú nhảy chữ L",
    instruction: "Đưa Mã đến ngôi sao", voiceInstruction: "Hãy đưa quân Mã đến ngôi sao theo hình chữ L.",
    objective: "reach-target", boardSize: { rows: 6, cols: 6 }, startPosition: { row: 4, col: 1 }, targets: [{ row: 2, col: 2 }], blockers: [],
    hints: ["Mã đi hai ô rồi rẽ một ô.", "Ngôi sao tạo thành chữ L.", "Chọn ngôi sao phía trên bên phải."], showValidMovesInitially: true,
  },
  {
    id: "knight-one-of-many", piece: "knight", title: "Tìm ngôi sao đúng",
    instruction: "Chọn ngôi sao Mã có thể đến", voiceInstruction: "Có nhiều ngôi sao, nhưng chỉ một ngôi sao tạo thành hình chữ L.",
    objective: "reach-target", boardSize: { rows: 6, cols: 6 }, startPosition: { row: 3, col: 2 }, targets: [{ row: 1, col: 3 }, { row: 2, col: 4 }, { row: 0, col: 5 }], blockers: [],
    hints: ["Đếm hai ô rồi rẽ một ô.", "Không chọn ô chéo thông thường.", "Ngôi sao ở hàng 2, cột 4 là chữ L."], showValidMovesInitially: false,
  },
  {
    id: "knight-jump", piece: "knight", title: "Mã nhảy qua vật cản",
    instruction: "Nhảy qua các hòn đá đến ngôi sao", voiceInstruction: "Mã có thể nhảy qua vật cản. Hãy tìm ngôi sao hình chữ L.",
    objective: "reach-target", boardSize: { rows: 6, cols: 6 }, startPosition: { row: 3, col: 2 }, targets: [{ row: 1, col: 3 }], blockers: [{ row: 2, col: 2 }, { row: 3, col: 3 }, { row: 2, col: 3 }],
    hints: ["Vật cản không giữ được Mã.", "Hai ô lên rồi một ô sang phải.", "Chọn ngôi sao phía trên bên phải."], showValidMovesInitially: false,
  },
  {
    id: "knight-not-diagonal", piece: "knight", title: "Chữ L hay đường chéo?",
    instruction: "Chọn tất cả ô Mã có thể nhảy đến", voiceInstruction: "Mã không đi chéo như Tượng. Hãy tìm các ô chữ L.",
    objective: "select-valid-squares", boardSize: { rows: 6, cols: 6 }, startPosition: { row: 3, col: 3 }, targets: [{ row: 1, col: 1 }], blockers: [],
    hints: ["Mã không đi đường chéo thường.", "Hai ô rồi rẽ một ô.", "Các dấu chân chữ L là đáp án."], showValidMovesInitially: false,
  },
  {
    id: "knight-select", piece: "knight", title: "Bậc thầy nhảy cao",
    instruction: "Chọn tất cả ô Mã có thể đến", voiceInstruction: "Hãy chọn tất cả ô Mã có thể đến, kể cả khi có vật cản xung quanh.",
    objective: "select-valid-squares", boardSize: { rows: 6, cols: 6 }, startPosition: { row: 2, col: 2 }, targets: [], blockers: [{ row: 1, col: 2 }, { row: 2, col: 1 }, { row: 2, col: 3 }, { row: 3, col: 2 }],
    hints: ["Mã nhảy qua được vật cản.", "Tìm tám hướng chữ L.", "Đếm hai ô rồi rẽ một ô."], showValidMovesInitially: false,
  },
];
