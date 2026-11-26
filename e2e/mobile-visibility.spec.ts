import { test, expect } from '@playwright/test'

/**
 * Small-phone viewport visibility regressions — v9.2 Home.
 *
 * The home is a scrolling paper document (no fixed chat bar any more). What
 * must hold on the smallest realistic phones is the first screen: the header
 * with its Sign in pill and the main CTA ("Get my free Saju Card") are inside
 * the first viewport, and nothing makes the page scroll sideways.
 *
 * Runs under TWO Playwright projects:
 *  - `mobile-visibility`: iPhone SE (375x667), smallest mainstream iOS
 *  - `narrow-viewport`:   Galaxy Z Fold outer screen (280x653)
 * Both projects exercise the same assertions, so a regression that only
 * shows up on the narrowest screens is also caught.
 */

async function expectInFirstViewport(
  page: import('@playwright/test').Page,
  locator: import('@playwright/test').Locator
) {
  const viewport = page.viewportSize()!
  await expect(locator).toBeVisible()
  const box = await locator.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1)
  expect(box!.x).toBeGreaterThanOrEqual(-1)
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1)
}

test.describe('Home — first screen on small phones', () => {
  test('header with the Sign in pill is inside the first viewport', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const header = page.locator('header').first()
    await expectInFirstViewport(page, header)

    // Guests see "Sign in" / "로그인" (signed-in users would see "Menu").
    const signIn = page.getByRole('button', { name: /^(Sign in|로그인)$/ })
    await expectInFirstViewport(page, signIn)
  })

  test('the main CTA is inside the first viewport', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    await expect(page.locator('#home-headline')).toBeVisible()
    const cta = page.getByRole('button', { name: /Get my free Saju Card|내 무료 사주 카드 받기/ })
    await expectInFirstViewport(page, cta)
  })

  test('no horizontal overflow', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('#home-headline')).toBeVisible()
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      innerWidth: window.innerWidth,
    }))
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth + 1)
  })
})

test.describe('Home — landscape short viewport', () => {
  test('the page scrolls and the CTA is reachable', async ({ page }) => {
    await page.setViewportSize({ width: 667, height: 375 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // The old home locked body scroll; the v9 home is a normal document.
    const overflow = await page.evaluate(() => getComputedStyle(document.body).overflowY)
    expect(overflow).not.toBe('hidden')

    const cta = page.getByRole('button', { name: /Get my free Saju Card|내 무료 사주 카드 받기/ })
    await expect(async () => {
      await cta.scrollIntoViewIfNeeded()
      await expect(cta).toBeVisible()
    }).toPass({ timeout: 10_000 })
  })
})
