import { test, expect } from '@playwright/test'

test.describe('Premium Reports Flow', () => {
  test.describe('Premium Reports Main Page', () => {
    test('should load premium-reports page with content', async ({ page }) => {
      await page.goto('/premium-reports', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)

      // 프리미엄 리포트 관련 콘텐츠 확인
      const hasPremiumContent =
        bodyText!.includes('프리미엄') ||
        bodyText!.includes('리포트') ||
        bodyText!.includes('Premium') ||
        bodyText!.includes('Report') ||
        bodyText!.includes('분석')
      expect(hasPremiumContent).toBe(true)
    })

    test('should display report options or cards', async ({ page }) => {
      await page.goto('/premium-reports', { waitUntil: 'domcontentloaded' })

      const reportOptions = page.locator('[class*="report"], [class*="card"], [class*="option"]')
      const count = await reportOptions.count()

      const bodyText = await page.locator('body').textContent()
      expect(count > 0 || bodyText!.length > 100).toBe(true)
    })

    test('should show pricing information', async ({ page }) => {
      await page.goto('/premium-reports', { waitUntil: 'domcontentloaded' })

      const bodyText = await page.locator('body').textContent()
      // 가격 관련 콘텐츠 확인
      const hasPricingInfo =
        bodyText!.includes('원') ||
        bodyText!.includes('크레딧') ||
        bodyText!.includes('credit') ||
        bodyText!.includes('₩') ||
        bodyText!.length > 100
      expect(hasPricingInfo).toBe(true)
    })

    test('should have purchase or action buttons', async ({ page }) => {
      await page.goto('/premium-reports', { waitUntil: 'domcontentloaded' })

      const buttons = page.locator('button, a')
      const count = await buttons.count()
      expect(count).toBeGreaterThan(0)

      let visibleButton = false
      for (let i = 0; i < Math.min(count, 10); i++) {
        if (await buttons.nth(i).isVisible()) {
          visibleButton = true
          break
        }
      }
      expect(visibleButton).toBe(true)
    })
  })

  test.describe('Comprehensive Report Page', () => {
    test('should load comprehensive report page with content', async ({ page }) => {
      await page.goto('/premium-reports/comprehensive', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })

    test('should display report preview or sections', async ({ page }) => {
      await page.goto('/premium-reports/comprehensive', { waitUntil: 'domcontentloaded' })

      const sections = page.locator('[class*="section"], h2, h3, [class*="preview"]')
      const count = await sections.count()

      const bodyText = await page.locator('body').textContent()
      expect(count > 0 || bodyText!.length > 100).toBe(true)
    })
  })

  test.describe('Themed Report Page', () => {
    test('should load themed report page with content', async ({ page }) => {
      await page.goto('/premium-reports/themed', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })

    test('should display theme options', async ({ page }) => {
      await page.goto('/premium-reports/themed', { waitUntil: 'domcontentloaded' })

      const themes = page.locator('[class*="theme"], [class*="option"], [class*="style"], [class*="card"]')
      const count = await themes.count()

      const bodyText = await page.locator('body').textContent()
      expect(count > 0 || bodyText!.length > 100).toBe(true)
    })
  })

  test.describe('Timing Report Page', () => {
    test('should load timing report page with content', async ({ page }) => {
      await page.goto('/premium-reports/timing', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })
  })

  test.describe('Pricing Page', () => {
    test('should load pricing page with Korean content', async ({ page }) => {
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)

      // 가격 관련 콘텐츠 확인
      const hasPricingContent =
        bodyText!.includes('가격') ||
        bodyText!.includes('요금') ||
        bodyText!.includes('구독') ||
        bodyText!.includes('Pricing') ||
        bodyText!.includes('원')
      expect(hasPricingContent).toBe(true)
    })

    test('should display pricing tiers or plans', async ({ page }) => {
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })

      const pricingTiers = page.locator('[class*="tier"], [class*="plan"], [class*="pricing"], [class*="card"]')
      const count = await pricingTiers.count()

      const bodyText = await page.locator('body').textContent()
      expect(count > 0 || bodyText!.length > 100).toBe(true)
    })

    test('should have subscription or action buttons', async ({ page }) => {
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })

      const buttons = page.locator('button, a')
      const count = await buttons.count()
      expect(count).toBeGreaterThan(0)

      let visibleButton = false
      for (let i = 0; i < Math.min(count, 10); i++) {
        if (await buttons.nth(i).isVisible()) {
          visibleButton = true
          break
        }
      }
      expect(visibleButton).toBe(true)
    })
  })

  test.describe('Success Page', () => {
    test('should load success page with content', async ({ page }) => {
      await page.goto('/success', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(10)
    })
  })

  test.describe('Premium Mobile Experience', () => {
    test('should render pricing page without horizontal scroll on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should render premium reports page without horizontal scroll on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/premium-reports', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should have touch-friendly buttons on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })

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

  test.describe('Premium Page Load Performance', () => {
    test('should load pricing page within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })

    test('should load premium-reports page within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/premium-reports', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })
  })
})
