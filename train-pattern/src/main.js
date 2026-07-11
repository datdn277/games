import { Game } from "./game/Game.js";

const root = document.querySelector("#app");

try {
  const game = new Game(root);
  game.init();
  window.__TRAIN_PATTERN_GAME__ = game;
} catch (error) {
  console.error(error);
  root.innerHTML = `
    <section class="fallback" role="alert">
      <span aria-hidden="true">🚂</span>
      <h1>Đoàn tàu đang nghỉ một chút</h1>
      <p>Hãy tải lại trang để tiếp tục chơi nhé.</p>
      <button onclick="location.reload()">Tải lại</button>
    </section>`;
}
