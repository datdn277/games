# Bé ơi, đồ vật ở đâu? · Little Explorer 3D

Trò chơi 3D tiếng Việt dành cho trẻ 5–6 tuổi. Bé chạm vào đồ vật để luyện xác định bên trái và bên phải theo góc nhìn trên màn hình. Lượt chơi đầu có một nhiệm vụ mẫu cùng Mimo. Mỗi màn có 5 nhiệm vụ và có thể chơi lại bất cứ lúc nào.

| Màn | Cách chơi |
| --- | --- |
| Khám phá trái và phải | Chọn một trong hai món đồ ở hai bên vật mốc. |
| Thám tử đồ chơi | Tìm món gần vật mốc nhất về phía được yêu cầu. |
| Siêu thị của Mimo | Tìm đúng loại hàng và đúng phía khi có hai món giống nhau. |

Mỗi màn mở khóa màn tiếp theo và trao một nhãn dán khi hoàn thành. Tiến độ và trạng thái âm thanh được lưu trên trình duyệt. Mỗi nhiệm vụ góp tối đa một sao vào thành tích của màn, nên bộ sưu tập có tối đa 15 sao.

## Chạy trên máy

Dùng Node.js 20.19+ hoặc 22.12+ theo yêu cầu phiên bản của Vite. Chạy các lệnh sau từ thư mục kho Games.

```bash
cd left-right
npm install
npm run dev
```

Mở địa chỉ Vite hiển thị trong terminal. Dùng `npm test` để chạy Vitest và `npm run build` để tạo bản tĩnh.

## Mở game từ trang chủ Games

Bản build nằm trong `left-right/static/` và được kèm theo mã nguồn để trang chủ có thể mở game ngay trên máy chủ tĩnh. Sau khi thay đổi mã, chạy lại `npm run build` và đưa bản build mới lên cùng với trang chủ. Để thử tích hợp tại máy, chạy từ thư mục kho Games.

```bash
python3 -m http.server 8080
```

Mở <http://localhost:8080/> và chọn thẻ **Bé ơi, đồ vật ở đâu?**. Nếu chỉ phục vụ riêng game, dùng `npm run preview` trong `left-right` sau khi build.

Bản tĩnh đóng gói mã, phông chữ, mô hình tạo bằng mã và âm thanh tổng hợp. Trên HTTPS hoặc localhost, service worker lưu các tệp của game sau lần tải đầu. Có thể mở lại địa chỉ của game và tiếp tục chơi khi mất mạng sau khi bộ nhớ đệm sẵn sàng.

## Điều khiển và hỗ trợ trình duyệt

- Chạm hoặc nhấp vào mô hình trên bệ. Với bàn phím, dùng Tab để tới nút tròn dưới món đồ rồi nhấn Enter hoặc Space.
- Nút loa phát lại yêu cầu nếu trình duyệt có giọng tiếng Việt. Mũi tên, hình ảnh và câu hỏi hiển thị trong cả chế độ tắt âm thanh. Một số giọng do hệ điều hành hoặc dịch vụ trình duyệt cung cấp có thể cần mạng.
- Cảnh 3D dùng WebGL 2. Nếu ngữ cảnh đồ họa không khả dụng, game chuyển sang bố cục minh họa và vẫn cho phép hoàn thành nhiệm vụ.
- Game hỗ trợ tùy chọn giảm chuyển động của hệ điều hành. Bộ kết xuất dừng khi tab bị ẩn và giảm độ phân giải kết xuất hoặc bóng trên thiết bị cấu hình thấp.

## Mã nguồn

```text
left-right/
├── index.html       Khung giao diện HTML
├── src/
│   ├── core/        Luồng chơi, camera, renderer, raycasting
│   ├── world/       Phòng đồ chơi, biến thể siêu thị và ánh sáng
│   ├── characters/ Mô hình và hoạt ảnh Mimo
│   ├── objects/     13 mẫu đồ vật 3D dùng chung tài nguyên
│   ├── gameplay/    Câu hỏi, đáp án theo tọa độ và tiến độ
│   ├── audio/       Nhạc, hiệu ứng và giọng đọc
│   ├── ui/          Menu, câu hỏi, gợi ý, kết quả và nhãn dán
│   ├── styles/      Bố cục và giao diện thích ứng
│   └── offline.js  Mẫu service worker, được điền khi build
├── public/          Biểu tượng và phông chữ cục bộ
├── static/          Bản build được trang chủ Games mở
└── tests/           Kiểm tra câu hỏi, tiến độ và âm thanh
```

Các mô hình và âm thanh được tạo trong mã. Phông Nunito được phân phối theo giấy phép SIL Open Font License 1.1 trong `public/fonts/OFL.txt`.
