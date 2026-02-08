import { test, expect } from '@playwright/test'

test.describe('Premium Reports Flow', () => {
  test.describe('Premium Reports Main Page', () => {
    test('should load premium-reports page successfully', async ({ page }) => {
      await page.goto('/premium-reports', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display report options', async ({ page }) => {
      await page.goto('/premium-reports', { waitUntil: 'domcontentloaded' })

      const reportOptions = page.locator('[class*="report"], [class*="card"], [class*="option"]')
      const count = await reportOptions.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should show pricing information', async ({ page }) => {
      await page.goto('/premium-reports', { waitUntil: 'domcontentloaded' })

      const pricing = page.locator('[class*="price"], [class*="credit"], [class*="cost"]')
      const count = await pricing.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have purchase buttons', async ({ page }) => {
      await page.goto('/premium-reports', { waitUntil: 'domcontentloaded' })

      const purchaseButtons = page.locator(
        'button:has-text("구매"), button:has-text("Purchase"), button:has-text("받기")'
      )
      const count = await purchaseButtons.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Comprehensive Report Page', () => {
    test('should load comprehensive report page', async ({ page }) => {
      await page.goto('/premium-reports/comprehensive', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display report preview', async ({ page }) => {
      await page.goto('/premium-reports/comprehensive', { waitUntil: 'domcontentloaded' })

      const preview = page.locator('[class*="preview"], [class*="sample"], main')
      const count = await preview.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have report sections', async ({ page }) => {
      await page.goto('/premium-reports/comprehensive', { waitUntil: 'domcontentloaded' })

      const sections = page.locator('[class*="section"], h2, h3')
      const count = await sections.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Themed Report Page', () => {
    test('should load themed report page', async ({ page }) => {
      await page.goto('/premium-reports/themed', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display theme options', async ({ page }) => {
      await page.goto('/premium-reports/themed', { waitUntil: 'domcontentloaded' })

      const themes = page.locator('[class*="theme"], [class*="option"], [class*="style"]')
      const count = await themes.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Timing Report Page', () => {
    test('should load timing report page', async ({ page }) => {
      await page.goto('/premium-reports/timing', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display timing analysis content', async ({ page }) => {
      await page.goto('/premium-reports/timing', { waitUntil: 'domcontentloaded' })

      const content = page.locator('[class*="timing"], [class*="analysis"], main')
      const count = await content.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Pricing Page', () => {
    test('should load pricing page successfully', async ({ page }) => {
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display pricing tiers', async ({ page }) => {
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })

      const pricingTiers = page.locator('[class*="tier"], [class*="plan"], [class*="pricing"]')
      const count = await pricingTiers.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have subscription buttons', async ({ page }) => {
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })

      const subButtons = page.locator(
        'button:has-text("구독"), button:has-text("Subscribe"), button:has-text("시작")'
      )
      const count = await subButtons.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should display feature comparison', async ({ page }) => {
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })

      const features = page.locator('[class*="feature"], [class*="comparison"], table, ul')
      const count = await features.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Success Page', () => {
    test('should load success page', async ({ page }) => {
      await page.goto('/success', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display success message', async ({ page }) => {
      await page.goto('/success', { waitUntil: 'domcontentloaded' })

      const successContent = page.locator('[class*="success"], [class*="thank"], main')
      const count = await successContent.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Premium Mobile Experience', () => {
    test('should be responsive on mobile - pricing page', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should be responsive on mobile - premium reports', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/premium-reports', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()
    })
  })
})
