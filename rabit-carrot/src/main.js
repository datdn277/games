import { Game } from "./game/Game.js";

const root = document.querySelector("#app");

try {
  const game = new Game(root);
  game.init();
  window.rabbitCarrotGame = game;
} catch (error) {
  console.error("Không thể khởi động Thỏ Con Tìm Cà Rốt:", error);
  root.innerHTML = `<main class="startup-error"><h1>Khu vườn chưa mở được</h1><p>Con hãy nhờ người lớn tải lại trang nhé.</p><button type="button" onclick="location.reload()">Tải lại</button></main>`;
}
