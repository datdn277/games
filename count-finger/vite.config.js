import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

function offlineGame() {
  return {
    name: 'offline-game',
    apply: 'build',
    buildStart() {
      const licenses = [
        ['Three.js', './node_modules/three/LICENSE'],
        ['Nunito', './node_modules/@fontsource-variable/nunito/LICENSE'],
      ];
      this.emitFile({
        type: 'asset',
        fileName: 'licenses.txt',
        source: licenses.map(([name, path]) => (
          `${name}\n\n${readFileSync(new URL(path, import.meta.url), 'utf8').trim()}\n`
        )).join('\n'),
      });
    },
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const files = Object.keys(bundle).sort();
        const worker = readFileSync(new URL('./src/offline-worker.js', import.meta.url), 'utf8');
        const hash = createHash('sha256').update(worker);
        for (const file of files) {
          const output = bundle[file];
          hash.update(file).update(output.type === 'chunk' ? output.code : output.source);
        }
        this.emitFile({
          type: 'asset',
          fileName: 'sw.js',
          source: worker
            .replace('__CACHE_NAME__', JSON.stringify(hash.digest('hex').slice(0, 12)))
            .replace('__GAME_FILES__', JSON.stringify([...new Set(['index.html', ...files])])),
        });
      },
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [offlineGame()],
  build: {
    outDir: 'static',
    target: 'es2022',
    chunkSizeWarningLimit: 650,
  },
  server: { host: '127.0.0.1' },
  preview: { host: '127.0.0.1' },
});
