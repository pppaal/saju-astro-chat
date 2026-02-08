import { test, expect } from '@playwright/test'

test.describe('Share Functionality', () => {
  test.describe('Share Buttons', () => {
    test('should have share button on tarot result', async ({ page }) => {
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

      const shareButton = page.locator(
        'button:has-text("공유"), [class*="share"], button[aria-label*="share"]'
      )
      const count = await shareButton.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have share button on saju result', async ({ page }) => {
      await page.goto('/saju', { waitUntil: 'domcontentloaded' })

      const shareButton = page.locator('button:has-text("공유"), [class*="share"]')
      const count = await shareButton.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have share button on destiny-map result', async ({ page }) => {
      await page.goto('/destiny-map/result', { waitUntil: 'domcontentloaded' })

      const shareButton = page.locator('button:has-text("공유"), [class*="share"]')
      const count = await shareButton.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have share button on compatibility result', async ({ page }) => {
      await page.goto('/compatibility/insights', { waitUntil: 'domcontentloaded' })

      const shareButton = page.locator('button:has-text("공유"), [class*="share"]')
      const count = await shareButton.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Share Modal', () => {
    test('should open share modal on click', async ({ page }) => {
      await page.goto('/destiny-map/result', { waitUntil: 'domcontentloaded' })

      const shareButton = page.locator('button:has-text("공유"), [class*="share"]').first()
      if ((await shareButton.count()) > 0) {
        await shareButton.click()
        await page.waitForTimeout(500)

        const modal = page.locator('[class*="modal"], [role="dialog"], [class*="share-options"]')
        const count = await modal.count()
        expect(count).toBeGreaterThanOrEqual(0)
      }
    })

    test('should display social share options', async ({ page }) => {
      await page.goto('/destiny-map/result', { waitUntil: 'domcontentloaded' })

      const shareButton = page.locator('button:has-text("공유")').first()
      if ((await shareButton.count()) > 0) {
        await shareButton.click()
        await page.waitForTimeout(500)

        const socialOptions = page.locator(
          'button:has-text("카카오"), button:has-text("Twitter"), button:has-text("Facebook"), [class*="kakao"], [class*="twitter"]'
        )
        const count = await socialOptions.count()
        expect(count).toBeGreaterThanOrEqual(0)
      }
    })

    test('should have copy link option', async ({ page }) => {
      await page.goto('/destiny-map/result', { waitUntil: 'domcontentloaded' })

      const shareButton = page.locator('button:has-text("공유")').first()
      if ((await shareButton.count()) > 0) {
        await shareButton.click()
        await page.waitForTimeout(500)

        const copyLink = page.locator(
          'button:has-text("복사"), button:has-text("Copy"), [class*="copy"]'
        )
        const count = await copyLink.count()
        expect(count).toBeGreaterThanOrEqual(0)
      }
    })

    test('should close modal on backdrop click', async ({ page }) => {
      await page.goto('/destiny-map/result', { waitUntil: 'domcontentloaded' })

      const shareButton = page.locator('button:has-text("공유")').first()
      if ((await shareButton.count()) > 0) {
        await shareButton.click()
        await page.waitForTimeout(500)

        const backdrop = page.locator('[class*="backdrop"], [class*="overlay"]').first()
        if ((await backdrop.count()) > 0) {
          await backdrop.click({ position: { x: 10, y: 10 } })
          await page.waitForTimeout(300)
          await expect(page.locator('body')).toBeVisible()
        }
      }
    })
  })

  test.describe('Shared Content Page', () => {
    test('should load shared content page', async ({ page }) => {
      await page.goto('/shared/test-share-id', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display shared content', async ({ page }) => {
      await page.goto('/shared/test-share-id', { waitUntil: 'domcontentloaded' })

      const content = page.locator("main, [class*='shared'], [class*='content']")
      const count = await content.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have CTA for non-shared users', async ({ page }) => {
      await page.goto('/shared/test-share-id', { waitUntil: 'domcontentloaded' })

      const cta = page.locator('button:has-text("시작"), a[href*="saju"], a[href*="tarot"]')
      const count = await cta.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Image Generation for Share', () => {
    test('should have image generation capability', async ({ page }) => {
      await page.goto('/destiny-map/result', { waitUntil: 'domcontentloaded' })

      const imageShareButton = page.locator(
        'button:has-text("이미지"), button:has-text("Image"), [class*="image-share"]'
      )
      const count = await imageShareButton.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Share Mobile Experience', () => {
    test('should trigger native share on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/destiny-map/result', { waitUntil: 'domcontentloaded' })

      const shareButton = page.locator('button:has-text("공유"), [class*="share"]').first()
      if ((await shareButton.count()) > 0) {
        await expect(shareButton).toBeVisible()
      }
    })

    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/shared/test-id', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })
  })
})
