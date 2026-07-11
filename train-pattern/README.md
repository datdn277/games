# Đoàn Tàu Quy Luật

MVP game giáo dục 2.5D cho trẻ khoảng 5 tuổi. Trẻ quan sát đoàn tàu, nhận ra **đơn vị quy luật đang lặp lại**, rồi chạm hoặc kéo toa phù hợp vào ô trống.

## Chạy project

Yêu cầu Node.js 20.19+ hoặc 22.12+.

```bash
npm install
npm run dev
```

Vite sẽ in URL local, mặc định là `http://localhost:5173`.

Build và test:

```bash
npm test
npm run build
```

`node_modules/` và `dist/` đã được loại khỏi source bàn giao bằng `.gitignore`. Project không cần tải model, texture, font hay audio từ dịch vụ bên ngoài khi chạy.

## Gameplay

- Chọn `Dễ`, `Trung bình` hoặc `Khó`.
- Quan sát các toa từ trái sang phải.
- Chạm một đáp án để toa bay vào vị trí trống, hoặc kéo toa vào dấu hỏi.
- Nhấn `Gợi ý` lần lượt để:
  1. nghe lại chuỗi;
  2. chia chuỗi thành các nhóm quy luật;
  3. làm sáng lựa chọn phù hợp mà không tự hoàn thành.
- `Nghe lại` đọc chuỗi bằng Web Speech API với `lang="vi-VN"`.
- Nút nốt nhạc bật/tắt voice; game vẫn chơi bình thường nếu thiết bị không có voice tiếng Việt.
- `Chơi lại` reset màn hiện tại, không phạt và không mất tiến trình.

Game không có đếm ngược, mạng, bảng xếp hạng hoặc hình phạt nặng. Sau câu sai đầu tiên, feedback hướng trẻ quay lại quan sát nhóm lặp thay vì tiết lộ đáp án.

## Nội dung MVP

| Mức | Pattern | Số toa | Lựa chọn |
|---|---|---:|---:|
| Dễ | AB | 5–6 | 2 |
| Trung bình | AB, AAB, ABC | 6–8 | 3 |
| Khó | AAB, ABB, ABC | 7–9 | 4 |

Ba nhóm nội dung được tách khỏi logic:

- trái cây;
- hình học (khác cả hình và màu);
- màu sắc (có số/ký hiệu đi kèm, không chỉ truyền đạt bằng màu).

## Kiến trúc

```text
src/
  main.js                     Điểm khởi động
  styles.css                  Theme, responsive, reduced motion
  data/
    itemSets.js               Trái cây, hình học, màu sắc
    patternConfigs.js         Pattern và cấu hình độ khó
  game/
    Game.js                   Điều phối vòng chơi
    GameState.js              State thuần + tính sao
    PatternEngine.js          Logic quy luật độc lập UI
    LevelGenerator.js         Sinh và kiểm tra cấu trúc level
    Train.js                  Đầu tàu, scene group, khói
    TrainCar.js               Toa 3D + CanvasTexture nội dung
    InputController.js        Pointer, touch, keyboard, drag/drop
    HintController.js         Luồng gợi ý ba bước
    AudioController.js        SpeechSynthesis + tiếng còi Web Audio
    AnimationController.js    Bounce, shake, train run
    GameUI.js                 DOM HUD và accessibility
    ProgressStorage.js        localStorage có fallback
test/
  PatternEngine.test.js
  LevelGenerator.test.js
  Interaction.test.js
```

### Ranh giới trách nhiệm

- `PatternEngine`, `LevelGenerator` và `GameState` không phụ thuộc Three.js hay DOM, nên có thể test trực tiếp.
- Three.js chỉ là lớp hiển thị: camera, ánh sáng, locomotive, toa, bánh xe, khói và animation.
- HUD, feedback, nút và khay đáp án dùng DOM để có responsive, touch target lớn, keyboard và ARIA tốt hơn.
- Nội dung trong `itemSets.js` độc lập với pattern; thêm category không cần sửa engine.
- Dữ liệu lưu chỉ gồm tiến trình có thể serialize, không lưu object Three.js.

## PatternEngine

Các API chính:

```js
parsePattern(pattern)
buildPatternSequence(pattern, itemsByToken, length)
getExpectedItemAt(pattern, itemsByToken, index)
createMissingSequence(sequence, missingIndex)
validateAnswer(answer, expectedItem)
getPatternGroups(pattern, sequenceLength)
describePattern(pattern, itemsByToken)
```

Engine hiểu pattern từ cấu hình hoặc chuỗi token, nên có thể thêm `AABC`, `ABBC`, `ABCD` bằng cách bổ sung cấu hình mà không đổi thuật toán lặp.

## LevelGenerator

Generator đảm bảo:

- đúng pattern được phép theo độ khó;
- ít nhất hai đơn vị quy luật;
- một và chỉ một ô trống;
- ô trống gần cuối trong MVP nhưng data model hỗ trợ index bất kỳ;
- các item đại diện A/B/C khác nhau;
- đáp án xuất hiện đúng một lần trong khay;
- distractor khác đáp án;
- không lặp chính xác signature của màn liền trước.

Test tự động sinh 500 level xen kẽ cả ba độ khó và kiểm tra toàn bộ invariant trên.

## Accessibility và responsive

- Mouse, touch, pointer và keyboard (`Enter`/`Space`) đều chọn được đáp án.
- Answer card có nhãn đọc màn hình; nút có `aria-label`; feedback dùng live region.
- Touch target lớn, `touch-action: none` chỉ trên vùng kéo để tránh cuộn trang khi đang drag.
- Đúng/sai có icon, chữ, motion và màu; không phụ thuộc duy nhất vào màu.
- `prefers-reduced-motion` rút ngắn animation không thiết yếu.
- Layout đã được thiết kế cho desktop, tablet dọc/ngang và mobile dọc/ngang.
- WebGL context loss có trạng thái fallback; dữ liệu localStorage hỏng sẽ trở về mặc định.

## Mở rộng

- Pattern mới: thêm token array vào `patternConfigs` và đưa key vào `allowedPatterns`.
- Nội dung mới: thêm category/item vào `itemSets` với `id`, `label`, `speechLabel`, kiểu hiển thị và màu.
- Ô trống giữa chuỗi: đổi chiến lược chọn `missingIndex` trong `LevelGenerator`; renderer và validation đã đọc index từ level.
- Nhiều ô trống hoặc tìm cả đơn vị quy luật: mở rộng level schema thành danh sách missing index và giữ `PatternEngine` làm nguồn xác thực.

## Kiểm thử đã triển khai

- Pattern: `ABABAB`, `AABAAB`, `ABBABB`, `ABCABC`.
- Expected item ở mọi index, missing sequence, validation, nhóm và mô tả.
- 500 level ngẫu nhiên qua Dễ/Trung bình/Khó.
- Keyboard select, khóa input, ba bước gợi ý, reset và tính sao.
- Playtest trình duyệt: desktop/tablet/mobile, portrait/landscape, tap sai, drag đúng, drag sai vùng, voice toggle, chuyển màn và console.
