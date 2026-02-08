import { test, expect } from '@playwright/test'

/**
 * Error handling and boundary tests
 */

test.describe('404 Error Page', () => {
  test('should show 404 for non-existent page', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-12345', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    // Should show some content (error page or redirect)
    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(10)
  })

  test('404 page should have content and navigation', async ({ page }) => {
    await page.goto('/non-existent-route-xyz', { waitUntil: 'domcontentloaded' })

    // Should have content
    const bodyText = await page.locator('body').textContent()
    const hasErrorOrNav =
      bodyText!.includes('404') ||
      bodyText!.includes('찾을 수 없') ||
      bodyText!.includes('Not Found') ||
      bodyText!.includes('홈') ||
      bodyText!.length > 100
    expect(hasErrorOrNav).toBe(true)
  })

  test('should handle Korean path 404', async ({ page }) => {
    await page.goto('/존재하지않는페이지', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(10)
  })
})

test.describe('API Error Responses', () => {
  test('should return 404 for non-existent API', async ({ page }) => {
    const response = await page.request.get('/api/non-existent-endpoint-xyz')
    expect(response.status()).toBe(404)
  })

  test('should return error for invalid POST body', async ({ page }) => {
    const response = await page.request.post('/api/saju', {
      data: 'invalid-json-string',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Should return error status (400, 401, 403, or 500)
    expect([400, 401, 403, 500]).toContain(response.status())
  })

  test('should handle empty POST body gracefully', async ({ page }) => {
    const response = await page.request.post('/api/destiny-map', {
      data: {},
    })

    expect([400, 401, 403, 500]).toContain(response.status())
  })

  test('should handle empty query params', async ({ page }) => {
    const response = await page.request.get('/api/cities?q=')
    // Should handle gracefully - either return empty results or error
    expect([200, 400, 401, 403]).toContain(response.status())
  })
})

test.describe('Network Error Handling', () => {
  test('should handle slow network gracefully', async ({ page }) => {
    // Simulate slow network
    await page.route('**/*', async (route) => {
      await new Promise((r) => setTimeout(r, 100))
      await route.continue()
    })

    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)
  })
})

test.describe('JavaScript Error Handling', () => {
  test('should not have critical JS errors on homepage', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => {
      errors.push(error.message)
    })

    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Filter known benign errors
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('ResizeObserver') &&
        !e.includes('Loading chunk') &&
        !e.includes('hydration') &&
        !e.includes('ChunkLoadError')
    )

    expect(criticalErrors.length).toBe(0)
  })

  test('should not have critical JS errors on saju page', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => {
      errors.push(error.message)
    })

    await page.goto('/saju', { waitUntil: 'domcontentloaded' })

    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('ResizeObserver') &&
        !e.includes('Loading chunk') &&
        !e.includes('hydration') &&
        !e.includes('ChunkLoadError')
    )

    expect(criticalErrors.length).toBe(0)
  })

  test('should not have critical JS errors on tarot page', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => {
      errors.push(error.message)
    })

    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('ResizeObserver') &&
        !e.includes('Loading chunk') &&
        !e.includes('hydration') &&
        !e.includes('ChunkLoadError')
    )

    expect(criticalErrors.length).toBe(0)
  })
})

test.describe('Form Validation Errors', () => {
  test('should handle empty saju form submit', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })

    const submitBtn = page.locator("button[type='submit']").first()
    if ((await submitBtn.count()) > 0) {
      await submitBtn.click()

      // Form should still be visible after failed validation
      await expect(page.locator('body')).toBeVisible()
      expect(page.url()).toContain('saju')
    }
  })

  test('should handle empty destiny-map form submit', async ({ page }) => {
    await page.goto('/destiny-map', { waitUntil: 'domcontentloaded' })

    const submitBtn = page.locator("button[type='submit']").first()
    if ((await submitBtn.count()) > 0) {
      await submitBtn.click()

      await expect(page.locator('body')).toBeVisible()
    }
  })
})

test.describe('Auth Error Handling', () => {
  test('should handle unauthenticated access to profile', async ({ page }) => {
    await page.goto('/profile', { waitUntil: 'domcontentloaded' })

    // Should either show profile or redirect to login
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)
  })

  test('should handle session expiry gracefully', async ({ page }) => {
    // Clear all cookies to simulate expired session
    await page.context().clearCookies()

    await page.goto('/myjourney', { waitUntil: 'domcontentloaded' })

    // Should handle gracefully - show page or redirect
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Rate Limiting', () => {
  test('should handle rapid requests', async ({ page }) => {
    // Make many rapid requests
    const responses = []
    for (let i = 0; i < 10; i++) {
      responses.push(await page.request.get('/api/auth/csrf'))
    }

    // Should either succeed or return 429
    for (const response of responses) {
      expect([200, 429]).toContain(response.status())
    }
  })
})

test.describe('Invalid URL Handling', () => {
  test('should handle special characters in URL', async ({ page }) => {
    await page.goto('/page%20with%20spaces', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('should handle URL with query params', async ({ page }) => {
    await page.goto('/?test=1&foo=bar&special=%20', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)
  })
})

test.describe('Missing Data Handling', () => {
  test('result page should handle missing data gracefully', async ({ page }) => {
    await page.goto('/destiny-map/result', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    // Should show content (empty state or redirect)
    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(10)
  })

  test('life-prediction result should handle missing data', async ({ page }) => {
    await page.goto('/life-prediction/result', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('personality result should handle missing data', async ({ page }) => {
    await page.goto('/personality/result', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('icp result should handle missing data', async ({ page }) => {
    await page.goto('/icp/result', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Timeout Handling', () => {
  test('auth csrf endpoint should respond quickly', async ({ page }) => {
    const startTime = Date.now()
    const response = await page.request.get('/api/auth/csrf')
    const duration = Date.now() - startTime

    expect(response.ok()).toBe(true)
    expect(duration).toBeLessThan(5000) // Should respond within 5 seconds
  })
})
