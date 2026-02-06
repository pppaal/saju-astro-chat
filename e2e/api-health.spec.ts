import { test, expect } from '@playwright/test'

/**
 * API Health Check Tests
 *
 * These tests verify that critical API endpoints are responsive and return expected status codes.
 * Tests are designed to fail fast and provide actionable feedback.
 */

test.describe('API Health Checks', () => {
  test.describe('Auth Endpoints', () => {
    test('GET /api/auth/csrf - should return CSRF token', async ({ request }) => {
      const response = await request.get('/api/auth/csrf')

      expect(response.status()).toBeLessThan(500)

      if (response.ok()) {
        const data = await response.json()
        expect(data).toHaveProperty('csrfToken')
        expect(typeof data.csrfToken).toBe('string')
        expect(data.csrfToken.length).toBeGreaterThan(0)
      }
    })

    test('GET /api/auth/providers - should return auth providers', async ({ request }) => {
      const response = await request.get('/api/auth/providers')

      expect(response.status()).toBeLessThan(500)

      if (response.ok()) {
        const data = await response.json()
        expect(typeof data).toBe('object')
      }
    })

    test('GET /api/auth/session - should return session info', async ({ request }) => {
      const response = await request.get('/api/auth/session')

      expect(response.status()).toBeLessThan(500)

      if (response.ok()) {
        const data = await response.json()
        expect(data).toBeDefined()
      }
    })
  })

  test.describe('Error Handling', () => {
    test('should return 404 for non-existent API routes', async ({ request }) => {
      const response = await request.get('/api/non-existent-route-xyz-12345')

      expect(response.status()).toBe(404)
    })

    test('should return 405 for invalid HTTP method', async ({ request }) => {
      const response = await request.delete('/api/auth/csrf')

      expect([404, 405]).toContain(response.status())
    })
  })
})

test.describe('Page Load Performance', () => {
  const MAX_LOAD_TIME_MS = 10000 // 10 seconds max

  test('homepage should load within reasonable time', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(MAX_LOAD_TIME_MS)
    await expect(page.locator('body')).toBeVisible()
  })

  test('saju page should load within reasonable time', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })
    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(MAX_LOAD_TIME_MS)
    await expect(page.locator('body')).toBeVisible()
  })

  test('tarot page should load within reasonable time', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })
    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(MAX_LOAD_TIME_MS)
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Critical Page Availability', () => {
  const criticalPages = ['/', '/saju', '/tarot', '/dream', '/compatibility', '/auth/signin']

  for (const pagePath of criticalPages) {
    test(`${pagePath} should be accessible`, async ({ page }) => {
      const response = await page.goto(pagePath, { waitUntil: 'domcontentloaded' })

      expect(response?.status()).toBeLessThan(500)
      await expect(page.locator('body')).toBeVisible()
    })
  }
})
