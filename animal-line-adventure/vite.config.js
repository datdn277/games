import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

function offlineBundle() {
  return {
    name: 'animal-line-offline',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const publicRoot = new URL('./public/', import.meta.url);
      const publicPath = fileURLToPath(publicRoot);
      const publicFiles = readdirSync(publicRoot, { recursive: true, withFileTypes: true })
        .filter((item) => item.isFile())
        .map((item) => relative(publicPath, join(item.parentPath, item.name)).split(sep).join('/'))
        .sort();
      const outputFiles = Object.keys(bundle).sort();
      const worker = readFileSync(new URL('./src/offline.js', import.meta.url), 'utf8');
      const hash = createHash('sha256').update(worker);
      for (const name of publicFiles) hash.update(name).update(readFileSync(new URL(name, publicRoot)));
      for (const name of outputFiles) {
        const output = bundle[name];
        hash.update(name).update(output.type === 'chunk' ? output.code : output.source);
      }
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: worker
          .replace('__VERSION__', JSON.stringify(hash.digest('hex').slice(0, 12)))
          .replace('__FILES__', JSON.stringify([...outputFiles, ...publicFiles])),
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [offlineBundle()],
  build: {
    outDir: 'static',
    rollupOptions: { output: { manualChunks: { three: ['three'] } } },
    chunkSizeWarningLimit: 650,
  },
});
