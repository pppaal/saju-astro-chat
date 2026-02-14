import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 60000, // 1 minute per test
  expect: {
    timeout: 10000, // 10 seconds for assertions
  },
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    navigationTimeout: 30000, // 30 seconds
    actionTimeout: 15000, // 15 seconds
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
          ],
        },
      },
    },
  ],
  webServer: {
    command:
      'cross-env DEMO_TOKEN=demo-test-token SUPPORT_EMAIL=support@destinypal.com npm run dev',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120 * 1000, // 2 minutes for Next.js startup
    stdout: 'ignore',
    stderr: 'ignore',
  },
})
