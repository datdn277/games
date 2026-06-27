# Number Race - Đường đua số MVP

MVP game Three.js dạy trẻ nhận biết số lớn nhất / nhỏ nhất thông qua vị trí trên đường số.

## Bản cập nhật

- Con vật trên đường đua chỉ hiển thị model 3D, không còn icon/số đè trên model.
- Tất cả con vật xuất phát từ vạch 0, bấm **Chạy thử** để chạy tới vị trí số tương ứng.
- Bỏ các text phụ trên trục số như “gần số 0”, “xa bên phải”, “số càng đi xa...” để giao diện thoáng hơn.
- Bỏ panel text “Bước 1: Ai lớn nhất?” / “Bước 2: Ai nhỏ nhất?”.
- Bỏ nền platform dưới trục số để trục số gọn hơn.
- Sau khi chạy xong, game hỏi bằng voice: “Ai ở vị trí số lớn nhất?”, chọn xong hỏi tiếp “Ai ở vị trí số nhỏ nhất?”.
- Chọn xong cả 2 câu thì game tổng kết đúng/sai cho từng câu.

## Chạy project

Không cần npm install nếu dùng static server:

```bash
python3 -m http.server 5173
```

Sau đó mở:

```text
http://localhost:5173
```

Project dùng Three.js từ CDN, nên cần internet khi mở game.


## v4-track-visible

- Sửa lỗi trục số / đường đua không hiển thị rõ sau khi bỏ nền xám.
- Trục số, vạch số và lane được vẽ bằng mesh riêng, không phụ thuộc vào platform/background.
