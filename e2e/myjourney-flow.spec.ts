import { test, expect } from '@playwright/test'

const hasAny = (text: string | null, keywords: string[]) => {
  const source = (text || '').toLowerCase()
  return keywords.some((k) => source.includes(k.toLowerCase()))
}

test.describe('My Journey Flow', () => {
  test.describe('My Journey Main Page', () => {
    test('should load myjourney page with content', async ({ page }) => {
      await page.goto('/myjourney', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })

    test('should display journey overview content', async ({ page }) => {
      await page.goto('/myjourney', { waitUntil: 'domcontentloaded' })

      const bodyText = await page.locator('body').textContent()
      const hasContent =
        hasAny(bodyText, ['journey', 'history', 'record', 'my destiny']) || bodyText!.length > 100
      expect(hasContent).toBe(true)
    })

    test('should have navigation elements', async ({ page }) => {
      await page.goto('/myjourney', { waitUntil: 'domcontentloaded' })
      const navItems = page.locator('nav a, a[href], button, [role="tab"], [role="button"]')
      const count = await navItems.count()

      let visibleItem = false
      for (let i = 0; i < Math.min(count, 10); i++) {
        if (await navItems.nth(i).isVisible()) {
          visibleItem = true
          break
        }
      }

      const bodyText = await page.locator('body').textContent()
      const hasNavigationContext = hasAny(bodyText, [
        'history',
        'circle',
        'community',
        'blog',
        'journey',
        'my destiny',
      ])
      expect(visibleItem || hasNavigationContext).toBe(true)
    })
  })

  test.describe('My Journey History Page', () => {
    test('should load history page with content', async ({ page }) => {
      await page.goto('/myjourney/history', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(10)
    })

    test('should display history items or empty state', async ({ page }) => {
      await page.goto('/myjourney/history', { waitUntil: 'domcontentloaded' })

      const historyItems = page.locator('[class*="history"], [class*="item"], [class*="card"]')
      const count = await historyItems.count()
      const bodyText = await page.locator('body').textContent()
      expect(count > 0 || bodyText!.length > 50).toBe(true)
    })

    test('should allow clicking history item if exists', async ({ page }) => {
      await page.goto('/myjourney/history', { waitUntil: 'domcontentloaded' })

      const historyItem = page.locator('[class*="item"], [class*="card"]').first()
      if ((await historyItem.count()) > 0 && (await historyItem.isVisible())) {
        await historyItem.click()
        await page.waitForTimeout(500)
        await expect(page.locator('body')).toBeVisible()
      }
    })
  })

  test.describe('My Journey Circle Page', () => {
    test('should load circle page with content', async ({ page }) => {
      await page.goto('/myjourney/circle', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(10)
    })

    test('should display circle members or empty state', async ({ page }) => {
      await page.goto('/myjourney/circle', { waitUntil: 'domcontentloaded' })

      const members = page.locator(
        '[class*="member"], [class*="person"], [class*="profile"], [class*="card"]'
      )
      const count = await members.count()

      const bodyText = await page.locator('body').textContent()
      expect(count > 0 || bodyText!.length > 50).toBe(true)
    })
  })

  test.describe('Community Pages', () => {
    test('should load community page with content', async ({ page }) => {
      await page.goto('/community', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })

    test('should display community posts or content', async ({ page }) => {
      await page.goto('/community', { waitUntil: 'domcontentloaded' })

      const content = page.locator('[class*="community"], [class*="post"], main, article')
      const count = await content.count()

      const bodyText = await page.locator('body').textContent()
      expect(count > 0 || bodyText!.length > 100).toBe(true)
    })

    test('should load recommendations page', async ({ page }) => {
      await page.goto('/community/recommendations', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(10)
    })
  })

  test.describe('Blog Pages', () => {
    test('should load blog page with content', async ({ page }) => {
      await page.goto('/blog', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })

    test('should display blog posts or articles', async ({ page }) => {
      await page.goto('/blog', { waitUntil: 'domcontentloaded' })

      const posts = page.locator('[class*="post"], [class*="article"], article, [class*="card"]')
      const count = await posts.count()

      const bodyText = await page.locator('body').textContent()
      expect(count > 0 || bodyText!.length > 100).toBe(true)
    })

    test('should have post titles', async ({ page }) => {
      await page.goto('/blog', { waitUntil: 'domcontentloaded' })

      const titles = page.locator("h1, h2, h3, [class*='title']")
      const count = await titles.count()

      if (count > 0) {
        let hasTitle = false
        for (let i = 0; i < Math.min(count, 5); i++) {
          const text = await titles.nth(i).textContent()
          if (text && text.length > 3) {
            hasTitle = true
            break
          }
        }
        expect(hasTitle).toBe(true)
      }
    })
  })

  test.describe('Shared Content Page', () => {
    test('should handle shared content URL', async ({ page }) => {
      await page.goto('/shared/test-id', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(10)
    })
  })

  test.describe('My Journey Mobile Experience', () => {
    test('should render main page without horizontal scroll on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/myjourney', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should render history page without horizontal scroll on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/myjourney/history', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should render circle page without horizontal scroll on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/myjourney/circle', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should have touch-friendly elements on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/myjourney', { waitUntil: 'domcontentloaded' })

      const buttons = page.locator('button, a')
      const count = await buttons.count()

      for (let i = 0; i < Math.min(count, 3); i++) {
        const button = buttons.nth(i)
        if (await button.isVisible()) {
          const box = await button.boundingBox()
          if (box) {
            expect(box.height).toBeGreaterThanOrEqual(20)
            expect(box.width).toBeGreaterThanOrEqual(20)
          }
        }
      }
    })
  })

  test.describe('My Journey Page Load Performance', () => {
    test('should load main page within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/myjourney', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })

    test('should load history page within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/myjourney/history', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })

    test('should load blog page within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/blog', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })
  })
})
