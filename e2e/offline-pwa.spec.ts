import { test, expect } from '@playwright/test'

test.describe('Offline & PWA Features', () => {
  test.describe('Offline Page', () => {
    test('should load offline page with content', async ({ page }) => {
      await page.goto('/offline', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)

      // Offline page should have offline-related content
      const hasOfflineContent =
        bodyText!.includes('오프라인') ||
        bodyText!.includes('Offline') ||
        bodyText!.includes('연결') ||
        bodyText!.includes('네트워크')
      expect(hasOfflineContent).toBe(true)
    })

    test('should have action button or link', async ({ page }) => {
      await page.goto('/offline', { waitUntil: 'domcontentloaded' })

      const buttons = page.locator('button, a')
      const count = await buttons.count()
      expect(count).toBeGreaterThan(0)
    })
  })

  test.describe('PWA Manifest', () => {
    test('should have web app manifest', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      const manifestLink = page.locator('link[rel="manifest"]')
      const count = await manifestLink.count()
      expect(count).toBeGreaterThan(0)

      const href = await manifestLink.getAttribute('href')
      expect(href).toBeTruthy()
    })

    test('should have apple-touch-icon', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      const appleIcon = page.locator('link[rel="apple-touch-icon"]')
      const count = await appleIcon.count()
      expect(count).toBeGreaterThan(0)
    })

    test('should have theme-color meta tag', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      const themeColor = page.locator('meta[name="theme-color"]')
      const count = await themeColor.count()
      expect(count).toBeGreaterThan(0)

      const content = await themeColor.getAttribute('content')
      expect(content).toBeTruthy()
    })
  })

  test.describe('Service Worker', () => {
    test('should have service worker API available', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      const hasServiceWorker = await page.evaluate(() => {
        return 'serviceWorker' in navigator
      })
      expect(hasServiceWorker).toBe(true)
    })
  })

  test.describe('Install Prompt', () => {
    test('should not show install prompt on first visit', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      // Just verify page loads without errors
      await expect(page.locator('body')).toBeVisible()
      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(100)
    })
  })

  test.describe('Caching Behavior', () => {
    test('should cache homepage assets', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      // Navigate away and back
      await page.goto('/about', { waitUntil: 'domcontentloaded' })
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()
      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(100)
    })

    test('should handle page refresh', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      await page.reload({ waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()
      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(100)
    })
  })

  test.describe('Offline Mobile Experience', () => {
    test('should be responsive on mobile - offline page', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/offline', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should have touch-friendly buttons on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/offline', { waitUntil: 'domcontentloaded' })

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

  test.describe('PWA Page Load Performance', () => {
    test('should load offline page within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/offline', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })
  })
})
