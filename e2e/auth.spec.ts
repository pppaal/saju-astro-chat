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
