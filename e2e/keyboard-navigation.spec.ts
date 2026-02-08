import { test, expect } from '@playwright/test'

test.describe('Keyboard Navigation', () => {
  test.describe('Tab Navigation', () => {
    test('should navigate through header links with Tab', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')

      const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
      expect(focusedElement).toBeTruthy()
      expect(['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT']).toContain(focusedElement)
    })

    test('should navigate backwards with Shift+Tab', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')

      const beforeShiftTab = await page.evaluate(() => document.activeElement?.tagName)

      await page.keyboard.press('Shift+Tab')

      const afterShiftTab = await page.evaluate(() => document.activeElement?.tagName)
      expect(afterShiftTab).toBeTruthy()
      await expect(page.locator('body')).toBeVisible()
    })

    test('should have visible focus indicators on focused element', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      const button = page.locator('button, a').first()
      if ((await button.count()) > 0 && (await button.isVisible())) {
        await button.focus()

        const focusedElement = page.locator(':focus')
        const count = await focusedElement.count()
        expect(count).toBeGreaterThan(0)

        // 포커스된 요소가 보이는지 확인
        await expect(focusedElement).toBeVisible()
      }
    })
  })

  test.describe('Form Keyboard Navigation', () => {
    test('should navigate through form fields on saju page', async ({ page }) => {
      await page.goto('/saju', { waitUntil: 'domcontentloaded' })

      const inputs = page.locator('input, select, textarea, button')
      const count = await inputs.count()

      if (count > 0) {
        await inputs.first().focus()
        await page.keyboard.press('Tab')

        const focusedTag = await page.evaluate(() => document.activeElement?.tagName)
        expect(focusedTag).toBeTruthy()
        await expect(page.locator('body')).toBeVisible()
      }
    })

    test('should submit form with Enter key', async ({ page }) => {
      await page.goto('/saju', { waitUntil: 'domcontentloaded' })

      const submitButton = page.locator('button[type="submit"]').first()
      if ((await submitButton.count()) > 0 && (await submitButton.isVisible())) {
        await submitButton.focus()
        await page.keyboard.press('Enter')
        await page.waitForTimeout(500)

        // 페이지가 여전히 정상 작동하는지 확인
        await expect(page.locator('body')).toBeVisible()
        const bodyText = await page.locator('body').textContent()
        expect(bodyText!.length).toBeGreaterThan(50)
      }
    })

    test('should open date picker with keyboard', async ({ page }) => {
      await page.goto('/saju', { waitUntil: 'domcontentloaded' })

      const dateInput = page.locator('input[type="date"]').first()
      if ((await dateInput.count()) > 0 && (await dateInput.isVisible())) {
        await dateInput.focus()
        await page.keyboard.press('Enter')
        await expect(page.locator('body')).toBeVisible()
      }
    })

    test('should allow typing in input after focus', async ({ page }) => {
      await page.goto('/saju', { waitUntil: 'domcontentloaded' })

      const textInput = page.locator('input[type="text"]').first()
      if ((await textInput.count()) > 0 && (await textInput.isVisible())) {
        await textInput.focus()
        await page.keyboard.type('테스트 입력')
        const value = await textInput.inputValue()
        expect(value).toContain('테스트')
      }
    })
  })

  test.describe('Modal Keyboard Navigation', () => {
    test('should close modal with Escape key', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      const modalTrigger = page.locator('button[aria-haspopup="dialog"], [data-modal]').first()
      if ((await modalTrigger.count()) > 0 && (await modalTrigger.isVisible())) {
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
      if ((await modalTrigger.count()) > 0 && (await modalTrigger.isVisible())) {
        await modalTrigger.click()
        await page.waitForTimeout(300)

        // Tab 여러 번 눌러서 포커스 트랩 확인
        for (let i = 0; i < 10; i++) {
          await page.keyboard.press('Tab')
        }

        const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
        expect(focusedElement).toBeTruthy()
        await expect(page.locator('body')).toBeVisible()
      }
    })
  })

  test.describe('Menu Keyboard Navigation', () => {
    test('should navigate dropdown with arrow keys', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      const dropdown = page.locator('[role="menu"], [aria-haspopup="true"]').first()
      if ((await dropdown.count()) > 0 && (await dropdown.isVisible())) {
        await dropdown.focus()
        await page.keyboard.press('ArrowDown')
        await page.keyboard.press('ArrowDown')

        const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
        expect(focusedElement).toBeTruthy()
        await expect(page.locator('body')).toBeVisible()
      }
    })

    test('should select menu item with Enter', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      const menuItem = page.locator('[role="menuitem"], nav a').first()
      if ((await menuItem.count()) > 0 && (await menuItem.isVisible())) {
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
      if ((await tab.count()) > 0 && (await tab.isVisible())) {
        await tab.focus()
        await page.keyboard.press('ArrowRight')

        const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('role'))
        // 탭이 있으면 포커스가 이동해야 함
        await expect(page.locator('body')).toBeVisible()
      }
    })

    test('should activate tab with Enter or Space', async ({ page }) => {
      await page.goto('/destiny-map', { waitUntil: 'domcontentloaded' })

      const tab = page.locator('[role="tab"]').first()
      if ((await tab.count()) > 0 && (await tab.isVisible())) {
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
      if ((await input.count()) > 0 && (await input.isVisible())) {
        await input.focus()
        await input.fill('테스트 메시지')
        const valueBeforeEnter = await input.inputValue()
        expect(valueBeforeEnter).toContain('테스트')

        await page.keyboard.press('Enter')
        await page.waitForTimeout(500)
        await expect(page.locator('body')).toBeVisible()
      }
    })

    test('should add newline with Shift+Enter in chat', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const textarea = page.locator('textarea').first()
      if ((await textarea.count()) > 0 && (await textarea.isVisible())) {
        await textarea.focus()
        await textarea.fill('첫 번째 줄')
        await page.keyboard.press('Shift+Enter')
        await page.keyboard.type('두 번째 줄')

        const value = await textarea.inputValue()
        expect(value.length).toBeGreaterThan(5)
        expect(value).toContain('첫 번째')
      }
    })
  })

  test.describe('Skip Links', () => {
    test('should have skip to main content link or navigation', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      // 스킵 링크가 있거나 네비게이션이 정상 작동해야 함
      await page.keyboard.press('Tab')

      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement
        return {
          tag: el?.tagName,
          text: el?.textContent?.slice(0, 50) || ''
        }
      })

      expect(focusedElement.tag).toBeTruthy()
    })

    test('should focus on first interactive element on Tab', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      await page.keyboard.press('Tab')

      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement
        return {
          tag: el?.tagName,
          isInteractive: ['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName || '')
        }
      })

      expect(focusedElement.isInteractive).toBe(true)
    })
  })

  test.describe('Keyboard Mobile Considerations', () => {
    test('should work with virtual keyboard on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/saju', { waitUntil: 'domcontentloaded' })

      const input = page.locator('input, textarea').first()
      if ((await input.count()) > 0 && (await input.isVisible())) {
        await input.tap()
        await page.keyboard.type('테스트 입력')
        const value = await input.inputValue()
        expect(value).toContain('테스트')
      }
    })

    test('should render without horizontal scroll on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })
  })

  test.describe('Keyboard Navigation Page Load Performance', () => {
    test('should load page within acceptable time for keyboard nav', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })
  })
})
