import { test, expect } from '@playwright/test'

test.describe('Policy Pages', () => {
  test.describe('Privacy Policy Page', () => {
    test('should load privacy policy page with content', async ({ page }) => {
      await page.goto('/policy/privacy', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(200)

      // Privacy policy should have privacy-related content
      const hasPrivacyContent =
        bodyText!.includes('개인정보') ||
        bodyText!.includes('Privacy') ||
        bodyText!.includes('정보') ||
        bodyText!.includes('보호')
      expect(hasPrivacyContent).toBe(true)
    })

    test('should have section headings', async ({ page }) => {
      await page.goto('/policy/privacy', { waitUntil: 'domcontentloaded' })

      const headings = page.locator('h1, h2, h3')
      const count = await headings.count()
      expect(count).toBeGreaterThan(0)
    })

    test('should be scrollable for long content', async ({ page }) => {
      await page.goto('/policy/privacy', { waitUntil: 'domcontentloaded' })

      const scrollHeight = await page.evaluate(() => document.body.scrollHeight)
      expect(scrollHeight).toBeGreaterThan(500)
    })
  })

  test.describe('Terms of Service Page', () => {
    test('should load terms of service page with content', async ({ page }) => {
      await page.goto('/policy/terms', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(200)

      // Terms should have terms-related content
      const hasTermsContent =
        bodyText!.includes('이용약관') ||
        bodyText!.includes('Terms') ||
        bodyText!.includes('서비스') ||
        bodyText!.includes('약관')
      expect(hasTermsContent).toBe(true)
    })

    test('should have numbered or sectioned content', async ({ page }) => {
      await page.goto('/policy/terms', { waitUntil: 'domcontentloaded' })

      const sections = page.locator('ol, h2, h3, section')
      const count = await sections.count()
      expect(count).toBeGreaterThan(0)
    })
  })

  test.describe('Refund Policy Page', () => {
    test('should load refund policy page with content', async ({ page }) => {
      await page.goto('/policy/refund', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(100)

      // Refund policy should have refund-related content
      const hasRefundContent =
        bodyText!.includes('환불') ||
        bodyText!.includes('Refund') ||
        bodyText!.includes('취소') ||
        bodyText!.includes('정책')
      expect(hasRefundContent).toBe(true)
    })

    test('should have refund conditions listed', async ({ page }) => {
      await page.goto('/policy/refund', { waitUntil: 'domcontentloaded' })

      const lists = page.locator('ul, ol')
      const count = await lists.count()
      expect(count).toBeGreaterThan(0)
    })
  })

  test.describe('Policy Navigation', () => {
    test('should navigate between policy pages', async ({ page }) => {
      await page.goto('/policy/privacy', { waitUntil: 'domcontentloaded' })

      const termsLink = page.locator('a[href*="terms"], a:has-text("이용약관")')
      if ((await termsLink.count()) > 0 && (await termsLink.first().isVisible())) {
        await termsLink.first().click()
        await page.waitForTimeout(500)
        await expect(page.locator('body')).toBeVisible()
        expect(page.url()).toContain('terms')
      }
    })

    test('should have back to home navigation', async ({ page }) => {
      await page.goto('/policy/privacy', { waitUntil: 'domcontentloaded' })

      const homeLink = page.locator('a[href="/"], a:has-text("홈"), [class*="logo"]')
      const count = await homeLink.count()
      expect(count).toBeGreaterThan(0)
    })
  })

  test.describe('Policy Footer Links', () => {
    test('should have policy links in footer', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      const footerLinks = page.locator('footer a')
      const count = await footerLinks.count()
      expect(count).toBeGreaterThan(0)
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

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should be responsive on mobile - refund', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/policy/refund', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should have readable text size on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/policy/privacy', { waitUntil: 'domcontentloaded' })

      const paragraph = page.locator('p').first()
      if ((await paragraph.count()) > 0 && (await paragraph.isVisible())) {
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
      expect(h1Count).toBeGreaterThan(0)
    })

    test('should have readable content structure', async ({ page }) => {
      await page.goto('/policy/privacy', { waitUntil: 'domcontentloaded' })

      const content = page.locator('p, article, main, section')
      const count = await content.count()
      expect(count).toBeGreaterThan(0)
    })
  })

  test.describe('Policy Page Load Performance', () => {
    test('should load privacy policy within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/policy/privacy', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })

    test('should load terms within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/policy/terms', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })
  })
})
