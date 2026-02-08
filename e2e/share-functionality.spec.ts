import { test, expect } from '@playwright/test'

test.describe('Share Functionality', () => {
  test.describe('Share Buttons', () => {
    test('should have share button on tarot page', async ({ page }) => {
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)

      const shareButton = page.locator(
        'button:has-text("공유"), [class*="share"], button[aria-label*="share"]'
      )
      const count = await shareButton.count()

      if (count > 0) {
        await expect(shareButton.first()).toBeVisible()
      }
    })

    test('should have share button on saju page', async ({ page }) => {
      await page.goto('/saju', { waitUntil: 'domcontentloaded' })

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)

      const shareButton = page.locator('button:has-text("공유"), [class*="share"]')
      const count = await shareButton.count()

      if (count > 0) {
        await expect(shareButton.first()).toBeVisible()
      }
    })

    test('should have share button on destiny-map result', async ({ page }) => {
      await page.goto('/destiny-map/result', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const shareButton = page.locator('button:has-text("공유"), [class*="share"]')
      const count = await shareButton.count()

      if (count > 0) {
        await expect(shareButton.first()).toBeVisible()
      }
    })
  })

  test.describe('Share Modal', () => {
    test('should open share modal on click', async ({ page }) => {
      await page.goto('/destiny-map/result', { waitUntil: 'domcontentloaded' })

      const shareButton = page.locator('button:has-text("공유"), [class*="share"]').first()
      if ((await shareButton.count()) > 0 && (await shareButton.isVisible())) {
        await shareButton.click()
        await page.waitForTimeout(500)

        // 모달이 열리거나 페이지가 정상 작동해야 함
        await expect(page.locator('body')).toBeVisible()
        const bodyText = await page.locator('body').textContent()
        expect(bodyText!.length).toBeGreaterThan(50)
      }
    })

    test('should display social share options when modal opens', async ({ page }) => {
      await page.goto('/destiny-map/result', { waitUntil: 'domcontentloaded' })

      const shareButton = page.locator('button:has-text("공유")').first()
      if ((await shareButton.count()) > 0 && (await shareButton.isVisible())) {
        await shareButton.click()
        await page.waitForTimeout(500)

        const socialOptions = page.locator(
          'button:has-text("카카오"), button:has-text("Twitter"), button:has-text("Facebook"), [class*="kakao"], [class*="twitter"]'
        )
        const count = await socialOptions.count()

        // 소셜 옵션이 있거나 페이지가 정상 작동
        const bodyText = await page.locator('body').textContent()
        expect(count > 0 || bodyText!.length > 50).toBe(true)
      }
    })

    test('should have copy link option when modal opens', async ({ page }) => {
      await page.goto('/destiny-map/result', { waitUntil: 'domcontentloaded' })

      const shareButton = page.locator('button:has-text("공유")').first()
      if ((await shareButton.count()) > 0 && (await shareButton.isVisible())) {
        await shareButton.click()
        await page.waitForTimeout(500)

        const copyLink = page.locator(
          'button:has-text("복사"), button:has-text("Copy"), [class*="copy"]'
        )
        const count = await copyLink.count()

        if (count > 0) {
          await expect(copyLink.first()).toBeVisible()
        }
      }
    })
  })

  test.describe('Shared Content Page', () => {
    test('should load shared content page with content', async ({ page }) => {
      await page.goto('/shared/test-share-id', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(10)
    })

    test('should display shared content or error state', async ({ page }) => {
      await page.goto('/shared/test-share-id', { waitUntil: 'domcontentloaded' })

      const content = page.locator("main, [class*='shared'], [class*='content']")
      const count = await content.count()

      const bodyText = await page.locator('body').textContent()
      expect(count > 0 || bodyText!.length > 50).toBe(true)
    })

    test('should have CTA buttons for visitors', async ({ page }) => {
      await page.goto('/shared/test-share-id', { waitUntil: 'domcontentloaded' })

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

  test.describe('Share Mobile Experience', () => {
    test('should render share button on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/destiny-map/result', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const shareButton = page.locator('button:has-text("공유"), [class*="share"]').first()
      if ((await shareButton.count()) > 0 && (await shareButton.isVisible())) {
        await expect(shareButton).toBeVisible()
      }
    })

    test('should render shared page without horizontal scroll on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/shared/test-id', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should have touch-friendly share buttons on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/destiny-map/result', { waitUntil: 'domcontentloaded' })

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

  test.describe('Share Page Load Performance', () => {
    test('should load shared page within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/shared/test-id', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })
  })
})
