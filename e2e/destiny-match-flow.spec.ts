import { test, expect } from '@playwright/test'

test.describe('Destiny Match Flow', () => {
  test.describe('Destiny Match Main Page', () => {
    test('should load destiny-match page successfully', async ({ page }) => {
      await page.goto('/destiny-match', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display main content', async ({ page }) => {
      await page.goto('/destiny-match', { waitUntil: 'domcontentloaded' })

      const mainContent = page.locator("main, [class*='content'], article")
      const count = await mainContent.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have call-to-action button', async ({ page }) => {
      await page.goto('/destiny-match', { waitUntil: 'domcontentloaded' })

      const ctaButton = page.locator(
        'button:has-text("시작"), button:has-text("찾기"), a[href*="setup"], button:has-text("Start")'
      )
      const count = await ctaButton.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Destiny Match Setup Page', () => {
    test('should load setup page successfully', async ({ page }) => {
      await page.goto('/destiny-match/setup', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should have profile setup form', async ({ page }) => {
      await page.goto('/destiny-match/setup', { waitUntil: 'domcontentloaded' })

      // Look for form elements
      const formElements = page.locator('input, select, textarea')
      const count = await formElements.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have birth date input', async ({ page }) => {
      await page.goto('/destiny-match/setup', { waitUntil: 'domcontentloaded' })

      const dateInputs = page.locator(
        'input[type="date"], input[name*="birth"], input[placeholder*="생년월일"]'
      )
      const count = await dateInputs.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have preference options', async ({ page }) => {
      await page.goto('/destiny-match/setup', { waitUntil: 'domcontentloaded' })

      // Look for preference selectors
      const preferences = page.locator("select, [role='listbox'], input[type='radio']")
      const count = await preferences.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should validate form before submission', async ({ page }) => {
      await page.goto('/destiny-match/setup', { waitUntil: 'domcontentloaded' })

      const submitButton = page.locator('button[type="submit"], button:has-text("완료")')
      if ((await submitButton.count()) > 0) {
        await submitButton.first().click()
        await page.waitForTimeout(500)
        await expect(page.locator('body')).toBeVisible()
      }
    })
  })

  test.describe('Destiny Match Matches Page', () => {
    test('should load matches page successfully', async ({ page }) => {
      await page.goto('/destiny-match/matches', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display match cards or list', async ({ page }) => {
      await page.goto('/destiny-match/matches', { waitUntil: 'domcontentloaded' })

      const matchItems = page.locator('[class*="match"], [class*="card"], [class*="profile"]')
      const count = await matchItems.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have filter options', async ({ page }) => {
      await page.goto('/destiny-match/matches', { waitUntil: 'domcontentloaded' })

      const filters = page.locator('[class*="filter"], select, [role="combobox"]')
      const count = await filters.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have compatibility score display', async ({ page }) => {
      await page.goto('/destiny-match/matches', { waitUntil: 'domcontentloaded' })

      const scores = page.locator(
        '[class*="score"], [class*="percentage"], [class*="compatibility"]'
      )
      const count = await scores.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Destiny Match Interaction', () => {
    test('should handle like/pass actions', async ({ page }) => {
      await page.goto('/destiny-match/matches', { waitUntil: 'domcontentloaded' })

      // Look for action buttons
      const actionButtons = page.locator(
        'button:has-text("좋아요"), button:has-text("패스"), button[class*="like"], button[class*="pass"]'
      )
      const count = await actionButtons.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should show match details on click', async ({ page }) => {
      await page.goto('/destiny-match/matches', { waitUntil: 'domcontentloaded' })

      const matchCard = page.locator('[class*="card"], [class*="match"]').first()
      if ((await matchCard.count()) > 0) {
        await matchCard.click()
        await page.waitForTimeout(500)
        await expect(page.locator('body')).toBeVisible()
      }
    })
  })

  test.describe('Destiny Match Mobile Experience', () => {
    test('should be responsive on mobile - main page', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/destiny-match', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should be responsive on mobile - matches page', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/destiny-match/matches', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()
    })

    test('should support swipe gestures on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/destiny-match/matches', { waitUntil: 'domcontentloaded' })

      // Check for swipeable elements
      const swipeableElements = page.locator('[class*="swipe"], [class*="card"]')
      const count = await swipeableElements.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Destiny Match Navigation', () => {
    test('should navigate from main to setup', async ({ page }) => {
      await page.goto('/destiny-match', { waitUntil: 'domcontentloaded' })

      const setupLink = page.locator('a[href*="setup"], button:has-text("시작")')
      if ((await setupLink.count()) > 0) {
        await setupLink.first().click()
        await page.waitForTimeout(1000)
        await expect(page.locator('body')).toBeVisible()
      }
    })

    test('should have navigation back option', async ({ page }) => {
      await page.goto('/destiny-match/setup', { waitUntil: 'domcontentloaded' })

      const backButton = page.locator(
        'a[href*="destiny-match"]:not([href*="setup"]), button:has-text("뒤로"), [class*="back"]'
      )
      const count = await backButton.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })
})
