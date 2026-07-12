# Hành Trình Rổ Trái Cây

MVP game giáo dục dành cho trẻ khoảng 5 tuổi. Trẻ đi theo một đường tính liên tiếp, quan sát số quả táo thực sự được thêm vào hoặc lấy ra khỏi rổ 3D, đếm lại rồi chọn kết quả. Kết quả đúng của bước trước trở thành số bắt đầu của bước sau.

## Chạy project

Yêu cầu Node.js 20.19+ hoặc 22.12+.

```bash
npm install
npm run dev
```

Vite sẽ in URL local, mặc định là `http://localhost:5173`.

Kiểm thử và build production:

```bash
npm test
npm run build
npm run preview
```

`node_modules/` và `dist/` đã được loại khỏi source bằng `.gitignore`.

## Trải nghiệm đã triển khai

- Ba mức Dễ, Trung bình và Khó; cấu hình tách khỏi logic game.
- Đường tính dạng rắn, có start/operation/answer/finish và state locked/active/completed/correct/incorrect.
- Rổ và táo 2.5D dựng procedural bằng Three.js; camera orthographic giúp giảm che khuất.
- Táo bố trí tối đa 5 quả mỗi hàng; hỗ trợ 0–15 quả.
- Mỗi bước đọc trọn câu mô tả trước; giọng đọc kết thúc mới chạy animation chậm từng quả, rồi mới đọc câu hỏi và mở khay đáp án.
- Cộng bay từng quả vào, trừ highlight rồi bay từng quả ra; không hiển thị nhãn tổng số để trẻ tự đếm và suy luận.
- Chạm, bàn phím, kéo chuột và kéo bằng touch/pointer để trả lời.
- Sai lần đầu: rung thẻ, sắp lại rổ và đếm sáng từng quả. Sai tiếp: đọc số lượng và highlight đáp án đúng nhưng vẫn để trẻ chọn.
- Bốn cấp gợi ý: nhắc phép tính, chạy lại chậm, đếm toàn bộ, highlight đáp án.
- Web Speech API tiếng Việt, có bật/tắt và nghe lại; game vẫn hoạt động nếu không có voice.
- Ba sao nhẹ nhàng, không timer, không mạng sống, không bảng xếp hạng.
- Lưu mức chơi, số màn, sao, voice và tốc độ animation bằng `localStorage`, có fallback khi dữ liệu lỗi.
- Responsive desktop/tablet/mobile, keyboard focus, ARIA, vùng chạm lớn và `prefers-reduced-motion`.
- Fallback emoji nếu WebGL không khởi tạo được; xử lý resize và context loss.

## Kiến trúc

```text
src/
  main.js                         Bootstrap
  styles.css                      Visual system + responsive + a11y
  data/
    difficultyConfigs.js          Cấu hình 3 mức độ
    fruitThemes.js                Theme táo
  game/
    Game.js                       Điều phối vòng chơi
    GameState.js                  Simulation state, tính sao
    LevelGenerator.js             Sinh/validate chuỗi phép tính
    ArithmeticPath.js             Render đường tính dạng rắn
    PathCell.js                   Cell và state UI
    BasketScene.js                Three.js scene và fruit lifecycle
    Fruit.js                      Mesh táo độc lập + dispose
    AnimationController.js        Tween, speed, reduced motion
    AnswerController.js           Đáp án click/keyboard/drag
    HintController.js             4 cấp gợi ý
    AudioController.js            Web Speech API vi-VN
    GameUI.js                     DOM view adapter
    ProgressStorage.js            localStorage boundary
test/
  level-generator.test.js         1.500 level ngẫu nhiên + chuỗi mẫu
  game-logic.test.js              Đáp án, state, sao, layout 0–15
```

`GameState` và level model là nguồn dữ liệu thật. Three.js không giữ quy tắc phép tính; nó chỉ biểu diễn state và chạy animation. Vì vậy có thể bổ sung mode “trẻ tự kéo quả” sau này bằng một input/controller mới mà không phải viết lại generator hay đường tính.

## Luồng dữ liệu

```text
LevelGenerator
  → GameState
  → Game điều phối bước hiện tại
  ├─ ArithmeticPath (DOM)
  ├─ BasketScene (Three.js)
  ├─ AnswerController (pointer/keyboard)
  ├─ HintController
  └─ AudioController (không bắt buộc)
```

Trong lúc animation, `interactionLocked = true`. Chỉ khi số object trong rổ đã khớp với `step.result`, khay đáp án mới được mở khóa.

## Kiểm thử

`npm test` kiểm tra bắt buộc:

- hai chuỗi mẫu liên tiếp;
- 500 level cho mỗi mức (tổng 1.500), không âm, không quá `maxResult`, đúng operand/operator và không lặp màn ngay trước;
- cả cộng và trừ ở Trung bình/Khó;
- đáp án đúng duy nhất, distractor không âm;
- chuyển result thành input tiếp theo;
- layout 0, 1, 5, 10, 15 quả không trùng vị trí;
- công thức tính sao.

Khi chạy ở trình duyệt, `window.__FRUIT_GAME_DEBUG__` cung cấp các getter nhỏ để smoke test state, level và số object trong rổ mà không biến scene graph thành nguồn sự thật.
