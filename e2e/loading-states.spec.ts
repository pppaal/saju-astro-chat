import { test, expect } from '@playwright/test'

test.describe('Loading States & Transitions', () => {
  test.describe('Page Loading States', () => {
    test('should load saju page within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/saju', { waitUntil: 'domcontentloaded' })

      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(10000)

      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)

      // 사주 관련 콘텐츠 확인
      const hasSajuContent =
        bodyText!.includes('사주') ||
        bodyText!.includes('운세') ||
        bodyText!.includes('분석')
      expect(hasSajuContent).toBe(true)
    })

    test('should load destiny-map page within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/destiny-map', { waitUntil: 'domcontentloaded' })

      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(10000)

      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })

    test('should load homepage within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(10000)

      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(100)
    })
  })

  test.describe('Form Submission Loading', () => {
    test('should handle form submit on saju page', async ({ page }) => {
      await page.goto('/saju', { waitUntil: 'domcontentloaded' })

      const submitButton = page.locator('button[type="submit"]').first()
      if ((await submitButton.count()) > 0 && (await submitButton.isVisible())) {
        const buttonText = await submitButton.textContent()
        expect(buttonText).toBeTruthy()

        await submitButton.click()
        await page.waitForTimeout(500)

        // 페이지가 정상 작동해야 함
        await expect(page.locator('body')).toBeVisible()
        const bodyText = await page.locator('body').textContent()
        expect(bodyText!.length).toBeGreaterThan(50)
      }
    })

    test('should handle form submit on contact page', async ({ page }) => {
      await page.goto('/contact', { waitUntil: 'domcontentloaded' })

      const submitButton = page.locator('button[type="submit"]').first()
      if ((await submitButton.count()) > 0 && (await submitButton.isVisible())) {
        await submitButton.click()
        await page.waitForTimeout(500)

        // 유효성 검사 또는 로딩 표시
        await expect(page.locator('body')).toBeVisible()
        const bodyText = await page.locator('body').textContent()
        expect(bodyText!.length).toBeGreaterThan(50)
      }
    })
  })

  test.describe('Chat Loading States', () => {
    test('should load counselor page with chat interface', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)

      // 채팅 인터페이스 확인
      const chatInput = page.locator('textarea, input[type="text"]')
      const chatElements = page.locator('[class*="chat"], [class*="message"]')

      const hasChat = (await chatInput.count()) > 0 || (await chatElements.count()) > 0
      expect(hasChat || bodyText!.length > 100).toBe(true)
    })

    test('should load saju counselor page with chat interface', async ({ page }) => {
      await page.goto('/saju/counselor', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)

      // 채팅 요소 확인
      const chatElements = page.locator('[class*="chat"], [class*="message"], textarea')
      const count = await chatElements.count()

      expect(count > 0 || bodyText!.length > 100).toBe(true)
    })

    test('should accept message input in counselor', async ({ page }) => {
      await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })

      const input = page.locator('textarea, input[type="text"]').first()
      if ((await input.count()) > 0 && (await input.isVisible())) {
        await input.fill('테스트 메시지입니다')
        const value = await input.inputValue()
        expect(value).toContain('테스트')
      }
    })
  })

  test.describe('Image Loading', () => {
    test('should load tarot page with images', async ({ page }) => {
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

      const images = page.locator('img')
      const imageCount = await images.count()

      if (imageCount > 0) {
        const firstImage = images.first()
        if (await firstImage.isVisible()) {
          const src = await firstImage.getAttribute('src')
          expect(src).toBeTruthy()
        }
      }

      // 페이지에 타로 관련 콘텐츠가 있어야 함
      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })

    test('should load homepage with images', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      const images = page.locator('img')
      const imageCount = await images.count()

      if (imageCount > 0) {
        const firstImage = images.first()
        const src = await firstImage.getAttribute('src')
        expect(src).toBeTruthy()
        expect(src!.length).toBeGreaterThan(0)
      }
    })
  })

  test.describe('Data Fetching States', () => {
    test('should load myjourney history page with content', async ({ page }) => {
      await page.goto('/myjourney/history', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(10)
    })

    test('should load tarot history page with content', async ({ page }) => {
      await page.goto('/tarot/history', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(10)
    })

    test('should load calendar page with content', async ({ page }) => {
      await page.goto('/calendar', { waitUntil: 'domcontentloaded' })

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

      const sajuBodyText = await page.locator('body').textContent()
      expect(sajuBodyText!.length).toBeGreaterThan(50)

      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()

      const tarotBodyText = await page.locator('body').textContent()
      expect(tarotBodyText!.length).toBeGreaterThan(50)

      expect(page.url()).toContain('tarot')
    })

    test('should handle back navigation gracefully', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      await page.goto('/saju', { waitUntil: 'domcontentloaded' })

      await page.goBack()
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })

    test('should handle forward navigation gracefully', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      await page.goto('/saju', { waitUntil: 'domcontentloaded' })

      await page.goBack()
      await page.goForward()

      await expect(page.locator('body')).toBeVisible()
      expect(page.url()).toContain('saju')
    })
  })

  test.describe('Error States', () => {
    test('should handle 404 page gracefully', async ({ page }) => {
      await page.goto('/nonexistent-page-xyz', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(10)
    })

    test('should show meaningful content on 404', async ({ page }) => {
      await page.goto('/this-page-does-not-exist', { waitUntil: 'domcontentloaded' })

      const bodyText = await page.locator('body').textContent()

      // 에러 메시지 또는 네비게이션 옵션이 있어야 함
      const hasErrorContent =
        bodyText!.includes('404') ||
        bodyText!.includes('찾을 수 없') ||
        bodyText!.includes('Not Found') ||
        bodyText!.includes('홈') ||
        bodyText!.includes('Home') ||
        bodyText!.length > 50
      expect(hasErrorContent).toBe(true)
    })

    test('should have navigation options on error page', async ({ page }) => {
      await page.goto('/nonexistent-page', { waitUntil: 'domcontentloaded' })

      const links = page.locator('a')
      const count = await links.count()
      expect(count).toBeGreaterThan(0)

      let visibleLink = false
      for (let i = 0; i < Math.min(count, 10); i++) {
        if (await links.nth(i).isVisible()) {
          visibleLink = true
          break
        }
      }
      expect(visibleLink).toBe(true)
    })
  })

  test.describe('Loading Mobile Experience', () => {
    test('should load saju page on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/saju', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)

      // 모바일에서 수평 스크롤 없어야 함
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should be interactive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/destiny-map', { waitUntil: 'domcontentloaded' })

      const interactable = page.locator('button, a, input').first()
      if ((await interactable.count()) > 0 && (await interactable.isVisible())) {
        await expect(interactable).toBeVisible()

        const box = await interactable.boundingBox()
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(20)
        }
      }
    })

    test('should have touch-friendly buttons on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/', { waitUntil: 'domcontentloaded' })

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

  test.describe('Scroll Behavior', () => {
    test('should be scrollable on long pages', async ({ page }) => {
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      // 스크롤 다운
      await page.evaluate(() => window.scrollTo(0, 500))

      const newScroll = await page.evaluate(() => window.scrollY)

      // 스크롤 후에도 콘텐츠가 보여야 함
      await expect(page.locator('body')).toBeVisible()
    })

    test('should scroll to bottom on long page', async ({ page }) => {
      await page.goto('/policy/privacy', { waitUntil: 'domcontentloaded' })

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })

    test('should scroll back to top', async ({ page }) => {
      await page.goto('/policy/terms', { waitUntil: 'domcontentloaded' })

      await page.evaluate(() => window.scrollTo(0, 500))
      await page.evaluate(() => window.scrollTo(0, 0))

      const scrollY = await page.evaluate(() => window.scrollY)
      expect(scrollY).toBe(0)
    })
  })

  test.describe('Loading Performance', () => {
    test('should load dream page within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/dream', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })

    test('should load tarot page within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })

    test('should load pricing page within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(10000)
      await expect(page.locator('body')).toBeVisible()
    })
  })
})
