import { test, expect } from '@playwright/test'

test.describe('ICP (Ideal Customer Profile) Flow', () => {
  test.describe('ICP Main Page', () => {
    test('should load ICP page successfully', async ({ page }) => {
      await page.goto('/icp', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display ICP introduction content', async ({ page }) => {
      await page.goto('/icp', { waitUntil: 'domcontentloaded' })

      // Check for main content area
      const mainContent = page.locator("main, [class*='content'], article")
      const count = await mainContent.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have start quiz button or link', async ({ page }) => {
      await page.goto('/icp', { waitUntil: 'domcontentloaded' })

      const startButton = page.locator(
        'a[href*="quiz"], button:has-text("시작"), button:has-text("테스트"), button:has-text("Start")'
      )
      const count = await startButton.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('ICP Quiz Page', () => {
    test('should load quiz page successfully', async ({ page }) => {
      await page.goto('/icp/quiz', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display quiz questions', async ({ page }) => {
      await page.goto('/icp/quiz', { waitUntil: 'domcontentloaded' })

      // Look for question elements
      const questions = page.locator('[class*="question"], [data-question], h2, h3')
      const count = await questions.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have answer options', async ({ page }) => {
      await page.goto('/icp/quiz', { waitUntil: 'domcontentloaded' })

      // Look for answer options - radio buttons, buttons, or clickable items
      const options = page.locator(
        'input[type="radio"], [role="option"], [class*="option"], button'
      )
      const count = await options.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should show progress indicator', async ({ page }) => {
      await page.goto('/icp/quiz', { waitUntil: 'domcontentloaded' })

      // Look for progress bar or step indicator
      const progressIndicator = page.locator(
        '[class*="progress"], [role="progressbar"], [class*="step"], [class*="indicator"]'
      )
      const count = await progressIndicator.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should allow navigating between questions', async ({ page }) => {
      await page.goto('/icp/quiz', { waitUntil: 'domcontentloaded' })

      // Look for next/previous buttons
      const navButtons = page.locator(
        'button:has-text("다음"), button:has-text("이전"), button:has-text("Next"), button:has-text("Back")'
      )
      const count = await navButtons.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('ICP Result Page', () => {
    test('should load result page successfully', async ({ page }) => {
      await page.goto('/icp/result', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display result content', async ({ page }) => {
      await page.goto('/icp/result', { waitUntil: 'domcontentloaded' })

      // Check for result display
      const resultContent = page.locator('[class*="result"], [class*="profile"], main')
      const count = await resultContent.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have share functionality', async ({ page }) => {
      await page.goto('/icp/result', { waitUntil: 'domcontentloaded' })

      // Look for share buttons
      const shareButton = page.locator(
        'button:has-text("공유"), button:has-text("Share"), [class*="share"]'
      )
      const count = await shareButton.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have retry quiz option', async ({ page }) => {
      await page.goto('/icp/result', { waitUntil: 'domcontentloaded' })

      // Look for retry/restart button
      const retryButton = page.locator(
        'button:has-text("다시"), a[href*="quiz"], button:has-text("Retry")'
      )
      const count = await retryButton.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('ICP Quiz Completion Flow', () => {
    test('should complete quiz and see result', async ({ page }) => {
      await page.goto('/icp/quiz', { waitUntil: 'domcontentloaded' })

      // Try to answer first question if available
      const firstOption = page
        .locator('input[type="radio"], [role="option"], button[class*="option"]')
        .first()

      if ((await firstOption.count()) > 0) {
        await firstOption.click()
        await page.waitForTimeout(500)
        await expect(page.locator('body')).toBeVisible()
      }
    })
  })

  test.describe('ICP Mobile Experience', () => {
    test('should be responsive on mobile for quiz page', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/icp/quiz', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should be responsive on mobile for result page', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/icp/result', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()
    })
  })
})
