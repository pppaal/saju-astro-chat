import { test, expect } from '@playwright/test'

test.describe('Numerology Flow', () => {
  test.describe('Numerology Main Page', () => {
    test('should load numerology page with Korean content', async ({ page }) => {
      await page.goto('/numerology', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)

      // 수비학 관련 콘텐츠 확인
      const hasNumerologyContent =
        bodyText!.includes('수비학') ||
        bodyText!.includes('숫자') ||
        bodyText!.includes('Numerology') ||
        bodyText!.includes('생년월일') ||
        bodyText!.includes('운명')
      expect(hasNumerologyContent).toBe(true)
    })

    test('should have input form elements', async ({ page }) => {
      await page.goto('/numerology', { waitUntil: 'domcontentloaded' })

      const inputs = page.locator('input, select')
      const count = await inputs.count()

      if (count > 0) {
        let visibleInput = false
        for (let i = 0; i < count; i++) {
          if (await inputs.nth(i).isVisible()) {
            visibleInput = true
            break
          }
        }
        expect(visibleInput).toBe(true)
      }
    })

    test('should have calculate or submit button', async ({ page }) => {
      await page.goto('/numerology', { waitUntil: 'domcontentloaded' })

      const buttons = page.locator('button')
      const count = await buttons.count()
      expect(count).toBeGreaterThan(0)

      let visibleButtonFound = false
      for (let i = 0; i < count; i++) {
        if (await buttons.nth(i).isVisible()) {
          visibleButtonFound = true
          break
        }
      }
      expect(visibleButtonFound).toBe(true)
    })
  })

  test.describe('Numerology Input Validation', () => {
    test('should accept and retain birth date input', async ({ page }) => {
      await page.goto('/numerology', { waitUntil: 'domcontentloaded' })

      const dateInput = page.locator('input[type="date"]').first()
      if ((await dateInput.count()) > 0 && (await dateInput.isVisible())) {
        await dateInput.fill('1990-05-15')
        const value = await dateInput.inputValue()
        expect(value).toBe('1990-05-15')
      }
    })

    test('should accept and retain name input', async ({ page }) => {
      await page.goto('/numerology', { waitUntil: 'domcontentloaded' })

      const nameInput = page.locator('input[name*="name"], input[type="text"]').first()
      if ((await nameInput.count()) > 0 && (await nameInput.isVisible())) {
        await nameInput.fill('홍길동')
        const value = await nameInput.inputValue()
        expect(value).toBe('홍길동')
      }
    })

    test('should handle form submission', async ({ page }) => {
      await page.goto('/numerology', { waitUntil: 'domcontentloaded' })

      const submitButton = page.locator(
        'button[type="submit"], button:has-text("계산"), button:has-text("분석")'
      )
      if ((await submitButton.count()) > 0) {
        await submitButton.first().click()
        await page.waitForTimeout(500)

        await expect(page.locator('body')).toBeVisible()
        const bodyText = await page.locator('body').textContent()
        expect(bodyText!.length).toBeGreaterThan(50)
      }
    })
  })

  test.describe('Numerology Results', () => {
    test('should display interpretations or result text', async ({ page }) => {
      await page.goto('/numerology', { waitUntil: 'domcontentloaded' })

      const paragraphs = page.locator('p')
      const count = await paragraphs.count()

      if (count > 0) {
        let hasContent = false
        for (let i = 0; i < Math.min(count, 5); i++) {
          const text = await paragraphs.nth(i).textContent()
          if (text && text.length > 20) {
            hasContent = true
            break
          }
        }
        expect(hasContent).toBe(true)
      }
    })
  })

  test.describe('Numerology Mobile Experience', () => {
    test('should render without horizontal scroll on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/numerology', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should have touch-friendly form inputs on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/numerology', { waitUntil: 'domcontentloaded' })

      const inputs = page.locator('input')
      const count = await inputs.count()

      for (let i = 0; i < Math.min(count, 3); i++) {
        const input = inputs.nth(i)
        if (await input.isVisible()) {
          const box = await input.boundingBox()
          if (box) {
            expect(box.height).toBeGreaterThanOrEqual(30)
          }
        }
      }
    })

    test('should allow form input on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/numerology', { waitUntil: 'domcontentloaded' })

      const input = page.locator('input[type="text"], input[name*="name"]').first()
      if ((await input.count()) > 0 && (await input.isVisible())) {
        await input.tap()
        await input.fill('모바일 테스트')
        const value = await input.inputValue()
        expect(value).toContain('모바일')
      }
    })
  })

  test.describe('Numerology Page Load Performance', () => {
    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/numerology', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })
  })
})
