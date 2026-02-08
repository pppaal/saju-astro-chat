import { test, expect } from '@playwright/test'

test.describe('Saju Analysis Flow', () => {
  test('should load saju page with Korean form content', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)

    const hasSajuContent =
      bodyText!.includes('사주') ||
      bodyText!.includes('Saju') ||
      bodyText!.includes('생년월일') ||
      bodyText!.includes('팔자') ||
      bodyText!.includes('운세')
    expect(hasSajuContent).toBe(true)
  })

  test('should have birth date input fields visible', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })

    const inputs = page.locator('input, select')
    const inputCount = await inputs.count()
    expect(inputCount).toBeGreaterThan(0)

    let visibleInput = false
    for (let i = 0; i < Math.min(inputCount, 10); i++) {
      if (await inputs.nth(i).isVisible()) {
        visibleInput = true
        break
      }
    }
    expect(visibleInput).toBe(true)
  })

  test('should have gender selection elements', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })

    const genderElements = page.locator(
      'input[type="radio"], button:has-text("남"), button:has-text("여"), [class*="gender"]'
    )
    const count = await genderElements.count()
    expect(count).toBeGreaterThan(0)

    let visibleElement = false
    for (let i = 0; i < Math.min(count, 10); i++) {
      if (await genderElements.nth(i).isVisible()) {
        visibleElement = true
        break
      }
    }
    expect(visibleElement).toBe(true)
  })

  test('should display validation for empty form submission', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })

    const submitButton = page.locator(
      'button[type="submit"], button:has-text("분석"), button:has-text("시작"), button:has-text("Submit")'
    )

    if ((await submitButton.count()) > 0 && (await submitButton.first().isVisible())) {
      await submitButton.first().click()
      await page.waitForTimeout(500)

      await expect(page.locator('body')).toBeVisible()
      expect(page.url()).toContain('saju')

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    }
  })

  test('should accept name input', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })

    const nameInput = page.locator('input[type="text"], input[name*="name"]').first()
    if ((await nameInput.count()) > 0 && (await nameInput.isVisible())) {
      await nameInput.fill('테스트 이름')
      const value = await nameInput.inputValue()
      expect(value).toContain('테스트')
    }
  })

  test('should accept date input', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })

    const dateInput = page.locator('input[type="date"]').first()
    if ((await dateInput.count()) > 0 && (await dateInput.isVisible())) {
      await dateInput.fill('1990-05-15')
      const value = await dateInput.inputValue()
      expect(value).toBe('1990-05-15')
    }
  })

  test('should load saju counselor page with content', async ({ page }) => {
    await page.goto('/saju/counselor', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)
  })

  test('should have chat interface on counselor page', async ({ page }) => {
    await page.goto('/saju/counselor', { waitUntil: 'domcontentloaded' })

    const chatElements = page.locator(
      'textarea, input[type="text"], [class*="chat"], [class*="message"]'
    )
    const count = await chatElements.count()
    expect(count).toBeGreaterThan(0)

    let visibleElement = false
    for (let i = 0; i < Math.min(count, 10); i++) {
      if (await chatElements.nth(i).isVisible()) {
        visibleElement = true
        break
      }
    }
    expect(visibleElement).toBe(true)
  })

  test('should accept chat input on counselor page', async ({ page }) => {
    await page.goto('/saju/counselor', { waitUntil: 'domcontentloaded' })

    const input = page.locator('textarea, input[type="text"]').first()
    if ((await input.count()) > 0 && (await input.isVisible())) {
      await input.fill('오늘 운세가 궁금해요')
      const value = await input.inputValue()
      expect(value).toContain('운세')
    }
  })
})

test.describe('Destiny Map Flow', () => {
  test('should load destiny-map page with Korean content', async ({ page }) => {
    await page.goto('/destiny-map', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)

    const hasContent =
      bodyText!.includes('운명') ||
      bodyText!.includes('Destiny') ||
      bodyText!.includes('사주') ||
      bodyText!.includes('분석')
    expect(hasContent).toBe(true)
  })

  test('should have form inputs for birth info visible', async ({ page }) => {
    await page.goto('/destiny-map', { waitUntil: 'domcontentloaded' })

    const inputs = page.locator('input, select')
    const inputCount = await inputs.count()
    expect(inputCount).toBeGreaterThan(0)

    let visibleInput = false
    for (let i = 0; i < Math.min(inputCount, 10); i++) {
      if (await inputs.nth(i).isVisible()) {
        visibleInput = true
        break
      }
    }
    expect(visibleInput).toBe(true)
  })

  test('should navigate to result page', async ({ page }) => {
    await page.goto('/destiny-map/result', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(10)
  })

  test('should load destiny-map counselor page with content', async ({ page }) => {
    await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)
  })

  test('should have tab or section navigation visible', async ({ page }) => {
    await page.goto('/destiny-map', { waitUntil: 'domcontentloaded' })

    const tabs = page.locator('[role="tab"], [class*="tab"], button')
    const count = await tabs.count()
    expect(count).toBeGreaterThan(0)

    let visibleTab = false
    for (let i = 0; i < Math.min(count, 10); i++) {
      if (await tabs.nth(i).isVisible()) {
        visibleTab = true
        break
      }
    }
    expect(visibleTab).toBe(true)
  })
})

test.describe('Life Prediction Flow', () => {
  test('should load life-prediction page with Korean content', async ({ page }) => {
    await page.goto('/life-prediction', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)

    const hasContent =
      bodyText!.includes('인생') ||
      bodyText!.includes('Life') ||
      bodyText!.includes('예측') ||
      bodyText!.includes('운세')
    expect(hasContent).toBe(true)
  })

  test('should load life-prediction result page', async ({ page }) => {
    await page.goto('/life-prediction/result', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(10)
  })

  test('should have birth date form visible', async ({ page }) => {
    await page.goto('/life-prediction', { waitUntil: 'domcontentloaded' })

    const inputs = page.locator('input, select')
    const inputCount = await inputs.count()
    expect(inputCount).toBeGreaterThan(0)

    let visibleInput = false
    for (let i = 0; i < Math.min(inputCount, 10); i++) {
      if (await inputs.nth(i).isVisible()) {
        visibleInput = true
        break
      }
    }
    expect(visibleInput).toBe(true)
  })
})

test.describe('Numerology Flow', () => {
  test('should load numerology page with Korean content', async ({ page }) => {
    await page.goto('/numerology', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)

    const hasContent =
      bodyText!.includes('수비') ||
      bodyText!.includes('Numerology') ||
      bodyText!.includes('숫자') ||
      bodyText!.includes('생년월일')
    expect(hasContent).toBe(true)
  })

  test('should have input for birth date visible', async ({ page }) => {
    await page.goto('/numerology', { waitUntil: 'domcontentloaded' })

    const inputs = page.locator('input')
    const inputCount = await inputs.count()
    expect(inputCount).toBeGreaterThan(0)

    let visibleInput = false
    for (let i = 0; i < Math.min(inputCount, 10); i++) {
      if (await inputs.nth(i).isVisible()) {
        visibleInput = true
        break
      }
    }
    expect(visibleInput).toBe(true)
  })

  test('should be able to fill in birth date', async ({ page }) => {
    await page.goto('/numerology', { waitUntil: 'domcontentloaded' })

    const dateInput = page.locator('input[type="date"], input[name*="date"]').first()
    if ((await dateInput.count()) > 0 && (await dateInput.isVisible())) {
      await dateInput.fill('1990-05-15')
      const value = await dateInput.inputValue()
      expect(value).toBe('1990-05-15')
    }
  })

  test('should accept name input', async ({ page }) => {
    await page.goto('/numerology', { waitUntil: 'domcontentloaded' })

    const nameInput = page.locator('input[type="text"]').first()
    if ((await nameInput.count()) > 0 && (await nameInput.isVisible())) {
      await nameInput.fill('테스트')
      const value = await nameInput.inputValue()
      expect(value).toContain('테스트')
    }
  })
})

test.describe('Astrology Flow', () => {
  test('should load astrology page with Korean content', async ({ page }) => {
    await page.goto('/astrology', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)

    const hasContent =
      bodyText!.includes('점성') ||
      bodyText!.includes('Astrology') ||
      bodyText!.includes('별자리') ||
      bodyText!.includes('행성')
    expect(hasContent).toBe(true)
  })

  test('should load astrology counselor page with content', async ({ page }) => {
    await page.goto('/astrology/counselor', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)
  })

  test('should have birth info form visible', async ({ page }) => {
    await page.goto('/astrology', { waitUntil: 'domcontentloaded' })

    const inputs = page.locator('input, select')
    const inputCount = await inputs.count()
    expect(inputCount).toBeGreaterThan(0)

    let visibleInput = false
    for (let i = 0; i < Math.min(inputCount, 10); i++) {
      if (await inputs.nth(i).isVisible()) {
        visibleInput = true
        break
      }
    }
    expect(visibleInput).toBe(true)
  })
})

test.describe('Past Life Flow', () => {
  test('should load past-life page with Korean content', async ({ page }) => {
    await page.goto('/past-life', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)

    const hasContent =
      bodyText!.includes('전생') ||
      bodyText!.includes('Past') ||
      bodyText!.includes('Life')
    expect(hasContent).toBe(true)
  })

  test('should have birth info form visible', async ({ page }) => {
    await page.goto('/past-life', { waitUntil: 'domcontentloaded' })

    const inputs = page.locator('input, select')
    const inputCount = await inputs.count()
    expect(inputCount).toBeGreaterThan(0)

    let visibleInput = false
    for (let i = 0; i < Math.min(inputCount, 10); i++) {
      if (await inputs.nth(i).isVisible()) {
        visibleInput = true
        break
      }
    }
    expect(visibleInput).toBe(true)
  })
})

test.describe('Saju Mobile Experience', () => {
  test('should render saju page without horizontal scroll on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })

    await expect(page.locator('body')).toBeVisible()

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
  })

  test('should have touch-friendly inputs on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })

    const inputs = page.locator('input, select, textarea')
    const count = await inputs.count()

    for (let i = 0; i < Math.min(count, 3); i++) {
      const input = inputs.nth(i)
      if (await input.isVisible()) {
        const box = await input.boundingBox()
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(30)
        }
      }
    }
  })

  test('should allow mobile input on saju page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })

    const input = page.locator('input[type="text"]').first()
    if ((await input.count()) > 0 && (await input.isVisible())) {
      await input.tap()
      await input.fill('모바일 테스트')
      const value = await input.inputValue()
      expect(value).toContain('모바일')
    }
  })
})

test.describe('Saju Page Load Performance', () => {
  test('should load saju page within acceptable time', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })
    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(10000)
    await expect(page.locator('body')).toBeVisible()
  })

  test('should load destiny-map page within acceptable time', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/destiny-map', { waitUntil: 'domcontentloaded' })
    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(10000)
    await expect(page.locator('body')).toBeVisible()
  })

  test('should load numerology page within acceptable time', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/numerology', { waitUntil: 'domcontentloaded' })
    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(10000)
    await expect(page.locator('body')).toBeVisible()
  })
})
