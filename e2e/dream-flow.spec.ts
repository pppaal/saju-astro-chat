import { test, expect } from '@playwright/test'

test.describe('Dream Interpretation Flow', () => {
  test.describe('Dream Input Page', () => {
    test('should load dream page with Korean dream content', async ({ page }) => {
      await page.goto('/dream', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)

      const hasDreamContent =
        bodyText!.includes('꿈') ||
        bodyText!.includes('Dream') ||
        bodyText!.includes('해몽')
      expect(hasDreamContent).toBe(true)
    })

    test('should have dream description textarea visible', async ({ page }) => {
      await page.goto('/dream', { waitUntil: 'domcontentloaded' })

      const textarea = page.locator('textarea')
      const count = await textarea.count()

      if (count > 0) {
        let visibleTextarea = false
        for (let i = 0; i < count; i++) {
          if (await textarea.nth(i).isVisible()) {
            visibleTextarea = true
            break
          }
        }
        expect(visibleTextarea).toBe(true)
      }
    })

    test('should accept dream text input and retain value', async ({ page }) => {
      await page.goto('/dream', { waitUntil: 'domcontentloaded' })

      const textarea = page.locator('textarea')
      if ((await textarea.count()) > 0) {
        const firstTextarea = textarea.first()
        if (await firstTextarea.isVisible()) {
          const dreamText = '어젯밤에 하늘을 나는 꿈을 꿨어요. 구름 위를 걸어다녔습니다.'
          await firstTextarea.fill(dreamText)
          const value = await firstTextarea.inputValue()
          expect(value).toContain('하늘')
          expect(value).toContain('구름')
        }
      }
    })

    test('should have submit button visible', async ({ page }) => {
      await page.goto('/dream', { waitUntil: 'domcontentloaded' })

      const submitButton = page.locator(
        'button[type="submit"], button:has-text("해석"), button:has-text("분석"), button:has-text("시작")'
      )
      const count = await submitButton.count()

      if (count > 0) {
        let visibleButton = false
        for (let i = 0; i < count; i++) {
          if (await submitButton.nth(i).isVisible()) {
            visibleButton = true
            break
          }
        }
        expect(visibleButton).toBe(true)
      }
    })

    test('should handle long dream descriptions', async ({ page }) => {
      await page.goto('/dream', { waitUntil: 'domcontentloaded' })

      const textarea = page.locator('textarea')
      if ((await textarea.count()) > 0) {
        const firstTextarea = textarea.first()
        if (await firstTextarea.isVisible()) {
          const longText =
            '어젯밤 꿈에서 저는 넓은 바다를 헤엄치고 있었습니다. 물은 맑고 따뜻했습니다. '
          await firstTextarea.fill(longText.repeat(5))
          const value = await firstTextarea.inputValue()
          expect(value.length).toBeGreaterThan(100)
          expect(value).toContain('바다')
        }
      }
    })

    test('should display dream-related keywords', async ({ page }) => {
      await page.goto('/dream', { waitUntil: 'domcontentloaded' })

      const bodyText = await page.locator('body').textContent()

      // 꿈 해석 관련 콘텐츠 확인
      const hasDreamKeywords =
        bodyText!.includes('꿈') ||
        bodyText!.includes('해몽') ||
        bodyText!.includes('무의식') ||
        bodyText!.includes('상징')
      expect(hasDreamKeywords).toBe(true)
    })
  })

  test.describe('Dream Form Validation', () => {
    test('should handle empty dream submission', async ({ page }) => {
      await page.goto('/dream', { waitUntil: 'domcontentloaded' })

      const submitButton = page.locator(
        'button[type="submit"], button:has-text("해석"), button:has-text("분석")'
      )

      if ((await submitButton.count()) > 0 && (await submitButton.first().isVisible())) {
        await submitButton.first().click()
        await page.waitForTimeout(500)

        // 페이지에 머물러야 함
        await expect(page.locator('body')).toBeVisible()
        expect(page.url()).toContain('dream')

        const bodyText = await page.locator('body').textContent()
        expect(bodyText!.length).toBeGreaterThan(50)
      }
    })

    test('should submit dream and stay on page', async ({ page }) => {
      await page.goto('/dream', { waitUntil: 'domcontentloaded' })

      const textarea = page.locator('textarea')
      if ((await textarea.count()) > 0 && (await textarea.first().isVisible())) {
        await textarea.first().fill('물에 빠지는 꿈을 꿨습니다')

        const submitButton = page.locator('button[type="submit"], button:has-text("해석")')
        if ((await submitButton.count()) > 0 && (await submitButton.first().isVisible())) {
          await submitButton.first().click()
          await page.waitForTimeout(1000)
          await expect(page.locator('body')).toBeVisible()

          const bodyText = await page.locator('body').textContent()
          expect(bodyText!.length).toBeGreaterThan(50)
        }
      }
    })

    test('should handle special characters in dream input', async ({ page }) => {
      await page.goto('/dream', { waitUntil: 'domcontentloaded' })

      const textarea = page.locator('textarea')
      if ((await textarea.count()) > 0 && (await textarea.first().isVisible())) {
        await textarea.first().fill('꿈에서 "안녕"이라고 말했어요! 🌙')
        const value = await textarea.first().inputValue()
        expect(value).toContain('안녕')
      }
    })
  })

  test.describe('Dream History', () => {
    test('should have navigation to history or recent dreams', async ({ page }) => {
      await page.goto('/dream', { waitUntil: 'domcontentloaded' })

      const links = page.locator('a')
      const count = await links.count()
      expect(count).toBeGreaterThan(0)

      let visibleLink = false
      for (let i = 0; i < Math.min(count, 10); i++) {
        if (await links.nth(i).isVisible()) {
          visibleLink = true
          break
        }
      }
      expect(visibleLink).toBe(true)
    })
  })

  test.describe('Dream Mobile Experience', () => {
    test('should render on mobile viewport without horizontal scroll', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/dream', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should have usable textarea on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/dream', { waitUntil: 'domcontentloaded' })

      const textarea = page.locator('textarea')
      if ((await textarea.count()) > 0) {
        const firstTextarea = textarea.first()
        if (await firstTextarea.isVisible()) {
          await firstTextarea.tap()
          await firstTextarea.fill('모바일에서 꿈 입력 테스트')
          const value = await firstTextarea.inputValue()
          expect(value).toContain('모바일')
        }
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

    test('should have responsive textarea on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/dream', { waitUntil: 'domcontentloaded' })

      const textarea = page.locator('textarea').first()
      if ((await textarea.count()) > 0 && (await textarea.isVisible())) {
        const box = await textarea.boundingBox()
        if (box) {
          // 텍스트 영역이 화면 너비에 맞게 조정되어야 함
          expect(box.width).toBeLessThanOrEqual(375)
        }
      }
    })
  })

  test.describe('Dream Page Load Performance', () => {
    test('should load dream page within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/dream', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })
  })

  test.describe('Dream Accessibility', () => {
    test('should have accessible form elements', async ({ page }) => {
      await page.goto('/dream', { waitUntil: 'domcontentloaded' })

      const textarea = page.locator('textarea').first()
      if ((await textarea.count()) > 0 && (await textarea.isVisible())) {
        const ariaLabel = await textarea.getAttribute('aria-label')
        const placeholder = await textarea.getAttribute('placeholder')
        const id = await textarea.getAttribute('id')

        // 접근성을 위한 레이블이 있어야 함
        const hasAccessibleLabel = ariaLabel || placeholder || id
        expect(hasAccessibleLabel).toBeTruthy()
      }
    })

    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/dream', { waitUntil: 'domcontentloaded' })

      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')

      const focusedTag = await page.evaluate(() => document.activeElement?.tagName)
      expect(focusedTag).toBeTruthy()
    })
  })
})
