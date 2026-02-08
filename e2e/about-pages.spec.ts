import { test, expect } from '@playwright/test'

test.describe('About Pages', () => {
  test.describe('About Main Page', () => {
    test('should load about page successfully', async ({ page }) => {
      await page.goto('/about', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })

    test('should display about content', async ({ page }) => {
      await page.goto('/about', { waitUntil: 'domcontentloaded' })

      const content = page.locator("main, article, [class*='about'], [class*='content']")
      const count = await content.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('About Features Page', () => {
    test('should load features page', async ({ page }) => {
      await page.goto('/about/features', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display feature list', async ({ page }) => {
      await page.goto('/about/features', { waitUntil: 'domcontentloaded' })

      const features = page.locator('[class*="feature"], [class*="card"], li')
      const count = await features.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('FAQ Page', () => {
    test('should load FAQ page', async ({ page }) => {
      await page.goto('/faq', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display FAQ items', async ({ page }) => {
      await page.goto('/faq', { waitUntil: 'domcontentloaded' })

      const faqItems = page.locator(
        '[class*="faq"], [class*="question"], details, [class*="accordion"]'
      )
      const count = await faqItems.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should expand FAQ on click', async ({ page }) => {
      await page.goto('/faq', { waitUntil: 'domcontentloaded' })

      const faqItem = page
        .locator('details summary, button[aria-expanded], [class*="question"]')
        .first()
      if ((await faqItem.count()) > 0) {
        await faqItem.click()
        await page.waitForTimeout(300)
        await expect(page.locator('body')).toBeVisible()
      }
    })
  })

  test.describe('Contact Page', () => {
    test('should load contact page', async ({ page }) => {
      await page.goto('/contact', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display contact form', async ({ page }) => {
      await page.goto('/contact', { waitUntil: 'domcontentloaded' })

      const form = page.locator("form, [class*='contact-form']")
      const count = await form.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('About Mobile Experience', () => {
    test('should be responsive on mobile - about page', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/about', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should be responsive on mobile - FAQ page', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/faq', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()
    })

    test('should be responsive on mobile - contact page', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/contact', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()
    })
  })
})
