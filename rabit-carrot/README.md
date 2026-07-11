# Thỏ Con Tìm Cà Rốt

MVP game giáo dục dành cho trẻ khoảng 5 tuổi, giúp trẻ liên hệ nút mũi tên với tên hướng, một bước di chuyển và vị trí mới trên ma trận.

## Chạy game

Yêu cầu Node.js 20.19+ hoặc 22.12+.

```bash
cd rabit-carrot
npm install
npm run dev
```

Mở địa chỉ Vite hiển thị trong terminal, mặc định là `http://localhost:5173`.

Các lệnh kiểm tra:

```bash
npm test
npm run build
npm run preview
```

## Cách chơi

- Bấm nút **Lên**, **Xuống**, **Trái**, **Phải** hoặc dùng bốn phím mũi tên.
- Mỗi lần bấm, Thỏ chỉ đi đúng một ô.
- Nhặt tất cả cà rốt để mở hang, sau đó đưa Thỏ về hang.
- Không thể đi xuyên cây, đá, vũng nước hoặc ra ngoài khu vườn.
- Bật **Hướng dẫn** hoặc bấm **Gợi ý** để xem đúng một bước BFS tiếp theo.
- Có thể chọn màn 1–4. Tùy chọn **Tự tăng màn** sẽ chuyển sang độ khó tiếp theo sau khi hoàn thành.

## Kiến trúc

```text
src/
  main.js                     Điểm khởi động
  styles.css                  UI responsive và accessibility
  game/
    Game.js                   Điều phối gameplay, feedback và level
    GameState.js              Luật di chuyển và trạng thái thuần
    GardenScene.js            Three.js, primitive 3D và animation
    LevelGenerator.js         Sinh màn theo 4 cấp độ
    PathFinder.js             BFS kiểm tra đường đi và tạo gợi ý
    InputController.js        Click, touch và keyboard
    AudioController.js        Web Speech API tiếng Việt
    GameUI.js                 DOM UI và trạng thái hiển thị
    directions.js             Mapping bốn hướng dùng chung
test/
  game.test.js                Unit test logic, BFS, generator và voice
```

`GameState`, `LevelGenerator` và `PathFinder` không phụ thuộc DOM/Three.js nên được test trực tiếp bằng Node. `InputController` nhận một callback lệnh duy nhất; kiến trúc này cho phép bổ sung chế độ **xếp lệnh rồi chạy** bằng cách đưa lệnh vào queue trước khi gọi cùng pipeline di chuyển.

## Bảo đảm sinh màn

- Mỗi object chiếm một ô riêng.
- Mỗi màn được BFS kiểm tra đường từ Thỏ tới từng cà rốt và tới hang.
- Màn không hợp lệ bị bỏ và sinh lại; có bản đồ dự phòng an toàn.
- Level 1 luôn là lưới 3×3, không chướng ngại và cà rốt cách Thỏ đúng một ô.
- Bộ test sinh 100 màn qua cả bốn cấp độ và xác nhận tất cả đều hoàn thành được.

## Accessibility

- Nút có nhãn tiếng Việt và vùng bấm lớn.
- Trạng thái được thông báo qua `aria-live`, không chỉ qua màu.
- Hỗ trợ keyboard và `prefers-reduced-motion`.
- Voice dùng `speechSynthesis`, luôn hủy câu cũ trước khi đọc câu mới; game vẫn chạy nếu trình duyệt không có giọng Việt.

## Giới hạn MVP

- Nhân vật và vật phẩm dùng primitive geometry, chưa dùng model GLTF hay âm thanh thu sẵn.
- Chế độ **xếp lệnh rồi chạy** mới được chuẩn bị ở ranh giới input/game command, chưa có UI queue.
- Web Speech API phụ thuộc giọng và chính sách autoplay của từng trình duyệt.
- Camera cố định và không xoay để đảm bảo hướng trên màn hình luôn trùng với hàng/cột của ma trận.

## Hướng mở rộng

- Thêm command queue cho chế độ xếp lệnh, nút hoàn tác và chạy từng lệnh.
- Thêm âm thanh thu sẵn, nhiều skin khu vườn và animation biểu cảm.
- Lưu tiến độ theo hồ sơ trẻ, thống kê hướng còn nhầm và điều chỉnh độ khó thích ứng.
- Bổ sung bài hỏi “Cà rốt ở hướng nào?” trước khi cho phép di chuyển.
