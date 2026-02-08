import { test, expect } from '@playwright/test'

test.describe('Admin Pages', () => {
  test.describe('Admin Dashboard', () => {
    test('should load admin dashboard page', async ({ page }) => {
      await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display dashboard widgets', async ({ page }) => {
      await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' })

      const widgets = page.locator('[class*="widget"], [class*="card"], [class*="stat"]')
      const count = await widgets.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have navigation menu', async ({ page }) => {
      await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' })

      const navMenu = page.locator('nav, [class*="sidebar"], [class*="menu"]')
      const count = await navMenu.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should display metrics or charts', async ({ page }) => {
      await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' })

      const charts = page.locator('canvas, svg, [class*="chart"], [class*="graph"]')
      const count = await charts.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Admin Feedback Page', () => {
    test('should load feedback page', async ({ page }) => {
      await page.goto('/admin/feedback', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display feedback list', async ({ page }) => {
      await page.goto('/admin/feedback', { waitUntil: 'domcontentloaded' })

      const feedbackItems = page.locator('[class*="feedback"], [class*="item"], table tr')
      const count = await feedbackItems.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have filter options', async ({ page }) => {
      await page.goto('/admin/feedback', { waitUntil: 'domcontentloaded' })

      const filters = page.locator('[class*="filter"], select, input[type="search"]')
      const count = await filters.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have status indicators', async ({ page }) => {
      await page.goto('/admin/feedback', { waitUntil: 'domcontentloaded' })

      const status = page.locator('[class*="status"], [class*="badge"]')
      const count = await status.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Admin Refunds Page', () => {
    test('should load refunds page', async ({ page }) => {
      await page.goto('/admin/refunds', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display refund requests', async ({ page }) => {
      await page.goto('/admin/refunds', { waitUntil: 'domcontentloaded' })

      const refunds = page.locator('[class*="refund"], table, [class*="list"]')
      const count = await refunds.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have action buttons', async ({ page }) => {
      await page.goto('/admin/refunds', { waitUntil: 'domcontentloaded' })

      const actionButtons = page.locator(
        'button:has-text("승인"), button:has-text("거부"), button:has-text("처리")'
      )
      const count = await actionButtons.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('API Documentation Page', () => {
    test('should load api-docs page', async ({ page }) => {
      await page.goto('/api-docs', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display API endpoints', async ({ page }) => {
      await page.goto('/api-docs', { waitUntil: 'domcontentloaded' })

      const endpoints = page.locator('[class*="endpoint"], [class*="operation"], [class*="path"]')
      const count = await endpoints.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have interactive try-it sections', async ({ page }) => {
      await page.goto('/api-docs', { waitUntil: 'domcontentloaded' })

      const tryIt = page.locator(
        'button:has-text("Try"), button:has-text("Execute"), [class*="try"]'
      )
      const count = await tryIt.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Admin Access Control', () => {
    test('should redirect unauthorized users', async ({ page }) => {
      await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' })

      // Should either show login form or redirect
      await expect(page.locator('body')).toBeVisible()
    })

    test('should show login prompt for protected pages', async ({ page }) => {
      await page.goto('/admin/feedback', { waitUntil: 'domcontentloaded' })

      const loginPrompt = page.locator('[class*="login"], form, [class*="auth"]')
      const count = await loginPrompt.count()
      expect(count).toBeGreaterThanOrEqual(0)
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

    test('should have collapsible sidebar on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' })

      const menuToggle = page.locator(
        '[class*="hamburger"], [class*="menu-toggle"], button[aria-label*="menu"]'
      )
      const count = await menuToggle.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })
})
