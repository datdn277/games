import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: false,
  optimizeDeps: {
    noDiscovery: true,
    include: [],
  },
  test: {
    environment: "node",
    include: [".generated/tests/**/*.test.js"],
  },
});
