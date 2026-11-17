# Đoàn Tàu Muông Thú – Bé đếm từ đâu?

Game giáo dục 3D cho bé 5–6 tuổi. Ở Ga Cầu Vồng, Mimo hướng dẫn bé tìm đầu hàng, chạm từng bạn thú theo đúng chiều, dừng ở số cần tìm và xác nhận đáp án. Chặng cuối giữ nguyên hàng để bé so sánh cùng một số thứ tự khi đổi bên bắt đầu.

## Chạy và kiểm thử

Dùng Node.js 20.19+ (nhánh 20) hoặc 22.12+.

```sh
cd animal-line-adventure
npm install
npm run dev
```

Mở địa chỉ Vite in ra trong terminal. Các lệnh khác:

```sh
npm test         # kiểm thử luật đếm, sinh câu hỏi, tiến độ và chuyển trạng thái
npm run build    # cập nhật bản tĩnh tại static/
npm run preview  # xem riêng bản tĩnh sau khi build
```

Trang chủ của kho game mở `animal-line-adventure/static/index.html`. Để xem cùng trang chủ, chạy `python3 -m http.server 8080` từ thư mục gốc `Games`, rồi mở `http://localhost:8080`. Cập nhật `static/` sau khi sửa mã nguồn để trang chủ dùng được bản mới.

## Cách chơi

- Năm chặng đi từ nhận biết hai đầu hàng đến đếm và so sánh hai chiều. Mỗi nhiệm vụ hoàn thành được một sao. Trò chơi tự điều chỉnh gợi ý theo cách bé đếm.
- Chạm trực tiếp vào con vật 3D hoặc dùng Tab và Enter. Chọn sai thì thử lại tại bước hiện tại. Nút Gợi ý mở một lời nhắc cụ thể; nút Nghe lại đọc câu hỏi và bước hiện tại nếu thiết bị hỗ trợ.
- Game dùng Web Speech API và chỉ chọn giọng tiếng Việt có sẵn trên thiết bị. Nếu không có giọng phù hợp vẫn có lời hướng dẫn, mũi tên, số và tiếng chạm. Có thể tắt âm thanh từ menu hoặc khi chơi.
- Hình 3D cần trình duyệt hỗ trợ WebGL 2. Khi WebGL không khởi tạo được, game hiển thị lời báo và cho bé đếm bằng các nút tên theo cùng một hàng.
- Sao, chặng đã hoàn thành và cài đặt âm thanh được lưu trên trình duyệt. Bản tĩnh tự lưu tài nguyên để chơi ngoại tuyến sau lần mở thành công đầu tiên trên HTTPS hoặc localhost. Game không yêu cầu tài khoản hay dịch vụ ngoài.

Mô hình, hoạt ảnh, sân ga và đoàn tàu được dựng bằng Three.js; phần luật chơi trong `src/gameplay/` có thể kiểm thử độc lập. Phông Nunito đi kèm giấy phép SIL OFL tại `public/fonts/OFL.txt`.
