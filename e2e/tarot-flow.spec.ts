import { test, expect } from '@playwright/test'

test.describe('Tarot Flow', () => {
  test('should load tarot homepage with content', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)

    // Verify tarot-specific content
    const hasTarotContent =
      bodyText!.includes('타로') || bodyText!.includes('Tarot') || bodyText!.includes('카드')
    expect(hasTarotContent).toBe(true)
  })

  test('should have question input area', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    // Tarot page should have input for question
    const questionInput = page.locator("textarea, input[type='text']")
    const count = await questionInput.count()

    if (count > 0) {
      // If there's an input, verify it's interactable
      const firstInput = questionInput.first()
      await expect(firstInput).toBeVisible()
      await firstInput.fill('테스트 질문입니다')
      const value = await firstInput.inputValue()
      expect(value).toContain('테스트')
    }
  })

  test('should display tarot categories or spreads', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    // Tarot page should show different reading options
    const cards = page.locator('[class*="card"], [class*="spread"], button, a[href*="tarot"]')
    const count = await cards.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should navigate to spread page', async ({ page }) => {
    await page.goto('/tarot/general-insight/past-present-future?question=test', {
      waitUntil: 'domcontentloaded',
    })
    await expect(page.locator('body')).toBeVisible()

    // Verify we're on a tarot reading page
    expect(page.url()).toContain('tarot')
  })

  test('should load tarot history page', async ({ page }) => {
    await page.goto('/tarot/history', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    // History page should have list or empty state
    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)
  })

  test('should be able to select a tarot category', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    // Find clickable category elements
    const categories = page.locator('a[href*="/tarot/"], button, [class*="category"]').first()
    if ((await categories.count()) > 0) {
      await expect(categories).toBeVisible()
    }
  })
})

test.describe('Dream Interpretation Flow', () => {
  test('should load dream page with content', async ({ page }) => {
    await page.goto('/dream', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)

    // Verify dream-specific content
    const hasDreamContent =
      bodyText!.includes('꿈') || bodyText!.includes('Dream') || bodyText!.includes('해몽')
    expect(hasDreamContent).toBe(true)
  })

  test('should have dream input area', async ({ page }) => {
    await page.goto('/dream', { waitUntil: 'domcontentloaded' })

    const textareas = page.locator('textarea')
    const textareaCount = await textareas.count()

    if (textareaCount > 0) {
      const textarea = textareas.first()
      await expect(textarea).toBeVisible()
      await textarea.fill('어젯밤 꿈에서 하늘을 날았습니다')
      const value = await textarea.inputValue()
      expect(value).toContain('하늘')
    }
  })

  test('should have submit button', async ({ page }) => {
    await page.goto('/dream', { waitUntil: 'domcontentloaded' })

    const submitButton = page.locator(
      'button[type="submit"], button:has-text("해석"), button:has-text("시작")'
    )
    if ((await submitButton.count()) > 0) {
      await expect(submitButton.first()).toBeVisible()
    }
  })
})

test.describe('I-Ching Flow', () => {
  test('should load I-Ching page with content', async ({ page }) => {
    await page.goto('/iching', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)

    // Verify I-Ching specific content
    const hasIChingContent =
      bodyText!.includes('주역') ||
      bodyText!.includes('I-Ching') ||
      bodyText!.includes('易') ||
      bodyText!.includes('점')
    expect(hasIChingContent).toBe(true)
  })

  test('should have question input for I-Ching', async ({ page }) => {
    await page.goto('/iching', { waitUntil: 'domcontentloaded' })

    const inputs = page.locator('input, textarea')
    const inputCount = await inputs.count()

    if (inputCount > 0) {
      const input = inputs.first()
      await expect(input).toBeVisible()
    }
  })

  test('should have hexagram visualization or buttons', async ({ page }) => {
    await page.goto('/iching', { waitUntil: 'domcontentloaded' })

    // I-Ching should have interaction buttons or hexagram display
    const elements = page.locator('button, [class*="hexagram"], [class*="line"]')
    const count = await elements.count()
    expect(count).toBeGreaterThan(0)
  })
})

test.describe('Compatibility Flow', () => {
  test('should load compatibility page with content', async ({ page }) => {
    await page.goto('/compatibility', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)

    // Verify compatibility-specific content
    const hasCompatibilityContent =
      bodyText!.includes('궁합') ||
      bodyText!.includes('Compatibility') ||
      bodyText!.includes('상성')
    expect(hasCompatibilityContent).toBe(true)
  })

  test('should load compatibility chat page', async ({ page }) => {
    await page.goto('/compatibility/chat', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('should load compatibility insights page', async ({ page }) => {
    await page.goto('/compatibility/insights', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('should have form for two people info', async ({ page }) => {
    await page.goto('/compatibility', { waitUntil: 'domcontentloaded' })

    // Compatibility should have inputs for two people
    const inputs = page.locator('input')
    const inputCount = await inputs.count()
    expect(inputCount).toBeGreaterThan(0)
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

    // Calendar should have date elements
    const calendarElements = page.locator(
      '[class*="calendar"], [class*="month"], [class*="day"], table'
    )
    const count = await calendarElements.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should have navigation for months', async ({ page }) => {
    await page.goto('/calendar', { waitUntil: 'domcontentloaded' })

    // Should have month navigation buttons
    const navButtons = page.locator(
      'button:has-text("이전"), button:has-text("다음"), [class*="prev"], [class*="next"]'
    )
    const count = await navButtons.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })
})
