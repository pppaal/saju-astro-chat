import { expect, test } from '@playwright/test'

const PUBLIC_ROUTES = [
  '/',
  '/pricing',
  '/about',
  '/faq',
  '/contact',
  '/blog',
  '/tarot',
  '/numerology',
  '/dream',
  '/astrology',
  '/destiny-map',
  '/calendar',
]

const KEY_LEAK_PATTERNS = [
  /\bheroTitle\b/,
  /\bheroSub\b/,
  /\bsubscribe\b/,
  /\bdestinyMap\b/,
  /\btitleAstrology\b/,
  /\bsubtitleAstrology\b/,
  /\bcreditPacksDesc\b/,
]

test.describe('Public pages smoke', () => {
  test.setTimeout(120000)

  for (const route of PUBLIC_ROUTES) {
    test(`no key leak/mojibake/permanent loading: ${route}`, async ({ page }, testInfo) => {
      try {
        await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60000 })
        await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {})
        await page.waitForTimeout(1000)
        await expect(page).toHaveURL(
          new RegExp(route === '/' ? '/$' : route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        )

        await page
          .waitForFunction(() => !document.body.innerText.includes('Loading...'), undefined, {
            timeout: 11000,
          })
          .catch(() => {})

        const text = await page.locator('body').innerText()
        for (const keyPattern of KEY_LEAK_PATTERNS) {
          expect(text).not.toMatch(keyPattern)
        }

        expect(text).not.toContain('â')
        expect(text).not.toContain('Ã')
        expect(text).not.toContain('ï¿½')
        expect(text).not.toContain('Loading...')

        const headingCount = await page.locator('main h1, h1').count()
        expect(headingCount).toBeGreaterThan(0)
        const headingText = (await page.locator('main h1, h1').first().innerText()).trim()
        expect(headingText.length).toBeGreaterThan(0)
      } catch (error) {
        const safeRouteName = route === '/' ? 'home' : route.replace(/[\/:.?&=]/g, '_')
        try {
          await page.screenshot({
            path: `test-results/public-smoke-${safeRouteName}.png`,
            fullPage: true,
          })
        } catch {
          // no-op
        }

        testInfo.attach(`failure-route-${safeRouteName}`, {
          body: Buffer.from(String(error)),
          contentType: 'text/plain',
        })
        throw error
      }
    })
  }

  test('blog index is not empty when posts exist', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {})
    await page.waitForTimeout(800)

    const cards = await page.locator('a[href^="/blog/"]').count()
    const emptyMessage = page.getByText('No posts in this category yet')
    const hasEmptyMessage = await emptyMessage.isVisible().catch(() => false)

    expect(cards).toBeGreaterThan(0)
    expect(hasEmptyMessage).toBe(false)
  })
})
