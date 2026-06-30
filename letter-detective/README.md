# Thám tử chữ cái - MVP v3 clean UI

Game giúp trẻ tìm **chữ khác trong nhóm chữ**, chỉ dùng các chữ cái thuộc **bảng chữ cái tiếng Việt**.

Bảng chữ cái dùng trong game:

```text
A Ă Â B C D Đ E Ê G H I K L M N O Ô Ơ P Q R S T U Ư V X Y
```

Không dùng các chữ không thuộc bảng chữ cái tiếng Việt như `F`, `J`, `W`, `Z`.

## Cập nhật v3

- Bỏ `instruction-panel` trên màn chơi để giao diện thoáng hơn.
- Bỏ `floating-note`.
- Bỏ đổ bóng của chữ trong lưới chữ cái.
- Giữ lại toast/voice để feedback và hướng dẫn khi cần.

## Tính năng

- Lưới chữ 3x3 dạng tile 3D.
- Một chữ khác nằm random trong nhóm.
- Click/touch để chọn chữ khác.
- Feedback đúng/sai có giải thích.
- Có nút đọc câu hỏi bằng giọng nói trình duyệt.
- Có nút gợi ý.
- Có chế độ hướng dẫn chi tiết: game quét từng ô để dạy trẻ quan sát.
- Các mode:
  - Dễ: chữ Việt khác rõ
  - Trung bình: chữ Việt gần giống
  - Dấu chữ Việt: Ă Â Đ Ê Ô Ơ Ư
  - Ngẫu nhiên chữ Việt

## Cách chạy

Không cần cài dependency nếu chạy bằng Python:

```bash
python3 -m http.server 5173
```

Mở trình duyệt:

```text
http://localhost:5173
```

Hoặc dùng npm:

```bash
npm run dev
```

Bản này dùng Three.js từ CDN nên cần internet khi mở game.
