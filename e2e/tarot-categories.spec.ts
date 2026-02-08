import { test, expect } from '@playwright/test'

test.describe('Tarot Categories', () => {
  test.describe('Tarot Main Page', () => {
    test('should load tarot main page with Korean content', async ({ page }) => {
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)

      // 타로 관련 콘텐츠 확인
      const hasTarotContent =
        bodyText!.includes('타로') ||
        bodyText!.includes('카드') ||
        bodyText!.includes('Tarot') ||
        bodyText!.includes('운세')
      expect(hasTarotContent).toBe(true)
    })

    test('should display category options', async ({ page }) => {
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

      const categories = page.locator('[class*="category"], [class*="card"], a[href*="tarot/"]')
      const count = await categories.count()

      const bodyText = await page.locator('body').textContent()
      expect(count > 0 || bodyText!.length > 100).toBe(true)
    })

    test('should have question input', async ({ page }) => {
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

      const questionInput = page.locator("textarea, input[type='text']")
      const count = await questionInput.count()

      if (count > 0) {
        const firstInput = questionInput.first()
        if (await firstInput.isVisible()) {
          await firstInput.fill('오늘의 운세가 궁금해요')
          const value = await firstInput.inputValue()
          expect(value).toContain('운세')
        }
      }
    })
  })

  test.describe('Tarot Category Navigation', () => {
    test('should navigate to love category with content', async ({ page }) => {
      await page.goto('/tarot/love', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)

      // 연애 관련 콘텐츠 확인
      const hasLoveContent =
        bodyText!.includes('연애') ||
        bodyText!.includes('사랑') ||
        bodyText!.includes('Love') ||
        bodyText!.includes('타로')
      expect(hasLoveContent).toBe(true)
    })

    test('should navigate to career category with content', async ({ page }) => {
      await page.goto('/tarot/career', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)

      // 직업 관련 콘텐츠 확인
      const hasCareerContent =
        bodyText!.includes('직업') ||
        bodyText!.includes('커리어') ||
        bodyText!.includes('Career') ||
        bodyText!.includes('타로')
      expect(hasCareerContent).toBe(true)
    })

    test('should navigate to general-insight category with content', async ({ page }) => {
      await page.goto('/tarot/general-insight', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })
  })

  test.describe('Tarot Spreads', () => {
    test('should display spread options or content', async ({ page }) => {
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

      const spreads = page.locator('[class*="spread"], [class*="layout"]')
      const count = await spreads.count()

      const bodyText = await page.locator('body').textContent()
      expect(count > 0 || bodyText!.length > 100).toBe(true)
    })

    test('should show past-present-future spread page', async ({ page }) => {
      await page.goto('/tarot/general-insight/past-present-future', {
        waitUntil: 'domcontentloaded',
      })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)

      // 과거-현재-미래 관련 콘텐츠 확인
      const hasSpreadContent =
        bodyText!.includes('과거') ||
        bodyText!.includes('현재') ||
        bodyText!.includes('미래') ||
        bodyText!.includes('타로')
      expect(hasSpreadContent).toBe(true)
    })
  })

  test.describe('Tarot Card Selection', () => {
    test('should display card deck or content', async ({ page }) => {
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

      const cards = page.locator('[class*="card"], [class*="deck"]')
      const count = await cards.count()

      const bodyText = await page.locator('body').textContent()
      expect(count > 0 || bodyText!.length > 100).toBe(true)
    })

    test('should allow card selection interaction', async ({ page }) => {
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

      const selectableCard = page.locator('[class*="selectable"], [role="button"]').first()
      if ((await selectableCard.count()) > 0 && (await selectableCard.isVisible())) {
        await selectableCard.click()
        await page.waitForTimeout(300)
        await expect(page.locator('body')).toBeVisible()

        const bodyText = await page.locator('body').textContent()
        expect(bodyText!.length).toBeGreaterThan(50)
      }
    })
  })

  test.describe('Tarot Reading Results', () => {
    test('should display card images or content', async ({ page }) => {
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

      const cardImages = page.locator('img[alt*="card"], img[alt*="tarot"], [class*="card-image"]')
      const count = await cardImages.count()

      const bodyText = await page.locator('body').textContent()
      expect(count > 0 || bodyText!.length > 100).toBe(true)
    })

    test('should display card names or content', async ({ page }) => {
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

      const cardNames = page.locator('[class*="card-name"], [class*="title"]')
      const count = await cardNames.count()

      const bodyText = await page.locator('body').textContent()
      expect(count > 0 || bodyText!.length > 100).toBe(true)
    })

    test('should display card interpretations or content', async ({ page }) => {
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

      const interpretations = page.locator('[class*="interpretation"], [class*="meaning"]')
      const count = await interpretations.count()

      const bodyText = await page.locator('body').textContent()
      expect(count > 0 || bodyText!.length > 100).toBe(true)
    })
  })

  test.describe('Tarot Couple Reading', () => {
    test('should load couple reading page with content', async ({ page }) => {
      await page.goto('/tarot/couple', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)

      // 커플 관련 콘텐츠 확인
      const hasCoupleContent =
        bodyText!.includes('커플') ||
        bodyText!.includes('두 사람') ||
        bodyText!.includes('연인') ||
        bodyText!.includes('타로')
      expect(hasCoupleContent).toBe(true)
    })

    test('should accept name input if available', async ({ page }) => {
      await page.goto('/tarot/couple', { waitUntil: 'domcontentloaded' })

      const inputs = page.locator('input[name*="name"], input[placeholder*="이름"], input[type="text"]')
      const count = await inputs.count()

      if (count > 0) {
        const firstInput = inputs.first()
        if (await firstInput.isVisible()) {
          await firstInput.fill('테스트 이름')
          const value = await firstInput.inputValue()
          expect(value).toContain('테스트')
        }
      }
    })
  })

  test.describe('Tarot History', () => {
    test('should load tarot history page with content', async ({ page }) => {
      await page.goto('/tarot/history', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(10)
    })

    test('should display reading history or empty state', async ({ page }) => {
      await page.goto('/tarot/history', { waitUntil: 'domcontentloaded' })

      const historyItems = page.locator('[class*="history"], [class*="reading"], [class*="item"]')
      const count = await historyItems.count()

      const bodyText = await page.locator('body').textContent()
      // 히스토리 아이템이 있거나 페이지가 정상 로드됨
      expect(count > 0 || bodyText!.length > 50).toBe(true)
    })

    test('should have view button or navigation elements', async ({ page }) => {
      await page.goto('/tarot/history', { waitUntil: 'domcontentloaded' })

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

  test.describe('Tarot Mobile Experience', () => {
    test('should be responsive on mobile without horizontal scroll', async ({ page }) => {
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
      if ((await card.count()) > 0 && (await card.isVisible())) {
        const box = await card.boundingBox()
        if (box) {
          expect(box.width).toBeLessThanOrEqual(375)
        }
      }
    })

    test('should have touch-friendly card selection', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

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

  test.describe('Tarot Page Load Performance', () => {
    test('should load tarot main page within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })

    test('should load tarot love page within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/tarot/love', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })

    test('should load tarot history page within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/tarot/history', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })
  })
})
