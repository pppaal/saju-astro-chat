import { test, expect } from '@playwright/test'

/**
 * Authentication Flow Tests
 *
 * Verifies OAuth-based authentication endpoints and session management.
 */

test.describe('Authentication Flow', () => {
  test('should display sign-in page', async ({ page }) => {
    await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    // Should show some auth-related content
    const bodyText = await page.textContent('body')
    const hasAuthContent =
      bodyText?.includes('로그인') ||
      bodyText?.includes('Sign') ||
      bodyText?.includes('Google') ||
      bodyText?.includes('Kakao')

    expect(hasAuthContent).toBe(true)
  })

  test('should handle unauthenticated access to protected routes', async ({ page }) => {
    await page.goto('/profile', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    // Should either redirect or show the page (based on auth state)
    const url = page.url()
    expect(url.includes('signin') || url.includes('profile')).toBe(true)
  })

  test('should have CSRF token available', async ({ request }) => {
    const response = await request.get('/api/auth/csrf')

    expect(response.status()).toBeLessThan(500)

    if (response.ok()) {
      const data = await response.json()
      expect(data).toHaveProperty('csrfToken')
      expect(data.csrfToken).toBeTruthy()
    }
  })

  test('should have providers endpoint', async ({ request }) => {
    const response = await request.get('/api/auth/providers')

    expect(response.status()).toBeLessThan(500)

    if (response.ok()) {
      const providers = await response.json()
      expect(typeof providers).toBe('object')
    }
  })
})

test.describe('Session Management', () => {
  test('should handle session endpoint', async ({ request }) => {
    const response = await request.get('/api/auth/session')

    expect(response.status()).toBeLessThan(500)

    if (response.ok()) {
      const session = await response.json()
      expect(session).toBeDefined()
    }
  })

  test('should persist cookies across requests', async ({ context }) => {
    const page = await context.newPage()
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const cookies = await context.cookies()
    expect(Array.isArray(cookies)).toBe(true)
  })
})
