# Thỏ Con Thoát Mê Cung

MVP game giáo dục 3D/2.5D dành cho trẻ khoảng 5 tuổi. Trẻ điều khiển Thỏ theo bốn hướng, quan sát vị trí mới sau từng bước, nhặt đủ cà rốt và trở về hang. Game không giới hạn thời gian, không trừ mạng và luôn giải thích nhẹ nhàng khi một hướng bị chặn.

## Mục tiêu giáo dục

Vòng học chính của game là:

```text
Quan sát vị trí hiện tại
→ nhận ra các hướng có thể đi
→ chọn một hướng
→ quan sát vị trí mới
→ nhặt đủ cà rốt
→ tìm đường về hang
```

Bốn màn đầu có highlight ô đi được để hướng dẫn. Từ độ khó Trung bình, highlight tự động được bỏ dần; trẻ phải tự đọc đường và chỉ nhận gợi ý khi yêu cầu. Ô sáng không phải nút bấm, vì vậy trẻ vẫn phải chọn đúng mũi tên.

## Công nghệ

- HTML semantic và CSS responsive
- TypeScript strict mode
- Three.js cho khu vườn 3D/2.5D
- Vite cho dev server và production build
- Vitest cho unit test
- Web Speech API với `vi-VN`
- `localStorage` cho tiến trình

Không có model hoặc texture tải ngoài. Thỏ, cà rốt, hang và hàng rào được dựng từ geometry Three.js nhẹ, nên game có thể chạy offline sau khi cài dependency.

## Cài đặt và chạy

Yêu cầu Node.js 20.19+ hoặc 22.12+.

```bash
npm install
npm run dev
```

Mở địa chỉ Vite in ra terminal, mặc định là `http://localhost:5173`.

Build production:

```bash
npm run build
```

Chạy test:

```bash
npm run test
```

Preview bản build:

```bash
npm run preview
```

Pipeline compile TypeScript vào thư mục tạm `.generated/` trước khi Vite/Vitest chạy. `src/` vẫn là source duy nhất; `.generated/`, `dist/` và `node_modules/` đều đã được ignore và không thuộc source bàn giao.

## Luật chơi

- Mỗi mũi tên di chuyển Thỏ đúng một ô.
- Thỏ không thể đi xuyên tường hoặc ra ngoài ma trận.
- Đi vào ô cà rốt sẽ thu thập vật phẩm đúng một lần.
- Hang chỉ mở khi đã nhặt đủ cà rốt.
- Đến hang khi còn thiếu cà rốt không hoàn thành level.
- `Quay lại` khôi phục vị trí, số bước và cà rốt của bước gần nhất.
- `Làm lại` đưa level về trạng thái ban đầu.
- Không có đồng hồ đếm ngược, mạng hoặc bảng xếp hạng.

### Hai chế độ chơi

`Đi từng bước` là chế độ mặc định. Một thao tác hợp lệ chạy animation 380 ms rồi mới commit trạng thái logic; input bị khóa trong suốt animation.

`Xếp lệnh` mở sau màn 10 và là chế độ mặc định của màn 11–12. Trẻ xếp 12–20 lệnh tùy độ khó, nhấn `Chạy`, xem lệnh hiện tại được highlight và sửa đúng lệnh bị chặn. Chuỗi không bị xóa tự động. Khi sửa lỗi, game tiếp tục từ vị trí và chỉ số lệnh đang dừng.

## Cấu trúc thư mục

```text
src/
  main.ts
  styles.css
  redesign.css            # visual system, journey map và responsive UX
  game/
    MazeGame.ts            # điều phối simulation, renderer và UI
    GameState.ts           # trạng thái serializable
    MovementEngine.ts      # move/undo/stars, không phụ thuộc Three.js
    LevelManager.ts
    ProgressStorage.ts
    GardenScene.ts         # renderer/scene/lights/context lifecycle
    GameLoop.ts
  maze/
    MazeCell.ts            # type và hằng số miền
    MazeGrid.ts            # tọa độ, walkability, neighbor
    PathFinder.ts          # BFS và route qua nhiều vật phẩm
    MazeValidator.ts
    MazeGenerator.ts
    LevelFactory.ts
    predefinedLevels.ts    # 12 level thủ công
    MazeView.ts            # render adapter cho ma trận
    difficultyConfigs.ts
  entities/
    Rabbit.ts
    Carrot.ts
    Burrow.ts
    Obstacle.ts
  animation/
    AnimationController.ts
    RabbitAnimator.ts
    ItemAnimator.ts
    CameraController.ts
  input/
    InputController.ts
    KeyboardController.ts
    TouchController.ts
    CommandQueueController.ts
    CommandRunner.ts
  hint/HintController.ts
  audio/AudioController.ts
  ui/
    GameUI.ts
    DirectionPad.ts
    MissionPanel.ts
    FeedbackPanel.ts
    LevelMenu.ts
    CompletionDialog.ts
  tests/
```

## Kiến trúc

Game tuân theo ba ranh giới chính:

1. **Simulation là nguồn dữ liệu duy nhất.** `GameState`, movement, BFS, validator, command queue và progress không lưu Three.js object.
2. **Renderer là adapter.** `MazeView` biến `MazeLevel` thành mesh và đồng bộ mesh theo simulation. Vị trí lưới được đổi sang world coordinate bằng `gridToWorld`.
3. **HUD là DOM.** D-pad, text, dialog và `aria-live` không nằm trong canvas, giúp responsive, keyboard và screen reader hoạt động ổn định.

Camera trực giao đặt cố định từ trên xuống và hơi nghiêng. Trục hàng tăng hướng về cạnh dưới màn hình, trục cột tăng sang phải, nên bốn hướng không thay đổi giữa các level.

### UI/UX khu vườn

- Nút `Bản đồ` luôn hiển thị màn hiện tại và mở bản đồ hành trình theo ba khu Dễ, Trung bình, Khó.
- Bản đồ đánh dấu rõ màn đã hoàn thành, màn nên chơi tiếp, màn bị khóa và số sao; trên mobile tuyến màn tự chuyển sang bố cục dọc.
- Bốn nhãn `Trên / Dưới / Trái / Phải` bám quanh bàn chơi để nối khái niệm phương hướng với D-pad.
- Hàng rào được ghép từ cọc nhọn, thanh gỗ, bồn đất, lá và hoa; tile bo cạnh, nền vườn nâng cao, ánh sáng xiên và bóng đổ làm chiều sâu rõ hơn mà không che nhân vật.
- HUD và canvas vẫn tách rời: thay đổi giao diện hoặc geometry không làm thay đổi luật di chuyển.

### Mô hình dữ liệu

Các type chính nằm trong `MazeCell.ts` và `GameState.ts`:

- `Position { row, col }`
- `Direction = up | down | left | right`
- `CellType = wall | floor | start | exit`
- `Collectible`
- `MazeLevel`
- `GameState`
- `HistoryEntry`
- `ProgressData`

State lưu được tách khỏi view: không serialize mesh, geometry, material hoặc animation promise.

## Movement engine

`MovementEngine.ts` cung cấp `moveRabbit` và `undoMove`; các helper hình học nằm trong `MazeGrid.ts`:

```ts
getNextPosition(current, direction)
isInsideMaze(position, level)
isWalkable(position, level)
canMove(current, direction, level)
```

`MazeGame` khóa input, chạy animation, sau đó mới gọi movement engine để commit đúng một lần. Nếu hướng bị chặn, simulation không đổi; chỉ feedback, số lần thử sai và animation lắc đầu được cập nhật.

## BFS và gợi ý

`PathFinder.ts` triển khai BFS bằng queue và parent map:

- `findShortestPath`: trả đường ngắn nhất gồm cả ô đầu/cuối;
- `getReachableCells`: dùng cho validator và generator;
- `calculateDistance`: số cạnh của đường ngắn nhất;
- `findOptimalMissionRoute`: thử mọi hoán vị cà rốt rồi ghép các đoạn BFS.

MVP giới hạn tối đa 3 cà rốt, vì vậy thử tối đa `3! = 6` thứ tự là nhỏ và xác định được lời giải tối ưu chính xác.

Gợi ý có bốn cấp:

1. Hiện các ô có thể đi.
2. Chỉ hướng BFS nên đi tiếp.
3. Hiện tối đa ba dấu chân.
4. Chạy mẫu đúng một bước.

Route gợi ý luôn được tính lại từ vị trí hiện tại và chỉ bao gồm cà rốt chưa nhặt.

## Sinh và validate mê cung

`MazeGenerator` tạo mask tường ngẫu nhiên, dùng DFS để lấy vùng floor liên thông lớn nhất, rồi dùng BFS chọn cặp start/exit có khoảng cách đúng cấu hình. Cà rốt được đặt trên một route khả thi và level chỉ được trả về khi:

- start, exit và cà rốt khác nhau, nằm trong ma trận và không ở tường;
- mọi cà rốt và exit reachable;
- route thu thập đầy đủ tồn tại;
- `optimalPathLength` được tính lại đúng;
- độ dài và số ngõ cụt nằm trong giới hạn độ khó;
- signature không trùng level sinh ngay trước đó.

Generator có fallback corridor hợp lệ để không treo nếu random liên tục không đạt ràng buộc.

## 12 level thủ công

- Màn 1–4: học lên, phải, đi thẳng và đổi hướng.
- Màn 5–8: tường, ngõ cụt, quay về và lựa chọn đường.
- Màn 9–10: nhiều cà rốt và backtracking.
- Màn 11: xếp chuỗi lệnh đầu tiên.
- Màn 12: có chuỗi mẫu chứa một lệnh sai để trẻ tìm và sửa.

### Thêm level mới

Thêm blueprint vào `src/maze/predefinedLevels.ts`:

```ts
{
  id: "level-13",
  name: "Tên màn",
  instruction: "Câu hướng dẫn ngắn",
  difficulty: "hard",
  layout: [
    "######",
    "#S...#",
    "#.#C.#",
    "#...E#",
    "######",
  ],
  recommendedMode: "commands",
}
```

Ký hiệu: `#` tường, `.` đường, `S` start, `E` hang, `C` cà rốt. `LevelFactory` tự tạo collectible ID và tính `optimalPathLength`; test sẽ fail nếu level không có lời giải.

## Thêm nhân vật hoặc vật phẩm

- Tạo entity mới trong `src/entities/` dưới dạng `THREE.Group`.
- Giữ luật thu thập trong simulation; entity chỉ thể hiện hình ảnh.
- Thêm animator riêng trong `src/animation/` nếu cần.
- Đăng ký view object trong `MazeView`, cập nhật bằng state thay vì sửa luật trong mesh callback.
- Dispose geometry/material khi bỏ scene.

Nếu chuyển sang asset ngoài, nên chuẩn hóa GLB/glTF 2.0, có manifest key ổn định và tối ưu texture trước khi ship.

## Lưu tiến trình

Key localStorage: `rabbit-maze-progress-v1`.

Game lưu level đã hoàn thành, số sao tốt nhất, độ khó/chế độ đã mở, trạng thái voice và tổng số cà rốt. Dữ liệu được sanitize khi load; JSON lỗi hoặc schema lạ sẽ fallback về progress mặc định mà không làm crash game.

## Accessibility và responsive

- Nút semantic, `aria-label`, focus ring rõ.
- Arrow keys và WASD; bỏ qua key repeat để không di chuyển quá nhanh.
- Pointer/touch dùng `touch-action: none` ở D-pad.
- Feedback động dùng `role=status` và `aria-live`.
- Trạng thái gợi ý dùng cả dấu chân/mũi tên, không chỉ màu.
- Hỗ trợ `prefers-reduced-motion`.
- Voice có thể tắt; mọi trạng thái vẫn có hình và chữ.
- Responsive đã kiểm tra desktop, tablet ngang/dọc, mobile ngang/dọc; không có scroll ngang.

## Kiểm thử

`npm run test` chạy 34 test gồm:

- bốn hướng, tường, ngoài ma trận, input lock, collect và complete;
- undo một/nhiều bước và undo sau collect;
- BFS đơn giản, không có đường, start=target, ngõ cụt, nhiều vật phẩm;
- validator cho kích thước, tọa độ, wall, reachability, duplicate và optimal length;
- command queue add/remove/clear, lock, stop đúng lệnh sai và chạy tiếp sau sửa;
- progress hỏng dữ liệu và unlock;
- 500 mê cung ngẫu nhiên liên tiếp theo ba độ khó.

Playtest browser đã kiểm tra boot, movement, blocked feedback, collect, completion 3 sao, mở khóa tới command mode, sửa lệnh lỗi, console runtime và năm nhóm viewport.

## Hạn chế của MVP

- Geometry tạo bằng code, chưa có GLB nhân vật hoặc sound effect riêng.
- Chất lượng giọng Việt phụ thuộc voice có sẵn trong hệ điều hành/trình duyệt.
- Command mode hỗ trợ sửa từng chip nhưng chưa có kéo-thả reorder.
- Progress chỉ lưu local trên một browser, chưa đồng bộ tài khoản.
- Chưa có editor level trực quan hoặc telemetry giáo dục.

## Hướng mở rộng

- Kéo-thả block lệnh, loop và hàm con đơn giản.
- Level editor có validator trực tiếp.
- Nhiều nhân vật/vật phẩm và theme khu vườn.
- Sound effect Web Audio, caption và lựa chọn giọng.
- Hồ sơ nhiều trẻ trên cùng thiết bị.
- PWA/offline cache và bộ level theo chương trình học.
- Chế độ dành cho phụ huynh/giáo viên xem kỹ năng đã luyện, không dùng leaderboard.
