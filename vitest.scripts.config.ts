import path from "path";
import { defineConfig } from "vitest/config";

/** Runs generators in scripts/ (not part of `npm test`). */
export default defineConfig({
  test: { environment: "node", include: ["scripts/**/*.gen.ts"], testTimeout: 120000 },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
