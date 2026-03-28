import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3005'
const mockedFontResponses = path.join(process.cwd(), 'tests', 'playwright', 'google-fonts-mock.js')
const distDir = process.env.NEXT_DIST_DIR || '.next-playwright-calendar'

export default defineConfig({
  testDir: './e2e',
  testMatch: ['calendar-flow.spec.ts', 'calendar-check.spec.ts'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 90000,
  expect: {
    timeout: 15000,
  },
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report/calendar' }],
    ['list'],
    ['json', { outputFile: 'test-results/calendar-results.json' }],
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 120000,
    actionTimeout: 20000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--disable-dev-shm-usage', '--no-sandbox', '--disable-setuid-sandbox'],
        },
      },
    },
  ],
  ...(process.env.PLAYWRIGHT_SKIP_WEBSERVER !== 'true' && {
    webServer: {
      command:
        `cross-env NEXT_DIST_DIR=${distDir} NEXT_FONT_GOOGLE_MOCKED_RESPONSES="${mockedFontResponses}" DEMO_TOKEN=demo-test-token SUPPORT_EMAIL=support@destinypal.com npx next dev --webpack --port 3005`,
      url: baseURL,
      reuseExistingServer: true,
      timeout: 600 * 1000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  }),
})
