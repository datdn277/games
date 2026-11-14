import { createLevel, type LevelBlueprint } from "./LevelFactory";

const BLUEPRINTS: LevelBlueprint[] = [
  {
    id: "level-01",
    name: "Cà rốt ở phía trên",
    instruction: "Cà rốt ở ngay phía trên Thỏ. Con chọn mũi tên nào?",
    difficulty: "easy",
    layout: ["####", "#CE#", "#S##", "####"],
  },
  {
    id: "level-02",
    name: "Cà rốt bên phải",
    instruction: "Cà rốt ở bên phải. Hãy đi sang phải nhé!",
    difficulty: "easy",
    layout: ["####", "#SCE", "####", "####"],
  },
  {
    id: "level-03",
    name: "Đi thẳng nào",
    instruction: "Đi thẳng sang phải để nhặt cà rốt rồi về hang.",
    difficulty: "easy",
    layout: ["####", "S.CE", "####", "####"],
  },
  {
    id: "level-04",
    name: "Đổi hướng một lần",
    instruction: "Đi sang phải, rồi đổi hướng đi xuống.",
    difficulty: "easy",
    layout: ["####", "#S.#", "##C#", "##E#"],
  },
  {
    id: "level-05",
    name: "Hàng rào đầu tiên",
    instruction: "Hàng rào chặn lối. Hãy quan sát đường vòng.",
    difficulty: "medium",
    layout: ["#####", "#S#.#", "#...#", "##C.#", "##E##"],
  },
  {
    id: "level-06",
    name: "Ngõ cụt ngắn",
    instruction: "Một nhánh là ngõ cụt. Con hãy chọn lối xuống.",
    difficulty: "medium",
    layout: ["#####", "#S..#", "#.###", "#C.E#", "#####"],
  },
  {
    id: "level-07",
    name: "Nhặt rồi quay về",
    instruction: "Nhặt cà rốt ở góc vườn rồi tìm đường trở lại hang.",
    difficulty: "medium",
    layout: ["#####", "#S..#", "###.#", "#C.E#", "#...#"],
  },
  {
    id: "level-08",
    name: "Hai đường lựa chọn",
    instruction: "Có hai lối. Lối nào giúp Thỏ nhặt cà rốt nhanh hơn?",
    difficulty: "medium",
    layout: ["#####", "#S..#", "#.#.#", "#C.E#", "#...#"],
  },
  {
    id: "level-09",
    name: "Hai củ cà rốt",
    instruction: "Hãy lên kế hoạch để nhặt đủ hai củ cà rốt.",
    difficulty: "hard",
    layout: ["######", "#S...#", "#.##C#", "#....#", "#C.#E#", "######"],
  },
  {
    id: "level-10",
    name: "Quay lại một đoạn",
    instruction: "Sau khi nhặt cà rốt, Thỏ cần quay lại đường cũ.",
    difficulty: "hard",
    layout: ["######", "#S...#", "###.C#", "#C...#", "#E.###", "######"],
  },
  {
    id: "level-11",
    name: "Xếp lệnh đầu tiên",
    instruction: "Xếp một chuỗi mũi tên, rồi nhấn Chạy.",
    difficulty: "hard",
    layout: ["######", "#S...#", "###.C#", "#...##", "#C..E#", "######"],
    recommendedMode: "commands",
  },
  {
    id: "level-12",
    name: "Tìm lệnh bị sai",
    instruction: "Chuỗi mẫu có một lệnh bị chặn. Con hãy tìm và sửa nó.",
    difficulty: "hard",
    layout: ["######", "#S...#", "#.#.C#", "#.#..#", "#C..E#", "######"],
    recommendedMode: "commands",
  },
];

export const predefinedLevels = BLUEPRINTS.map(createLevel);
