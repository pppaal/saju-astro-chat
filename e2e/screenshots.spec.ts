import { test, expect } from '@playwright/test'

/**
 * Visual regression snapshots for the highest-traffic pages.
 *
 * Runs under the `screenshots` Playwright project (iPhone 13 viewport,
 * reducedMotion: 'reduce'). Captures the page as a PNG and compares
 * against the baseline in e2e/screenshots.spec.ts-snapshots/.
 *
 * When a CSS / layout change is intentional, update the baseline:
 *   npx playwright test --project=screenshots --update-snapshots
 *
 * If you need to ignore a region that changes every load (date, user
 * id, etc.), pass a `mask` array to toHaveScreenshot. Keep the masked
 * set small — masking too much defeats the point of the snapshot.
 *
 * Why reducedMotion: the home page has a canvas particle layer + chat
 * input typewriter prompt + chip pulse animations. They never settle
 * to a stable pixel state, so without disabling motion the screenshot
 * test flakes on every run.
 */

const HOME_ROUTE = '/'
const TAROT_ROUTE = '/tarot/general-insight/quick-reading?question=test'
const COMPATIBILITY_ROUTE = '/compatibility'

/** Wait helpers — every route needs the same "settle" treatment before
 *  the screenshot, so factor it out instead of repeating boilerplate. */
async function settle(page: import('@playwright/test').Page) {
  // Fonts swap from system-fallback to the chosen Google fonts on load.
  // If we screenshot before the swap, every diff shows a Cinzel/Lora
  // font replacing Times — false positive on every run.
  await page.evaluate(() => document.fonts.ready)
  // Give Next.js a beat to hydrate + any one-shot mount effects to run.
  await page.waitForLoadState('networkidle')
}

test.describe('Visual regression — high-traffic routes', () => {
  test('home page matches snapshot', async ({ page }) => {
    await page.goto(HOME_ROUTE, { waitUntil: 'domcontentloaded' })
    await settle(page)

    // The hex DP logo is the most stable above-the-fold anchor — wait
    // for it before snapping so we don't catch a half-painted hero.
    await expect(page.locator('[id="home-headline"]')).toBeVisible()

    await expect(page).toHaveScreenshot('home.png', {
      fullPage: false,
    })
  })

  test('tarot reading entrypoint matches snapshot', async ({ page }) => {
    await page.goto(TAROT_ROUTE, { waitUntil: 'domcontentloaded' })
    await settle(page)
    // Whatever stage renders for this URL (deck select or beyond), the
    // page body must contain the question text — sanity check before
    // snapping, otherwise an empty/error page also passes silently.
    await expect(page.locator('body')).toContainText('test', { timeout: 5000 })

    await expect(page).toHaveScreenshot('tarot.png', {
      fullPage: false,
    })
  })

  test('compatibility entry matches snapshot', async ({ page }) => {
    await page.goto(COMPATIBILITY_ROUTE, { waitUntil: 'domcontentloaded' })
    await settle(page)

    await expect(page).toHaveScreenshot('compatibility.png', {
      fullPage: false,
    })
  })
})
