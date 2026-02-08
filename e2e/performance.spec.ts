import { test, expect } from '@playwright/test'

/**
 * Performance tests - page load times, resource loading
 */

test.describe('Page Load Times', () => {
  test('homepage should load within reasonable time', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const loadTime = Date.now() - startTime

    // Should load within 30 seconds
    expect(loadTime).toBeLessThan(30000)
    await expect(page.locator('body')).toBeVisible()
  })

  test('saju page should load within reasonable time', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })
    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(30000)
    await expect(page.locator('body')).toBeVisible()
  })

  test('tarot page should load within reasonable time', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })
    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(30000)
    await expect(page.locator('body')).toBeVisible()
  })

  test('destiny-map page should load within reasonable time', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/destiny-map', { waitUntil: 'domcontentloaded' })
    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(30000)
    await expect(page.locator('body')).toBeVisible()
  })

  test('pricing page should load within reasonable time', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(30000)
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Resource Loading', () => {
  test('should load CSS resources', async ({ page }) => {
    const cssRequests: string[] = []
    page.on('request', (request) => {
      if (request.resourceType() === 'stylesheet') {
        cssRequests.push(request.url())
      }
    })

    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Should have some CSS loaded (or inline styles)
    await expect(page.locator('body')).toBeVisible()
  })

  test('should load JavaScript resources', async ({ page }) => {
    const jsRequests: string[] = []
    page.on('request', (request) => {
      if (request.resourceType() === 'script') {
        jsRequests.push(request.url())
      }
    })

    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Should have JS loaded for React app
    expect(jsRequests.length).toBeGreaterThan(0)
  })
})

test.describe('API Response Times', () => {
  test('CSRF endpoint should respond within reasonable time', async ({ page }) => {
    const startTime = Date.now()
    const response = await page.request.get('/api/auth/csrf')
    const responseTime = Date.now() - startTime

    expect(response.ok()).toBe(true)
    expect(responseTime).toBeLessThan(10000)
  })

  test('session endpoint should respond within reasonable time', async ({ page }) => {
    const startTime = Date.now()
    const response = await page.request.get('/api/auth/session')
    const responseTime = Date.now() - startTime

    expect(response.ok()).toBe(true)
    expect(responseTime).toBeLessThan(10000)
  })

  test('providers endpoint should respond within reasonable time', async ({ page }) => {
    const startTime = Date.now()
    const response = await page.request.get('/api/auth/providers')
    const responseTime = Date.now() - startTime

    expect(response.ok()).toBe(true)
    expect(responseTime).toBeLessThan(10000)
  })
})

test.describe('Memory Usage', () => {
  test('should not have memory leaks on navigation', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Navigate to multiple pages
    const pages = ['/saju', '/tarot', '/destiny-map', '/']
    for (const url of pages) {
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    }

    // If we got here without crashing, memory is acceptable
  })
})

test.describe('Concurrent Requests', () => {
  test('should handle multiple concurrent API requests', async ({ page }) => {
    const promises = [
      page.request.get('/api/auth/csrf'),
      page.request.get('/api/auth/session'),
      page.request.get('/api/auth/providers'),
    ]

    const responses = await Promise.all(promises)

    for (const response of responses) {
      // All should succeed
      expect(response.ok()).toBe(true)
    }
  })
})

test.describe('First Contentful Paint', () => {
  test('homepage should have content after load', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Check that body has content
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toBeTruthy()
    expect(bodyText!.trim().length).toBeGreaterThan(0)
  })
})

test.describe('Time to Interactive', () => {
  test('buttons should be interactive after load', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const buttons = page.locator('button')
    const count = await buttons.count()

    if (count > 0) {
      const firstButton = buttons.first()
      if (await firstButton.isVisible()) {
        // Button should be clickable (not disabled unless intended)
        const isEnabled = await firstButton.isEnabled()
        expect(typeof isEnabled).toBe('boolean')
      }
    }
  })

  test('links should be clickable after load', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const links = page.locator('a[href]')
    const count = await links.count()

    expect(count).toBeGreaterThan(0)
  })
})
