# Gấu tìm đường đến nhà Thỏ

Browser game giáo dục 3D giúp trẻ hiểu mối quan hệ:

**Mũi tên → một câu lệnh → một bước di chuyển → một chuỗi thuật toán.**

Trẻ có thể chọn hai chế độ bổ trợ nhau bằng công tắc **Cách chơi**:

- **Thử từng bước**: chọn một trong bốn mũi tên 3D tỏa ra quanh Gấu để đi ngay. Mỗi lựa chọn được ghi lại thành lệnh trên ô vừa rời đi.
- **Lập trình trước**: không hiện mũi tên quanh Gấu. Trẻ suy nghĩ, đặt trước cả thuật toán lên bàn cờ 6×6 rồi bấm **Cho Gấu đi**.

Đổi chế độ sẽ đưa Gấu về ô bắt đầu nhưng giữ lại các lệnh đã đặt.

Game có thể tạo khu vườn mới theo bốn kiểu bố trí:

- **Cổ điển**: giữ bố cục gốc.
- **Random hồ**: giữ nhà Thỏ ở hàng 6, cột 6 và đổi vị trí hồ.
- **Random nhà Thỏ**: đổi vị trí đích, ưu tiên cách xa Gấu.
- **Random tất cả**: đổi cả hồ và nhà Thỏ.

Mức thử thách cho phép chọn **3, 6, 9 hoặc 12 hồ**. `LevelGenerator` kiểm tra kết nối bằng BFS và luôn chừa ít nhất một đường đi hợp lệ.

## Công nghệ

- Three.js thuần với `WebGLRenderer`, `OrthographicCamera`, `Raycaster`, `Clock` và `requestAnimationFrame`
- TypeScript + Vite
- Vitest
- HTML/CSS cho toolbar, chuỗi lệnh, status và modal
- Web Audio API cho hiệu ứng âm thanh procedural, không cần file audio bên ngoài
- Không dùng framework UI, physics engine hay thư viện animation ngoài

## Chạy project

Yêu cầu Node.js 20.19+ hoặc 22.12+.

```bash
npm install
npm run dev
```

Sau đó mở địa chỉ Vite hiển thị trong terminal.

Các lệnh kiểm chứng:

```bash
npm test
npm run typecheck
npm run build
npm run preview
npm run playtest
```

`npm run playtest` dùng `playwright-core` và Google Chrome cài trên máy để kiểm tra drag/drop thật, WebGL, thay/xóa lệnh và layout 390×844. Có thể truyền `PLAYTEST_URL` hoặc `CHROME_PATH` nếu môi trường khác mặc định.

Thêm `?debug=1` vào URL để hiện draw calls/triangles và API hỗ trợ playtest tại `window.__BEAR_GAME__`.

## Cách chơi

- Desktop: chọn rồi click một mũi tên, hoặc kéo mũi tên từ toolbar và thả lên ô 3D.
- Mobile/tablet: chạm mũi tên rồi chạm ô trên bàn cờ.
- Chọn **Thử từng bước** để chạm trực tiếp một trong bốn mũi tên 3D đang tỏa ra quanh Gấu. Hướng hợp lệ được ghi thành lệnh và Gấu đi ngay; bốn lựa chọn xuất hiện lại ở ô mới.
- Chọn **Lập trình trước** để ẩn các lựa chọn quanh Gấu, đặt toàn bộ mũi tên bằng toolbar rồi mới chạy chuỗi.
- Nút loa cạnh tốc độ bật/tắt toàn bộ âm thanh. Audio chỉ được khởi tạo sau thao tác của người chơi để tuân thủ autoplay policy.
- Bàn phím: `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight` chọn hướng; `Escape` bỏ chọn.
- Công cụ **Xóa ô** xóa một lệnh. **Xóa tất cả mũi tên** hủy lượt chạy, đưa Gấu về đầu và dọn bàn cờ.
- **Đưa Gấu về đầu** hủy animation hiện tại nhưng giữ nguyên các mũi tên.

## Kiến trúc

```text
src/
├── audio/
│   └── AudioController.ts
├── game/
│   ├── types.ts
│   ├── level.ts
│   ├── LevelGenerator.ts
│   ├── GameSession.ts
│   ├── PathSimulator.ts
│   └── GameController.ts
├── render/
│   ├── ThreeGameApp.ts
│   ├── GardenScene.ts
│   ├── CameraController.ts
│   ├── InputController.ts
│   ├── ResizeController.ts
│   ├── AnimationController.ts
│   ├── coordinates.ts
│   └── objects/
│       ├── Board3D.ts
│       ├── Bear3D.ts
│       ├── Arrow3D.ts
│       ├── DirectionPicker3D.ts
│       ├── Pond3D.ts
│       └── RabbitHouse3D.ts
├── ui/
│   └── AppUIController.ts
├── main.ts
└── styles.css
tests/
├── PathSimulator.test.ts
├── GameSession.test.ts
└── coordinates.test.ts
```

### Simulation và renderer

`GameSession` là nguồn dữ liệu của các câu lệnh. `PathSimulator` chỉ nhận dữ liệu thuần, tạo danh sách `MoveStep` và một trong năm outcome: `success`, `missing-command`, `obstacle`, `boundary`, `loop`. Hai module này không import Three.js hoặc DOM.

`LevelGenerator` cũng là simulation thuần dữ liệu. Nó random vị trí theo mode, loại trừ ô bắt đầu/đích, giới hạn số hồ và chạy BFS trước khi trả level. Nếu không tìm được bố trí sau giới hạn thử an toàn, generator tạo một hành lang bảo đảm kết nối rồi đặt hồ vào các ô còn lại.

`GameController` mô phỏng toàn bộ lượt chạy trước, sau đó phát từng `MoveStep` sang lớp hiển thị. Với cách đi trực tiếp, controller kiểm tra biên/hồ bằng `GameSession`, ghi hướng vào ô hiện tại rồi mới yêu cầu `Bear3D` di chuyển một bước. Một `runId` kết hợp với `AnimationController.cancelAll()` bảo đảm animation cũ không thể cập nhật state sau khi reset hoặc xóa toàn bộ.

Three.js chỉ dựng scene, highlight lệnh và phát animation. Luật đặt lệnh, chướng ngại và kết thúc không nằm trong mesh, raycaster hoặc render loop.

### Raycasting

Mỗi tile có metadata:

```ts
mesh.userData = { type: 'board-cell', row, col };
```

`InputController` đổi pointer/drop coordinate sang normalized device coordinates và gọi `raycaster.setFromCamera()`. Nó raycast danh sách bốn mesh của `DirectionPicker3D` trước, sau đó mới raycast 36 tile; không intersect toàn scene. Kết quả direction/grid được gửi về `GameController` dưới dạng action, còn raycaster không chứa luật chơi.

### Mũi tên tỏa ra và âm thanh

`DirectionPicker3D` dùng một `ExtrudeGeometry` chung và bốn material theo hướng. Khi `show(cell)` được gọi, các mũi tên nội suy từ tâm ô ra bốn phía bằng smoothstep, sau đó pulse nhẹ; hover và hướng sai chỉ thay emissive/transform sẵn có. `AudioController` tổng hợp các tiếng chọn, đặt lệnh, bước chân, cảnh báo và chiến thắng bằng oscillator + gain envelope, khởi tạo lười và giải phóng `AudioContext` khi dispose.

### Animation Gấu

Gấu được dựng hoàn toàn bằng primitive mesh, không dùng asset có bản quyền. `BearRoot` chứa bóng và `BearBody`; tay/chân có pivot tại khớp. Mỗi bước gồm:

1. Nội suy góc quay theo cung ngắn nhất.
2. Nội suy vị trí giữa hai tâm ô.
3. Vung tay trái/chân phải ngược pha với tay phải/chân trái.
4. Nhún thân và co giãn bóng.
5. Trả các pivot về pose ổn định.

Ba tốc độ là 1000 ms, 700 ms và 430 ms mỗi bước. Khi `prefers-reduced-motion` bật, biên độ vung tay/chân và nhún giảm nhưng chuyển động giữa hai ô vẫn giữ nguyên.

## Tọa độ grid và world

Grid trong source code dùng zero-based index:

- `row` tăng theo trục `+Z`.
- `col` tăng theo trục `+X`.
- `Y` là chiều cao.

Tất cả chuyển đổi nằm trong `src/render/coordinates.ts`:

```ts
worldX = (col - (columnCount - 1) / 2) * cellSize
worldZ = (row - (rowCount - 1) / 2) * cellSize
```

Không lặp công thức ở module khác.

## Thay đổi level

Sửa `src/game/level.ts`:

```ts
export const GARDEN_LEVEL = {
  rows: 6,
  columns: 6,
  start: { row: 0, col: 0 },
  goal: { row: 5, col: 5 },
  obstacles: [{ row: 0, col: 1 }],
};
```

Hiện tại renderer tọa độ dùng cùng `GARDEN_LEVEL`, nên kích thước board, camera và test cần được kiểm tra lại nếu đổi số hàng/cột.

## Thay Gấu primitive bằng GLB

1. Xuất model sang GLB/glTF 2.0, giữ pivot ở chân và scale nhất quán.
2. Thêm loader riêng, ví dụ `src/render/loaders/loadBear.ts`, dùng `GLTFLoader` từ `three/addons/loaders/GLTFLoader.js`.
3. Giữ public API của `Bear3D`: `setCell`, `moveTo`, `reactToProblem`, `celebrate`, `update`, `dispose`.
4. Nếu GLB có clip, tạo `AnimationMixer` cho `idle`, `walk`, `celebrate`; renderer vẫn nhận `MoveStep` từ controller, model không tự quyết định đường đi.
5. Khi lỗi tải asset, khởi tạo lại model primitive hiện tại làm fallback.
6. Khi dispose, dừng mixer, uncache root/clip và chỉ dispose geometry/material/texture thuộc model đó.

## Quản lý WebGL và tài nguyên

- Pixel ratio được giới hạn ở 2.
- Geometry/material của tile và mũi tên được dùng chung.
- Không có texture lớn hoặc post-processing.
- Delta được clamp ở 0.05 giây; animation dừng khi tab ẩn.
- Có xử lý resize, context lost/restored và DOM fallback khi WebGL không khả dụng.
- Mỗi object renderer có `dispose()`; app gỡ event listener, `ResizeObserver`, animation frame và renderer.

## Test

Vitest bao phủ:

- Đủ năm trạng thái kết thúc của `PathSimulator`.
- Chuỗi mẫu 10 bước tới hàng 6, cột 6.
- Không đặt lệnh vào hồ/nhà Thỏ.
- Thay thế và xóa lệnh.
- Chuyển đổi grid-to-world, world-to-grid và board bounds.
- Random hồ, random đích, không chồng lấp và khả năng đi tới đích ở mode 12 hồ.
