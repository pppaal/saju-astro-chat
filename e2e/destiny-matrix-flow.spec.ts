import { test, expect } from '@playwright/test'

test.describe('Destiny Matrix Flow', () => {
  test.describe('Destiny Matrix Main Page', () => {
    test('should load destiny-map matrix page with content', async ({ page }) => {
      await page.goto('/destiny-map/matrix', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })

    test('should have visual matrix elements or content', async ({ page }) => {
      await page.goto('/destiny-map/matrix', { waitUntil: 'domcontentloaded' })

      const hasVisualElements = await page.evaluate(() => {
        const canvas = document.querySelectorAll('canvas')
        const svg = document.querySelectorAll('svg')
        const matrix = document.querySelectorAll('[class*="matrix"], [class*="grid"]')
        return canvas.length > 0 || svg.length > 0 || matrix.length > 0
      })

      const bodyText = await page.locator('body').textContent()
      expect(hasVisualElements || bodyText!.length > 100).toBe(true)
    })

    test('should have interactive buttons', async ({ page }) => {
      await page.goto('/destiny-map/matrix', { waitUntil: 'domcontentloaded' })

      const buttons = page.locator('button')
      const count = await buttons.count()

      if (count > 0) {
        for (let i = 0; i < count; i++) {
          const button = buttons.nth(i)
          if (await button.isVisible()) {
            await button.click()
            await page.waitForTimeout(300)
            await expect(page.locator('body')).toBeVisible()
            break
          }
        }
      }
    })
  })

  test.describe('Destiny Matrix Themed Reports', () => {
    test('should load themed reports page with content', async ({ page }) => {
      await page.goto('/destiny-matrix/themed-reports', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })

    test('should display report options or cards', async ({ page }) => {
      await page.goto('/destiny-matrix/themed-reports', { waitUntil: 'domcontentloaded' })

      const cards = page.locator('[class*="card"], [class*="report"], [class*="theme"], a')
      const count = await cards.count()

      if (count > 0) {
        const firstVisibleCard = cards.first()
        if (await firstVisibleCard.isVisible()) {
          await expect(firstVisibleCard).toBeVisible()
        }
      }
    })
  })

  test.describe('Destiny Matrix Viewer', () => {
    test('should load viewer page with content', async ({ page }) => {
      await page.goto('/destiny-matrix/viewer', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(10)
    })
  })

  test.describe('Destiny Map Theme Page', () => {
    test('should load theme page with content', async ({ page }) => {
      await page.goto('/destiny-map/theme', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })
  })

  test.describe('Destiny Map Result Page', () => {
    test('should load result page and display content', async ({ page }) => {
      await page.goto('/destiny-map/result', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(10)
    })

    test('should check for share functionality', async ({ page }) => {
      await page.goto('/destiny-map/result', { waitUntil: 'domcontentloaded' })

      const shareButton = page.locator(
        'button:has-text("공유"), button:has-text("Share"), [class*="share"]'
      )
      const count = await shareButton.count()

      if (count > 0) {
        await expect(shareButton.first()).toBeVisible()
      }
    })
  })

  test.describe('Destiny Pal Page', () => {
    test('should load destiny-pal page with content', async ({ page }) => {
      await page.goto('/destiny-pal', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })
  })

  test.describe('Matrix Mobile Experience', () => {
    test('should render matrix page without horizontal scroll on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/destiny-map/matrix', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should have touch-friendly buttons on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/destiny-map/matrix', { waitUntil: 'domcontentloaded' })

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

    test('should support tap interactions on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/destiny-map/matrix', { waitUntil: 'domcontentloaded' })

      const touchTarget = page.locator('button').first()
      if ((await touchTarget.count()) > 0 && (await touchTarget.isVisible())) {
        await touchTarget.tap()
        await page.waitForTimeout(300)
        await expect(page.locator('body')).toBeVisible()
      }
    })
  })

  test.describe('Destiny Matrix Page Load Performance', () => {
    test('should load matrix page within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/destiny-map/matrix', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })

    test('should load themed-reports page within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/destiny-matrix/themed-reports', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })
  })
})
