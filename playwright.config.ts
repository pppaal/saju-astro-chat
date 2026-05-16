import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  outputDir: 'tmp/test-results/default',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 60000, // 1 minute per test
  expect: {
    timeout: 10000, // 10 seconds for assertions
  },
  reporter: [['html', { open: 'never', outputFolder: 'tmp/playwright-report/default' }], ['list']],
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
      // The two specs below are viewport- or media-feature-specific and
      // only make sense under their own projects (mobile-visibility,
      // reduced-motion). Exclude them from the default desktop run.
      testIgnore: [/mobile-visibility\.spec\.ts/, /reduced-motion\.spec\.ts/],
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
    // Small-phone viewport — catches "chat bar / hero clipped off-screen"
    // bugs that don't reproduce on a desktop window. iPhone SE (375x667)
    // is the smallest mainstream iOS device still in heavy use.
    {
      name: 'mobile-visibility',
      use: { ...devices['iPhone SE'] },
      testMatch: /mobile-visibility\.spec\.ts/,
    },
    // prefers-reduced-motion: reduce — iOS Accessibility setting + Low
    // Power Mode trigger this. Catches cards/elements that start at
    // opacity:0 + rely on an animation to land in their visible state.
    {
      name: 'reduced-motion',
      use: { ...devices['iPhone 13'], reducedMotion: 'reduce' },
      testMatch: /reduced-motion\.spec\.ts/,
    },
    // Narrowest realistic viewport — Galaxy Z Fold outer screen is 280px
    // wide. Chips, buttons, and headlines often overflow at this width
    // even when iPhone SE (375px) passes. Same spec file as iPhone SE so
    // both run the visibility assertions.
    {
      name: 'narrow-viewport',
      use: { viewport: { width: 280, height: 653 }, isMobile: true, hasTouch: true },
      testMatch: /mobile-visibility\.spec\.ts/,
    },
  ],
  webServer: {
    command:
      'cross-env DEMO_TOKEN=demo-test-token SUPPORT_EMAIL=support@destinypal.com npm run dev:webpack',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120 * 1000, // 2 minutes for Next.js startup
    stdout: 'ignore',
    stderr: 'ignore',
  },
})
