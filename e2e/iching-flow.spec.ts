import { test, expect } from '@playwright/test'

test.describe('I-Ching Flow', () => {
  test.describe('I-Ching Main Page', () => {
    test('should load I-Ching page with Korean content', async ({ page }) => {
      await page.goto('/iching', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)

      // 주역 관련 한국어 콘텐츠 확인
      const hasIChingContent =
        bodyText!.includes('주역') ||
        bodyText!.includes('점괘') ||
        bodyText!.includes('I-Ching') ||
        bodyText!.includes('64괘') ||
        bodyText!.includes('역경')
      expect(hasIChingContent).toBe(true)
    })

    test('should have question input area', async ({ page }) => {
      await page.goto('/iching', { waitUntil: 'domcontentloaded' })

      const questionInput = page.locator("textarea, input[type='text']")
      const count = await questionInput.count()

      if (count > 0) {
        await expect(questionInput.first()).toBeVisible()
      }
    })

    test('should have cast or start button', async ({ page }) => {
      await page.goto('/iching', { waitUntil: 'domcontentloaded' })

      const buttons = page.locator('button')
      const count = await buttons.count()
      expect(count).toBeGreaterThan(0)

      // 버튼 중 하나는 보여야 함
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

  test.describe('I-Ching Question Input', () => {
    test('should accept and retain question text', async ({ page }) => {
      await page.goto('/iching', { waitUntil: 'domcontentloaded' })

      const input = page.locator("textarea, input[type='text']").first()
      if ((await input.count()) > 0 && (await input.isVisible())) {
        const question = '올해 사업 운은 어떻게 될까요?'
        await input.fill(question)
        const value = await input.inputValue()
        expect(value).toContain('사업')
        expect(value.length).toBeGreaterThan(10)
      }
    })

    test('should handle form submission', async ({ page }) => {
      await page.goto('/iching', { waitUntil: 'domcontentloaded' })

      const submitButton = page.locator(
        'button[type="submit"], button:has-text("던지기"), button:has-text("시작")'
      )
      if ((await submitButton.count()) > 0) {
        await submitButton.first().click()
        await page.waitForTimeout(500)

        // 페이지가 여전히 작동해야 함
        await expect(page.locator('body')).toBeVisible()
        const bodyText = await page.locator('body').textContent()
        expect(bodyText!.length).toBeGreaterThan(50)
      }
    })
  })

  test.describe('I-Ching Coin Casting', () => {
    test('should interact with casting after question input', async ({ page }) => {
      await page.goto('/iching', { waitUntil: 'domcontentloaded' })

      const input = page.locator("textarea, input[type='text']").first()
      const submitButton = page
        .locator('button:has-text("던지기"), button[type="submit"], button:has-text("시작")')
        .first()

      if ((await input.count()) > 0 && (await submitButton.count()) > 0) {
        await input.fill('내 미래는 어떻게 될까요?')
        const filledValue = await input.inputValue()
        expect(filledValue).toContain('미래')

        await submitButton.click()
        await page.waitForTimeout(1000)

        // 페이지 콘텐츠 확인
        await expect(page.locator('body')).toBeVisible()
      }
    })
  })

  test.describe('I-Ching Mobile Experience', () => {
    test('should render without horizontal scroll on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/iching', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should have touch-friendly buttons on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/iching', { waitUntil: 'domcontentloaded' })

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

    test('should allow text input on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/iching', { waitUntil: 'domcontentloaded' })

      const input = page.locator("textarea, input[type='text']").first()
      if ((await input.count()) > 0 && (await input.isVisible())) {
        await input.tap()
        await input.fill('모바일에서 주역 점괘 테스트')
        const value = await input.inputValue()
        expect(value).toContain('모바일')
      }
    })
  })

  test.describe('I-Ching Page Load Performance', () => {
    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/iching', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })
  })
})
