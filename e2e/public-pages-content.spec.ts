import { test, expect } from '@playwright/test'

const ROUTES = ['/', '/pricing', '/about', '/faq', '/contact', '/blog', '/tarot', '/numerology']
const FORBIDDEN_PATTERNS = [/\bheroTitle\b/, /\bsubscribe\b/, /\bcreditPacksDesc\b/, /â|Ã|�/]

test.describe('public pages content smoke', () => {
  for (const route of ROUTES) {
    test(`${route} does not render raw i18n keys or mojibake`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
      const bodyText = await page.locator('body').innerText()
      expect(bodyText).toBeTruthy()

      for (const pattern of FORBIDDEN_PATTERNS) {
        expect(bodyText).not.toMatch(pattern)
      }

      if (route === '/blog') {
        // Guardrail: blog index should not show empty state when post links exist.
        await expect(page.locator('a[href^="/blog/"]').first()).toBeVisible()
        await expect(page.getByText('No posts in this category yet')).toHaveCount(0)
      }
    })
  }
})
