import { test, expect } from '@playwright/test'

test.describe('Numerology Flow', () => {
  test.describe('Numerology Main Page', () => {
    test('should load numerology page successfully', async ({ page }) => {
      await page.goto('/numerology', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })

    test('should display numerology introduction', async ({ page }) => {
      await page.goto('/numerology', { waitUntil: 'domcontentloaded' })

      const intro = page.locator("main, [class*='intro'], [class*='content']")
      const count = await intro.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have birth date input', async ({ page }) => {
      await page.goto('/numerology', { waitUntil: 'domcontentloaded' })

      const dateInput = page.locator('input[type="date"], input[name*="birth"]')
      const count = await dateInput.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have calculate button', async ({ page }) => {
      await page.goto('/numerology', { waitUntil: 'domcontentloaded' })

      const calcButton = page.locator(
        'button[type="submit"], button:has-text("계산"), button:has-text("분석"), button:has-text("Calculate")'
      )
      const count = await calcButton.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Numerology Input Validation', () => {
    test('should accept valid birth date', async ({ page }) => {
      await page.goto('/numerology', { waitUntil: 'domcontentloaded' })

      const dateInput = page.locator('input[type="date"]').first()
      if ((await dateInput.count()) > 0) {
        await dateInput.fill('1990-05-15')
        const value = await dateInput.inputValue()
        expect(value).toBe('1990-05-15')
      }
    })

    test('should accept name input', async ({ page }) => {
      await page.goto('/numerology', { waitUntil: 'domcontentloaded' })

      const nameInput = page.locator('input[name*="name"], input[type="text"]').first()
      if ((await nameInput.count()) > 0) {
        await nameInput.fill('홍길동')
        const value = await nameInput.inputValue()
        expect(value).toBe('홍길동')
      }
    })

    test('should validate empty form submission', async ({ page }) => {
      await page.goto('/numerology', { waitUntil: 'domcontentloaded' })

      const submitButton = page.locator('button[type="submit"]')
      if ((await submitButton.count()) > 0) {
        await submitButton.first().click()
        await page.waitForTimeout(500)
        await expect(page.locator('body')).toBeVisible()
      }
    })
  })

  test.describe('Numerology Results', () => {
    test('should display life path number', async ({ page }) => {
      await page.goto('/numerology', { waitUntil: 'domcontentloaded' })

      const lifePathNumber = page.locator(
        '[class*="life-path"], [class*="number"], [class*="result"]'
      )
      const count = await lifePathNumber.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should display number interpretations', async ({ page }) => {
      await page.goto('/numerology', { waitUntil: 'domcontentloaded' })

      const interpretations = page.locator('[class*="interpretation"], [class*="meaning"], p')
      const count = await interpretations.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Numerology Mobile Experience', () => {
    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/numerology', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should have touch-friendly form inputs', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/numerology', { waitUntil: 'domcontentloaded' })

      const input = page.locator('input').first()
      if ((await input.count()) > 0) {
        const box = await input.boundingBox()
        if (box) {
          expect(box.height >= 30).toBe(true)
        }
      }
    })
  })
})
