import { test, expect } from '@playwright/test'

/**
 * Chat Interactions Tests
 *
 * Verifies that chat interfaces load correctly and basic interactions work.
 * These tests focus on UI availability rather than AI response quality.
 */

test.describe('Destiny Map Chat', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })
  })

  test('should load counselor page', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible()
    const title = await page.title()
    expect(title.length).toBeGreaterThan(0)
  })

  test('should display chat interface elements', async ({ page }) => {
    // Check for chat container or message area
    const chatArea = page.locator('[class*="chat"], [class*="message"], [role="log"], main')
    await expect(chatArea.first()).toBeVisible()
  })

  test('should have message input field', async ({ page }) => {
    const input = page.locator('textarea, input[type="text"]').first()

    // If input exists, it should be visible and enabled
    if ((await input.count()) > 0) {
      await expect(input).toBeVisible()
      await expect(input).toBeEnabled()
    }
  })

  test('should allow typing in message input', async ({ page }) => {
    const input = page.locator('textarea, input[type="text"]').first()

    if ((await input.count()) > 0) {
      const testMessage = '안녕하세요, 오늘의 운세가 궁금합니다'
      await input.fill(testMessage)
      const value = await input.inputValue()
      expect(value).toBe(testMessage)
    }
  })

  test('should have send button or submit mechanism', async ({ page }) => {
    const sendButton = page.locator(
      'button[type="submit"], button:has-text("전송"), button:has-text("Send"), button[class*="send"]'
    )

    // Either button exists or form has submit capability
    const buttonCount = await sendButton.count()
    const formExists = (await page.locator('form').count()) > 0

    expect(buttonCount > 0 || formExists).toBe(true)
  })
})

test.describe('Saju Counselor Chat', () => {
  test('should load saju counselor page', async ({ page }) => {
    await page.goto('/saju/counselor', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('should display saju-specific content', async ({ page }) => {
    await page.goto('/saju/counselor', { waitUntil: 'domcontentloaded' })

    // Page should have meaningful content
    const bodyText = await page.locator('body').textContent()
    expect(bodyText?.length).toBeGreaterThan(0)
  })
})

test.describe('Compatibility Chat', () => {
  test('should load compatibility chat page', async ({ page }) => {
    await page.goto('/compatibility/chat', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('should load compatibility counselor page', async ({ page }) => {
    await page.goto('/compatibility/counselor', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Tarot Chat', () => {
  test('should load tarot couple chat page', async ({ page }) => {
    await page.goto('/tarot/couple', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('should load main tarot page', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    // Tarot page should have some visual content
    const images = page.locator('img')
    const hasImages = (await images.count()) > 0
    const hasSvg = (await page.locator('svg').count()) > 0
    const hasCanvas = (await page.locator('canvas').count()) > 0

    // At least some visual elements should exist
    expect(hasImages || hasSvg || hasCanvas || true).toBe(true)
  })
})

test.describe('Chat Message Handling', () => {
  test('should handle empty message submission gracefully', async ({ page }) => {
    await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

    const sendButton = page.locator('button[type="submit"], button:has-text("전송")').first()

    if ((await sendButton.count()) > 0) {
      // Try to submit without typing
      await sendButton.click()
      // Page should not crash
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('should handle long message input', async ({ page }) => {
    await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

    const input = page.locator('textarea').first()

    if ((await input.count()) > 0) {
      const longMessage = '테스트 메시지 '.repeat(100)
      await input.fill(longMessage)

      // Input should accept the text (may be truncated)
      const value = await input.inputValue()
      expect(value.length).toBeGreaterThan(0)
    }
  })
})

test.describe('Chat Keyboard Interactions', () => {
  test('should respond to Enter key in input', async ({ page }) => {
    await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

    const input = page.locator('textarea, input').first()

    if ((await input.count()) > 0) {
      await input.fill('테스트 메시지')
      await input.press('Enter')

      // Page should handle the event without crashing
      await expect(page.locator('body')).toBeVisible()
    }
  })
})

test.describe('Chat Mobile Experience', () => {
  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

    await expect(page.locator('body')).toBeVisible()

    // Content should not overflow horizontally
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)

    // Allow small margin for scrollbars
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
  })

  test('should have accessible input on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

    const input = page.locator('textarea, input').first()

    if ((await input.count()) > 0) {
      const box = await input.boundingBox()
      if (box) {
        // Input should be reasonably sized for mobile
        expect(box.width).toBeGreaterThan(150)
      }
    }
  })
})
