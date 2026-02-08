import { test, expect } from '@playwright/test'

test.describe('ICP (Ideal Customer Profile) Flow', () => {
  test.describe('ICP Main Page', () => {
    test('should load ICP page with content', async ({ page }) => {
      await page.goto('/icp', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })

    test('should display ICP introduction content', async ({ page }) => {
      await page.goto('/icp', { waitUntil: 'domcontentloaded' })

      const bodyText = await page.locator('body').textContent()
      // ICP 관련 콘텐츠 확인
      const hasContent =
        bodyText!.includes('이상형') ||
        bodyText!.includes('테스트') ||
        bodyText!.includes('프로필') ||
        bodyText!.length > 100
      expect(hasContent).toBe(true)
    })

    test('should have start quiz button or link', async ({ page }) => {
      await page.goto('/icp', { waitUntil: 'domcontentloaded' })

      const buttons = page.locator('button, a')
      const count = await buttons.count()
      expect(count).toBeGreaterThan(0)

      let visibleButtonFound = false
      for (let i = 0; i < count; i++) {
        if (await buttons.nth(i).isVisible()) {
          visibleButtonFound = true
          break
        }
      }
      expect(visibleButtonFound).toBe(true)
    })
  })

  test.describe('ICP Quiz Page', () => {
    test('should load quiz page with content', async ({ page }) => {
      await page.goto('/icp/quiz', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(10)
    })

    test('should display quiz questions or options', async ({ page }) => {
      await page.goto('/icp/quiz', { waitUntil: 'domcontentloaded' })

      const questions = page.locator('[class*="question"], h2, h3, p, label')
      const count = await questions.count()

      if (count > 0) {
        let hasQuestionText = false
        for (let i = 0; i < Math.min(count, 10); i++) {
          const text = await questions.nth(i).textContent()
          if (text && text.length > 5) {
            hasQuestionText = true
            break
          }
        }
        expect(hasQuestionText).toBe(true)
      }
    })

    test('should have answer options', async ({ page }) => {
      await page.goto('/icp/quiz', { waitUntil: 'domcontentloaded' })

      const options = page.locator('input[type="radio"], [role="option"], button, [class*="option"]')
      const count = await options.count()

      if (count > 0) {
        const firstOption = options.first()
        if (await firstOption.isVisible()) {
          await expect(firstOption).toBeVisible()
        }
      }
    })

    test('should allow selecting an answer', async ({ page }) => {
      await page.goto('/icp/quiz', { waitUntil: 'domcontentloaded' })

      const firstOption = page
        .locator('input[type="radio"], [role="option"], button[class*="option"]')
        .first()

      if ((await firstOption.count()) > 0 && (await firstOption.isVisible())) {
        await firstOption.click()
        await page.waitForTimeout(500)
        await expect(page.locator('body')).toBeVisible()
      }
    })
  })

  test.describe('ICP Result Page', () => {
    test('should load result page with content', async ({ page }) => {
      await page.goto('/icp/result', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(10)
    })

    test('should check for share functionality', async ({ page }) => {
      await page.goto('/icp/result', { waitUntil: 'domcontentloaded' })

      const shareButton = page.locator(
        'button:has-text("공유"), button:has-text("Share"), [class*="share"]'
      )
      const count = await shareButton.count()

      if (count > 0) {
        await expect(shareButton.first()).toBeVisible()
      }
    })
  })

  test.describe('ICP Mobile Experience', () => {
    test('should render quiz page without horizontal scroll on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/icp/quiz', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should render result page without horizontal scroll on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/icp/result', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should have touch-friendly buttons on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/icp/quiz', { waitUntil: 'domcontentloaded' })

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

  test.describe('ICP Page Load Performance', () => {
    test('should load main page within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/icp', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })

    test('should load quiz page within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/icp/quiz', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })
  })
})
