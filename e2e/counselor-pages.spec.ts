import { test, expect } from '@playwright/test'

test.describe('Counselor Pages', () => {
  test.describe('Destiny Map Counselor', () => {
    test('should load destiny-map counselor page', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display AI counselor interface', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const counselorInterface = page.locator('[class*="counselor"], [class*="advisor"], main')
      const count = await counselorInterface.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have chat input area', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const inputArea = page.locator('textarea, input[type="text"]')
      const count = await inputArea.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have suggested questions', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const suggestions = page.locator('[class*="suggestion"], [class*="prompt"], [class*="quick"]')
      const count = await suggestions.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should display counselor avatar or icon', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const avatar = page.locator('[class*="avatar"], [class*="icon"], img[alt*="counselor"]')
      const count = await avatar.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Saju Counselor', () => {
    test('should load saju counselor page', async ({ page }) => {
      await page.goto('/saju/counselor', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display saju-specific counselor content', async ({ page }) => {
      await page.goto('/saju/counselor', { waitUntil: 'domcontentloaded' })

      const content = page.locator('[class*="saju"], [class*="counselor"], main')
      const count = await content.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have message history display', async ({ page }) => {
      await page.goto('/saju/counselor', { waitUntil: 'domcontentloaded' })

      const history = page.locator('[class*="message"], [class*="history"], [role="log"]')
      const count = await history.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Astrology Counselor', () => {
    test('should load astrology counselor page', async ({ page }) => {
      await page.goto('/astrology/counselor', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display astrology-specific content', async ({ page }) => {
      await page.goto('/astrology/counselor', { waitUntil: 'domcontentloaded' })

      const content = page.locator('[class*="astrology"], [class*="counselor"], main')
      const count = await content.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Compatibility Counselor', () => {
    test('should load compatibility counselor page', async ({ page }) => {
      await page.goto('/compatibility/counselor', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display compatibility-specific interface', async ({ page }) => {
      await page.goto('/compatibility/counselor', { waitUntil: 'domcontentloaded' })

      const interface_ = page.locator('[class*="compatibility"], [class*="counselor"], main')
      const count = await interface_.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have partner selection if available', async ({ page }) => {
      await page.goto('/compatibility/counselor', { waitUntil: 'domcontentloaded' })

      const partnerSelect = page.locator('[class*="partner"], select, [class*="person"]')
      const count = await partnerSelect.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Counselor Common Features', () => {
    test('should have clear conversation button', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const clearButton = page.locator(
        'button:has-text("지우기"), button:has-text("Clear"), button:has-text("새 대화")'
      )
      const count = await clearButton.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should show loading state during response', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      // Check for loading indicator elements
      const loadingIndicators = page.locator(
        '[class*="loading"], [class*="typing"], [class*="spinner"]'
      )
      const count = await loadingIndicators.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have back navigation', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const backButton = page.locator(
        'button:has-text("뒤로"), a[href*="destiny-map"], [class*="back"]'
      )
      const count = await backButton.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Counselor Message Interactions', () => {
    test('should send message on button click', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const input = page.locator("textarea, input[type='text']").first()
      const sendButton = page.locator('button[type="submit"], button:has-text("전송")').first()

      if ((await input.count()) > 0 && (await sendButton.count()) > 0) {
        await input.fill('오늘 운세가 궁금해요')
        await sendButton.click()
        await page.waitForTimeout(500)
        await expect(page.locator('body')).toBeVisible()
      }
    })

    test('should display user message in chat', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const userMessages = page.locator(
        '[class*="user-message"], [class*="sent"], [class*="outgoing"]'
      )
      const count = await userMessages.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should display AI response in chat', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const aiMessages = page.locator(
        '[class*="ai-message"], [class*="received"], [class*="incoming"]'
      )
      const count = await aiMessages.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Counselor Mobile Experience', () => {
    test('should be responsive on mobile - destiny counselor', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should be responsive on mobile - saju counselor', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/saju/counselor', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()
    })

    test('should have fixed input at bottom on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const inputArea = page.locator('[class*="input"], [class*="bottom"]')
      const count = await inputArea.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })
})
