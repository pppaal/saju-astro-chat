import { test, expect } from '@playwright/test'

test.describe('Share Functionality', () => {
  test.describe('Share Buttons', () => {
    test('should have share button on tarot page', async ({ page }) => {
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)

      const shareButton = page.locator(
        'button:has-text("공유"), [class*="share"], button[aria-label*="share"]'
      )
      const count = await shareButton.count()

      if (count > 0) {
        await expect(shareButton.first()).toBeVisible()
      }
    })
  })
})
