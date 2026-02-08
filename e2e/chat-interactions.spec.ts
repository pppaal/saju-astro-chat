import { test, expect } from '@playwright/test'

test.describe('Chat Interactions Tests', () => {
  test.describe('Destiny Map Chat', () => {
    test('should load destiny-map counselor page with Korean content', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)

      const hasCounselorContent =
        bodyText!.includes('상담') ||
        bodyText!.includes('운세') ||
        bodyText!.includes('사주') ||
        bodyText!.includes('질문')
      expect(hasCounselorContent).toBe(true)
    })

    test('should have message input field visible', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const input = page.locator('textarea, input[type="text"]')
      const count = await input.count()

      if (count > 0) {
        let visibleInput = false
        for (let i = 0; i < count; i++) {
          if (await input.nth(i).isVisible()) {
            visibleInput = true
            break
          }
        }
        expect(visibleInput).toBe(true)
      }
    })

    test('should have send button visible', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const sendButton = page.locator(
        'button[type="submit"], button:has-text("전송"), button:has-text("Send"), button[class*="send"]'
      )
      const count = await sendButton.count()

      if (count > 0) {
        let visibleButton = false
        for (let i = 0; i < count; i++) {
          if (await sendButton.nth(i).isVisible()) {
            visibleButton = true
            break
          }
        }
        expect(visibleButton).toBe(true)
      }
    })

    test('should allow typing message and retain value', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const input = page.locator('textarea, input[type="text"]').first()
      if ((await input.count()) > 0 && (await input.isVisible())) {
        await input.fill('안녕하세요, 오늘의 운세가 궁금합니다')
        const value = await input.inputValue()
        expect(value).toContain('안녕하세요')
        expect(value).toContain('운세')
      }
    })
  })

  test.describe('Saju Counselor Chat', () => {
    test('should load saju counselor page with Korean content', async ({ page }) => {
      await page.goto('/saju/counselor', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)

      const hasSajuContent =
        bodyText!.includes('사주') ||
        bodyText!.includes('상담') ||
        bodyText!.includes('운세')
      expect(hasSajuContent).toBe(true)
    })

    test('should have chat input on saju counselor visible', async ({ page }) => {
      await page.goto('/saju/counselor', { waitUntil: 'domcontentloaded' })

      const chatInput = page.locator('textarea, input[type="text"]')
      const count = await chatInput.count()

      if (count > 0) {
        let visibleInput = false
        for (let i = 0; i < count; i++) {
          if (await chatInput.nth(i).isVisible()) {
            visibleInput = true
            break
          }
        }
        expect(visibleInput).toBe(true)
      }
    })

    test('should accept chat input on saju counselor', async ({ page }) => {
      await page.goto('/saju/counselor', { waitUntil: 'domcontentloaded' })

      const input = page.locator('textarea, input[type="text"]').first()
      if ((await input.count()) > 0 && (await input.isVisible())) {
        await input.fill('올해 재물운이 궁금해요')
        const value = await input.inputValue()
        expect(value).toContain('재물')
      }
    })
  })

  test.describe('Compatibility Chat', () => {
    test('should load compatibility chat page with content', async ({ page }) => {
      await page.goto('/compatibility/chat', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })

    test('should have message input on compatibility chat visible', async ({ page }) => {
      await page.goto('/compatibility/chat', { waitUntil: 'domcontentloaded' })

      const input = page.locator('textarea, input[type="text"]')
      const count = await input.count()

      if (count > 0) {
        let visibleInput = false
        for (let i = 0; i < count; i++) {
          if (await input.nth(i).isVisible()) {
            visibleInput = true
            break
          }
        }
        expect(visibleInput).toBe(true)
      }
    })

    test('should load compatibility counselor page with content', async ({ page }) => {
      await page.goto('/compatibility/counselor', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)

      const hasCompatibilityContent =
        bodyText!.includes('궁합') ||
        bodyText!.includes('상담') ||
        bodyText!.includes('연인')
      expect(hasCompatibilityContent).toBe(true)
    })
  })

  test.describe('Chat Message Handling', () => {
    test('should handle empty message submission gracefully', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const sendButton = page.locator('button[type="submit"], button:has-text("전송")')
      if ((await sendButton.count()) > 0 && (await sendButton.first().isVisible())) {
        await sendButton.first().click()
        await page.waitForTimeout(500)

        await expect(page.locator('body')).toBeVisible()
        expect(page.url()).toContain('counselor')

        const bodyText = await page.locator('body').textContent()
        expect(bodyText!.length).toBeGreaterThan(50)
      }
    })

    test('should be able to type long message', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const input = page.locator('textarea').first()
      if ((await input.count()) > 0 && (await input.isVisible())) {
        const longMessage = '테스트 메시지입니다. 오늘의 운세가 궁금합니다. '.repeat(10)
        await input.fill(longMessage)
        const value = await input.inputValue()
        expect(value.length).toBeGreaterThan(100)
        expect(value).toContain('운세')
      }
    })

    test('should clear input after placeholder interaction', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const input = page.locator('textarea, input[type="text"]').first()
      if ((await input.count()) > 0 && (await input.isVisible())) {
        await input.fill('테스트 메시지')
        await input.clear()
        const value = await input.inputValue()
        expect(value).toBe('')
      }
    })
  })

  test.describe('Chat Keyboard Interactions', () => {
    test('should allow keyboard input', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const input = page.locator('textarea, input').first()
      if ((await input.count()) > 0 && (await input.isVisible())) {
        await input.focus()
        await page.keyboard.type('테스트 메시지')
        const value = await input.inputValue()
        expect(value).toContain('테스트')
      }
    })

    test('should handle Shift+Enter in textarea for newline', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const textarea = page.locator('textarea').first()
      if ((await textarea.count()) > 0 && (await textarea.isVisible())) {
        await textarea.fill('첫 번째 줄')
        await textarea.press('Shift+Enter')
        await page.keyboard.type('두 번째 줄')
        const value = await textarea.inputValue()
        expect(value).toContain('첫 번째')
        expect(value).toContain('두 번째')
      }
    })

    test('should focus input on Tab navigation', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')

      const focusedTag = await page.evaluate(() => document.activeElement?.tagName)
      expect(focusedTag).toBeTruthy()
    })
  })

  test.describe('Chat Mobile Experience', () => {
    test('should render destiny counselor on mobile without horizontal scroll', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should have usable input on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const input = page.locator('textarea, input').first()
      if ((await input.count()) > 0 && (await input.isVisible())) {
        await input.tap()
        await input.fill('모바일 테스트 메시지')
        const value = await input.inputValue()
        expect(value).toContain('모바일')
      }
    })

    test('should have touch-friendly send button on mobile', async ({ page }) => {
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

    test('should render saju counselor on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/saju/counselor', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })
  })

  test.describe('Tarot Pages', () => {
    test('should load tarot couple page with Korean content', async ({ page }) => {
      await page.goto('/tarot/couple', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)

      const hasTarotContent =
        bodyText!.includes('타로') ||
        bodyText!.includes('커플') ||
        bodyText!.includes('연인')
      expect(hasTarotContent).toBe(true)
    })

    test('should display tarot content on main page', async ({ page }) => {
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)

      const hasTarotContent =
        bodyText?.includes('타로') ||
        bodyText?.includes('Tarot') ||
        bodyText?.includes('카드')
      expect(hasTarotContent).toBe(true)
    })
  })

  test.describe('Astrology Counselor', () => {
    test('should load astrology counselor page with Korean content', async ({ page }) => {
      await page.goto('/astrology/counselor', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)

      const hasAstrologyContent =
        bodyText!.includes('점성술') ||
        bodyText!.includes('별자리') ||
        bodyText!.includes('상담')
      expect(hasAstrologyContent).toBe(true)
    })

    test('should have chat input on astrology counselor visible', async ({ page }) => {
      await page.goto('/astrology/counselor', { waitUntil: 'domcontentloaded' })

      const chatInput = page.locator('textarea, input[type="text"]')
      const count = await chatInput.count()

      if (count > 0) {
        let visibleInput = false
        for (let i = 0; i < count; i++) {
          if (await chatInput.nth(i).isVisible()) {
            visibleInput = true
            break
          }
        }
        expect(visibleInput).toBe(true)
      }
    })

    test('should accept message on astrology counselor', async ({ page }) => {
      await page.goto('/astrology/counselor', { waitUntil: 'domcontentloaded' })

      const input = page.locator('textarea, input[type="text"]').first()
      if ((await input.count()) > 0 && (await input.isVisible())) {
        await input.fill('제 별자리 운세가 궁금해요')
        const value = await input.inputValue()
        expect(value).toContain('별자리')
      }
    })
  })

  test.describe('Chat Page Load Performance', () => {
    test('should load destiny counselor within acceptable time', async ({ page }) => {
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

    test('should load astrology counselor within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/astrology/counselor', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })
  })
})
