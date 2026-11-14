# Vũ điệu trái – phải

Mimo Dance Party là trò chơi nhảy 3D tiếng Việt cho trẻ 5–6 tuổi. Bé quan sát Mimo, chọn hướng trái hoặc phải và ghi nhớ các chuỗi động tác ngắn.

## Chạy trò chơi

Dùng Node.js 20.19 trở lên trong nhánh 20, hoặc Node.js 22.12 trở lên.

```sh
cd dance-direction
npm install
npm run dev
```

Mở địa chỉ Vite in ra trong terminal. Trình duyệt cần hỗ trợ WebGL 2.

```sh
npm test
npm run build
npm run preview
```

Build tạo `dance-direction/static/`. Trang chủ của kho game liên kết đến `dance-direction/static/index.html`, để game chạy cùng các mục khác trên máy chủ tĩnh của kho. Chạy lại `npm run build` sau khi sửa nguồn để cập nhật mục này.

## Cách chơi

- Bấm hoặc chạm **Trái** và **Phải**. Trên bàn phím, dùng **←**, **→**, **Enter** để tiếp tục và **Esc** để tạm dừng.
- Trong bài học, Mimo quay lưng về phía người chơi. Tay trái của Mimo xuất hiện bên trái màn hình và tay phải bên phải.
- Dùng nút loa bên cạnh hướng dẫn để nghe và xem lại mẫu. Bé có thể thử lại bao nhiêu lần tùy ý. Trò chơi chấm hướng được chọn qua nút bấm hoặc bàn phím.
- Chạm một nút để bật Web Audio. Hướng dẫn bằng giọng nói dùng giọng tiếng Việt cục bộ khi trình duyệt có hỗ trợ. Biểu tượng, hoạt ảnh và hướng dẫn chữ luôn có sẵn.
- Tiến độ, sao, nhãn dán và tùy chọn âm thanh được lưu trong LocalStorage của trình duyệt.

## Mã nguồn

- `src/game/` chứa dữ liệu bốn màn, bộ sinh chuỗi, kiểm tra đáp án, luồng trạng thái và tiến độ.
- `src/scene/` dựng sân khấu, mô hình Mimo có khớp, camera, hoạt ảnh và hiệu ứng Three.js.
- `src/audio/` tạo bốn bản nhạc gốc và hiệu ứng bằng Web Audio, theo dõi nhịp và phát hướng dẫn tiếng Việt.
- `src/ui/` và `src/styles/` xử lý giao diện, thao tác và bố cục.
- `tests/` kiểm tra luồng bốn màn, lưu tiến độ và đồng hồ âm thanh bằng Node.js.

Phông Nunito được kèm với giấy phép SIL Open Font License trong `public/fonts/`.
