import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.{test,spec}.ts"],
    exclude: [
      "**/node_modules/**",
      "tests/i18nKeys.test.ts",
      "tests/metrics.test.ts",
      "tests/textGuards.test.ts",
      "tests/setup.ts",
    ],
    setupFiles: ["./tests/setup.ts"],
  },
});
