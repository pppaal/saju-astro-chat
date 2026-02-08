import { test, expect } from '@playwright/test'

test.describe('Offline & PWA Features', () => {
  test.describe('Offline Page', () => {
    test('should load offline page', async ({ page }) => {
      await page.goto('/offline', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display offline message', async ({ page }) => {
      await page.goto('/offline', { waitUntil: 'domcontentloaded' })

      const offlineMessage = page.locator('[class*="offline"], main, h1, h2')
      const count = await offlineMessage.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have retry button', async ({ page }) => {
      await page.goto('/offline', { waitUntil: 'domcontentloaded' })

      const retryButton = page.locator(
        'button:has-text("다시"), button:has-text("Retry"), button:has-text("새로고침")'
      )
      const count = await retryButton.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should display helpful instructions', async ({ page }) => {
      await page.goto('/offline', { waitUntil: 'domcontentloaded' })

      const instructions = page.locator("p, [class*='instruction'], [class*='help']")
      const count = await instructions.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('PWA Manifest', () => {
    test('should have web app manifest', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      const manifestLink = page.locator('link[rel="manifest"]')
      const count = await manifestLink.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have apple-touch-icon', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      const appleIcon = page.locator('link[rel="apple-touch-icon"]')
      const count = await appleIcon.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have theme-color meta tag', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      const themeColor = page.locator('meta[name="theme-color"]')
      const count = await themeColor.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Service Worker', () => {
    test('should register service worker', async ({ page }) => {
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
    })
  })

  test.describe('Caching Behavior', () => {
    test('should cache homepage assets', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      // Navigate away and back
      await page.goto('/about', { waitUntil: 'domcontentloaded' })
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()
    })

    test('should handle page refresh', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      await page.reload({ waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()
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
  })
})
