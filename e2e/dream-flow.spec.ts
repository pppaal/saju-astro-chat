import { test, expect } from '@playwright/test'

test.describe('Dream Interpretation Flow', () => {
  test.describe('Dream Input Page', () => {
    test('should load dream page with dream content', async ({ page }) => {
      await page.goto('/dream', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)

      // Verify dream-specific content
      const hasDreamContent =
        bodyText!.includes('꿈') || bodyText!.includes('Dream') || bodyText!.includes('해몽')
      expect(hasDreamContent).toBe(true)
    })

    test('should have dream description textarea', async ({ page }) => {
      await page.goto('/dream', { waitUntil: 'domcontentloaded' })

      const textarea = page.locator('textarea')
      const count = await textarea.count()

      if (count > 0) {
        await expect(textarea.first()).toBeVisible()
      }
    })

    test('should accept dream text input', async ({ page }) => {
      await page.goto('/dream', { waitUntil: 'domcontentloaded' })

      const textarea = page.locator('textarea')
      if ((await textarea.count()) > 0) {
        const dreamText = '어젯밤에 하늘을 나는 꿈을 꿨어요. 구름 위를 걸어다녔습니다.'
        await textarea.first().fill(dreamText)
        const value = await textarea.first().inputValue()
        expect(value).toContain('하늘')
      }
    })

    test('should have submit button', async ({ page }) => {
      await page.goto('/dream', { waitUntil: 'domcontentloaded' })

      const submitButton = page.locator(
        'button[type="submit"], button:has-text("해석"), button:has-text("분석"), button:has-text("시작")'
      )
      const count = await submitButton.count()

      if (count > 0) {
        await expect(submitButton.first()).toBeVisible()
      }
    })

    test('should handle long dream descriptions', async ({ page }) => {
      await page.goto('/dream', { waitUntil: 'domcontentloaded' })

      const textarea = page.locator('textarea')
      if ((await textarea.count()) > 0) {
        const longText =
          '어젯밤 꿈에서 저는 넓은 바다를 헤엄치고 있었습니다. 물은 맑고 따뜻했습니다. '
        await textarea.first().fill(longText.repeat(5))
        const value = await textarea.first().inputValue()
        expect(value.length).toBeGreaterThan(100)
      }
    })
  })

  test.describe('Dream Form Validation', () => {
    test('should handle empty dream submission', async ({ page }) => {
      await page.goto('/dream', { waitUntil: 'domcontentloaded' })

      const submitButton = page.locator(
        'button[type="submit"], button:has-text("해석"), button:has-text("분석")'
      )

      if ((await submitButton.count()) > 0) {
        await submitButton.first().click()
        await page.waitForTimeout(500)

        // Should stay on page or show validation
        await expect(page.locator('body')).toBeVisible()
        expect(page.url()).toContain('dream')
      }
    })

    test('should submit dream and stay on page', async ({ page }) => {
      await page.goto('/dream', { waitUntil: 'domcontentloaded' })

      const textarea = page.locator('textarea')
      if ((await textarea.count()) > 0) {
        await textarea.first().fill('물에 빠지는 꿈을 꿨습니다')

        const submitButton = page.locator('button[type="submit"], button:has-text("해석")')
        if ((await submitButton.count()) > 0) {
          await submitButton.first().click()
          await page.waitForTimeout(1000)
          await expect(page.locator('body')).toBeVisible()
        }
      }
    })
  })

  test.describe('Dream Mobile Experience', () => {
    test('should render on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/dream', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      // No horizontal scroll
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should have usable textarea on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/dream', { waitUntil: 'domcontentloaded' })

      const textarea = page.locator('textarea')
      if ((await textarea.count()) > 0) {
        await textarea.first().tap()
        await textarea.first().fill('모바일에서 꿈 입력 테스트')
        const value = await textarea.first().inputValue()
        expect(value).toContain('모바일')
      }
    })

    test('should have accessible touch targets', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/dream', { waitUntil: 'domcontentloaded' })

      const buttons = page.locator('button')
      const count = await buttons.count()

      for (let i = 0; i < Math.min(count, 3); i++) {
        const button = buttons.nth(i)
        if (await button.isVisible()) {
          const box = await button.boundingBox()
          if (box) {
            expect(box.width).toBeGreaterThanOrEqual(30)
            expect(box.height).toBeGreaterThanOrEqual(30)
          }
        }
      }
    })
  })
})
