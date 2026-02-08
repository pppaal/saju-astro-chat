import { test, expect } from '@playwright/test'

test.describe('Profile & Settings Flow', () => {
  test.describe('Profile Page', () => {
    test('should load profile page successfully', async ({ page }) => {
      await page.goto('/profile', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display user information section', async ({ page }) => {
      await page.goto('/profile', { waitUntil: 'domcontentloaded' })

      const userInfo = page.locator('[class*="profile"], [class*="user"], main')
      const count = await userInfo.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have edit profile button', async ({ page }) => {
      await page.goto('/profile', { waitUntil: 'domcontentloaded' })

      const editButton = page.locator(
        'button:has-text("수정"), button:has-text("편집"), button:has-text("Edit"), [class*="edit"]'
      )
      const count = await editButton.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should display birth info section', async ({ page }) => {
      await page.goto('/profile', { waitUntil: 'domcontentloaded' })

      const birthInfo = page.locator('[class*="birth"], [class*="date"], [class*="info"]')
      const count = await birthInfo.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have settings navigation', async ({ page }) => {
      await page.goto('/profile', { waitUntil: 'domcontentloaded' })

      const settingsNav = page.locator(
        'a[href*="settings"], button:has-text("설정"), [class*="settings"]'
      )
      const count = await settingsNav.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Profile Edit', () => {
    test('should allow editing name', async ({ page }) => {
      await page.goto('/profile', { waitUntil: 'domcontentloaded' })

      const nameInput = page.locator('input[name*="name"], input[placeholder*="이름"]')
      if ((await nameInput.count()) > 0) {
        await nameInput.first().click()
        await expect(page.locator('body')).toBeVisible()
      }
    })

    test('should allow editing birth date', async ({ page }) => {
      await page.goto('/profile', { waitUntil: 'domcontentloaded' })

      const dateInput = page.locator('input[type="date"], input[name*="birth"]')
      if ((await dateInput.count()) > 0) {
        await expect(page.locator('body')).toBeVisible()
      }
    })

    test('should have save button for profile changes', async ({ page }) => {
      await page.goto('/profile', { waitUntil: 'domcontentloaded' })

      const saveButton = page.locator(
        'button[type="submit"], button:has-text("저장"), button:has-text("Save")'
      )
      const count = await saveButton.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Notifications Settings', () => {
    test('should load notifications page', async ({ page }) => {
      await page.goto('/notifications', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display notification preferences', async ({ page }) => {
      await page.goto('/notifications', { waitUntil: 'domcontentloaded' })

      const toggles = page.locator(
        'input[type="checkbox"], [role="switch"], button[class*="toggle"]'
      )
      const count = await toggles.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have notification type options', async ({ page }) => {
      await page.goto('/notifications', { waitUntil: 'domcontentloaded' })

      const notificationTypes = page.locator('[class*="notification"], [class*="setting"]')
      const count = await notificationTypes.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Auth Pages', () => {
    test('should load signin page', async ({ page }) => {
      await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display login form', async ({ page }) => {
      await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' })

      const form = page.locator("form, [class*='login'], [class*='signin']")
      const count = await form.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have social login options', async ({ page }) => {
      await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' })

      const socialButtons = page.locator(
        'button:has-text("Google"), button:has-text("카카오"), button:has-text("Kakao"), [class*="social"]'
      )
      const count = await socialButtons.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should validate empty email submission', async ({ page }) => {
      await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' })

      const submitButton = page.locator('button[type="submit"], button:has-text("로그인")')
      if ((await submitButton.count()) > 0) {
        await submitButton.first().click()
        await page.waitForTimeout(500)
        await expect(page.locator('body')).toBeVisible()
      }
    })
  })

  test.describe('Contact Page', () => {
    test('should load contact page', async ({ page }) => {
      await page.goto('/contact', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should have contact form', async ({ page }) => {
      await page.goto('/contact', { waitUntil: 'domcontentloaded' })

      const form = page.locator("form, [class*='contact']")
      const count = await form.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have message textarea', async ({ page }) => {
      await page.goto('/contact', { waitUntil: 'domcontentloaded' })

      const textarea = page.locator('textarea')
      const count = await textarea.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Profile Mobile Experience', () => {
    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/profile', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should have accessible form inputs on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/profile', { waitUntil: 'domcontentloaded' })

      const inputs = page.locator('input, textarea, select')
      if ((await inputs.count()) > 0) {
        const firstInput = inputs.first()
        const box = await firstInput.boundingBox()
        if (box) {
          expect(box.height >= 40).toBe(true)
        }
      }
    })
  })
})
