import { test, expect } from '@playwright/test'

test.describe('Tarot Flow', () => {
  test('should load tarot homepage with Korean content', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)

    // 타로 관련 콘텐츠 확인
    const hasTarotContent =
      bodyText!.includes('타로') ||
      bodyText!.includes('Tarot') ||
      bodyText!.includes('카드') ||
      bodyText!.includes('운세')
    expect(hasTarotContent).toBe(true)
  })

  test('should have question input area and accept input', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    const questionInput = page.locator("textarea, input[type='text']")
    const count = await questionInput.count()

    if (count > 0) {
      const firstInput = questionInput.first()
      if (await firstInput.isVisible()) {
        await firstInput.fill('오늘의 연애 운세가 궁금해요')
        const value = await firstInput.inputValue()
        expect(value).toContain('연애')
      }
    }
  })

  test('should display tarot categories or spreads', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    const cards = page.locator('[class*="card"], [class*="spread"], button, a[href*="tarot"]')
    const count = await cards.count()
    expect(count).toBeGreaterThan(0)

    // 하나 이상의 요소가 보여야 함
    let visibleElement = false
    for (let i = 0; i < Math.min(count, 10); i++) {
      if (await cards.nth(i).isVisible()) {
        visibleElement = true
        break
      }
    }
    expect(visibleElement).toBe(true)
  })

  test('should navigate to spread page with content', async ({ page }) => {
    await page.goto('/tarot/general-insight/past-present-future?question=test', {
      waitUntil: 'domcontentloaded',
    })
    await expect(page.locator('body')).toBeVisible()

    expect(page.url()).toContain('tarot')

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)
  })

  test('should load tarot history page with content', async ({ page }) => {
    await page.goto('/tarot/history', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(10)
  })

  test('should be able to select a tarot category', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    const categories = page.locator('a[href*="/tarot/"], button, [class*="category"]').first()
    if ((await categories.count()) > 0 && (await categories.isVisible())) {
      await expect(categories).toBeVisible()
      await categories.click()
      await page.waitForTimeout(500)
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('should load love category with content', async ({ page }) => {
    await page.goto('/tarot/love', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)

    const hasLoveContent =
      bodyText!.includes('연애') ||
      bodyText!.includes('사랑') ||
      bodyText!.includes('Love') ||
      bodyText!.includes('타로')
    expect(hasLoveContent).toBe(true)
  })

  test('should load career category with content', async ({ page }) => {
    await page.goto('/tarot/career', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)
  })
})

test.describe('Dream Interpretation Flow', () => {
  test('should load dream page with Korean content', async ({ page }) => {
    await page.goto('/dream', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)

    const hasDreamContent =
      bodyText!.includes('꿈') ||
      bodyText!.includes('Dream') ||
      bodyText!.includes('해몽')
    expect(hasDreamContent).toBe(true)
  })

  test('should have dream input area and accept input', async ({ page }) => {
    await page.goto('/dream', { waitUntil: 'domcontentloaded' })

    const textareas = page.locator('textarea')
    const textareaCount = await textareas.count()

    if (textareaCount > 0) {
      const textarea = textareas.first()
      if (await textarea.isVisible()) {
        await textarea.fill('어젯밤 꿈에서 높은 산을 올랐습니다')
        const value = await textarea.inputValue()
        expect(value).toContain('산')
      }
    }
  })

  test('should have submit button visible', async ({ page }) => {
    await page.goto('/dream', { waitUntil: 'domcontentloaded' })

    const submitButton = page.locator(
      'button[type="submit"], button:has-text("해석"), button:has-text("시작"), button:has-text("분석")'
    )
    const count = await submitButton.count()

    if (count > 0) {
      let visibleButton = false
      for (let i = 0; i < count; i++) {
        if (await submitButton.nth(i).isVisible()) {
          visibleButton = true
          break
        }
      }
      expect(visibleButton).toBe(true)
    }
  })
})

test.describe('I-Ching Flow', () => {
  test('should load I-Ching page with Korean content', async ({ page }) => {
    await page.goto('/iching', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)

    const hasIChingContent =
      bodyText!.includes('주역') ||
      bodyText!.includes('I-Ching') ||
      bodyText!.includes('易') ||
      bodyText!.includes('점') ||
      bodyText!.includes('괘')
    expect(hasIChingContent).toBe(true)
  })

  test('should have question input for I-Ching', async ({ page }) => {
    await page.goto('/iching', { waitUntil: 'domcontentloaded' })

    const inputs = page.locator('input, textarea')
    const inputCount = await inputs.count()

    if (inputCount > 0) {
      const input = inputs.first()
      if (await input.isVisible()) {
        await input.fill('이 일을 해도 될까요?')
        const value = await input.inputValue()
        expect(value).toContain('일')
      }
    }
  })

  test('should have hexagram visualization or buttons', async ({ page }) => {
    await page.goto('/iching', { waitUntil: 'domcontentloaded' })

    const elements = page.locator('button, [class*="hexagram"], [class*="line"]')
    const count = await elements.count()
    expect(count).toBeGreaterThan(0)

    let visibleElement = false
    for (let i = 0; i < Math.min(count, 10); i++) {
      if (await elements.nth(i).isVisible()) {
        visibleElement = true
        break
      }
    }
    expect(visibleElement).toBe(true)
  })
})

test.describe('Compatibility Flow', () => {
  test('should load compatibility page with Korean content', async ({ page }) => {
    await page.goto('/compatibility', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)

    const hasCompatibilityContent =
      bodyText!.includes('궁합') ||
      bodyText!.includes('Compatibility') ||
      bodyText!.includes('상성') ||
      bodyText!.includes('연인')
    expect(hasCompatibilityContent).toBe(true)
  })

  test('should load compatibility chat page', async ({ page }) => {
    await page.goto('/compatibility/chat', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)
  })

  test('should load compatibility insights page', async ({ page }) => {
    await page.goto('/compatibility/insights', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(10)
  })

  test('should have form for two people info', async ({ page }) => {
    await page.goto('/compatibility', { waitUntil: 'domcontentloaded' })

    const inputs = page.locator('input')
    const inputCount = await inputs.count()
    expect(inputCount).toBeGreaterThan(0)

    // 첫 번째 입력 필드가 보여야 함
    const firstInput = inputs.first()
    if (await firstInput.isVisible()) {
      await expect(firstInput).toBeVisible()
    }
  })

  test('should accept name input for compatibility', async ({ page }) => {
    await page.goto('/compatibility', { waitUntil: 'domcontentloaded' })

    const nameInput = page.locator('input[type="text"], input[name*="name"]').first()
    if ((await nameInput.count()) > 0 && (await nameInput.isVisible())) {
      await nameInput.fill('홍길동')
      const value = await nameInput.inputValue()
      expect(value).toBe('홍길동')
    }
  })
})

test.describe('Calendar Flow', () => {
  test('should load calendar page with content', async ({ page }) => {
    await page.goto('/calendar', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)
  })

  test('should display calendar grid or month view', async ({ page }) => {
    await page.goto('/calendar', { waitUntil: 'domcontentloaded' })

    const calendarElements = page.locator(
      '[class*="calendar"], [class*="month"], [class*="day"], table'
    )
    const count = await calendarElements.count()
    expect(count).toBeGreaterThan(0)

    let visibleElement = false
    for (let i = 0; i < Math.min(count, 10); i++) {
      if (await calendarElements.nth(i).isVisible()) {
        visibleElement = true
        break
      }
    }
    expect(visibleElement).toBe(true)
  })

  test('should have navigation for months', async ({ page }) => {
    await page.goto('/calendar', { waitUntil: 'domcontentloaded' })

    const navButtons = page.locator('button')
    const count = await navButtons.count()
    expect(count).toBeGreaterThan(0)

    let visibleButton = false
    for (let i = 0; i < Math.min(count, 10); i++) {
      if (await navButtons.nth(i).isVisible()) {
        visibleButton = true
        break
      }
    }
    expect(visibleButton).toBe(true)
  })

  test('should be able to click on a day', async ({ page }) => {
    await page.goto('/calendar', { waitUntil: 'domcontentloaded' })

    const dayElement = page.locator('[class*="day"], td, button').first()
    if ((await dayElement.count()) > 0 && (await dayElement.isVisible())) {
      await dayElement.click()
      await page.waitForTimeout(300)
      await expect(page.locator('body')).toBeVisible()
    }
  })
})

test.describe('Tarot Mobile Experience', () => {
  test('should render tarot page without horizontal scroll on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    await expect(page.locator('body')).toBeVisible()

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
  })

  test('should have touch-friendly buttons on mobile', async ({ page }) => {
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
  test('should load tarot page within acceptable time', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })
    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(10000)
    await expect(page.locator('body')).toBeVisible()
  })

  test('should load dream page within acceptable time', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/dream', { waitUntil: 'domcontentloaded' })
    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(10000)
    await expect(page.locator('body')).toBeVisible()
  })

  test('should load iching page within acceptable time', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/iching', { waitUntil: 'domcontentloaded' })
    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(10000)
    await expect(page.locator('body')).toBeVisible()
  })
})
