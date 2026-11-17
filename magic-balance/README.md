# Chiếc cân thần kỳ

**Magic Balance · Little Math Detective** là game 3D tiếng Việt cho bé 5–6 tuổi. Cùng gấu Mimo quan sát đĩa nào hạ xuống, thêm hoặc bớt thú đồ chơi và khám phá khi nào hai đĩa cân thăng bằng.

## Chạy trên máy

Dùng Node.js 20.19+ (nhánh 20) hoặc 22.12+.

```sh
cd magic-balance
npm install
npm run dev
```

Mở địa chỉ Vite hiển thị trong terminal. Chạy `npm test` để kiểm thử luật chơi hoặc `npm run build` để tạo bản tĩnh trong `magic-balance/static/`. Lệnh `npm run preview` mở bản tĩnh của game.

Để thử liên kết từ kho game, chạy `python3 -m http.server 8080` tại thư mục gốc của repo, mở `http://127.0.0.1:8080` và chọn **Chiếc cân thần kỳ**. Khi đổi mã nguồn, build lại để cập nhật bản mà menu kho game mở.

## Cách chơi

Kéo thú từ khay lên đĩa cân hoặc chọn thú rồi chọn đĩa. Thú đang ở trên đĩa có thể được chọn để nhấc ra hoặc chuyển sang đĩa kia khi bài tập cho phép. Hai đĩa giữ phương ngang trong khi đĩa nặng hơn hạ xuống. Các điều khiển chọn thú, chọn đĩa và bớt thú cũng dùng được bằng bàn phím.

| Cấp | Bài tập |
| --- | --- |
| 1 · Ai nặng hơn? | Quan sát bên nặng, bên nhẹ và lúc cân nằm ngang. |
| 2 · Làm cân thăng bằng | Tự thêm hoặc bớt thú đến khi hai đĩa cân bằng. |
| 3 · Một bằng nhiều | Thử cân trâu với cáo và cân cáo với chó để tìm hai quan hệ tương đương. |
| 4 · Phép thay thế kỳ diệu | Lần lượt thay từng cáo, rồi ghép hai nhóm chó với hai cáo ban đầu. |
| 5 · Thám tử chiếc cân | Dùng dữ kiện từ nhiều cân để giải thử thách. Phân biệt dữ kiện thăng bằng với dữ kiện cho biết bên nặng hơn. |
| 6 · Bé tự tạo câu đố | Đặt thú tự do lên hai đĩa và thử những cách cân khác nhau. |

Sao, tiến độ và tùy chọn âm thanh lưu trong trình duyệt. Trọng lượng là đơn vị quy ước của bài học. Trò chơi cần WebGL 2 để hiển thị cảnh 3D. Giọng đọc tiếng Việt dùng Web Speech API khi thiết bị có giọng phù hợp. Hướng dẫn bằng chữ vẫn hiển thị trong game. Các mô hình và âm thanh được tạo từ mã nguồn của dự án.
