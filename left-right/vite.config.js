import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { defineConfig } from 'vite';

function offlineBundle() {
  return {
    name: 'offline-game',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const fonts = new URL('./public/fonts/', import.meta.url);
      const files = Object.keys(bundle).sort();
      const fontFiles = readdirSync(fonts).filter((file) => file.endsWith('.woff2')).sort();
      const version = createHash('sha256');
      for (const file of files) {
        const output = bundle[file];
        version.update(file).update(output.type === 'chunk' ? output.code : output.source);
      }
      for (const file of fontFiles) version.update(readFileSync(new URL(file, fonts)));
      version.update(readFileSync(new URL('./public/mimo.svg', import.meta.url)));
      const worker = readFileSync(new URL('./src/offline.js', import.meta.url), 'utf8');
      version.update(worker);
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: worker.replace('__VERSION__', JSON.stringify(version.digest('hex').slice(0, 12)))
          .replace('__FILES__', JSON.stringify([...files, 'mimo.svg', ...fontFiles.map((file) => `fonts/${file}`)])),
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [offlineBundle()],
  build: {
    outDir: 'static',
    rollupOptions: {
      output: { manualChunks: { three: ['three'] } },
    },
    chunkSizeWarningLimit: 650,
  },
});
