# Học Viện Cờ Vua Nhí

MVP game giáo dục 3D giúp trẻ khoảng 5 tuổi khám phá cách đi của quân **Xe**, **Tượng** và **Mã** bằng quan sát, thao tác, animation và feedback tiếng Việt.

## Chạy project

Yêu cầu Node.js 20.19+ hoặc 22.12+.

```bash
npm install
npm run dev
```

Mặc định Vite hiển thị URL local trong terminal (thường là `http://localhost:5173`).

Build và test:

```bash
npm run build
npm run test
```

`npm run build` xuất bản trực tiếp vào `static/` với đường dẫn asset tương đối để game chạy được khi deploy cùng trang chủ tĩnh.

`node_modules/` và `dist/` được loại khỏi source bằng `.gitignore`. `package-lock.json` được tạo từ registry npm công khai.

## Phân tích và quyết định thiết kế

Core loop của MVP là:

```text
Nhìn quân → xem cách đi → chọn quân → chọn ô → nhận giải thích → hoàn thành
```

Các quyết định chính:

- Bàn 6×6 giúp ô lớn, dễ chạm và giảm tải nhận thức.
- Camera trực giao gần từ trên xuống, cố định, không có orbit; phía trên màn hình luôn là phía trên bàn.
- Luật và trạng thái game không nằm trong Three.js. Renderer chỉ dựng cảnh, raycast và phát animation.
- DOM phụ trách menu, nhiệm vụ, feedback, nút, voice và accessibility; canvas chỉ phụ trách playfield 3D.
- Highlight đầy đủ chỉ xuất hiện ở tutorial/bài đầu. Các bài sau giảm dần hỗ trợ và yêu cầu trẻ tự suy luận.
- Không có giới hạn thời gian, mạng hay hình phạt. Sai được giải thích bằng luật cụ thể và có thể thử lại ngay.
- Mô hình quân, sao và vật cản được dựng procedural để MVP tải nhanh, không phụ thuộc asset ngoài.

## Nội dung MVP

- 18 lesson dữ liệu: 6 Xe, 6 Tượng, 6 Mã.
- Chế độ **Săn sao** không giới hạn cho từng quân: mỗi cặp mục tiêu gồm một sao đi 1 nước và một sao đi 2–4 nước theo thứ tự ngẫu nhiên, chạm quân để hiện các chấm đi và tới sao để sinh mục tiêu mới.
- Mỗi quân có đủ ba dạng: tutorial, đến mục tiêu, chọn tất cả ô hợp lệ.
- Xe đi ngang/dọc, dừng trước vật cản.
- Tượng đi chéo, luôn ở ô cùng màu, dừng trước vật cản.
- Mã đi chữ L và nhảy qua vật cản.
- Animation riêng: Xe trượt thẳng, Tượng trượt chéo, Mã nhún và nhảy theo cung.
- Highlight có border/ring, không chỉ dựa vào màu.
- Feedback đúng/sai giải thích luật bằng tiếng Việt.
- Gợi ý ba cấp: nhắc luật → hiện hướng → hiện ô phù hợp.
- Web Speech API `vi-VN`, hủy câu cũ trước khi đọc câu mới, có bật/tắt và nghe lại.
- Tiến trình, sao, huy hiệu và tùy chọn voice lưu trong `localStorage`, có fallback khi dữ liệu lỗi.
- 9 câu hỏi dữ liệu cho mini-game “Đúng hay chưa đúng” đã được chuẩn bị trong `TruthQuiz.ts` để mở rộng.
- Mouse, touch và keyboard (Tab, Enter/Space, phím mũi tên trong lưới bàn cờ).
- Responsive cho desktop, tablet ngang và tablet dọc; hỗ trợ `prefers-reduced-motion`.

## Kiến trúc

```text
src/
  main.ts                      # Bootstrap ứng dụng
  styles.css                   # Theme toy kingdom + responsive + accessibility
  game/
    ChessAcademyGame.ts        # Điều phối lesson/state/render/UI
    GameState.ts               # Kiểu dữ liệu serializable
    LessonManager.ts           # Điều hướng lesson
    LessonGenerator.ts         # Sinh và validate lesson ngẫu nhiên
    PracticeSession.ts         # State và vòng lặp luyện tập săn sao vô hạn
    ProgressStorage.ts         # localStorage + tính sao
  chess/
    ChessBoard.ts              # Render adapter cho bàn 3D
    ChessSquare.ts             # Tile và trạng thái highlight
    ChessPiece.ts              # Mô hình procedural Xe/Tượng/Mã
    MoveEngine.ts              # API luật độc lập UI
    MovePathfinder.ts          # BFS tìm đường ngắn nhất trên đồ thị nước đi
    BoardCoordinates.ts        # Logic board ↔ Three.js world
    rules/                     # RookRule/BishopRule/KnightRule
  lessons/                     # Lesson model + 18 level + TruthQuiz
  animation/                   # Move/celebration/highlight animation
  input/                       # Pointer raycast + touch tap
  ui/                          # DOM HUD, menu, feedback, hint
  audio/                       # Web Speech API
  tests/                       # Vitest
```

### Biên mô-đun

- `MoveEngine` chỉ nhận `BoardState`/`PieceState` và trả về `Position[]`; không import DOM hoặc Three.js.
- `BoardCoordinates` là nơi duy nhất chuyển giữa tọa độ hàng/cột và tọa độ thế giới.
- `ChessAcademyGame` khóa input trong animation và chỉ cập nhật vị trí logic sau khi animation hoàn tất.
- Mỗi lần đổi/reset lesson tăng token phiên; animation cũ không thể ghi đè lesson mới.
- Save chỉ chứa dữ liệu JSON; không lưu mesh, scene hoặc renderer object.

## Kiểm thử

Vitest hiện có 26 test:

- Xe giữa bàn, bị chặn, không đi chéo.
- Tượng bốn đường chéo, bị chặn, không đi ngang/dọc, giữ màu ô.
- Mã đủ 8 nước, ở góc, nhảy qua vật cản, không đi kiểu thông thường.
- Sinh và validate 300 lesson ngẫu nhiên.
- Không trùng quân/mục tiêu/vật cản; mọi `reach-target` có lời giải; lesson Mã dùng delta chữ L.
- Tính thưởng 1–3 sao.
- Phiên săn sao cân bằng chính xác 50/50 mục tiêu 1 nước và 2–4 nước, giữ nguyên sao khi đi trung gian và tăng bộ đếm khi tới nơi.

Browser playtest đã kiểm tra:

- boot và menu chọn quân/bài;
- click canvas, keyboard Enter, feedback đúng/sai;
- animation và input lock;
- bài chọn thừa/thiếu ô và gợi ý;
- completion modal, sao và lưu tiến trình;
- voice toggle không làm game phụ thuộc âm thanh;
- desktop 1280×720, tablet ngang 1024×768, tablet dọc 768×1024;
- màn săn sao desktop 1280×800 và mobile 390×844, gồm hiện chấm nước đi, đổi sao, tăng bộ đếm và thoát;
- console không có error/warning trong các luồng đã chạy.

## Mở rộng sau MVP

Kiến trúc có thể thêm quân mới bằng một `MoveRule`, model render và lesson data tương ứng. Mini-game đúng/sai có thể dùng dữ liệu `TruthQuiz` và cùng `MoveEngine`. Khi mở rộng sang ván cờ hoàn chỉnh, nên bổ sung lớp turn/capture/check riêng trong simulation, không đưa luật vào renderer.
