import { Game } from "./game/Game.js";

const root = document.querySelector("#app");

try {
  const game = new Game(root);
  game.init();
  window.matrixColorGame = game;
} catch (error) {
  console.error("Không thể khởi động Ô Màu Song Sinh:", error);
  root.innerHTML = `<main class="startup-error"><h1>Hai bảng chưa mở được</h1><p>Con hãy nhờ người lớn tải lại trang nhé.</p><button type="button" onclick="location.reload()">Tải lại</button></main>`;
}
