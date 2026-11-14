import "/src/styles.css";
import "/src/redesign.css";
import { MazeGame } from "./game/MazeGame";

const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("Không tìm thấy phần tử #app.");
}

try {
  const game = new MazeGame(root);
  window.addEventListener("beforeunload", () => game.dispose(), { once: true });
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : "Trình duyệt không thể mở khu vườn 3D.";
  root.innerHTML = `<main class="boot-error"><span aria-hidden="true">🐰</span><h1>Thỏ đang sửa khu vườn</h1><p>${message}</p><button type="button" onclick="location.reload()">Thử lại</button></main>`;
}
