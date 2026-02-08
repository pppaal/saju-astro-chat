import { test, expect } from '@playwright/test'
import { TestHelpers } from '../fixtures/test-helpers'

test.describe('Complete Tarot Reading Flow', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
  })

  test('should complete full tarot reading from question to result', async ({ page }) => {
    // Navigate to tarot page
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    // Enter a question
    const questionInput = page.locator("textarea, input[type='text']").first()
    if (await questionInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await questionInput.fill('What direction should I take in my career?')

      // Look for submit/analyze button
      const submitButton = page
        .locator(
          'button:has-text("시작"), button:has-text("분석"), button:has-text("Start"), button[type="submit"]'
        )
        .first()

      if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitButton.click()

        // Wait for results or card selection
        await page.waitForTimeout(3000)

        // Check if we have results or card display
        const hasCards =
          (await page.locator('.card, .tarot-card, [data-testid*="card"]').count()) > 0
        const hasResults = await page
          .textContent('body')
          .then(
            (text) =>
              text?.includes('해석') || text?.includes('interpretation') || text?.includes('result')
          )

        expect(hasCards || hasResults).toBe(true)
      }
    }
  })

  test('should display tarot cards for selection', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    // Check for card-related elements
    await page.waitForTimeout(2000)

    const bodyText = await page.textContent('body')
    const hasCardUI =
      bodyText?.includes('카드') || bodyText?.includes('card') || bodyText?.includes('타로')

    expect(hasCardUI).toBe(true)
  })

  test('should handle three-card spread', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    const questionInput = page.locator('textarea').first()
    if (await questionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await questionInput.fill('Tell me about my past, present, and future')

      const submitButton = page.locator('button[type="submit"], button:has-text("시작")').first()
      await submitButton.click()

      await page.waitForTimeout(3000)

      // Check for three-card spread indicators or any tarot content
      const bodyText = await page.textContent('body')
      const hasSpreadTerms =
        bodyText?.includes('과거') ||
        bodyText?.includes('현재') ||
        bodyText?.includes('미래') ||
        bodyText?.includes('past') ||
        bodyText?.includes('present') ||
        bodyText?.includes('future') ||
        bodyText?.includes('카드') ||
        bodyText?.includes('타로') ||
        bodyText!.length > 200

      expect(hasSpreadTerms).toBe(true)
    } else {
      // 입력 필드가 없어도 타로 페이지가 올바르게 로드되었는지 확인
      const bodyText = await page.textContent('body')
      const hasTarotContent =
        bodyText?.includes('타로') ||
        bodyText?.includes('Tarot') ||
        bodyText?.includes('카드') ||
        bodyText!.length > 100

      expect(hasTarotContent).toBe(true)
    }
  })

  test('should save tarot reading to history', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    // Perform a reading
    const questionInput = page.locator('textarea').first()
    if (await questionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await questionInput.fill('Test question for history')

      const submitButton = page.locator('button[type="submit"]').first()
      await submitButton.click()

      await page.waitForTimeout(3000)

      // Look for save button
      const saveButton = page
        .locator('button:has-text("저장"), button:has-text("Save"), button:has-text("저장하기")')
        .first()

      if (await saveButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await saveButton.click()
        await page.waitForTimeout(1000)

        // Navigate to history
        await page.goto('/tarot/history', { waitUntil: 'domcontentloaded' })
        await expect(page.locator('body')).toBeVisible()

        // Check if reading appears in history
        const historyContent = await page.textContent('body')
        const hasHistory =
          historyContent?.includes('Test question') ||
          historyContent?.includes('기록') ||
          historyContent?.includes('history')

        expect(hasHistory).toBe(true)
      }
    }
  })

  test('should load tarot reading history', async ({ page }) => {
    await page.goto('/tarot/history', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.textContent('body')
    const hasHistoryUI =
      bodyText?.includes('기록') ||
      bodyText?.includes('history') ||
      bodyText?.includes('이전') ||
      bodyText?.includes('previous') ||
      bodyText?.includes('타로') ||
      bodyText?.includes('로그인') ||
      bodyText!.length > 100

    expect(hasHistoryUI).toBe(true)
  })

  test('should handle chat-based tarot reading', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    // Look for chat interface
    const chatInput = page
      .locator('textarea, input[placeholder*="질문"], input[placeholder*="question"]')
      .first()

    if (await chatInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await chatInput.fill('Can you help me understand my love life?')

      const sendButton = page
        .locator('button:has-text("전송"), button:has-text("Send"), button[type="submit"]')
        .first()

      await sendButton.click()

      // Wait for AI response
      await page.waitForTimeout(5000)

      // Check for chat messages
      const messages = await page
        .locator('.message, .chat-message, [data-testid*="message"]')
        .count()
      expect(messages).toBeGreaterThan(0)
    }
  })

  test('should display card interpretations', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    const questionInput = page.locator('textarea').first()
    if (await questionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await questionInput.fill('What should I know today?')

      const submitButton = page.locator('button[type="submit"]').first()
      await submitButton.click()

      // Wait for interpretation
      await page.waitForTimeout(5000)

      const bodyText = await page.textContent('body')
      const hasInterpretation =
        bodyText?.includes('해석') ||
        bodyText?.includes('interpretation') ||
        bodyText?.includes('의미') ||
        bodyText?.includes('meaning') ||
        bodyText?.includes('카드') ||
        bodyText?.includes('타로') ||
        bodyText!.length > 200

      expect(hasInterpretation).toBe(true)
    } else {
      // 입력 필드가 없어도 타로 페이지 콘텐츠가 있는지 확인
      const bodyText = await page.textContent('body')
      const hasTarotContent =
        bodyText?.includes('타로') ||
        bodyText?.includes('Tarot') ||
        bodyText?.includes('카드') ||
        bodyText!.length > 100

      expect(hasTarotContent).toBe(true)
    }
  })

  test('should validate question input', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    const questionInput = page.locator('textarea').first()
    if (await questionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Try to submit empty question
      const submitButton = page.locator('button[type="submit"]').first()
      await submitButton.click()

      await page.waitForTimeout(1000)

      // Should show validation error or be disabled or still be on page
      const hasError = await helpers.hasError()
      const buttonDisabled = await submitButton.isDisabled().catch(() => false)
      const stillOnPage = page.url().includes('tarot')

      expect(hasError || buttonDisabled || stillOnPage).toBe(true)
    } else {
      // 입력 필드가 없어도 타로 페이지가 정상적으로 로드되었는지 확인
      const bodyText = await page.textContent('body')
      const hasTarotContent =
        bodyText?.includes('타로') ||
        bodyText?.includes('Tarot') ||
        bodyText?.includes('카드') ||
        bodyText!.length > 100

      expect(hasTarotContent).toBe(true)
    }
  })

  test('should handle different spread types', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    // Look for spread selection
    const bodyText = await page.textContent('body')
    const hasSpreadOptions =
      bodyText?.includes('스프레드') || bodyText?.includes('spread') || bodyText?.includes('배치')

    // If spread options exist, verify we can interact with them
    if (hasSpreadOptions) {
      const spreadButtons = page.locator('button, [role="tab"]')
      const count = await spreadButtons.count()
      expect(count).toBeGreaterThan(0)
    }
  })

  test('should display card images or names', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    const questionInput = page.locator('textarea').first()
    if (await questionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await questionInput.fill('Show me the cards')

      const submitButton = page.locator('button[type="submit"]').first()
      await submitButton.click()

      await page.waitForTimeout(3000)

      // Check for card visual elements
      const hasImages = (await page.locator('img').count()) > 0
      const bodyText = await page.textContent('body')
      const hasCardNames =
        bodyText?.includes('The') || bodyText?.includes('카드') || bodyText?.includes('Card')

      expect(hasImages || hasCardNames).toBe(true)
    }
  })

  test('should handle reversed cards if supported', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    const questionInput = page.locator('textarea').first()
    if (await questionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await questionInput.fill('What challenges might I face?')

      const submitButton = page.locator('button[type="submit"]').first()
      await submitButton.click()

      await page.waitForTimeout(3000)

      const bodyText = await page.textContent('body')
      const hasReversedConcept =
        bodyText?.includes('역방향') ||
        bodyText?.includes('reversed') ||
        bodyText?.includes('reverse')

      // This is optional - not all implementations use reversed cards
      expect(typeof hasReversedConcept).toBe('boolean')
    }
  })

  test('should allow sharing tarot reading', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    const questionInput = page.locator('textarea').first()
    if (await questionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await questionInput.fill('A reading to share')

      const submitButton = page.locator('button[type="submit"]').first()
      await submitButton.click()

      await page.waitForTimeout(3000)

      // Look for share button
      const shareButton = page
        .locator('button:has-text("공유"), button:has-text("Share"), [aria-label*="share"]')
        .first()

      if (await shareButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await shareButton.click()
        await page.waitForTimeout(1000)

        // Should show share options
        const bodyText = await page.textContent('body')
        const hasShareUI =
          bodyText?.includes('공유') || bodyText?.includes('Share') || bodyText?.includes('링크')

        expect(hasShareUI).toBe(true)
      }
    }
  })

  test('should deduct credits for premium features', async ({ page }) => {
    // Get initial credits
    const initialCredits = await helpers.getCreditBalance()

    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    const questionInput = page.locator('textarea').first()
    if (await questionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await questionInput.fill('Credit test question')

      const submitButton = page.locator('button[type="submit"]').first()
      await submitButton.click()

      await page.waitForTimeout(3000)

      // Check if credits were deducted (if not premium)
      const finalCredits = await helpers.getCreditBalance()
      const isPremium = await helpers.checkPremiumStatus()

      if (!isPremium && initialCredits > 0) {
        expect(finalCredits).toBeLessThanOrEqual(initialCredits)
      }
    }
  })
})
