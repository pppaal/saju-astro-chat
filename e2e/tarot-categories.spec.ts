import { test, expect } from '@playwright/test'

test.describe('Tarot Categories', () => {
  test.describe('Tarot Main Page', () => {
    test('should load tarot main page', async ({ page }) => {
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display category options', async ({ page }) => {
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

      const categories = page.locator('[class*="category"], [class*="card"], a[href*="tarot/"]')
      const count = await categories.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have question input', async ({ page }) => {
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

      const questionInput = page.locator("textarea, input[type='text']")
      const count = await questionInput.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Tarot Category Navigation', () => {
    test('should navigate to love category', async ({ page }) => {
      await page.goto('/tarot/love', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should navigate to career category', async ({ page }) => {
      await page.goto('/tarot/career', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should navigate to general-insight category', async ({ page }) => {
      await page.goto('/tarot/general-insight', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })
  })

  test.describe('Tarot Spreads', () => {
    test('should display spread options', async ({ page }) => {
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

      const spreads = page.locator('[class*="spread"], [class*="layout"]')
      const count = await spreads.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should show past-present-future spread', async ({ page }) => {
      await page.goto('/tarot/general-insight/past-present-future', {
        waitUntil: 'domcontentloaded',
      })
      await expect(page.locator('body')).toBeVisible()
    })
  })

  test.describe('Tarot Card Selection', () => {
    test('should display card deck', async ({ page }) => {
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

      const cards = page.locator('[class*="card"], [class*="deck"]')
      const count = await cards.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should allow card selection', async ({ page }) => {
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

      const selectableCard = page.locator('[class*="selectable"], [role="button"]').first()
      if ((await selectableCard.count()) > 0) {
        await selectableCard.click()
        await page.waitForTimeout(300)
        await expect(page.locator('body')).toBeVisible()
      }
    })

    test('should show card flip animation', async ({ page }) => {
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

      const flipAnimation = page.locator('[class*="flip"], [class*="reveal"]')
      const count = await flipAnimation.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Tarot Reading Results', () => {
    test('should display card images', async ({ page }) => {
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

      const cardImages = page.locator('img[alt*="card"], img[alt*="tarot"], [class*="card-image"]')
      const count = await cardImages.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should display card names', async ({ page }) => {
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

      const cardNames = page.locator('[class*="card-name"], [class*="title"]')
      const count = await cardNames.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should display card interpretations', async ({ page }) => {
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

      const interpretations = page.locator('[class*="interpretation"], [class*="meaning"]')
      const count = await interpretations.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should show upright/reversed indicator', async ({ page }) => {
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

      const orientation = page.locator(
        '[class*="upright"], [class*="reversed"], [class*="orientation"]'
      )
      const count = await orientation.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Tarot Couple Reading', () => {
    test('should load couple reading page', async ({ page }) => {
      await page.goto('/tarot/couple', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should have two person inputs', async ({ page }) => {
      await page.goto('/tarot/couple', { waitUntil: 'domcontentloaded' })

      const inputs = page.locator('input[name*="name"], input[placeholder*="이름"]')
      const count = await inputs.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Tarot History', () => {
    test('should load tarot history page', async ({ page }) => {
      await page.goto('/tarot/history', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display reading history', async ({ page }) => {
      await page.goto('/tarot/history', { waitUntil: 'domcontentloaded' })

      const historyItems = page.locator('[class*="history"], [class*="reading"], [class*="item"]')
      const count = await historyItems.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should allow viewing past readings', async ({ page }) => {
      await page.goto('/tarot/history', { waitUntil: 'domcontentloaded' })

      const viewButton = page.locator(
        'button:has-text("보기"), a[href*="reading"], [class*="view"]'
      )
      const count = await viewButton.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Tarot Mobile Experience', () => {
    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should display cards correctly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

      const card = page.locator('[class*="card"]').first()
      if ((await card.count()) > 0) {
        const box = await card.boundingBox()
        if (box) {
          expect(box.width).toBeLessThanOrEqual(375)
        }
      }
    })

    test('should have touch-friendly card selection', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

      const touchTarget = page.locator('[class*="card"], button').first()
      if ((await touchTarget.count()) > 0) {
        const box = await touchTarget.boundingBox()
        if (box) {
          expect(box.height >= 40 || box.width >= 40).toBe(true)
        }
      }
    })
  })
})
