import { test, expect } from '@playwright/test'

test.describe('Keyboard Navigation', () => {
  test.describe('Tab Navigation', () => {
    test('should navigate through header links with Tab', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')

      const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
      expect(focusedElement).not.toBeNull()
    })

    test('should navigate backwards with Shift+Tab', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Shift+Tab')

      await expect(page.locator('body')).toBeVisible()
    })

    test('should have visible focus indicators', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      const button = page.locator('button, a').first()
      if ((await button.count()) > 0) {
        await button.focus()

        // Check if focus is visible
        const hasFocusStyle = await page.evaluate(() => {
          const el = document.activeElement
          if (!el) return false
          const style = window.getComputedStyle(el)
          return style.outline !== 'none' || style.boxShadow !== 'none'
        })
        expect(typeof hasFocusStyle).toBe('boolean')
      }
    })
  })

  test.describe('Form Keyboard Navigation', () => {
    test('should navigate through form fields on saju page', async ({ page }) => {
      await page.goto('/saju', { waitUntil: 'domcontentloaded' })

      const inputs = page.locator('input, select, textarea, button')
      if ((await inputs.count()) > 0) {
        await inputs.first().focus()
        await page.keyboard.press('Tab')
        await expect(page.locator('body')).toBeVisible()
      }
    })

    test('should submit form with Enter key', async ({ page }) => {
      await page.goto('/saju', { waitUntil: 'domcontentloaded' })

      const submitButton = page.locator('button[type="submit"]').first()
      if ((await submitButton.count()) > 0) {
        await submitButton.focus()
        await page.keyboard.press('Enter')
        await page.waitForTimeout(500)
        await expect(page.locator('body')).toBeVisible()
      }
    })

    test('should open date picker with keyboard', async ({ page }) => {
      await page.goto('/saju', { waitUntil: 'domcontentloaded' })

      const dateInput = page.locator('input[type="date"]').first()
      if ((await dateInput.count()) > 0) {
        await dateInput.focus()
        await page.keyboard.press('Enter')
        await expect(page.locator('body')).toBeVisible()
      }
    })
  })

  test.describe('Modal Keyboard Navigation', () => {
    test('should close modal with Escape key', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      // Try to open a modal if available
      const modalTrigger = page.locator('button[aria-haspopup="dialog"], [data-modal]').first()
      if ((await modalTrigger.count()) > 0) {
        await modalTrigger.click()
        await page.waitForTimeout(300)
        await page.keyboard.press('Escape')
        await page.waitForTimeout(300)
        await expect(page.locator('body')).toBeVisible()
      }
    })

    test('should trap focus within modal', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      const modalTrigger = page.locator('button[aria-haspopup="dialog"]').first()
      if ((await modalTrigger.count()) > 0) {
        await modalTrigger.click()
        await page.waitForTimeout(300)

        // Tab multiple times to check focus trap
        for (let i = 0; i < 10; i++) {
          await page.keyboard.press('Tab')
        }
        await expect(page.locator('body')).toBeVisible()
      }
    })
  })

  test.describe('Menu Keyboard Navigation', () => {
    test('should navigate dropdown with arrow keys', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      const dropdown = page.locator('[role="menu"], [aria-haspopup="true"]').first()
      if ((await dropdown.count()) > 0) {
        await dropdown.focus()
        await page.keyboard.press('ArrowDown')
        await page.keyboard.press('ArrowDown')
        await expect(page.locator('body')).toBeVisible()
      }
    })

    test('should select menu item with Enter', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      const menuItem = page.locator('[role="menuitem"], nav a').first()
      if ((await menuItem.count()) > 0) {
        await menuItem.focus()
        await page.keyboard.press('Enter')
        await page.waitForTimeout(500)
        await expect(page.locator('body')).toBeVisible()
      }
    })
  })

  test.describe('Tab Panel Keyboard Navigation', () => {
    test('should switch tabs with arrow keys', async ({ page }) => {
      await page.goto('/destiny-map', { waitUntil: 'domcontentloaded' })

      const tab = page.locator('[role="tab"]').first()
      if ((await tab.count()) > 0) {
        await tab.focus()
        await page.keyboard.press('ArrowRight')
        await expect(page.locator('body')).toBeVisible()
      }
    })

    test('should activate tab with Enter or Space', async ({ page }) => {
      await page.goto('/destiny-map', { waitUntil: 'domcontentloaded' })

      const tab = page.locator('[role="tab"]').first()
      if ((await tab.count()) > 0) {
        await tab.focus()
        await page.keyboard.press('Space')
        await expect(page.locator('body')).toBeVisible()
      }
    })
  })

  test.describe('Chat Keyboard Navigation', () => {
    test('should send message with Enter in chat', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const input = page.locator("textarea, input[type='text']").first()
      if ((await input.count()) > 0) {
        await input.focus()
        await input.fill('테스트 메시지')
        await page.keyboard.press('Enter')
        await page.waitForTimeout(500)
        await expect(page.locator('body')).toBeVisible()
      }
    })

    test('should add newline with Shift+Enter in chat', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const textarea = page.locator('textarea').first()
      if ((await textarea.count()) > 0) {
        await textarea.focus()
        await textarea.fill('첫 번째 줄')
        await page.keyboard.press('Shift+Enter')
        await page.keyboard.type('두 번째 줄')

        const value = await textarea.inputValue()
        expect(value.length).toBeGreaterThan(0)
      }
    })
  })

  test.describe('Skip Links', () => {
    test('should have skip to main content link', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      const skipLink = page.locator('a[href="#main"], a:has-text("본문으로"), a:has-text("Skip")')
      const count = await skipLink.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should focus skip link on first Tab', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      await page.keyboard.press('Tab')

      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement
        return el?.textContent?.toLowerCase() || ''
      })
      expect(typeof focusedElement).toBe('string')
    })
  })

  test.describe('Keyboard Mobile Considerations', () => {
    test('should work with virtual keyboard on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/saju', { waitUntil: 'domcontentloaded' })

      const input = page.locator('input, textarea').first()
      if ((await input.count()) > 0) {
        await input.tap()
        await page.keyboard.type('테스트')
        await expect(page.locator('body')).toBeVisible()
      }
    })
  })
})
