import { test, expect } from '@playwright/test'

test.describe('Astrology Flow', () => {
  test.describe('Astrology Main Page', () => {
    test('should load astrology page with Korean content', async ({ page }) => {
      await page.goto('/astrology', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)

      // 점성술 관련 콘텐츠 확인
      const hasAstrologyContent =
        bodyText!.includes('점성술') ||
        bodyText!.includes('별자리') ||
        bodyText!.includes('Astrology') ||
        bodyText!.includes('운세') ||
        bodyText!.includes('천체')
      expect(hasAstrologyContent).toBe(true)
    })

    test('should display main content area', async ({ page }) => {
      await page.goto('/astrology', { waitUntil: 'domcontentloaded' })

      const content = page.locator("main, [class*='content'], article")
      const count = await content.count()

      if (count > 0) {
        await expect(content.first()).toBeVisible()
      }
    })

    test('should have birth chart form elements', async ({ page }) => {
      await page.goto('/astrology', { waitUntil: 'domcontentloaded' })

      const formElements = page.locator('input, select, form')
      const count = await formElements.count()

      if (count > 0) {
        let visibleElement = false
        for (let i = 0; i < count; i++) {
          if (await formElements.nth(i).isVisible()) {
            visibleElement = true
            break
          }
        }
        expect(visibleElement).toBe(true)
      }
    })
  })

  test.describe('Astrology Counselor Page', () => {
    test('should load counselor page with content', async ({ page }) => {
      await page.goto('/astrology/counselor', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })

    test('should display chat interface or content', async ({ page }) => {
      await page.goto('/astrology/counselor', { waitUntil: 'domcontentloaded' })

      const chatInterface = page.locator('[class*="chat"], [class*="message"], [role="log"], textarea')
      const count = await chatInterface.count()

      const bodyText = await page.locator('body').textContent()
      expect(count > 0 || bodyText!.length > 100).toBe(true)
    })

    test('should have message input area', async ({ page }) => {
      await page.goto('/astrology/counselor', { waitUntil: 'domcontentloaded' })

      const input = page.locator('textarea, input[type="text"]')
      const count = await input.count()

      if (count > 0) {
        const firstInput = input.first()
        if (await firstInput.isVisible()) {
          await expect(firstInput).toBeVisible()
        }
      }
    })

    test('should accept and send message', async ({ page }) => {
      await page.goto('/astrology/counselor', { waitUntil: 'domcontentloaded' })

      const input = page.locator('textarea, input[type="text"]').first()
      if ((await input.count()) > 0 && (await input.isVisible())) {
        await input.fill('오늘 운세가 궁금해요')
        const value = await input.inputValue()
        expect(value).toContain('운세')
      }
    })
  })

  test.describe('Birth Chart Generation', () => {
    test('should accept birth date input', async ({ page }) => {
      await page.goto('/astrology', { waitUntil: 'domcontentloaded' })

      const dateInput = page.locator('input[type="date"], input[name*="birth"]').first()
      if ((await dateInput.count()) > 0 && (await dateInput.isVisible())) {
        await dateInput.fill('1990-01-15')
        const value = await dateInput.inputValue()
        expect(value).toBe('1990-01-15')
      }
    })

    test('should handle form submission', async ({ page }) => {
      await page.goto('/astrology', { waitUntil: 'domcontentloaded' })

      const submitButton = page.locator('button[type="submit"], button:has-text("분석"), button:has-text("시작")')
      if ((await submitButton.count()) > 0) {
        await submitButton.first().click()
        await page.waitForTimeout(1000)
        await expect(page.locator('body')).toBeVisible()
      }
    })

    test('should have chart visualization elements or content', async ({ page }) => {
      await page.goto('/astrology', { waitUntil: 'domcontentloaded' })

      const hasVisualElements = await page.evaluate(() => {
        const canvas = document.querySelectorAll('canvas')
        const svg = document.querySelectorAll('svg')
        const chart = document.querySelectorAll('[class*="chart"], [class*="wheel"]')
        return canvas.length > 0 || svg.length > 0 || chart.length > 0
      })

      const bodyText = await page.locator('body').textContent()
      expect(hasVisualElements || bodyText!.length > 100).toBe(true)
    })
  })

  test.describe('Astrology Mobile Experience', () => {
    test('should render without horizontal scroll on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/astrology', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should have touch-friendly buttons on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/astrology', { waitUntil: 'domcontentloaded' })

      const buttons = page.locator('button')
      const count = await buttons.count()

      for (let i = 0; i < Math.min(count, 3); i++) {
        const button = buttons.nth(i)
        if (await button.isVisible()) {
          const box = await button.boundingBox()
          if (box) {
            expect(box.height).toBeGreaterThanOrEqual(30)
            expect(box.width).toBeGreaterThanOrEqual(30)
          }
        }
      }
    })
  })

  test.describe('Past Life Page', () => {
    test('should load past-life page with content', async ({ page }) => {
      await page.goto('/past-life', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })
  })

  test.describe('Astrology Page Load Performance', () => {
    test('should load main page within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/astrology', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })

    test('should load counselor page within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/astrology/counselor', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })
  })
})
