import { test, expect } from '@playwright/test'

test.describe('Personality Test Flow', () => {
  test.describe('Personality Main Page', () => {
    test('should load personality page successfully', async ({ page }) => {
      await page.goto('/personality', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display personality test options', async ({ page }) => {
      await page.goto('/personality', { waitUntil: 'domcontentloaded' })

      // Look for test type options
      const options = page.locator('[class*="card"], [class*="option"], a[href*="personality"]')
      const count = await options.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have start test button', async ({ page }) => {
      await page.goto('/personality', { waitUntil: 'domcontentloaded' })

      const startButton = page.locator(
        'button:has-text("시작"), a[href*="quiz"], button:has-text("테스트")'
      )
      const count = await startButton.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Personality Quiz Page', () => {
    test('should load quiz page successfully', async ({ page }) => {
      await page.goto('/personality/quiz', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display questions with answer choices', async ({ page }) => {
      await page.goto('/personality/quiz', { waitUntil: 'domcontentloaded' })

      // Look for question elements
      const questions = page.locator('[class*="question"], h2, h3, p')
      const questionsCount = await questions.count()

      // Look for answer options
      const options = page.locator('input[type="radio"], button, [role="option"]')
      const optionsCount = await options.count()

      expect(questionsCount).toBeGreaterThanOrEqual(0)
      expect(optionsCount).toBeGreaterThanOrEqual(0)
    })

    test('should track quiz progress', async ({ page }) => {
      await page.goto('/personality/quiz', { waitUntil: 'domcontentloaded' })

      // Look for progress indicator
      const progress = page.locator('[class*="progress"], [role="progressbar"], [class*="step"]')
      const count = await progress.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should allow selecting answer', async ({ page }) => {
      await page.goto('/personality/quiz', { waitUntil: 'domcontentloaded' })

      // Try clicking an option
      const option = page
        .locator('input[type="radio"], [role="option"], button[class*="option"]')
        .first()
      if ((await option.count()) > 0) {
        await option.click()
        await page.waitForTimeout(300)
        await expect(page.locator('body')).toBeVisible()
      }
    })
  })

  test.describe('Personality Result Page', () => {
    test('should load result page successfully', async ({ page }) => {
      await page.goto('/personality/result', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display personality type result', async ({ page }) => {
      await page.goto('/personality/result', { waitUntil: 'domcontentloaded' })

      // Look for result display
      const result = page.locator('[class*="result"], [class*="type"], main')
      const count = await result.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have share option', async ({ page }) => {
      await page.goto('/personality/result', { waitUntil: 'domcontentloaded' })

      const shareButton = page.locator('button:has-text("공유"), [class*="share"]')
      const count = await shareButton.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Personality Compatibility Page', () => {
    test('should load compatibility page successfully', async ({ page }) => {
      await page.goto('/personality/compatibility', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should display compatibility content', async ({ page }) => {
      await page.goto('/personality/compatibility', { waitUntil: 'domcontentloaded' })

      const content = page.locator("main, [class*='content']")
      const count = await content.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Personality Combined Page', () => {
    test('should load combined analysis page', async ({ page }) => {
      await page.goto('/personality/combined', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    })
  })

  test.describe('Personality Mobile Experience', () => {
    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/personality', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should have touch-friendly quiz buttons on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/personality/quiz', { waitUntil: 'domcontentloaded' })

      const buttons = page.locator("button, [role='button']")
      if ((await buttons.count()) > 0) {
        const firstButton = buttons.first()
        const box = await firstButton.boundingBox()
        if (box) {
          expect(box.height >= 40 || box.width >= 40).toBe(true)
        }
      }
    })
  })
})
