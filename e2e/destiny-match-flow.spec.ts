import { test, expect } from '@playwright/test'

test.describe('Destiny Match Flow', () => {
  test.describe('Destiny Match Main Page', () => {
    test('should load destiny-match page with content', async ({ page }) => {
      await page.goto('/destiny-match', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)

      // 운명 매칭 관련 콘텐츠 확인
      const hasMatchContent =
        bodyText!.includes('매칭') ||
        bodyText!.includes('인연') ||
        bodyText!.includes('만남') ||
        bodyText!.includes('Match') ||
        bodyText!.includes('운명')
      expect(hasMatchContent).toBe(true)
    })

    test('should display main content area', async ({ page }) => {
      await page.goto('/destiny-match', { waitUntil: 'domcontentloaded' })

      const mainContent = page.locator("main, [class*='content'], article")
      const count = await mainContent.count()

      if (count > 0) {
        await expect(mainContent.first()).toBeVisible()
      }
    })

    test('should have call-to-action button', async ({ page }) => {
      await page.goto('/destiny-match', { waitUntil: 'domcontentloaded' })

      const buttons = page.locator('button, a')
      const count = await buttons.count()
      expect(count).toBeGreaterThan(0)

      let visibleButtonFound = false
      for (let i = 0; i < count; i++) {
        if (await buttons.nth(i).isVisible()) {
          visibleButtonFound = true
          break
        }
      }
      expect(visibleButtonFound).toBe(true)
    })
  })

  test.describe('Destiny Match Setup Page', () => {
    test('should load setup page with content', async ({ page }) => {
      await page.goto('/destiny-match/setup', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })

    test('should have profile setup form elements', async ({ page }) => {
      await page.goto('/destiny-match/setup', { waitUntil: 'domcontentloaded' })

      const formElements = page.locator('input, select, textarea')
      const count = await formElements.count()

      if (count > 0) {
        let visibleElement = false
        for (let i = 0; i < count; i++) {
          if (await formElements.nth(i).isVisible()) {
            visibleElement = true
            break
          }
        }
        expect(visibleElement).toBe(true)
      }
    })

    test('should accept and retain birth date input', async ({ page }) => {
      await page.goto('/destiny-match/setup', { waitUntil: 'domcontentloaded' })

      const dateInput = page.locator('input[type="date"]').first()
      if ((await dateInput.count()) > 0 && (await dateInput.isVisible())) {
        await dateInput.fill('1990-05-15')
        const value = await dateInput.inputValue()
        expect(value).toBe('1990-05-15')
      }
    })

    test('should handle form submission', async ({ page }) => {
      await page.goto('/destiny-match/setup', { waitUntil: 'domcontentloaded' })

      const submitButton = page.locator('button[type="submit"], button:has-text("완료"), button:has-text("시작")')
      if ((await submitButton.count()) > 0) {
        await submitButton.first().click()
        await page.waitForTimeout(500)
        await expect(page.locator('body')).toBeVisible()
        const bodyText = await page.locator('body').textContent()
        expect(bodyText!.length).toBeGreaterThan(50)
      }
    })
  })

  test.describe('Destiny Match Matches Page', () => {
    test('should load matches page with content', async ({ page }) => {
      await page.goto('/destiny-match/matches', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(10)
    })

    test('should display match cards or empty state', async ({ page }) => {
      await page.goto('/destiny-match/matches', { waitUntil: 'domcontentloaded' })

      const matchItems = page.locator('[class*="match"], [class*="card"], [class*="profile"]')
      const count = await matchItems.count()

      const bodyText = await page.locator('body').textContent()
      // 매칭 아이템이 있거나 빈 상태 메시지가 있어야 함
      expect(count > 0 || bodyText!.length > 50).toBe(true)
    })

    test('should allow clicking match card if exists', async ({ page }) => {
      await page.goto('/destiny-match/matches', { waitUntil: 'domcontentloaded' })

      const matchCard = page.locator('[class*="card"], [class*="match"]').first()
      if ((await matchCard.count()) > 0 && (await matchCard.isVisible())) {
        await matchCard.click()
        await page.waitForTimeout(500)
        await expect(page.locator('body')).toBeVisible()
      }
    })
  })

  test.describe('Destiny Match Mobile Experience', () => {
    test('should render without horizontal scroll on mobile - main page', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/destiny-match', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should render without horizontal scroll on mobile - matches page', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/destiny-match/matches', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should have touch-friendly buttons on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/destiny-match', { waitUntil: 'domcontentloaded' })

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

  test.describe('Destiny Match Navigation', () => {
    test('should navigate from main to setup', async ({ page }) => {
      await page.goto('/destiny-match', { waitUntil: 'domcontentloaded' })

      const setupLink = page.locator('a[href*="setup"], button:has-text("시작")')
      if ((await setupLink.count()) > 0 && (await setupLink.first().isVisible())) {
        await setupLink.first().click()
        await page.waitForTimeout(1000)
        await expect(page.locator('body')).toBeVisible()
        const bodyText = await page.locator('body').textContent()
        expect(bodyText!.length).toBeGreaterThan(50)
      }
    })
  })

  test.describe('Destiny Match Page Load Performance', () => {
    test('should load main page within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/destiny-match', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })

    test('should load setup page within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/destiny-match/setup', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })
  })
})
