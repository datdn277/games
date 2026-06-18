# Cá Sấu So Sánh Số

MVP game giáo dục bằng Three.js giúp trẻ học so sánh hai số thông qua số lượng đồ vật.

## Cách chơi

- Nhìn hai nhóm đồ vật bên trái và bên phải.
- Cá sấu luôn đứng ở giữa.
- Kéo sang trái/phải để xoay miệng cá sấu về phía có nhiều đồ vật hơn.
- Nếu hai bên bằng nhau, để cá sấu nhìn thẳng ở giữa.
- Khi đúng, game sẽ ghép cặp các đồ vật để trẻ thấy bên nào còn dư, rồi mới hiện ký hiệu `>`, `<`, hoặc `=`.

## Cách chạy local

```bash
python3 -m http.server 5173
```

Sau đó mở:

```text
http://localhost:5173
```

Không nên double-click trực tiếp `index.html` vì trình duyệt có thể chặn ES module/CDN.

## Nội dung học tập

Game dạy trẻ theo thứ tự:

1. Nhìn vật thật.
2. So sánh số lượng.
3. Ghép cặp 1-1 để biết bên nào còn dư.
4. Kết luận số nào lớn hơn/nhỏ hơn/bằng nhau.
5. Hiện ký hiệu `>`, `<`, `=`.

## Gợi ý nâng cấp

- Thêm giọng đọc tiếng Việt.
- Thêm âm thanh cá sấu, pop, success.
- Thêm chế độ chọn ký hiệu `>`, `<`, `=` sau khi trẻ quen.
- Thêm nhiều chủ đề: táo, cá, hoa, khối gỗ.
- Thêm bảng phụ huynh để chọn phạm vi số 1–5, 1–10, 1–20.
