import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    outDir: "static",
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
