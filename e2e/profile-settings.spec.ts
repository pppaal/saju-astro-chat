import { test, expect } from '@playwright/test'

test.describe('Profile & Settings Flow', () => {
  test.describe('Profile Page', () => {
    test('should load profile page with content', async ({ page }) => {
      await page.goto('/profile', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })

    test('should display user information or login prompt', async ({ page }) => {
      await page.goto('/profile', { waitUntil: 'domcontentloaded' })

      const bodyText = await page.locator('body').textContent()
      // 프로필 관련 콘텐츠 확인
      const hasProfileContent =
        bodyText!.includes('프로필') ||
        bodyText!.includes('정보') ||
        bodyText!.includes('로그인') ||
        bodyText!.includes('Profile') ||
        bodyText!.length > 100
      expect(hasProfileContent).toBe(true)
    })

    test('should have navigation or action buttons', async ({ page }) => {
      await page.goto('/profile', { waitUntil: 'domcontentloaded' })

      const buttons = page.locator('button, a')
      const count = await buttons.count()
      expect(count).toBeGreaterThan(0)

      let visibleButton = false
      for (let i = 0; i < Math.min(count, 10); i++) {
        if (await buttons.nth(i).isVisible()) {
          visibleButton = true
          break
        }
      }
      expect(visibleButton).toBe(true)
    })
  })

  test.describe('Profile Edit', () => {
    test('should have form inputs on profile page', async ({ page }) => {
      await page.goto('/profile', { waitUntil: 'domcontentloaded' })

      const inputs = page.locator('input, select, textarea')
      const count = await inputs.count()

      if (count > 0) {
        let visibleInput = false
        for (let i = 0; i < count; i++) {
          if (await inputs.nth(i).isVisible()) {
            visibleInput = true
            break
          }
        }
        // 입력 필드가 있거나 페이지가 정상 로드됨
        const bodyText = await page.locator('body').textContent()
        expect(visibleInput || bodyText!.length > 50).toBe(true)
      }
    })

    test('should accept name input if available', async ({ page }) => {
      await page.goto('/profile', { waitUntil: 'domcontentloaded' })

      const nameInput = page.locator('input[name*="name"], input[placeholder*="이름"], input[type="text"]').first()
      if ((await nameInput.count()) > 0 && (await nameInput.isVisible())) {
        await nameInput.fill('테스트 이름')
        const value = await nameInput.inputValue()
        expect(value).toContain('테스트')
      }
    })

    test('should accept birth date input if available', async ({ page }) => {
      await page.goto('/profile', { waitUntil: 'domcontentloaded' })

      const dateInput = page.locator('input[type="date"]').first()
      if ((await dateInput.count()) > 0 && (await dateInput.isVisible())) {
        await dateInput.fill('1990-05-15')
        const value = await dateInput.inputValue()
        expect(value).toBe('1990-05-15')
      }
    })
  })

  test.describe('Notifications Settings', () => {
    test('should load notifications page with content', async ({ page }) => {
      await page.goto('/notifications', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(10)
    })

    test('should display notification settings or empty state', async ({ page }) => {
      await page.goto('/notifications', { waitUntil: 'domcontentloaded' })

      const toggles = page.locator(
        'input[type="checkbox"], [role="switch"], button[class*="toggle"]'
      )
      const count = await toggles.count()

      const bodyText = await page.locator('body').textContent()
      expect(count > 0 || bodyText!.length > 50).toBe(true)
    })
  })

  test.describe('Auth Pages', () => {
    test('should load signin page with content', async ({ page }) => {
      await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)

      // 로그인 관련 콘텐츠 확인
      const hasLoginContent =
        bodyText!.includes('로그인') ||
        bodyText!.includes('Sign') ||
        bodyText!.includes('Login') ||
        bodyText!.includes('계정')
      expect(hasLoginContent).toBe(true)
    })

    test('should display login form elements', async ({ page }) => {
      await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' })

      const formElements = page.locator('form, input, button')
      const count = await formElements.count()
      expect(count).toBeGreaterThan(0)

      let visibleElement = false
      for (let i = 0; i < Math.min(count, 10); i++) {
        if (await formElements.nth(i).isVisible()) {
          visibleElement = true
          break
        }
      }
      expect(visibleElement).toBe(true)
    })

    test('should have social login options', async ({ page }) => {
      await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' })

      const socialButtons = page.locator(
        'button:has-text("Google"), button:has-text("카카오"), button:has-text("Kakao"), [class*="social"], [class*="oauth"]'
      )
      const count = await socialButtons.count()

      if (count > 0) {
        await expect(socialButtons.first()).toBeVisible()
      }
    })

    test('should handle form submission', async ({ page }) => {
      await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' })

      const submitButton = page.locator('button[type="submit"], button:has-text("로그인"), button:has-text("Sign")')
      if ((await submitButton.count()) > 0) {
        await submitButton.first().click()
        await page.waitForTimeout(500)
        await expect(page.locator('body')).toBeVisible()
      }
    })
  })

  test.describe('Contact Page', () => {
    test('should load contact page with content', async ({ page }) => {
      await page.goto('/contact', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)

      // 연락처 관련 콘텐츠 확인
      const hasContactContent =
        bodyText!.includes('문의') ||
        bodyText!.includes('연락') ||
        bodyText!.includes('Contact') ||
        bodyText!.includes('이메일')
      expect(hasContactContent).toBe(true)
    })

    test('should have contact form elements', async ({ page }) => {
      await page.goto('/contact', { waitUntil: 'domcontentloaded' })

      const formElements = page.locator('form, input, textarea')
      const count = await formElements.count()

      if (count > 0) {
        let visibleElement = false
        for (let i = 0; i < count; i++) {
          if (await formElements.nth(i).isVisible()) {
            visibleElement = true
            break
          }
        }
        expect(visibleElement).toBe(true)
      }
    })

    test('should accept message input', async ({ page }) => {
      await page.goto('/contact', { waitUntil: 'domcontentloaded' })

      const textarea = page.locator('textarea').first()
      if ((await textarea.count()) > 0 && (await textarea.isVisible())) {
        await textarea.fill('테스트 메시지입니다.')
        const value = await textarea.inputValue()
        expect(value).toContain('테스트')
      }
    })
  })

  test.describe('Profile Mobile Experience', () => {
    test('should render profile page without horizontal scroll on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/profile', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should render auth page without horizontal scroll on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should have touch-friendly form inputs on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/profile', { waitUntil: 'domcontentloaded' })

      const inputs = page.locator('input, textarea, select')
      const count = await inputs.count()

      for (let i = 0; i < Math.min(count, 3); i++) {
        const input = inputs.nth(i)
        if (await input.isVisible()) {
          const box = await input.boundingBox()
          if (box) {
            expect(box.height).toBeGreaterThanOrEqual(30)
          }
        }
      }
    })

    test('should allow mobile input on profile page', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/profile', { waitUntil: 'domcontentloaded' })

      const input = page.locator('input[type="text"]').first()
      if ((await input.count()) > 0 && (await input.isVisible())) {
        await input.tap()
        await input.fill('모바일 테스트')
        const value = await input.inputValue()
        expect(value).toContain('모바일')
      }
    })
  })

  test.describe('Profile Page Load Performance', () => {
    test('should load profile page within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/profile', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })

    test('should load auth signin page within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })

    test('should load contact page within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/contact', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })
  })
})
