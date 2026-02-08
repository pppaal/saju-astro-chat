import { test, expect } from '@playwright/test'

test.describe('Saju Analysis Flow', () => {
  test('should load saju page with form', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)

    // Verify saju-specific content
    const hasSajuContent =
      bodyText!.includes('사주') ||
      bodyText!.includes('Saju') ||
      bodyText!.includes('생년월일') ||
      bodyText!.includes('팔자')
    expect(hasSajuContent).toBe(true)
  })

  test('should have birth date input fields', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })

    // Page should have form elements for birth info
    const inputs = page.locator('input, select')
    const inputCount = await inputs.count()
    expect(inputCount).toBeGreaterThan(0)

    // At least one input should be visible
    const firstInput = inputs.first()
    await expect(firstInput).toBeVisible()
  })

  test('should have gender selection', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })

    // Look for gender selection
    const genderElements = page.locator(
      'input[type="radio"], button:has-text("남"), button:has-text("여"), [class*="gender"]'
    )
    const count = await genderElements.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should display validation for empty form submission', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })

    // Try to find and click submit button
    const submitButton = page.locator(
      'button[type="submit"], button:has-text("분석"), button:has-text("시작"), button:has-text("Submit")'
    )

    if ((await submitButton.count()) > 0) {
      await submitButton.first().click()
      await page.waitForTimeout(500)

      // Should still be on saju page or show validation
      await expect(page.locator('body')).toBeVisible()
      expect(page.url()).toContain('saju')
    }
  })

  test('should load saju counselor page', async ({ page }) => {
    await page.goto('/saju/counselor', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)
  })

  test('should have chat interface on counselor page', async ({ page }) => {
    await page.goto('/saju/counselor', { waitUntil: 'domcontentloaded' })

    // Counselor page should have chat elements
    const chatElements = page.locator(
      'textarea, input[type="text"], [class*="chat"], [class*="message"]'
    )
    const count = await chatElements.count()
    expect(count).toBeGreaterThan(0)
  })
})

test.describe('Destiny Map Flow', () => {
  test('should load destiny-map page with content', async ({ page }) => {
    await page.goto('/destiny-map', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)

    // Verify destiny-map specific content
    const hasContent =
      bodyText!.includes('운명') || bodyText!.includes('Destiny') || bodyText!.includes('사주')
    expect(hasContent).toBe(true)
  })

  test('should have form inputs for birth info', async ({ page }) => {
    await page.goto('/destiny-map', { waitUntil: 'domcontentloaded' })

    const inputs = page.locator('input, select')
    const inputCount = await inputs.count()
    expect(inputCount).toBeGreaterThan(0)
  })

  test('should navigate to result page', async ({ page }) => {
    await page.goto('/destiny-map/result', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    // Result page should exist (may show empty state without data)
    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)
  })

  test('should load destiny-map counselor page', async ({ page }) => {
    await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('should have tab or section navigation', async ({ page }) => {
    await page.goto('/destiny-map', { waitUntil: 'domcontentloaded' })

    // Should have tabs or section buttons
    const tabs = page.locator('[role="tab"], [class*="tab"], button')
    const count = await tabs.count()
    expect(count).toBeGreaterThan(0)
  })
})

test.describe('Life Prediction Flow', () => {
  test('should load life-prediction page with content', async ({ page }) => {
    await page.goto('/life-prediction', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)

    // Verify life-prediction specific content
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
  })

  test('should have birth date form', async ({ page }) => {
    await page.goto('/life-prediction', { waitUntil: 'domcontentloaded' })

    const inputs = page.locator('input, select')
    const inputCount = await inputs.count()
    expect(inputCount).toBeGreaterThan(0)
  })
})

test.describe('Numerology Flow', () => {
  test('should load numerology page with content', async ({ page }) => {
    await page.goto('/numerology', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)

    // Verify numerology specific content
    const hasContent =
      bodyText!.includes('수비') ||
      bodyText!.includes('Numerology') ||
      bodyText!.includes('숫자') ||
      bodyText!.includes('생년월일')
    expect(hasContent).toBe(true)
  })

  test('should have input for birth date', async ({ page }) => {
    await page.goto('/numerology', { waitUntil: 'domcontentloaded' })

    const inputs = page.locator('input')
    const inputCount = await inputs.count()
    expect(inputCount).toBeGreaterThan(0)

    // At least one should be visible
    const firstInput = inputs.first()
    await expect(firstInput).toBeVisible()
  })

  test('should be able to fill in birth date', async ({ page }) => {
    await page.goto('/numerology', { waitUntil: 'domcontentloaded' })

    const dateInput = page.locator('input[type="date"], input[name*="date"]').first()
    if ((await dateInput.count()) > 0) {
      await dateInput.fill('1990-05-15')
      const value = await dateInput.inputValue()
      expect(value).toBe('1990-05-15')
    }
  })
})

test.describe('Astrology Flow', () => {
  test('should load astrology page with content', async ({ page }) => {
    await page.goto('/astrology', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)

    // Verify astrology specific content
    const hasContent =
      bodyText!.includes('점성') ||
      bodyText!.includes('Astrology') ||
      bodyText!.includes('별자리') ||
      bodyText!.includes('행성')
    expect(hasContent).toBe(true)
  })

  test('should load astrology counselor page', async ({ page }) => {
    await page.goto('/astrology/counselor', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('should have birth info form', async ({ page }) => {
    await page.goto('/astrology', { waitUntil: 'domcontentloaded' })

    const inputs = page.locator('input, select')
    const inputCount = await inputs.count()
    expect(inputCount).toBeGreaterThan(0)
  })
})

test.describe('Past Life Flow', () => {
  test('should load past-life page with content', async ({ page }) => {
    await page.goto('/past-life', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)

    // Verify past-life specific content
    const hasContent =
      bodyText!.includes('전생') || bodyText!.includes('Past') || bodyText!.includes('Life')
    expect(hasContent).toBe(true)
  })

  test('should have birth info form', async ({ page }) => {
    await page.goto('/past-life', { waitUntil: 'domcontentloaded' })

    const inputs = page.locator('input, select')
    const inputCount = await inputs.count()
    expect(inputCount).toBeGreaterThan(0)
  })
})
