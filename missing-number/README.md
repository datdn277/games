# Missing Number Three.js MVP - Single Board

MVP game điền số còn thiếu: chỉ hiển thị 1 nhóm 2x3. Khi trẻ điền đúng, game tự random nhóm mới và ô missing mới.

## Cách chạy

```bash
npm config set registry https://registry.npmjs.org/
npm install
npm run dev
```

Mở URL Vite in ra, thường là `http://localhost:5173`.

## Thay đổi chính trong bản này

- Chỉ hiển thị 1 nhóm số 2x3.
- Điền đúng sẽ tự random nhóm mới.
- Bỏ khay gợi ý/bộ chuẩn riêng.
- Chỉ còn khay số kéo 1–6.
- Hướng dẫn chi tiết dùng chính khay số kéo để highlight số đã có và số còn thiếu.


## Chỉnh sửa v4

- Khi kéo sai số vào ô trống, số sai sẽ snap vào ô để trẻ nhìn thấy lỗi.
- Sau đó số sai tự mờ và ẩn sau khoảng 4 giây.
- Ô trống không được coi là đã điền, trẻ vẫn cần kéo số đúng vào ô.
