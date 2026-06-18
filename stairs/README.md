# Cầu thang số - Game học cộng số bằng Three.js

Game giáo dục cho trẻ nhỏ, dạy bản chất phép cộng bằng mô hình:

> Cộng = bắt đầu ở một số, đi thêm vài bước trên dãy số.

## Cách chạy

```bash
cd number-stairs-addition-game
python3 -m http.server 5173
```

Mở trình duyệt:

```text
http://localhost:5173
```

Không nên mở trực tiếp bằng `file://`, vì một số trình duyệt sẽ chặn ES module/CDN.

## Gameplay

- Bé kéo thẻ `+n` vào nhân vật.
- Nhân vật nhảy từng bậc trên cầu thang số `0 → 10`.
- Mỗi bước nhảy làm số tăng thêm `1`.
- Khi nhảy đủ bước, game hiện phép tính, ví dụ: `2 + 3 = 5`.
- Không có điểm số, không có thua, không có đếm ngược.

## Mục tiêu học tập

Game dạy trẻ hiểu:

- Số bắt đầu là vị trí hiện tại.
- Số cộng thêm là số bước cần đi tiếp.
- Kết quả là bậc cuối cùng nhân vật dừng lại.

Ví dụ:

```text
2 + 3 nghĩa là:
đang ở số 2,
nhảy thêm 3 bước: 3, 4, 5,
nên kết quả là 5.
```

## File chính

- `index.html`: toàn bộ HTML, CSS, JavaScript và Three.js game logic.

## Gợi ý nâng cấp

- Thêm giọng đọc tiếng Việt: “Đang ở số 2, đi thêm 3 bước”.
- Thêm nhiều nhân vật: thỏ, mèo, robot.
- Thêm chế độ tìm số còn thiếu: `3 + ? = 7`.
- Thêm mode tự do: bé kéo nhiều thẻ `+1`, `+2`, `+3` để khám phá.
