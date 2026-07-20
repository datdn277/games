import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'static',
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
  server: { host: '127.0.0.1' },
  preview: { host: '127.0.0.1' },
  test: {
    environment: 'node',
    coverage: { reporter: ['text', 'html'] },
  },
});
