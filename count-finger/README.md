# Bàn tay Toán học kỳ diệu

Cùng gấu Mimo học đếm, cộng và trừ trong phạm vi 10. Bé ghi nhớ số đầu, giơ số ngón cần dùng rồi đếm đúng một bước trên mỗi ngón.

## Chạy ở máy

Dùng Node.js 22.12 trở lên.

```sh
cd count-finger
npm install
npm run dev
```

Mở địa chỉ Vite hiển thị trong terminal.

## Kiểm thử và build

```sh
npm test
npm run build
```

Thư mục `static/` chứa bản chạy độc lập mà trang chủ kho trò chơi liên kết tới. Sau khi sửa mã nguồn, build lại và đưa thư mục này lên cùng trang chủ. Để thử cả hai trang, chạy `python3 -m http.server 8080` ở thư mục gốc repo rồi mở `http://localhost:8080`.

Bản build gói Three.js, phông chữ và toàn bộ tài nguyên. Khi được mở qua HTTPS hoặc localhost, service worker lưu các tệp của trò chơi cho những lần chơi ngoại tuyến tiếp theo. Nếu thiết bị có giọng tiếng Việt cục bộ, Mimo đọc hướng dẫn và từng số. Bé luôn có thể đọc hướng dẫn trên màn hình và nghe hiệu ứng tổng hợp.

## Cách chơi

- **Học cùng Mimo** tự giơ ngón, đánh dấu ngón cần chạm và có đường số hỗ trợ.
- **Bé tự tính** cho bé tự chọn số ngón, sau đó chạm theo thứ tự bất kỳ.
- **Thử thách ngôi sao** tắt đường số mặc định và có huy hiệu hoàn thành. Bé có thể bật gợi ý trong câu hỏi.
- Bé chạm trực tiếp vào bàn tay 3D hoặc dùng các nút số bên cạnh bằng bàn phím. Tiến độ và cài đặt được lưu trong trình duyệt.

## Mã nguồn

- `src/game.js` quản lý các bước chơi, phần thưởng và tiến độ.
- `src/questions.js` sinh câu hỏi, dãy đếm và đáp án.
- `src/scene.js` và `src/scene/` dựng lớp học, bàn tay, Mimo và đường số 3D.
- `src/ui.js` điều khiển giao diện. `src/audio.js` điều khiển nhạc, hiệu ứng và giọng đọc.
