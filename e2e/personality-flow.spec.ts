import { test, expect } from '@playwright/test'

test.describe('Personality Test Flow', () => {
  test.describe('Personality Main Page', () => {
    test('should load personality page with content', async ({ page }) => {
      await page.goto('/personality', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)

      // 성격/심리 테스트 관련 콘텐츠 확인
      const hasPersonalityContent =
        bodyText!.includes('성격') ||
        bodyText!.includes('심리') ||
        bodyText!.includes('MBTI') ||
        bodyText!.includes('테스트') ||
        bodyText!.includes('Personality')
      expect(hasPersonalityContent).toBe(true)
    })

    test('should display test options or cards', async ({ page }) => {
      await page.goto('/personality', { waitUntil: 'domcontentloaded' })

      const options = page.locator('[class*="card"], [class*="option"], a, button')
      const count = await options.count()
      expect(count).toBeGreaterThan(0)

      let visibleOption = false
      for (let i = 0; i < Math.min(count, 10); i++) {
        if (await options.nth(i).isVisible()) {
          visibleOption = true
          break
        }
      }
      expect(visibleOption).toBe(true)
    })

    test('should have start test button or link', async ({ page }) => {
      await page.goto('/personality', { waitUntil: 'domcontentloaded' })

      const buttons = page.locator('button, a')
      const count = await buttons.count()
      expect(count).toBeGreaterThan(0)
    })
  })

  test.describe('Personality Quiz Page', () => {
    test('should load quiz page with content', async ({ page }) => {
      await page.goto('/personality/quiz', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(10)
    })

    test('should display questions or quiz content', async ({ page }) => {
      await page.goto('/personality/quiz', { waitUntil: 'domcontentloaded' })

      const questions = page.locator('h1, h2, h3, p, label')
      const count = await questions.count()

      if (count > 0) {
        let hasQuestionText = false
        for (let i = 0; i < Math.min(count, 10); i++) {
          const text = await questions.nth(i).textContent()
          if (text && text.length > 10) {
            hasQuestionText = true
            break
          }
        }
        expect(hasQuestionText).toBe(true)
      }
    })

    test('should allow selecting an answer option', async ({ page }) => {
      await page.goto('/personality/quiz', { waitUntil: 'domcontentloaded' })

      const options = page.locator('input[type="radio"], button[class*="option"], [role="option"]')
      if ((await options.count()) > 0) {
        const firstOption = options.first()
        if (await firstOption.isVisible()) {
          await firstOption.click()
          await page.waitForTimeout(300)
          await expect(page.locator('body')).toBeVisible()
        }
      }
    })
  })

  test.describe('Personality Result Page', () => {
    test('should load result page with content', async ({ page }) => {
      await page.goto('/personality/result', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(10)
    })

    test('should check for share functionality', async ({ page }) => {
      await page.goto('/personality/result', { waitUntil: 'domcontentloaded' })

      const shareButton = page.locator(
        'button:has-text("공유"), button:has-text("Share"), [class*="share"]'
      )
      const count = await shareButton.count()

      if (count > 0) {
        await expect(shareButton.first()).toBeVisible()
      }
    })
  })

  test.describe('Personality Compatibility Page', () => {
    test('should load compatibility page with content', async ({ page }) => {
      await page.goto('/personality/compatibility', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })
  })

  test.describe('Personality Combined Page', () => {
    test('should load combined analysis page with content', async ({ page }) => {
      await page.goto('/personality/combined', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(10)
    })
  })

  test.describe('Personality Mobile Experience', () => {
    test('should render without horizontal scroll on mobile', async ({ page }) => {
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

    test('should allow tap interactions on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/personality/quiz', { waitUntil: 'domcontentloaded' })

      const options = page.locator("button, [role='option']")
      if ((await options.count()) > 0) {
        const firstOption = options.first()
        if (await firstOption.isVisible()) {
          await firstOption.tap()
          await page.waitForTimeout(300)
          await expect(page.locator('body')).toBeVisible()
        }
      }
    })
  })

  test.describe('Personality Page Load Performance', () => {
    test('should load personality page within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/personality', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })

    test('should load quiz page within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/personality/quiz', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })
  })
})
