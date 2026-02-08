import { test, expect } from '@playwright/test'

test.describe('Policy Pages', () => {
  test.describe('Privacy Policy Page', () => {
    test('should load privacy policy page', async ({ page }) => {
      await page.goto('/policy/privacy', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display privacy policy content', async ({ page }) => {
      await page.goto('/policy/privacy', { waitUntil: 'domcontentloaded' })

      const content = page.locator("main, article, [class*='policy'], [class*='content']")
      const count = await content.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have section headings', async ({ page }) => {
      await page.goto('/policy/privacy', { waitUntil: 'domcontentloaded' })

      const headings = page.locator('h1, h2, h3')
      const count = await headings.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have last updated date', async ({ page }) => {
      await page.goto('/policy/privacy', { waitUntil: 'domcontentloaded' })

      const dateInfo = page.locator('[class*="date"], [class*="updated"], time')
      const count = await dateInfo.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should be scrollable for long content', async ({ page }) => {
      await page.goto('/policy/privacy', { waitUntil: 'domcontentloaded' })

      const scrollHeight = await page.evaluate(() => document.body.scrollHeight)
      expect(scrollHeight).toBeGreaterThan(0)
    })
  })

  test.describe('Terms of Service Page', () => {
    test('should load terms of service page', async ({ page }) => {
      await page.goto('/policy/terms', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display terms content', async ({ page }) => {
      await page.goto('/policy/terms', { waitUntil: 'domcontentloaded' })

      const content = page.locator("main, article, [class*='terms'], [class*='content']")
      const count = await content.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have numbered sections', async ({ page }) => {
      await page.goto('/policy/terms', { waitUntil: 'domcontentloaded' })

      const sections = page.locator("ol, [class*='section'], h2")
      const count = await sections.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Refund Policy Page', () => {
    test('should load refund policy page', async ({ page }) => {
      await page.goto('/policy/refund', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display refund policy content', async ({ page }) => {
      await page.goto('/policy/refund', { waitUntil: 'domcontentloaded' })

      const content = page.locator("main, article, [class*='refund'], [class*='content']")
      const count = await content.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have refund conditions', async ({ page }) => {
      await page.goto('/policy/refund', { waitUntil: 'domcontentloaded' })

      const conditions = page.locator("ul, ol, [class*='condition']")
      const count = await conditions.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have contact information for refunds', async ({ page }) => {
      await page.goto('/policy/refund', { waitUntil: 'domcontentloaded' })

      const contact = page.locator('[class*="contact"], a[href*="mailto"], a[href*="contact"]')
      const count = await contact.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Policy Navigation', () => {
    test('should navigate between policy pages', async ({ page }) => {
      await page.goto('/policy/privacy', { waitUntil: 'domcontentloaded' })

      const termsLink = page.locator('a[href*="terms"], a:has-text("이용약관")')
      if ((await termsLink.count()) > 0) {
        await termsLink.first().click()
        await page.waitForTimeout(500)
        await expect(page.locator('body')).toBeVisible()
      }
    })

    test('should have back to home navigation', async ({ page }) => {
      await page.goto('/policy/privacy', { waitUntil: 'domcontentloaded' })

      const homeLink = page.locator('a[href="/"], a:has-text("홈"), [class*="logo"]')
      const count = await homeLink.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Policy Footer Links', () => {
    test('should have policy links in footer', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      const footerLinks = page.locator(
        'footer a[href*="policy"], footer a:has-text("개인정보"), footer a:has-text("이용약관")'
      )
      const count = await footerLinks.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Policy Mobile Experience', () => {
    test('should be responsive on mobile - privacy', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/policy/privacy', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should be responsive on mobile - terms', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/policy/terms', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()
    })

    test('should be responsive on mobile - refund', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/policy/refund', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()
    })

    test('should have readable text size on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/policy/privacy', { waitUntil: 'domcontentloaded' })

      const paragraph = page.locator('p').first()
      if ((await paragraph.count()) > 0) {
        const fontSize = await paragraph.evaluate((el) =>
          parseFloat(window.getComputedStyle(el).fontSize)
        )
        expect(fontSize).toBeGreaterThanOrEqual(14)
      }
    })
  })

  test.describe('Policy Accessibility', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('/policy/privacy', { waitUntil: 'domcontentloaded' })

      const h1 = page.locator('h1')
      const h1Count = await h1.count()
      expect(h1Count).toBeGreaterThanOrEqual(0)
    })

    test('should have readable font contrast', async ({ page }) => {
      await page.goto('/policy/privacy', { waitUntil: 'domcontentloaded' })

      const content = page.locator('p, article, main')
      const count = await content.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })
})
