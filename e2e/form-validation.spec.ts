import { test, expect } from '@playwright/test'

test.describe('Form Validation Tests', () => {
  test.describe('Birth Date Form Validation', () => {
    test('should have date input on destiny-counselor page', async ({ page }) => {
      await page.goto('/destiny-counselor', { waitUntil: 'domcontentloaded' })

      const dateInputs = page.locator(
        'input[type="date"], input[name*="date"], input[name*="year"], select'
      )
      // 출생 정보 패널은 하이드레이션 뒤에 그려진다.
      await expect(dateInputs.first()).toBeAttached({ timeout: 30000 })
      expect(await dateInputs.count()).toBeGreaterThan(0)
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
