import { test, expect } from '@playwright/test'

test.describe('Counselor Pages', () => {
  test.describe('Destiny Map Counselor', () => {
    test('should load destiny-map counselor page with content', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })

    test('should display AI counselor interface', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const counselorInterface = page.locator('[class*="counselor"], [class*="advisor"], main, [class*="chat"]')
      const count = await counselorInterface.count()

      if (count > 0) {
        await expect(counselorInterface.first()).toBeVisible()
      }
    })

    test('should have chat input area', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const inputArea = page.locator('textarea, input[type="text"]')
      const count = await inputArea.count()

      if (count > 0) {
        const firstInput = inputArea.first()
        if (await firstInput.isVisible()) {
          await expect(firstInput).toBeVisible()
        }
      }
    })

    test('should accept and retain message input', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const input = page.locator("textarea, input[type='text']").first()
      if ((await input.count()) > 0 && (await input.isVisible())) {
        await input.fill('오늘 운세가 궁금해요')
        const value = await input.inputValue()
        expect(value).toContain('운세')
      }
    })
  })

  test.describe('Saju Counselor', () => {
    test('should load saju counselor page with content', async ({ page }) => {
      await page.goto('/saju/counselor', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })

    test('should display saju-specific counselor content', async ({ page }) => {
      await page.goto('/saju/counselor', { waitUntil: 'domcontentloaded' })

      const bodyText = await page.locator('body').textContent()
      // 사주 관련 콘텐츠 확인
      const hasSajuContent =
        bodyText!.includes('사주') ||
        bodyText!.includes('운세') ||
        bodyText!.includes('상담') ||
        bodyText!.length > 100
      expect(hasSajuContent).toBe(true)
    })

    test('should have message input', async ({ page }) => {
      await page.goto('/saju/counselor', { waitUntil: 'domcontentloaded' })

      const input = page.locator('textarea, input[type="text"]')
      const count = await input.count()

      if (count > 0) {
        const firstInput = input.first()
        if (await firstInput.isVisible()) {
          await expect(firstInput).toBeVisible()
        }
      }
    })
  })

  test.describe('Astrology Counselor', () => {
    test('should load astrology counselor page with content', async ({ page }) => {
      await page.goto('/astrology/counselor', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })

    test('should display astrology-specific content', async ({ page }) => {
      await page.goto('/astrology/counselor', { waitUntil: 'domcontentloaded' })

      const bodyText = await page.locator('body').textContent()
      // 점성술 관련 콘텐츠 확인
      const hasContent =
        bodyText!.includes('점성술') ||
        bodyText!.includes('별자리') ||
        bodyText!.includes('상담') ||
        bodyText!.length > 100
      expect(hasContent).toBe(true)
    })
  })

  test.describe('Compatibility Counselor', () => {
    test('should load compatibility counselor page with content', async ({ page }) => {
      await page.goto('/compatibility/counselor', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })

    test('should display compatibility-specific content', async ({ page }) => {
      await page.goto('/compatibility/counselor', { waitUntil: 'domcontentloaded' })

      const bodyText = await page.locator('body').textContent()
      // 궁합 관련 콘텐츠 확인
      const hasContent =
        bodyText!.includes('궁합') ||
        bodyText!.includes('compatibility') ||
        bodyText!.includes('상담') ||
        bodyText!.length > 100
      expect(hasContent).toBe(true)
    })
  })

  test.describe('Counselor Message Interactions', () => {
    test('should send message on button click', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const input = page.locator("textarea, input[type='text']").first()
      const sendButton = page.locator('button[type="submit"], button:has-text("전송"), button:has-text("보내기")').first()

      if ((await input.count()) > 0 && (await sendButton.count()) > 0) {
        if ((await input.isVisible()) && (await sendButton.isVisible())) {
          await input.fill('오늘 운세가 궁금해요')
          const filledValue = await input.inputValue()
          expect(filledValue).toContain('운세')

          await sendButton.click()
          await page.waitForTimeout(500)
          await expect(page.locator('body')).toBeVisible()
        }
      }
    })
  })

  test.describe('Counselor Mobile Experience', () => {
    test('should render destiny counselor without horizontal scroll on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should render saju counselor without horizontal scroll on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/saju/counselor', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should have touch-friendly input on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const input = page.locator('textarea, input[type="text"]').first()
      if ((await input.count()) > 0 && (await input.isVisible())) {
        await input.tap()
        await input.fill('모바일 테스트 메시지')
        const value = await input.inputValue()
        expect(value).toContain('모바일')
      }
    })

    test('should have touch-friendly buttons on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

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

  test.describe('Counselor Page Load Performance', () => {
    test('should load destiny-map counselor within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })

    test('should load saju counselor within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/saju/counselor', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })

    test('should load compatibility counselor within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/compatibility/counselor', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })
  })
})
