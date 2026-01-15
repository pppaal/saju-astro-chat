import { defineConfig } from "vitest/config";
import path from "path";

// Allow E2E API suite to opt-in without running for every test command
const isE2E =
  process.env.npm_lifecycle_event === "test:e2e:api" ||
  process.env.VITEST_INCLUDE_E2E === "1";

// Integration tests use real database - opt-in via `npm run test:integration`
const isIntegration =
  process.env.npm_lifecycle_event === "test:integration" ||
  process.env.VITEST_INTEGRATION === "1";

// Performance tests require a running server - opt-in via `npm run test:performance`
const isPerformance =
  process.env.npm_lifecycle_event === "test:performance" ||
  process.env.npm_lifecycle_event === "test:performance:watch" ||
  process.env.VITEST_PERFORMANCE === "1";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    globals: true,
    environment: "happy-dom",
    environmentOptions: {
      happyDOM: {
        settings: {
          disableErrorCapturing: true,
        },
      },
    },
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "tests/setup.ts",
      "tests/integration/setup.ts",
      // Node.js native test runner tests (use `npm run test:node` instead)
      "tests/metrics.test.ts",
      "tests/textGuards.test.ts",
      "tests/i18nKeys.test.ts",
      // API smoke tests import server-only routes (run separately)
      "tests/apiSmoke.test.ts",
      // E2E tests require a running server; opt in via `npm run test:e2e:api`
      ...(isE2E ? [] : ["tests/e2e/**"]),
      // Integration tests use real DB; opt in via `npm run test:integration`
      ...(isIntegration ? [] : ["tests/integration/**"]),
      // Performance tests require a running server; opt in via `npm run test:performance`
      ...(isPerformance ? [] : ["tests/performance/**"]),
    ],
    setupFiles: isIntegration
      ? ["./tests/integration/setup.ts"]
      : ["./tests/setup.ts"],
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
      // Coverage thresholds - baseline to prevent regressions
      // Will gradually increase as we add more tests
      // Updated: Adjusted to current coverage baseline (307 test files, 10188 tests)
      thresholds: {
        lines: 29,
        functions: 32,
        branches: 28,
        statements: 29,
      },
    },
    // Test timeouts
    testTimeout: isPerformance ? 120000 : isE2E ? 60000 : 30000, // 2min for performance, 1min for E2E, 30s for regular
    hookTimeout: isPerformance ? 120000 : isE2E ? 60000 : 10000, // 2min for performance, 1min for E2E setup
  },
});
