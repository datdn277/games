# Máy Lắp Tiếng Việt

MVP game giáo dục cho trẻ 5–8 tuổi, giúp trẻ nhìn thấy cấu tạo đơn giản của một tiếng:

```text
âm đầu + vần (+ dấu khi tiếng có dấu) = tiếng hoàn chỉnh
```

Ví dụ: `b + a = ba` và `b + an + huyền = bàn`.

## Chạy project

Yêu cầu Node.js 20.19+ hoặc 22.12+.

```bash
npm install
npm run dev
```

Vite sẽ in địa chỉ local trong terminal, thường là `http://localhost:5173`.

Build và chạy test:

```bash
npm test
npm run build
```

Không commit `node_modules/`, `dist/` hoặc `package-lock.json` được tạo từ registry riêng. Project đã có `.gitignore` cho output và dependency local.

## Cách chơi

1. Nhìn hình và nghe tiếng cần ghép.
2. Chạm một tile hoặc kéo tile vào khe cùng loại.
3. Chọn âm đầu và vần; với tiếng có dấu, chọn thêm dấu.
4. Bấm **Kiểm tra**. Game chỉ rõ phần nào sai.
5. Khi đúng, nghe cách đánh vần và bấm **Chơi tiếp**.

Có bốn mức chọn bài: Dễ, Trung bình, Khó và Ngẫu nhiên. Toggle **Hướng dẫn chi tiết** biến nút Gợi ý thành chuỗi hướng dẫn từng bước.

## Kiến trúc

```text
vietnamese-machine/
├── index.html
├── package.json
├── src/
│   ├── data.js           # 25 tiếng, level và distractor
│   ├── game-logic.js     # kiểm tra từng thành phần và câu feedback
│   ├── main.js           # state, render, click/drag, hint và gameplay
│   ├── speech.js         # Web Speech API, hủy câu cũ trước câu mới
│   ├── styles.css        # layout responsive và accessibility
│   ├── three-scene.js    # hai/ba khối 3D, hover, shake và celebrate
│   └── vietnamese.js     # utility dựng tiếng và đặt dấu thanh
└── test/
    └── vietnamese.test.js
```

`word` trong dataset là nguồn sự thật khi chấm đáp án. `buildVietnameseSyllable()` tạo preview từ các mảnh và được test độc lập. Các tiếng có `tone: "ngang"` chỉ hiện âm đầu + vần và không đọc tên thanh. MVP dùng quy ước sư phạm theo đề bài `cặp = c + ap + nặng`; utility chuyển `ap` thành dạng chữ `ăp` trong trường hợp này.

## Tương tác và accessibility

- Pointer Events hỗ trợ kéo bằng chuột và cảm ứng; chạm/click tự đưa tile vào khe.
- Tile là button thật nên có thể chọn bằng Tab, Enter hoặc Space.
- Mỗi khe, nút và select có nhãn truy cập; feedback dùng `aria-live`.
- Sai/đúng được diễn đạt bằng chữ và biểu tượng, không chỉ bằng màu.
- Tôn trọng `prefers-reduced-motion`.
- Web Speech API ưu tiên `vi-VN`; nếu máy không có giọng Việt hoặc không hỗ trợ API, game chữ vẫn hoạt động bình thường.

## Phạm vi MVP

- Bộ dữ liệu hiện có 25 tiếng gần gũi, chưa phải từ điển tiếng Việt tổng quát.
- Quy tắc đặt dấu xử lý các mẫu trong bộ dữ liệu và nhiều vần thông dụng, chưa xử lý mọi biến thể chính tả (`qu`, `gi`, lựa chọn `i/y`, vần có cách tách âm vị khác nhau).
- Hình minh họa dùng icon hệ thống để project gọn và không cần tải asset mạng.
- Chất lượng giọng đọc phụ thuộc voice tiếng Việt có sẵn trong trình duyệt/hệ điều hành.

## Hướng mở rộng

- Ghi âm giọng giáo viên cho âm vị chuẩn và thống nhất giữa thiết bị.
- Bổ sung pipeline dữ liệu có kiểm duyệt ngôn ngữ, từ theo chủ đề và tranh minh họa riêng.
- Thêm hồ sơ người học, streak, adaptive difficulty và báo cáo phần trẻ thường chọn sai.
- Mở rộng utility thành bộ phân tích âm tiết tiếng Việt đầy đủ, có test theo từ điển.
