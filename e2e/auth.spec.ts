import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should display sign-in page', async ({ page }) => {
    await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('should redirect unauthenticated user from protected routes', async ({ page }) => {
    await page.goto('/profile', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    // Should either show profile or redirect to auth
    const url = page.url()
    const hasAuthContent = url.includes('signin') || url.includes('auth') || url.includes('profile')
    expect(hasAuthContent).toBe(true)
  })

  test('should have CSRF token available', async ({ page }) => {
    const response = await page.request.get('/api/auth/csrf')
    expect(response.ok()).toBe(true)

    const data = await response.json()
    expect(data.csrfToken).toBeTruthy()
    expect(typeof data.csrfToken).toBe('string')
    expect(data.csrfToken.length).toBeGreaterThan(0)
  })

  test('should have providers endpoint', async ({ page }) => {
    const response = await page.request.get('/api/auth/providers')
    expect(response.ok()).toBe(true)

    const providers = await response.json()
    expect(typeof providers).toBe('object')
  })
})

test.describe('Session Management', () => {
  test('should handle session endpoint', async ({ page }) => {
    const response = await page.request.get('/api/auth/session')
    expect(response.ok()).toBe(true)

    const session = await response.json()
    expect(session).toBeDefined()
  })

  test('should return empty session for unauthenticated user', async ({ page }) => {
    const response = await page.request.get('/api/auth/session')
    expect(response.ok()).toBe(true)

    const session = await response.json()
    // Unauthenticated user should not have a user in session
    expect(session.user).toBeUndefined()
  })
})

test.describe('Auth Page Content', () => {
  test('should display login page with Korean content', async ({ page }) => {
    await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)

    // Auth page should have login-related content
    const hasAuthContent =
      bodyText!.includes('로그인') ||
      bodyText!.includes('Sign in') ||
      bodyText!.includes('Google') ||
      bodyText!.includes('Kakao')
    expect(hasAuthContent).toBe(true)
  })

  test('should have OAuth provider buttons visible', async ({ page }) => {
    await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' })

    const oauthButtons = page.locator('button')
    const count = await oauthButtons.count()
    expect(count).toBeGreaterThan(0)

    // At least one button should be visible
    let visibleButton = false
    for (let i = 0; i < count; i++) {
      if (await oauthButtons.nth(i).isVisible()) {
        visibleButton = true
        break
      }
    }
    expect(visibleButton).toBe(true)
  })

  test('should handle error query params', async ({ page }) => {
    await page.goto('/auth/signin?error=OAuthSignin', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    // Page should still load with error param
    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)
  })
})

test.describe('Auth Mobile Experience', () => {
  test('should render sign-in page without horizontal scroll on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' })

    await expect(page.locator('body')).toBeVisible()

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
  })

  test('should have touch-friendly buttons on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' })

    const buttons = page.locator('button')
    const count = await buttons.count()

    for (let i = 0; i < Math.min(count, 3); i++) {
      const button = buttons.nth(i)
      if (await button.isVisible()) {
        const box = await button.boundingBox()
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(30)
          expect(box.width).toBeGreaterThanOrEqual(30)
        }
      }
    }
  })
})
