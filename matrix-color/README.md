# Ô Màu Song Sinh

MVP game giáo dục dành cho trẻ khoảng 5 tuổi. Trẻ quan sát một ô màu trong **Bảng mẫu**, tìm đúng hàng và cột tương ứng trong **Bảng của bé**, rồi tô đúng màu.

## Chạy game

Yêu cầu Node.js 20.19+ hoặc 22.12+.

```bash
cd matrix-color
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

- Chọn **Kích thước → Nhập tay**, rồi nhập một số từ 2 đến 7 để tạo bảng vuông tương ứng, ví dụ `6` tạo bảng 6×6.
- Giá trị nhỏ hơn 2 hoặc lớn hơn 7 được tự động đưa về giới hạn an toàn; dữ liệu không hợp lệ trở về mode Tự động.
- Ở mode **Tự động**, mức Dễ và Trung bình dùng 3×3, mức Khó dùng 4×4.
- Mức **Dễ** dùng một màu và tự chọn sẵn màu; trẻ chỉ cần tìm đúng vị trí.
- Mức **Trung bình** dùng hai màu.
- Mức **Khó** dùng ba hoặc bốn màu và hỗ trợ kéo màu vào ô.
- Khi nhập bảng lớn hơn, số ô cần sao chép tăng theo nhưng số màu vẫn do mức độ quyết định.
- Chọn màu rồi chạm ô trong Bảng của bé, hoặc kéo trực tiếp swatch màu vào ô.
- Màu sai được hiển thị ngắn, rung và tự trở lại trạng thái trước đó.
- Nút **Tẩy màu** xóa riêng một ô, không cần reset toàn màn.
- Mỗi lần bấm **Gợi ý** chỉ mở một bước: ô mẫu → hàng/cột tương ứng → màu cần dùng.

## Kiến trúc

Game tuân theo ranh giới của Game Studio: simulation là nguồn dữ liệu duy nhất, Three.js chỉ là render adapter, DOM phụ trách HUD và accessibility.

```text
src/
  main.js
  styles.css
  data/
    colors.js                 Bảng màu có tên và symbol
    levels.js                 Cấu hình độ khó và kích thước tách khỏi logic
  game/
    Game.js                   Điều phối vòng chơi
    GameState.js              State và luật tô/validation thuần
    LevelGenerator.js         Sinh mẫu và chống lặp mẫu trước
    validation.js             So sánh ô/toàn ma trận, tính sao
    InputController.js        Tap, drag, touch và keyboard
    AudioController.js        Web Speech API vi-VN
    ProgressStore.js          localStorage có fallback an toàn
  render/
    TwinGridScene.js          Cầu nối hai Three.js view
    GridView.js               Scene, camera, raycast và animation
    GridCellView.js           Tile 2.5D và các trạng thái trực quan
  ui/
    GameUI.js                 DOM HUD, palette và completion modal
test/
  game.test.js                15 nhóm test, gồm 500 level random
```

## Level generator

- Không tô trùng ô và không tạo level rỗng.
- Số ô và số màu luôn nằm trong cấu hình level.
- Mỗi màu thực tế xuất hiện ít nhất một lần.
- Mẫu trải qua ít nhất hai hàng và hai cột; mức Khó còn trải qua nhiều vùng ma trận.
- Không sinh lại đúng chữ ký của màn ngay trước đó.
- Màu đều lấy từ palette đã kiểm soát độ khác biệt.

## Input và accessibility

- Click/tap dùng raycast vào tile Three.js.
- Drag dùng Pointer Events và pointer capture, không tạo nhiều bản sao ghost.
- Canvas Bảng của bé có thể focus; dùng phím mũi tên để chọn ô, `Enter`/`Space` để tô, `Delete`/`Backspace` để tẩy.
- Palette luôn có tên màu, symbol và dấu tick, không chỉ truyền trạng thái bằng màu.
- Feedback đúng/sai dùng tick, dấu hỏi, border và `aria-live`.
- Tôn trọng `prefers-reduced-motion` và có UI phục hồi khi WebGL context bị mất.

## Lưu tiến trình

`localStorage` lưu phiên bản schema, mức hiện tại, kích thước đã chọn, mức đã mở, tổng số sao, số màn hoàn thành và sao tốt nhất theo độ khó. Dữ liệu thiếu, hỏng hoặc storage bị chặn đều trở về mặc định an toàn mà không chặn gameplay.

## Kiểm thử

Unit test bao phủ:

- 500 level ngẫu nhiên qua ba độ khó;
- 450 lượt bổ sung bao phủ 18 tổ hợp `3 độ khó × 6 kích thước nhập tay`;
- đúng/sai vị trí và màu;
- tô thừa ô trắng, bỏ sót, tô đè và tẩy;
- reset, chữ ký màn mới, ba bước gợi ý;
- completion, tính sao, save/load và dữ liệu hỏng;
- keyboard mapping và voice không phát chồng.

Playtest trình duyệt bao phủ click, mouse drag, touch, keyboard, completion và năm viewport: desktop, tablet ngang, tablet dọc, mobile ngang, mobile dọc.

## Giới hạn MVP

- Chế độ **kiểm tra ngay** là UI mặc định. `validationMode` đã tách trong level/state để bổ sung chế độ kiểm tra cuối màn.
- Các mode nhập tay hiện dùng mẫu random; chưa có pixel-art, ghi nhớ mẫu hoặc bài sửa lỗi trong bản sao.
- Âm thanh dùng Web Speech API, nên chất giọng phụ thuộc trình duyệt và hệ điều hành.
- Hai renderer Three.js làm code rõ và hai bảng độc lập, nhưng bundle vẫn mang toàn bộ Three.js; có thể tách vendor chunk khi triển khai production.

## Hướng mở rộng

- Thêm preset “Làm quen”, “Pixel art” và “Đối xứng” trên các kích thước hiện có.
- Thêm pattern đối xứng, pixel art đơn giản và chế độ ghi nhớ cho bảng lớn.
- Thêm policy kiểm tra cuối màn với nút kiểm tra và highlight nhiều lỗi.
- Thêm hồ sơ trẻ, thống kê hàng/cột thường nhầm và độ khó thích ứng.
