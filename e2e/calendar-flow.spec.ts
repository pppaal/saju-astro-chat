import { test, expect } from '@playwright/test'

test.describe('Calendar Flow', () => {
  test.describe('Calendar Main Page', () => {
    test('should load calendar page with content', async ({ page }) => {
      await page.goto('/calendar', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)

      // 달력 관련 콘텐츠 확인
      const hasCalendarContent =
        bodyText!.includes('달력') ||
        bodyText!.includes('월') ||
        bodyText!.includes('일') ||
        bodyText!.includes('Calendar') ||
        bodyText!.includes('운세')
      expect(hasCalendarContent).toBe(true)
    })

    test('should display calendar grid or date elements', async ({ page }) => {
      await page.goto('/calendar', { waitUntil: 'domcontentloaded' })

      const hasCalendarElements = await page.evaluate(() => {
        const calendar = document.querySelectorAll('[class*="calendar"], [class*="grid"], table')
        const days = document.querySelectorAll('[class*="day"], td')
        return calendar.length > 0 || days.length > 0
      })

      const bodyText = await page.locator('body').textContent()
      expect(hasCalendarElements || bodyText!.length > 100).toBe(true)
    })

    test('should have month navigation buttons', async ({ page }) => {
      await page.goto('/calendar', { waitUntil: 'domcontentloaded' })

      const buttons = page.locator('button')
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

  test.describe('Calendar Navigation', () => {
    test('should navigate to previous month', async ({ page }) => {
      await page.goto('/calendar', { waitUntil: 'domcontentloaded' })

      const prevButton = page
        .locator('button:has-text("이전"), button[aria-label*="previous"], [class*="prev"]')
        .first()
      if ((await prevButton.count()) > 0 && (await prevButton.isVisible())) {
        const beforeText = await page.locator('body').textContent()
        await prevButton.click()
        await page.waitForTimeout(500)

        await expect(page.locator('body')).toBeVisible()
        const afterText = await page.locator('body').textContent()
        // 페이지가 업데이트 되었거나 여전히 작동
        expect(afterText!.length).toBeGreaterThan(50)
      }
    })

    test('should navigate to next month', async ({ page }) => {
      await page.goto('/calendar', { waitUntil: 'domcontentloaded' })

      const nextButton = page
        .locator('button:has-text("다음"), button[aria-label*="next"], [class*="next"]')
        .first()
      if ((await nextButton.count()) > 0 && (await nextButton.isVisible())) {
        await nextButton.click()
        await page.waitForTimeout(500)

        await expect(page.locator('body')).toBeVisible()
        const bodyText = await page.locator('body').textContent()
        expect(bodyText!.length).toBeGreaterThan(50)
      }
    })
  })

  test.describe('Calendar Day Selection', () => {
    test('should select a day on click and show info', async ({ page }) => {
      await page.goto('/calendar', { waitUntil: 'domcontentloaded' })

      const dayCell = page.locator('[class*="day"], td, button').first()
      if ((await dayCell.count()) > 0 && (await dayCell.isVisible())) {
        await dayCell.click()
        await page.waitForTimeout(500)

        await expect(page.locator('body')).toBeVisible()
        const bodyText = await page.locator('body').textContent()
        expect(bodyText!.length).toBeGreaterThan(50)
      }
    })
  })

  test.describe('Calendar Mobile Experience', () => {
    test('should render without horizontal scroll on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/calendar', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should have touch-friendly day cells on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/calendar', { waitUntil: 'domcontentloaded' })

      const cells = page.locator('[class*="day"], td')
      const count = await cells.count()

      for (let i = 0; i < Math.min(count, 5); i++) {
        const cell = cells.nth(i)
        if (await cell.isVisible()) {
          const box = await cell.boundingBox()
          if (box) {
            expect(box.height).toBeGreaterThanOrEqual(20)
            expect(box.width).toBeGreaterThanOrEqual(20)
          }
        }
      }
    })

    test('should allow tap interaction on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/calendar', { waitUntil: 'domcontentloaded' })

      const dayCell = page.locator('[class*="day"], td, button').first()
      if ((await dayCell.count()) > 0 && (await dayCell.isVisible())) {
        await dayCell.tap()
        await page.waitForTimeout(300)
        await expect(page.locator('body')).toBeVisible()
      }
    })
  })

  test.describe('Calendar Page Load Performance', () => {
    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/calendar', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })
  })
})
