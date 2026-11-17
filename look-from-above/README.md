# Đôi mắt thần kỳ

**Magic Cube Explorer 3D · Look From Above!** là trò chơi tiếng Việt cho trẻ 5–6 tuổi. Bé cùng cú Bobo quan sát công trình bằng khối lập phương, dự đoán hình nhìn từ trên, rồi đổi góc để tự kiểm chứng.

## Chạy trên máy

Dùng Node.js 20.19+ (nhánh 20) hoặc 22.12+.

```sh
cd look-from-above
npm install
npm run dev
```

Mở địa chỉ Vite hiển thị trong terminal. Chạy `npm test` để kiểm thử logic, `npm run build` để tạo trang tĩnh trong `look-from-above/static/`, hoặc `npm run preview` để chạy thử bản build.

Để mở từ menu kho trò chơi, chạy `python3 -m http.server 8080` tại thư mục gốc của repo, truy cập `http://127.0.0.1:8080` rồi chọn **Đôi mắt thần kỳ**. Build lại sau khi sửa mã nguồn để cập nhật bản mà menu mở.

## Cách chơi

Quan sát công trình bằng các nút đổi góc hoặc thanh góc nhìn. Ở những bài dự đoán, bé chọn hoặc ghép hình trước khi bay lên cùng Bobo. Khi nhìn thẳng xuống, chỉ mặt trên cao nhất của mỗi cột xuất hiện trong hình chiếu. Chế độ nhìn xuyên khối giúp bé nhận ra những khối đang bị che và xem số tầng của cột.

| Cấp | Bài tập |
| --- | --- |
| 1 · Làm quen khối vuông | Tìm mặt trên và mặt bên, rồi bay lên để quan sát. |
| 2 · Những ô màu kỳ diệu | Ghép các ô trống, sáng và tối theo công trình một tầng. |
| 3 · Bay lên nhìn từ trên | Dự đoán hình chiếu rồi đổi góc để kiểm chứng. |
| 4 · Bí mật khối bị che | Khám phá các tầng và so sánh với hình chiếu thật. |
| 5 · Thám tử hình chiếu | Chọn một trong bốn hình cho các công trình nhiều tầng. |
| 6 · Kiến trúc sư nhí | Tô màu, thêm, xóa, xếp chồng và lưu công trình tự xây. |

Cảnh 3D cần WebGL 2. Giọng đọc cần giọng tiếng Việt do trình duyệt hoặc hệ điều hành cung cấp qua Web Speech API. Hướng dẫn bằng chữ vẫn hiển thị khi giọng đọc chưa khả dụng. Tiến độ, sao, công trình đã lưu và tùy chọn âm thanh dùng bộ nhớ cục bộ của trình duyệt.
