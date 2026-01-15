import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

/**
 * CI Configuration - Assumes server is already running
 * No webServer configuration to avoid startup timeouts
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: true,
  retries: 2,
  workers: 1,
  // Increased timeout for CI environment (slower than local)
  timeout: 120000, // 2 minutes per test
  expect: {
    timeout: 15000, // 15 seconds for assertions
  },
  reporter: [
    ["html", { open: "never" }],
    ["list"],
    ["junit", { outputFile: "test-results/junit.xml" }],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // Increased timeouts for CI stability
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
  // No webServer - server should be started externally in CI
});
