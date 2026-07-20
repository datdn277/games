import './styles.css';
import { GameController } from './game/GameController';
import { ThreeGameApp } from './render/ThreeGameApp';
import { AppUIController } from './ui/AppUIController';

declare global {
  interface Window {
    __BEAR_GAME__?: {
      loadSamplePath: () => void;
      run: () => Promise<void>;
      reset: () => void;
      clear: () => void;
      diagnostics: () => ReturnType<ThreeGameApp['getDiagnostics']>;
    };
  }
}

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
const container = document.querySelector<HTMLElement>('.stage-card');
const fallback = document.getElementById('webgl-fallback');
const ui = new AppUIController();

if (!canvas || !container || !fallback) {
  throw new Error('Không tìm thấy vùng hiển thị game.');
}

let controller: GameController | null = null;
try {
  controller = new GameController(canvas, container, fallback, ui);
  if (new URLSearchParams(window.location.search).has('debug')) {
    window.__BEAR_GAME__ = {
      loadSamplePath: () => controller?.loadSamplePath(),
      run: () => controller?.run() ?? Promise.resolve(),
      reset: () => controller?.resetBear(),
      clear: () => controller?.clearAll(),
      diagnostics: () => controller?.app.getDiagnostics() ?? { calls: 0, triangles: 0, geometries: 0, textures: 0 },
    };
    window.setInterval(() => {
      const stats = controller?.app.getDiagnostics();
      if (stats) ui.updateDebugStats(`${stats.calls} draw calls · ${stats.triangles.toLocaleString('vi-VN')} triangles`);
    }, 800);
  }
} catch (error) {
  console.error(error);
  ui.showWebGLFallback();
}

window.addEventListener('beforeunload', () => controller?.dispose(), { once: true });
