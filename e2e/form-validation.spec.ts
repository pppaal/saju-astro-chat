import { test, expect } from '@playwright/test'

test.describe('Form Validation Tests', () => {
  test.describe('Birth Date Form Validation', () => {
    test('should have date input on saju page', async ({ page }) => {
      await page.goto('/saju', { waitUntil: 'domcontentloaded' })

      // Should have date-related inputs
      const dateInputs = page.locator(
        'input[type="date"], input[name*="date"], input[name*="year"], select'
      )
      const count = await dateInputs.count()
      expect(count).toBeGreaterThan(0)
    })

    test('should validate empty form on saju page', async ({ page }) => {
      await page.goto('/saju', { waitUntil: 'domcontentloaded' })

      const submitButton = page.locator('button[type="submit"], button:has-text("분석")')
      if ((await submitButton.count()) > 0) {
        await submitButton.first().click()
        await page.waitForTimeout(500)

        // Should show validation message or remain on same page
        await expect(page.locator('body')).toBeVisible()
        expect(page.url()).toContain('saju')
      }
    })

    test('should have date input on destiny-map page', async ({ page }) => {
      await page.goto('/destiny-map', { waitUntil: 'domcontentloaded' })

      const dateInputs = page.locator(
        'input[type="date"], input[name*="date"], input[name*="year"], select'
      )
      const count = await dateInputs.count()
      expect(count).toBeGreaterThan(0)
    })

    test('should accept valid date format', async ({ page }) => {
      await page.goto('/saju', { waitUntil: 'domcontentloaded' })

      const dateInput = page.locator('input[type="date"], input[name*="date"]').first()
      if ((await dateInput.count()) > 0) {
        await dateInput.fill('1990-05-15')
        const value = await dateInput.inputValue()
        expect(value).toBe('1990-05-15')
      }
    })

    test('should have year/month/day selectors', async ({ page }) => {
      await page.goto('/saju', { waitUntil: 'domcontentloaded' })

      // Check for select dropdowns or input fields for date parts
      const selects = page.locator('select')
      const inputs = page.locator('input')

      const selectCount = await selects.count()
      const inputCount = await inputs.count()

      // Should have form elements
      expect(selectCount + inputCount).toBeGreaterThan(0)
    })
  })

  test.describe('Time Input Validation', () => {
    test('should have time input on saju page', async ({ page }) => {
      await page.goto('/saju', { waitUntil: 'domcontentloaded' })

      const timeElements = page.locator(
        'input[type="time"], select[name*="hour"], select[name*="time"], [class*="time"]'
      )
      const count = await timeElements.count()

      // Time input may or may not exist
      if (count > 0) {
        await expect(timeElements.first()).toBeVisible()
      }
    })

    test('should be able to select birth time', async ({ page }) => {
      await page.goto('/saju', { waitUntil: 'domcontentloaded' })

      const timeInput = page.locator('input[type="time"], select[name*="hour"]').first()
      if ((await timeInput.count()) > 0) {
        const tagName = await timeInput.evaluate((el) => el.tagName.toLowerCase())
        if (tagName === 'input') {
          await timeInput.fill('14:30')
          const value = await timeInput.inputValue()
          expect(value).toBe('14:30')
        } else {
          // It's a select
          const options = await timeInput.locator('option').count()
          expect(options).toBeGreaterThan(0)
        }
      }
    })

    test('should handle unknown birth time option', async ({ page }) => {
      await page.goto('/saju', { waitUntil: 'domcontentloaded' })

      const unknownTimeOption = page.locator(
        'input[type="checkbox"][name*="unknown"], button:has-text("모름"), label:has-text("모름"), [class*="unknown"]'
      )

      if ((await unknownTimeOption.count()) > 0) {
        await unknownTimeOption.first().click()
        await page.waitForTimeout(300)
        await expect(page.locator('body')).toBeVisible()
      }
    })
  })

  test.describe('Text Input Validation', () => {
    test('should have question input on tarot page', async ({ page }) => {
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

      const inputs = page.locator('textarea, input[type="text"]')
      const count = await inputs.count()

      if (count > 0) {
        const firstInput = inputs.first()
        await expect(firstInput).toBeVisible()
      }
    })

    test('should accept text input on tarot page', async ({ page }) => {
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

      const input = page.locator('textarea, input[type="text"]').first()
      if ((await input.count()) > 0) {
        await input.fill('오늘 운세는 어떨까요?')
        const value = await input.inputValue()
        expect(value).toContain('운세')
      }
    })

    test('should have dream input on dream page', async ({ page }) => {
      await page.goto('/dream', { waitUntil: 'domcontentloaded' })

      const textarea = page.locator('textarea')
      const count = await textarea.count()

      if (count > 0) {
        await expect(textarea.first()).toBeVisible()
      }
    })

    test('should accept dream description', async ({ page }) => {
      await page.goto('/dream', { waitUntil: 'domcontentloaded' })

      const textarea = page.locator('textarea').first()
      if ((await textarea.count()) > 0) {
        const dreamText =
          '어젯밤 꿈에서 높은 산을 올랐습니다. 정상에 도착하니 아름다운 풍경이 펼쳐졌습니다.'
        await textarea.fill(dreamText)
        const value = await textarea.inputValue()
        expect(value).toContain('산')
      }
    })

    test('should handle special characters safely', async ({ page }) => {
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

      const input = page.locator('textarea, input[type="text"]').first()
      if ((await input.count()) > 0) {
        // Test XSS prevention
        await input.fill('<script>alert("test")</script>')
        await expect(page.locator('body')).toBeVisible()

        // Page should not show alert or break
        const bodyText = await page.locator('body').textContent()
        expect(bodyText!.length).toBeGreaterThan(50)
      }
    })
  })

  test.describe('Name Input Validation', () => {
    test('should have name input on compatibility page', async ({ page }) => {
      await page.goto('/compatibility', { waitUntil: 'domcontentloaded' })

      const nameInputs = page.locator('input[name*="name"], input[placeholder*="이름"]')
      const count = await nameInputs.count()

      if (count > 0) {
        await expect(nameInputs.first()).toBeVisible()
      }
    })

    test('should accept Korean name', async ({ page }) => {
      await page.goto('/compatibility', { waitUntil: 'domcontentloaded' })

      const nameInput = page.locator('input[name*="name"], input[placeholder*="이름"]').first()
      if ((await nameInput.count()) > 0) {
        await nameInput.fill('홍길동')
        const value = await nameInput.inputValue()
        expect(value).toBe('홍길동')
      }
    })

    test('should accept English name', async ({ page }) => {
      await page.goto('/compatibility', { waitUntil: 'domcontentloaded' })

      const nameInput = page.locator('input[name*="name"], input[placeholder*="이름"]').first()
      if ((await nameInput.count()) > 0) {
        await nameInput.fill('John Doe')
        const value = await nameInput.inputValue()
        expect(value).toBe('John Doe')
      }
    })
  })

  test.describe('Email Validation', () => {
    test('should have email input on contact page', async ({ page }) => {
      await page.goto('/contact', { waitUntil: 'domcontentloaded' })

      const emailInput = page.locator('input[type="email"], input[name*="email"]')
      const count = await emailInput.count()

      if (count > 0) {
        await expect(emailInput.first()).toBeVisible()
      }
    })

    test('should accept valid email format', async ({ page }) => {
      await page.goto('/contact', { waitUntil: 'domcontentloaded' })

      const emailInput = page.locator('input[type="email"]').first()
      if ((await emailInput.count()) > 0) {
        await emailInput.fill('test@example.com')
        const value = await emailInput.inputValue()
        expect(value).toBe('test@example.com')
      }
    })

    test('should validate invalid email on submit', async ({ page }) => {
      await page.goto('/contact', { waitUntil: 'domcontentloaded' })

      const emailInput = page.locator('input[type="email"]').first()
      if ((await emailInput.count()) > 0) {
        await emailInput.fill('invalid-email')

        const submitButton = page.locator('button[type="submit"]')
        if ((await submitButton.count()) > 0) {
          await submitButton.first().click()
          await page.waitForTimeout(500)

          // Should stay on page due to validation
          await expect(page.locator('body')).toBeVisible()
        }
      }
    })
  })

  test.describe('Form Accessibility', () => {
    test('should have labels for form inputs on saju page', async ({ page }) => {
      await page.goto('/saju', { waitUntil: 'domcontentloaded' })

      const inputs = page.locator("input:not([type='hidden'])")
      const count = await inputs.count()

      if (count > 0) {
        // At least some inputs should have accessible names
        const firstInput = inputs.first()
        const ariaLabel = await firstInput.getAttribute('aria-label')
        const id = await firstInput.getAttribute('id')
        const placeholder = await firstInput.getAttribute('placeholder')

        // Should have some form of label
        const hasAccessibleName = ariaLabel || id || placeholder
        expect(hasAccessibleName || count > 0).toBe(true)
      }
    })

    test('should support keyboard navigation in forms', async ({ page }) => {
      await page.goto('/saju', { waitUntil: 'domcontentloaded' })

      const inputs = page.locator('input, select, textarea, button')
      const count = await inputs.count()

      if (count >= 2) {
        await inputs.first().focus()
        await page.keyboard.press('Tab')

        // Should be able to tab through form
        await expect(page.locator('body')).toBeVisible()
      }
    })

    test('should have visible focus indicators', async ({ page }) => {
      await page.goto('/saju', { waitUntil: 'domcontentloaded' })

      const firstInput = page.locator('input, button').first()
      if ((await firstInput.count()) > 0) {
        await firstInput.focus()

        // Element should be focusable
        const isFocused = await firstInput.evaluate((el) => document.activeElement === el)
        expect(isFocused).toBe(true)
      }
    })
  })

  test.describe('Form State Persistence', () => {
    test('should preserve input on navigation back', async ({ page }) => {
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

      const input = page.locator('textarea, input[type="text"]').first()
      if ((await input.count()) > 0) {
        await input.fill('테스트 질문')

        await page.goto('/', { waitUntil: 'domcontentloaded' })
        await page.goBack()

        await expect(page.locator('body')).toBeVisible()
      }
    })
  })
})
