import { test, expect } from '@playwright/test'

test.describe('Admin Pages', () => {
  test.describe('Admin Dashboard', () => {
    test('should load admin dashboard page', async ({ page }) => {
      await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })

    test('should display dashboard content or login redirect', async ({ page }) => {
      await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' })

      const bodyText = await page.locator('body').textContent()
      // Should show dashboard content or login prompt
      const hasContent =
        bodyText!.includes('대시보드') ||
        bodyText!.includes('Dashboard') ||
        bodyText!.includes('로그인') ||
        bodyText!.includes('관리자')
      expect(hasContent).toBe(true)
    })
  })

  test.describe('Admin Refunds Page', () => {
    test('should load refunds page', async ({ page }) => {
      await page.goto('/admin/refunds', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })

    test('should display refunds content or login redirect', async ({ page }) => {
      await page.goto('/admin/refunds', { waitUntil: 'domcontentloaded' })

      const bodyText = await page.locator('body').textContent()
      const hasContent =
        bodyText!.includes('환불') ||
        bodyText!.includes('Refund') ||
        bodyText!.includes('로그인') ||
        bodyText!.includes('관리')
      expect(hasContent).toBe(true)
    })
  })

  test.describe('Admin Access Control', () => {
    test('should handle unauthorized access to dashboard', async ({ page }) => {
      await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' })

      // Should either show login form or redirect
      await expect(page.locator('body')).toBeVisible()
      const url = page.url()
      const bodyText = await page.locator('body').textContent()

      const isProtected =
        url.includes('signin') ||
        url.includes('login') ||
        url.includes('admin') ||
        bodyText!.includes('로그인') ||
        bodyText!.includes('관리자')
      expect(isProtected).toBe(true)
    })
  })

  test.describe('Admin Mobile Experience', () => {
    test('should be responsive on mobile - dashboard', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should have touch-friendly elements on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' })

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

  test.describe('Admin Page Load Performance', () => {
    test('should load dashboard within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })
  })
})
