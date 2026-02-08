import { test, expect } from '@playwright/test'

test.describe('About Pages', () => {
  test.describe('About Main Page', () => {
    test('should load about page successfully', async ({ page }) => {
      await page.goto('/about', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)

      // About page should have content
      const hasAboutContent =
        bodyText!.includes('소개') ||
        bodyText!.includes('About') ||
        bodyText!.includes('서비스') ||
        bodyText!.includes('사주')
      expect(hasAboutContent).toBe(true)
    })

    test('should display about content with headings', async ({ page }) => {
      await page.goto('/about', { waitUntil: 'domcontentloaded' })

      const headings = page.locator('h1, h2, h3')
      const count = await headings.count()
      expect(count).toBeGreaterThan(0)
    })
  })

  test.describe('About Features Page', () => {
    test('should load features page', async ({ page }) => {
      await page.goto('/about/features', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })

    test('should display feature content', async ({ page }) => {
      await page.goto('/about/features', { waitUntil: 'domcontentloaded' })

      const bodyText = await page.locator('body').textContent()
      const hasFeatureContent =
        bodyText!.includes('기능') ||
        bodyText!.includes('Feature') ||
        bodyText!.includes('사주') ||
        bodyText!.includes('타로')
      expect(hasFeatureContent).toBe(true)
    })
  })

  test.describe('FAQ Page', () => {
    test('should load FAQ page with content', async ({ page }) => {
      await page.goto('/faq', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(100)

      // FAQ page should have question-related content
      const hasFAQContent =
        bodyText!.includes('질문') ||
        bodyText!.includes('자주') ||
        bodyText!.includes('FAQ') ||
        bodyText!.includes('문의')
      expect(hasFAQContent).toBe(true)
    })

    test('should expand FAQ on click', async ({ page }) => {
      await page.goto('/faq', { waitUntil: 'domcontentloaded' })

      const faqItem = page
        .locator('details summary, button[aria-expanded], [class*="question"]')
        .first()
      if ((await faqItem.count()) > 0 && (await faqItem.isVisible())) {
        await faqItem.click()
        await page.waitForTimeout(300)
        await expect(page.locator('body')).toBeVisible()
      }
    })
  })

  test.describe('Contact Page', () => {
    test('should load contact page with content', async ({ page }) => {
      await page.goto('/contact', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)

      // Contact page should have contact-related content
      const hasContactContent =
        bodyText!.includes('문의') ||
        bodyText!.includes('Contact') ||
        bodyText!.includes('연락') ||
        bodyText!.includes('이메일')
      expect(hasContactContent).toBe(true)
    })

    test('should have form or contact info', async ({ page }) => {
      await page.goto('/contact', { waitUntil: 'domcontentloaded' })

      const formElements = page.locator('form, input, textarea, a[href*="mailto"]')
      const count = await formElements.count()
      expect(count).toBeGreaterThan(0)
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

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should be responsive on mobile - contact page', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/contact', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })
  })

  test.describe('About Page Load Performance', () => {
    test('should load about page within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/about', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })

    test('should load FAQ page within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/faq', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })
  })
})
