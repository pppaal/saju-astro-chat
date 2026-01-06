import { defineConfig } from "vitest/config";
import path from "path";

// Allow E2E API suite to opt-in without running for every test command
const isE2E =
  process.env.npm_lifecycle_event === "test:e2e:api" ||
  process.env.VITEST_INCLUDE_E2E === "1";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    globals: true,
    environment: "happy-dom",
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "tests/setup.ts",
      // Node.js native test runner tests (use `npm run test:node` instead)
      "tests/metrics.test.ts",
      "tests/textGuards.test.ts",
      "tests/i18nKeys.test.ts",
      // API smoke tests import server-only routes (run separately)
      "tests/apiSmoke.test.ts",
      // E2E tests require a running server; opt in via `npm run test:e2e:api`
      ...(isE2E ? [] : ["tests/e2e/**"]),
    ],
    setupFiles: ["./tests/setup.ts"],
    // Coverage configuration
    coverage: {
      enabled: false, // Enable with --coverage flag
      provider: "v8",
      reporter: ["text", "html", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.d.ts",
        "src/**/*.test.{ts,tsx}",
        "src/**/*.spec.{ts,tsx}",
        // UI-heavy areas covered by E2E instead of unit coverage.
        "src/app/**",
        "src/components/**",
        "src/styles/**",
        "src/data/**",
        "src/lib/**/data/**",
        "src/lib/**/tarot-data.ts",
        "src/lib/**/tarot-spreads-data.ts",
        "src/lib/**/tarot-counselors.ts",
        "src/types/**",
        "src/generated/**",
      ],
      // Baseline thresholds to prevent regressions; raise as coverage improves.
      thresholds: {
        lines: 4.5,
        functions: 4.2,
        branches: 3.2,
        statements: 4.5,
      },
    },
    // Test timeouts
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
