# Ếch tìm lá sen thứ mấy?

**Lily Pad Order – Froggy Learning Adventure** là game 3D tiếng Việt cho trẻ 5–6 tuổi. Bé cùng Froggy chọn bờ, chạm từng lá sen theo thứ tự rồi tìm bông hoa phép thuật ở lá đích.

## Chạy trên máy

Dùng Node.js 20.19+ (nhánh 20) hoặc 22.12+.

```sh
cd frog-count
npm install
npm run dev
```

Mở địa chỉ Vite hiện trong terminal. Chạy `npm test` để kiểm tra luật chơi với Vitest. Chạy `npm run build` để cập nhật bản tĩnh trong `frog-count/static/`, rồi dùng `npm run preview` để xem bản đó.

Để xem trò chơi qua menu kho game, chạy `python3 -m http.server 8080` từ thư mục gốc của repo, mở `http://localhost:8080` và chọn **Ếch tìm lá sen thứ mấy?**. Thẻ trên trang chủ mở `frog-count/static/index.html` nên cần build lại khi sửa mã nguồn.

## Cách chơi

1. Chọn bờ trái hoặc bờ phải theo yêu cầu.
2. Chạm lần lượt từng lá theo hướng đã chọn. Cú nhảy từ bệ đến lá đầu tiên được tính là số 1.
3. Khi Froggy đến lá cần tìm, nhận sao và chọn chơi tiếp hoặc chơi lại.

Trò chơi có năm cấp độ, từ nhận biết hai bờ đến đếm luân phiên theo cả hai hướng. Trong **Đổi bờ – Đổi hướng**, bé đếm đến lá thứ tư từ mỗi đầu của cùng một hàng sáu lá để so sánh hai vị trí đích. Trò chơi tự điều chỉnh gợi ý theo tiến độ. Bé có thể nghe lại câu hỏi, xin gợi ý ở bước chọn bờ hoặc chọn lá, và đếm lại giữa lượt.

Bé có thể dùng chuột, chạm màn hình hoặc dùng `Tab` và `Enter`. Hiệu ứng âm thanh và nhạc nền được tạo trong trình duyệt. Hướng dẫn bằng giọng nói cần một giọng tiếng Việt khả dụng qua Web Speech API. Hướng dẫn bằng chữ và hình ảnh vẫn hiển thị khi giọng đọc chưa có. Cảnh 3D dùng WebGL 2.

Sao, tiến độ và tùy chọn âm thanh lưu trên trình duyệt bằng LocalStorage. Các quy tắc đếm, câu hỏi, hỗ trợ và tiến độ nằm trong `src/gameplay.js` và có thể chạy kiểm thử độc lập với Three.js.
