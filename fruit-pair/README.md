# Ghép cặp để tìm bên nhiều hơn

Game MVP dùng Three.js để giúp trẻ hiểu khái niệm:

- bên nào nhiều hơn
- bên nào ít hơn
- hai bên bằng nhau

Điểm chính của game là ghép từng cặp 1-1 giữa Táo và Cam, sau đó nhìn phần còn dư để kết luận.

## Chạy game

Từ thư mục `/Users/macm1/development/Games`:

```bash
python3 -m http.server 5173
```

Mở:

```text
http://localhost:5173/fruit-pair/index.html
```

## Điều khiển

- Kéo một quả Táo vào gần một quả Cam hoặc ngược lại để tạo cặp.
- Khi ghép hết cặp, chọn một trong ba đáp án:
  - `Trái nhiều hơn`
  - `Bằng nhau`
  - `Phải nhiều hơn`
- Bật `Hướng dẫn chi tiết` rồi bấm `Gợi ý` để xem game tự minh hoạ cách ghép cặp 1-1.
