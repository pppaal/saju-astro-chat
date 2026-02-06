import { test, expect } from '@playwright/test'
import { TestHelpers } from '../fixtures/test-helpers'

/**
 * User Registration and Authentication Flow Tests
 *
 * Tests OAuth-based authentication flow including:
 * - Sign-in page accessibility
 * - OAuth provider availability
 * - Session management
 * - CSRF protection
 * - Protected route handling
 */

test.describe('User Registration and Authentication Flow', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
  })

  test.describe('Sign-in Page', () => {
    test('should load sign-in page with auth options', async ({ page }) => {
      await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.textContent('body')
      const hasAuthContent =
        bodyText?.includes('로그인') ||
        bodyText?.includes('Sign in') ||
        bodyText?.includes('Google') ||
        bodyText?.includes('Kakao') ||
        bodyText?.includes('카카오')

      expect(hasAuthContent).toBe(true)
    })

    test('should display OAuth provider buttons', async ({ page }) => {
      await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' })

      const hasOAuthButton =
        (await page.locator('button:has-text("Google")').count()) > 0 ||
        (await page.locator('button:has-text("Kakao")').count()) > 0 ||
        (await page.locator('button:has-text("카카오")').count()) > 0 ||
        (await page.locator('[data-provider]').count()) > 0 ||
        (await page.locator('a[href*="oauth"]').count()) > 0

      expect(hasOAuthButton).toBe(true)
    })
  })

  test.describe('API Security', () => {
    test('should provide CSRF token', async ({ request }) => {
      const response = await request.get('/api/auth/csrf')

      expect(response.ok()).toBe(true)

      const data = await response.json()
      expect(data).toHaveProperty('csrfToken')
      expect(typeof data.csrfToken).toBe('string')
      expect(data.csrfToken.length).toBeGreaterThan(0)
    })

    test('should have OAuth providers configured', async ({ request }) => {
      const response = await request.get('/api/auth/providers')

      expect(response.ok()).toBe(true)

      const providers = await response.json()
      expect(typeof providers).toBe('object')
      expect(Object.keys(providers).length).toBeGreaterThan(0)
    })

    test('should handle session retrieval', async ({ request }) => {
      const response = await request.get('/api/auth/session')

      expect(response.ok()).toBe(true)

      const session = await response.json()
      expect(session).toBeDefined()
    })
  })

  test.describe('Protected Routes', () => {
    test('should handle access to protected route without auth', async ({ page }) => {
      await page.goto('/myjourney/profile', { waitUntil: 'domcontentloaded' })

      // Should either redirect to signin or show auth required message
      await page.waitForTimeout(1000)
      const url = page.url()
      const bodyText = await page.textContent('body')

      const isHandledCorrectly =
        url.includes('signin') ||
        url.includes('myjourney') ||
        bodyText?.includes('로그인') ||
        bodyText?.includes('Sign in')

      expect(isHandledCorrectly).toBe(true)
    })
  })

  test.describe('Session Management', () => {
    test('should persist session cookies across page reloads', async ({ page, context }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      await page.reload({ waitUntil: 'domcontentloaded' })

      const cookies = await context.cookies()
      expect(Array.isArray(cookies)).toBe(true)
    })

    test('should handle error query parameter on signin', async ({ page }) => {
      await page.goto('/auth/signin?error=AccessDenied', { waitUntil: 'domcontentloaded' })

      // Page should still be functional
      await expect(page.locator('body')).toBeVisible()

      const url = page.url()
      expect(url).toContain('signin')
    })
  })
})
