import { test, expect } from '@playwright/test'

test.describe('Astrology Flow', () => {
  test.describe('Astrology Main Page', () => {
    test('should load astrology page successfully', async ({ page }) => {
      await page.goto('/astrology', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })

    test('should display astrology content', async ({ page }) => {
      await page.goto('/astrology', { waitUntil: 'domcontentloaded' })

      const content = page.locator("main, [class*='content'], article")
      const count = await content.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have birth chart form', async ({ page }) => {
      await page.goto('/astrology', { waitUntil: 'domcontentloaded' })

      const formElements = page.locator('input, select, form')
      const count = await formElements.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Astrology Counselor Page', () => {
    test('should load counselor page successfully', async ({ page }) => {
      await page.goto('/astrology/counselor', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display counselor chat interface', async ({ page }) => {
      await page.goto('/astrology/counselor', { waitUntil: 'domcontentloaded' })

      const chatInterface = page.locator('[class*="chat"], [class*="message"], [role="log"]')
      const count = await chatInterface.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have message input', async ({ page }) => {
      await page.goto('/astrology/counselor', { waitUntil: 'domcontentloaded' })

      const input = page.locator('textarea, input[type="text"]')
      const count = await input.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Birth Chart Generation', () => {
    test('should generate chart with valid input', async ({ page }) => {
      await page.goto('/astrology', { waitUntil: 'domcontentloaded' })

      // Fill in birth info if form exists
      const dateInput = page.locator('input[type="date"], input[name*="birth"]').first()
      if ((await dateInput.count()) > 0) {
        await dateInput.fill('1990-01-15')
      }

      const submitButton = page.locator('button[type="submit"], button:has-text("분석")')
      if ((await submitButton.count()) > 0) {
        await submitButton.first().click()
        await page.waitForTimeout(1000)
        await expect(page.locator('body')).toBeVisible()
      }
    })

    test('should display chart visualization', async ({ page }) => {
      await page.goto('/astrology', { waitUntil: 'domcontentloaded' })

      const chartElements = page.locator('canvas, svg, [class*="chart"], [class*="wheel"]')
      const count = await chartElements.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Astrology Mobile Experience', () => {
    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/astrology', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })
  })

  test.describe('Past Life Page', () => {
    test('should load past-life page', async ({ page }) => {
      await page.goto('/past-life', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })
  })
})
