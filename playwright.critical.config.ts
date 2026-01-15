import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

/**
 * Critical flows configuration - optimized for faster execution
 * Use: npx playwright test --config=playwright.critical.config.ts
 */
export default defineConfig({
  testDir: "./e2e/critical-flows",
  fullyParallel: false, // Run sequentially for critical tests
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1, // Single worker for stability
  timeout: 90000, // 90 seconds per test
  expect: {
    timeout: 15000,
  },
  reporter: [
    ["html", { open: "never", outputFolder: "playwright-report/critical" }],
    ["list"],
    ["json", { outputFile: "test-results/critical-results.json" }],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    navigationTimeout: 60000,
    actionTimeout: 20000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Disable certain features for faster tests
        launchOptions: {
          args: [
            "--disable-dev-shm-usage",
            "--no-sandbox",
            "--disable-setuid-sandbox",
          ],
        },
      },
    },
  ],
  // Only start webServer if not already running
  ...(process.env.PLAYWRIGHT_SKIP_WEBSERVER !== "true" && {
    webServer: {
      command: "npm run dev",
      url: baseURL,
      reuseExistingServer: true, // Reuse existing server by default
      timeout: 240 * 1000, // 4 minutes for slow dev server
      stdout: "pipe",
      stderr: "pipe",
    },
  }),
});
