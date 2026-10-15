import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Grading tests run on the full canonical datasets; under a parallel run they need more than the 5 s default.
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
