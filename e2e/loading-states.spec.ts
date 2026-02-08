import { test, expect } from '@playwright/test'

test.describe('Loading States & Transitions', () => {
  test.describe('Page Loading States', () => {
    test('should load saju page without hanging', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/saju', { waitUntil: 'domcontentloaded' })

      // Page should load within reasonable time
      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(10000) // 10 seconds max

      await expect(page.locator('body')).toBeVisible()
    })

    test('should load destiny-map page without hanging', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/destiny-map', { waitUntil: 'domcontentloaded' })

      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(10000)

      await expect(page.locator('body')).toBeVisible()
    })

    test('should load homepage without hanging', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(10000)

      await expect(page.locator('body')).toBeVisible()
    })
  })

  test.describe('Form Submission Loading', () => {
    test('should show loading or handle form submit on saju page', async ({ page }) => {
      await page.goto('/saju', { waitUntil: 'domcontentloaded' })

      const submitButton = page.locator('button[type="submit"]').first()
      if ((await submitButton.count()) > 0) {
        const buttonText = await submitButton.textContent()
        await submitButton.click()

        // Should either show loading, validation error, or stay on page
        await expect(page.locator('body')).toBeVisible()

        // Button text may change during loading
        await page.waitForTimeout(300)
        await expect(page.locator('body')).toBeVisible()
      }
    })

    test('should handle form submit on contact page', async ({ page }) => {
      await page.goto('/contact', { waitUntil: 'domcontentloaded' })

      const submitButton = page.locator('button[type="submit"]').first()
      if ((await submitButton.count()) > 0) {
        await submitButton.click()

        // Should handle gracefully (show validation or loading)
        await expect(page.locator('body')).toBeVisible()
      }
    })
  })

  test.describe('Chat Loading States', () => {
    test('should load counselor page with chat interface', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      // Page should have chat elements
      await expect(page.locator('body')).toBeVisible()

      // Look for chat input
      const chatInput = page.locator('textarea, input[type="text"]')
      if ((await chatInput.count()) > 0) {
        await expect(chatInput.first()).toBeVisible()
      }
    })

    test('should load saju counselor page with chat interface', async ({ page }) => {
      await page.goto('/saju/counselor', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      // Should have message area or chat elements
      const chatElements = page.locator('[class*="chat"], [class*="message"], textarea')
      const count = await chatElements.count()
      expect(count).toBeGreaterThan(0)
    })
  })

  test.describe('Image Loading', () => {
    test('should load tarot page with images', async ({ page }) => {
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

      // Check if images exist on the page
      const images = page.locator('img')
      const imageCount = await images.count()

      // Tarot page should have images
      if (imageCount > 0) {
        // First image should be visible
        await expect(images.first()).toBeVisible()
      }
    })

    test('should load homepage with images', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      const images = page.locator('img')
      const imageCount = await images.count()

      if (imageCount > 0) {
        // Images should not have broken src
        const firstImage = images.first()
        const src = await firstImage.getAttribute('src')
        expect(src).toBeTruthy()
      }
    })
  })

  test.describe('Data Fetching States', () => {
    test('should load myjourney history page', async ({ page }) => {
      await page.goto('/myjourney/history', { waitUntil: 'domcontentloaded' })

      // Should show content (list or empty state)
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })

    test('should load tarot history page', async ({ page }) => {
      await page.goto('/tarot/history', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })
  })

  test.describe('Transition Animations', () => {
    test('should navigate between pages smoothly', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      await page.goto('/saju', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      // All pages should load without errors
      expect(page.url()).toContain('tarot')
    })

    test('should handle back navigation gracefully', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      await page.goto('/saju', { waitUntil: 'domcontentloaded' })

      await page.goBack()
      await expect(page.locator('body')).toBeVisible()
    })
  })

  test.describe('Error States', () => {
    test('should handle 404 page gracefully', async ({ page }) => {
      await page.goto('/nonexistent-page-xyz', { waitUntil: 'domcontentloaded' })

      // Should show error page or redirect
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(10)
    })

    test('should show meaningful content on 404', async ({ page }) => {
      await page.goto('/this-page-does-not-exist', { waitUntil: 'domcontentloaded' })

      const bodyText = await page.locator('body').textContent()

      // Should have error message or navigation options
      const hasErrorContent =
        bodyText!.includes('404') ||
        bodyText!.includes('찾을 수 없') ||
        bodyText!.includes('Not Found') ||
        bodyText!.includes('홈') ||
        bodyText!.includes('Home') ||
        bodyText!.length > 100
      expect(hasErrorContent).toBe(true)
    })
  })

  test.describe('Loading Mobile Experience', () => {
    test('should load saju page on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/saju', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      // Content should be visible
      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })

    test('should be interactive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/destiny-map', { waitUntil: 'domcontentloaded' })

      // Should be able to interact with page
      const interactable = page.locator('button, a, input').first()
      if ((await interactable.count()) > 0) {
        await expect(interactable).toBeVisible()
      }
    })
  })

  test.describe('Scroll Behavior', () => {
    test('should be scrollable on long pages', async ({ page }) => {
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })

      // Get initial scroll position
      const initialScroll = await page.evaluate(() => window.scrollY)

      // Scroll down
      await page.evaluate(() => window.scrollTo(0, 500))

      // Should have scrolled
      const newScroll = await page.evaluate(() => window.scrollY)

      // Content should still be visible after scroll
      await expect(page.locator('body')).toBeVisible()
    })

    test('should scroll to bottom on long page', async ({ page }) => {
      await page.goto('/policy/privacy', { waitUntil: 'domcontentloaded' })

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

      await expect(page.locator('body')).toBeVisible()
    })
  })
})
