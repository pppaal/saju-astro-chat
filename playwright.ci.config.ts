import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

/**
 * CI Configuration - Assumes server is already running
 * No webServer configuration to avoid startup timeouts
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: 'tmp/test-results/ci',
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
    ['html', { open: 'never', outputFolder: 'tmp/playwright-report/ci' }],
    ['list'],
    ['junit', { outputFile: 'tmp/test-results/ci/junit.xml' }],
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Increased timeouts for CI stability
    navigationTimeout: 60000, // 1 minute
    actionTimeout: 30000, // 30 seconds
  },
  projects: [
    {
      name: 'chromium',
      // Small-screen / a11y projects below test viewport- or media-feature-
      // specific behavior. They run under their own projects so they
      // don't false-positive under the default desktop run.
      testIgnore: [
        /mobile-visibility\.spec\.ts/,
        /reduced-motion\.spec\.ts/,
        /screenshots\.spec\.ts/,
      ],
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--disable-dev-shm-usage', '--no-sandbox', '--disable-setuid-sandbox'],
        },
      },
    },
    {
      name: 'mobile-chrome',
      testIgnore: [
        /mobile-visibility\.spec\.ts/,
        /reduced-motion\.spec\.ts/,
        /screenshots\.spec\.ts/,
      ],
      use: {
        ...devices['Pixel 5'],
        launchOptions: {
          args: ['--disable-dev-shm-usage', '--no-sandbox', '--disable-setuid-sandbox'],
        },
      },
    },
    // iPhone SE viewport (375×667) — smallest mainstream phone still in
    // heavy use. Catches "chat bar / send button clipped off-screen"
    // regressions that don't show up at 390+ widths. Emulated on chromium
    // (not webkit) so the project actually runs in CI, which only installs
    // chromium; the assertions here are layout-fit checks, not engine-
    // specific rendering, so chromium emulation is sufficient.
    {
      name: 'mobile-visibility',
      testMatch: /mobile-visibility\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 667 },
        isMobile: true,
        hasTouch: true,
        launchOptions: {
          args: ['--disable-dev-shm-usage', '--no-sandbox', '--disable-setuid-sandbox'],
        },
      },
    },
    // Galaxy Z Fold outer screen (280×653) — narrowest realistic mobile
    // viewport. Chips and headlines often overflow here even when iPhone
    // SE passes.
    {
      name: 'narrow-viewport',
      testMatch: /mobile-visibility\.spec\.ts/,
      use: {
        viewport: { width: 280, height: 653 },
        isMobile: true,
        hasTouch: true,
        launchOptions: {
          args: ['--disable-dev-shm-usage', '--no-sandbox', '--disable-setuid-sandbox'],
        },
      },
    },
    // prefers-reduced-motion: reduce — iOS Accessibility setting + Low
    // Power Mode trigger this. Catches elements that start at opacity:0
    // and rely on an animation to land visible. The assertions inspect the
    // loaded reduced-motion CSS rules (engine-independent), so emulate on
    // chromium (390×844, iPhone 13 viewport) instead of webkit so the
    // project runs in CI, which only installs chromium.
    {
      name: 'reduced-motion',
      testMatch: /reduced-motion\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        reducedMotion: 'reduce',
        launchOptions: {
          args: ['--disable-dev-shm-usage', '--no-sandbox', '--disable-setuid-sandbox'],
        },
      },
    },
  ],
  // No webServer - server should be started externally in CI
})
