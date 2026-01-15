import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  // Sequential execution for stability (980 tests benefit from predictable ordering)
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  // Single worker to prevent resource contention and flaky tests
  workers: 1,
  // Increased timeout for complex tests (accessibility, performance)
  timeout: 120000, // 2 minutes per test
  expect: {
    timeout: 15000, // 15 seconds for assertions
  },
  reporter: [
    ["html", { open: "never" }],
    ["list"],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // Increased navigation timeout for slow pages
    navigationTimeout: 60000, // 1 minute
    actionTimeout: 30000, // 30 seconds
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          args: [
            "--disable-dev-shm-usage",
            "--no-sandbox",
            "--disable-setuid-sandbox",
          ],
        },
      },
    },
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 5"],
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
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 300 * 1000, // 5 minutes for Next.js startup
    stdout: "pipe",
    stderr: "pipe",
  },
});
