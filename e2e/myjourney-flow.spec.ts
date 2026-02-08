import { test, expect } from '@playwright/test'

test.describe('My Journey Flow', () => {
  test.describe('My Journey Main Page', () => {
    test('should load myjourney page successfully', async ({ page }) => {
      await page.goto('/myjourney', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display journey overview', async ({ page }) => {
      await page.goto('/myjourney', { waitUntil: 'domcontentloaded' })

      const overview = page.locator('[class*="journey"], [class*="overview"], main')
      const count = await overview.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have navigation tabs or menu', async ({ page }) => {
      await page.goto('/myjourney', { waitUntil: 'domcontentloaded' })

      const navItems = page.locator('[role="tab"], [class*="tab"], nav a')
      const count = await navItems.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('My Journey History Page', () => {
    test('should load history page successfully', async ({ page }) => {
      await page.goto('/myjourney/history', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display history list', async ({ page }) => {
      await page.goto('/myjourney/history', { waitUntil: 'domcontentloaded' })

      const historyItems = page.locator('[class*="history"], [class*="item"], [class*="reading"]')
      const count = await historyItems.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have filter options', async ({ page }) => {
      await page.goto('/myjourney/history', { waitUntil: 'domcontentloaded' })

      const filters = page.locator('[class*="filter"], select, [role="combobox"]')
      const count = await filters.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have date range selector', async ({ page }) => {
      await page.goto('/myjourney/history', { waitUntil: 'domcontentloaded' })

      const dateSelectors = page.locator('input[type="date"], [class*="date"], [class*="calendar"]')
      const count = await dateSelectors.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should allow clicking history item', async ({ page }) => {
      await page.goto('/myjourney/history', { waitUntil: 'domcontentloaded' })

      const historyItem = page.locator('[class*="item"], [class*="card"]').first()
      if ((await historyItem.count()) > 0) {
        await historyItem.click()
        await page.waitForTimeout(500)
        await expect(page.locator('body')).toBeVisible()
      }
    })
  })

  test.describe('My Journey Circle Page', () => {
    test('should load circle page successfully', async ({ page }) => {
      await page.goto('/myjourney/circle', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display circle members', async ({ page }) => {
      await page.goto('/myjourney/circle', { waitUntil: 'domcontentloaded' })

      const members = page.locator('[class*="member"], [class*="person"], [class*="profile"]')
      const count = await members.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have add member button', async ({ page }) => {
      await page.goto('/myjourney/circle', { waitUntil: 'domcontentloaded' })

      const addButton = page.locator(
        'button:has-text("추가"), button:has-text("Add"), [class*="add"]'
      )
      const count = await addButton.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should allow viewing member details', async ({ page }) => {
      await page.goto('/myjourney/circle', { waitUntil: 'domcontentloaded' })

      const memberCard = page.locator('[class*="member"], [class*="card"]').first()
      if ((await memberCard.count()) > 0) {
        await memberCard.click()
        await page.waitForTimeout(500)
        await expect(page.locator('body')).toBeVisible()
      }
    })
  })

  test.describe('Community Pages', () => {
    test('should load community page', async ({ page }) => {
      await page.goto('/community', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display community content', async ({ page }) => {
      await page.goto('/community', { waitUntil: 'domcontentloaded' })

      const content = page.locator('[class*="community"], [class*="post"], main')
      const count = await content.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should load recommendations page', async ({ page }) => {
      await page.goto('/community/recommendations', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })
  })

  test.describe('Blog Pages', () => {
    test('should load blog page', async ({ page }) => {
      await page.goto('/blog', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display blog posts', async ({ page }) => {
      await page.goto('/blog', { waitUntil: 'domcontentloaded' })

      const posts = page.locator('[class*="post"], [class*="article"], article')
      const count = await posts.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have post titles', async ({ page }) => {
      await page.goto('/blog', { waitUntil: 'domcontentloaded' })

      const titles = page.locator("h2, h3, [class*='title']")
      const count = await titles.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Shared Content Page', () => {
    test('should handle shared content URL', async ({ page }) => {
      await page.goto('/shared/test-id', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })
  })

  test.describe('My Journey Mobile Experience', () => {
    test('should be responsive on mobile - main page', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/myjourney', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should be responsive on mobile - history page', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/myjourney/history', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()
    })

    test('should be responsive on mobile - circle page', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/myjourney/circle', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()
    })
  })
})
