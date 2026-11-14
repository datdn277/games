import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  esbuild: false,
  optimizeDeps: {
    noDiscovery: true,
    include: [],
  },
  build: {
    target: "esnext",
    minify: false,
    cssMinify: false,
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
        },
      },
    },
  },
});
