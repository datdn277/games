import './styles/main.css';
import './styles/game.css';
import { Game } from './core/Game.js';

if (!location.pathname.includes('/left-right/')) {
  document.querySelector('#catalog-link').hidden = true;
}

const game = new Game(document.querySelector('#world'));
window.addEventListener('pagehide', (event) => {
  if (!event.persisted) game.dispose();
});

if (import.meta.hot) import.meta.hot.dispose(() => game.dispose());

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {
    // The game is also playable when its files are served without a service worker.
  });
}
