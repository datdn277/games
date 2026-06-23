# Fruit Grid Three.js MVP v3 Fixed

## Chạy project

```bash
npm install
npm run dev
```

Mở URL Vite in ra, thường là `http://localhost:5173`.

## Bật / tắt Hướng dẫn chi tiết

Ở thanh điều khiển phía dưới có checkbox `Hướng dẫn chi tiết`.

- Tick checkbox để bật mode hướng dẫn từng bước.
- Bỏ tick checkbox để tắt mode hướng dẫn chi tiết.
- Sau khi bật, bấm `Gợi ý vị trí tiếp theo` để chạy animation hướng dẫn.

Mode hướng dẫn sẽ mô phỏng từng bước:

1. Xác định ô cần điền ở bảng số.
2. Tìm ô cùng hàng, cùng cột ở bảng trái cây.
3. Xác định loại quả ở ô đó.
4. Tìm quả trong bảng quy đổi.
5. Highlight số cần kéo vào ô viền sáng.

## Tính năng khác

- Kéo số vào ô trống tương ứng với vị trí quả ở bảng trái.
- Bấm `Chơi lại` để random lại ma trận quả.
