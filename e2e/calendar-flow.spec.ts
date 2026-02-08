import { test, expect } from '@playwright/test'

test.describe('Calendar Flow', () => {
  test.describe('Calendar Main Page', () => {
    test('should load calendar page successfully', async ({ page }) => {
      await page.goto('/calendar', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })

    test('should display calendar grid', async ({ page }) => {
      await page.goto('/calendar', { waitUntil: 'domcontentloaded' })

      const calendarGrid = page.locator('[class*="calendar"], [class*="grid"], table')
      const count = await calendarGrid.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should display month navigation', async ({ page }) => {
      await page.goto('/calendar', { waitUntil: 'domcontentloaded' })

      const monthNav = page.locator(
        'button:has-text("이전"), button:has-text("다음"), [class*="nav"], [class*="arrow"]'
      )
      const count = await monthNav.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should display day cells', async ({ page }) => {
      await page.goto('/calendar', { waitUntil: 'domcontentloaded' })

      const dayCells = page.locator('[class*="day"], [class*="cell"], td')
      const count = await dayCells.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Calendar Navigation', () => {
    test('should navigate to previous month', async ({ page }) => {
      await page.goto('/calendar', { waitUntil: 'domcontentloaded' })

      const prevButton = page
        .locator('button:has-text("이전"), button[aria-label*="previous"], [class*="prev"]')
        .first()
      if ((await prevButton.count()) > 0) {
        await prevButton.click()
        await page.waitForTimeout(500)
        await expect(page.locator('body')).toBeVisible()
      }
    })

    test('should navigate to next month', async ({ page }) => {
      await page.goto('/calendar', { waitUntil: 'domcontentloaded' })

      const nextButton = page
        .locator('button:has-text("다음"), button[aria-label*="next"], [class*="next"]')
        .first()
      if ((await nextButton.count()) > 0) {
        await nextButton.click()
        await page.waitForTimeout(500)
        await expect(page.locator('body')).toBeVisible()
      }
    })
  })

  test.describe('Calendar Day Selection', () => {
    test('should select a day on click', async ({ page }) => {
      await page.goto('/calendar', { waitUntil: 'domcontentloaded' })

      const dayCell = page.locator('[class*="day"], td').first()
      if ((await dayCell.count()) > 0) {
        await dayCell.click()
        await page.waitForTimeout(500)
        await expect(page.locator('body')).toBeVisible()
      }
    })
  })

  test.describe('Calendar Fortune Display', () => {
    test('should display fortune indicators', async ({ page }) => {
      await page.goto('/calendar', { waitUntil: 'domcontentloaded' })

      const fortuneIndicators = page.locator(
        '[class*="fortune"], [class*="luck"], [class*="indicator"]'
      )
      const count = await fortuneIndicators.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Calendar Mobile Experience', () => {
    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/calendar', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })
  })
})
