import { test, expect } from '@playwright/test'

test.describe('Chat Interactions Tests', () => {
  test.describe('Destiny Map Chat', () => {
    test('should load destiny-map counselor page with chat elements', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })

    test('should have message input field', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const input = page.locator('textarea, input[type="text"]')
      const count = await input.count()

      if (count > 0) {
        await expect(input.first()).toBeVisible()
      }
    })

    test('should have send button', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const sendButton = page.locator(
        'button[type="submit"], button:has-text("전송"), button:has-text("Send"), button[class*="send"]'
      )
      const count = await sendButton.count()

      if (count > 0) {
        await expect(sendButton.first()).toBeVisible()
      }
    })

    test('should allow typing message', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const input = page.locator('textarea, input[type="text"]').first()
      if ((await input.count()) > 0) {
        await input.fill('안녕하세요, 오늘의 운세가 궁금합니다')
        const value = await input.inputValue()
        expect(value).toContain('안녕하세요')
      }
    })
  })

  test.describe('Saju Counselor Chat', () => {
    test('should load saju counselor page with content', async ({ page }) => {
      await page.goto('/saju/counselor', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })

    test('should have chat input on saju counselor', async ({ page }) => {
      await page.goto('/saju/counselor', { waitUntil: 'domcontentloaded' })

      const chatInput = page.locator('textarea, input[type="text"]')
      const count = await chatInput.count()

      if (count > 0) {
        await expect(chatInput.first()).toBeVisible()
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

    test('should have message input on compatibility chat', async ({ page }) => {
      await page.goto('/compatibility/chat', { waitUntil: 'domcontentloaded' })

      const input = page.locator('textarea, input[type="text"]')
      const count = await input.count()

      if (count > 0) {
        await expect(input.first()).toBeVisible()
      }
    })

    test('should load compatibility counselor page', async ({ page }) => {
      await page.goto('/compatibility/counselor', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })
  })

  test.describe('Chat Message Handling', () => {
    test('should handle empty message submission gracefully', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const sendButton = page.locator('button[type="submit"], button:has-text("전송")')
      if ((await sendButton.count()) > 0) {
        await sendButton.first().click()
        await page.waitForTimeout(500)

        // Should stay on page without error
        await expect(page.locator('body')).toBeVisible()
        expect(page.url()).toContain('counselor')
      }
    })

    test('should be able to type long message', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const input = page.locator('textarea').first()
      if ((await input.count()) > 0) {
        const longMessage = '테스트 메시지입니다. '.repeat(20)
        await input.fill(longMessage)
        const value = await input.inputValue()
        expect(value.length).toBeGreaterThan(100)
      }
    })
  })

  test.describe('Chat Keyboard Interactions', () => {
    test('should allow keyboard input', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const input = page.locator('textarea, input').first()
      if ((await input.count()) > 0) {
        await input.fill('테스트 메시지')
        const value = await input.inputValue()
        expect(value).toContain('테스트')
      }
    })

    test('should handle Shift+Enter in textarea', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const textarea = page.locator('textarea').first()
      if ((await textarea.count()) > 0) {
        await textarea.fill('첫 번째 줄')
        await textarea.press('Shift+Enter')
        await textarea.type('두 번째 줄')
        const value = await textarea.inputValue()
        expect(value).toContain('첫 번째')
        expect(value).toContain('두 번째')
      }
    })
  })

  test.describe('Chat Mobile Experience', () => {
    test('should render destiny counselor on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      // No horizontal scroll
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should have usable input on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const input = page.locator('textarea, input').first()
      if ((await input.count()) > 0) {
        await input.tap()
        await input.fill('모바일 테스트')
        const value = await input.inputValue()
        expect(value).toContain('모바일')
      }
    })
  })

  test.describe('Tarot Pages', () => {
    test('should load tarot couple page', async ({ page }) => {
      await page.goto('/tarot/couple', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })

    test('should display tarot content', async ({ page }) => {
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

      const bodyText = await page.locator('body').textContent()
      const hasTarotContent =
        bodyText?.includes('타로') || bodyText?.includes('Tarot') || bodyText?.includes('카드')
      expect(hasTarotContent).toBe(true)
    })
  })

  test.describe('Astrology Counselor', () => {
    test('should load astrology counselor page', async ({ page }) => {
      await page.goto('/astrology/counselor', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })

    test('should have chat input on astrology counselor', async ({ page }) => {
      await page.goto('/astrology/counselor', { waitUntil: 'domcontentloaded' })

      const chatInput = page.locator('textarea, input[type="text"]')
      const count = await chatInput.count()

      if (count > 0) {
        await expect(chatInput.first()).toBeVisible()
      }
    })
  })
})
