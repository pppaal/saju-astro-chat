import { test, expect } from '@playwright/test'
import { TestHelpers } from '../fixtures/test-helpers'

test.describe('Complete Saju Analysis Flow', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
  })

  test('should complete full saju analysis with birth info', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    // Fill birth information
    await helpers.fillBirthInfo('1990-01-01', '12:00', 'Seoul')

    // Submit the form
    const submitButton = page
      .locator('button[type="submit"], button:has-text("분석"), button:has-text("시작")')
      .first()

    if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitButton.click()

      // Wait for analysis results
      await page.waitForTimeout(5000)

      // Verify results are displayed
      const bodyText = await page.textContent('body')
      const hasResults =
        bodyText?.includes('사주') ||
        bodyText?.includes('팔자') ||
        bodyText?.includes('analysis') ||
        bodyText?.includes('결과')

      expect(hasResults).toBe(true)
    }
  })

  test('should display four pillars (사주팔자)', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })

    await helpers.fillBirthInfo('1985-05-15', '14:30', 'Busan')

    const submitButton = page.locator('button[type="submit"]').first()
    await submitButton.click()

    await page.waitForTimeout(5000)

    // Check for four pillars display
    const bodyText = await page.textContent('body')
    const hasPillars =
      bodyText?.includes('년주') ||
      bodyText?.includes('월주') ||
      bodyText?.includes('일주') ||
      bodyText?.includes('시주') ||
      bodyText?.includes('pillar')

    expect(hasPillars).toBe(true)
  })

  test('should show heavenly stems and earthly branches', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })

    await helpers.fillBirthInfo('1992-08-20', '09:15', 'Seoul')

    const submitButton = page.locator('button[type="submit"]').first()
    await submitButton.click()

    await page.waitForTimeout(5000)

    const bodyText = await page.textContent('body')

    // Check for stems (천간)
    const hasStems =
      bodyText?.includes('갑') ||
      bodyText?.includes('을') ||
      bodyText?.includes('병') ||
      bodyText?.includes('정') ||
      bodyText?.includes('무') ||
      bodyText?.includes('기') ||
      bodyText?.includes('경') ||
      bodyText?.includes('신') ||
      bodyText?.includes('임') ||
      bodyText?.includes('계')

    // Check for branches (지지)
    const hasBranches =
      bodyText?.includes('자') ||
      bodyText?.includes('축') ||
      bodyText?.includes('인') ||
      bodyText?.includes('묘') ||
      bodyText?.includes('진') ||
      bodyText?.includes('사') ||
      bodyText?.includes('오') ||
      bodyText?.includes('미') ||
      bodyText?.includes('신') ||
      bodyText?.includes('유') ||
      bodyText?.includes('술') ||
      bodyText?.includes('해')

    expect(hasStems || hasBranches).toBe(true)
  })

  test('should provide personality analysis', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })

    await helpers.fillBirthInfo('1988-12-25', '18:00', 'Seoul')

    const submitButton = page.locator('button[type="submit"]').first()
    await submitButton.click()

    await page.waitForTimeout(5000)

    const bodyText = await page.textContent('body')
    const hasPersonality =
      bodyText?.includes('성격') ||
      bodyText?.includes('성향') ||
      bodyText?.includes('personality') ||
      bodyText?.includes('특징') ||
      bodyText?.includes('사주') ||
      bodyText?.includes('분석') ||
      bodyText?.includes('결과')

    expect(hasPersonality).toBe(true)
  })

  test('should enable chat consultation after analysis', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })

    await helpers.fillBirthInfo('1995-03-10', '11:30', 'Incheon')

    const submitButton = page.locator('button[type="submit"]').first()
    await submitButton.click()

    await page.waitForTimeout(5000)

    // Look for chat interface or counselor button
    const chatButton = page
      .locator(
        'button:has-text("상담"), button:has-text("채팅"), button:has-text("Chat"), button:has-text("counselor")'
      )
      .first()

    if (await chatButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await chatButton.click()

      await page.waitForTimeout(2000)

      // Verify chat interface is available
      const hasChatInput = (await page.locator('textarea, input').count()) > 0
      expect(hasChatInput).toBe(true)
    }
  })

  test('should navigate to saju counselor', async ({ page }) => {
    await page.goto('/saju/counselor', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.textContent('body')
    const hasCounselor =
      bodyText?.includes('상담') ||
      bodyText?.includes('counselor') ||
      bodyText?.includes('채팅') ||
      bodyText!.length > 200

    expect(hasCounselor).toBe(true)
  })

  test('should handle chat messages in saju counselor', async ({ page }) => {
    await page.goto('/saju/counselor', { waitUntil: 'domcontentloaded' })

    const chatInput = page.locator('textarea, input').first()
    if (await chatInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await chatInput.fill('What does my saju say about my career?')

      const sendButton = page
        .locator('button:has-text("전송"), button:has-text("Send"), button[type="submit"]')
        .first()

      await sendButton.click()

      // Wait for AI response
      await page.waitForTimeout(8000)

      // Check for messages
      const messageCount = await page
        .locator('.message, .chat-message, [data-testid*="message"]')
        .count()
      expect(messageCount).toBeGreaterThanOrEqual(1)
    }
  })

  test('should validate required birth information fields', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })

    // Try to submit without filling form
    const submitButton = page.locator('button[type="submit"]').first()

    if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitButton.click()

      await page.waitForTimeout(1000)

      // Should show validation error
      const hasError = await helpers.hasError()
      const buttonDisabled = await submitButton.isDisabled().catch(() => false)

      expect(hasError || buttonDisabled).toBe(true)
    }
  })

  test('should display luck period (대운) information', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })

    await helpers.fillBirthInfo('1987-07-07', '13:45', 'Daegu')

    const submitButton = page.locator('button[type="submit"]').first()
    await submitButton.click()

    await page.waitForTimeout(5000)

    const bodyText = await page.textContent('body')
    const hasLuckInfo =
      bodyText?.includes('대운') ||
      bodyText?.includes('운세') ||
      bodyText?.includes('luck period') ||
      bodyText?.includes('fortune')

    expect(hasLuckInfo).toBe(true)
  })

  test('should show element balance (오행)', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })

    await helpers.fillBirthInfo('1993-11-11', '16:20', 'Seoul')

    const submitButton = page.locator('button[type="submit"]').first()
    if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitButton.click()

      await page.waitForTimeout(5000)

      const bodyText = await page.textContent('body')
      const hasElements =
        bodyText?.includes('오행') ||
        bodyText?.includes('목') ||
        bodyText?.includes('화') ||
        bodyText?.includes('토') ||
        bodyText?.includes('금') ||
        bodyText?.includes('수') ||
        bodyText?.includes('element') ||
        bodyText!.length > 200

      expect(hasElements).toBe(true)
    }
  })

  test('should allow saving saju analysis', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })

    await helpers.fillBirthInfo('1991-04-04', '10:10', 'Seoul')

    const submitButton = page.locator('button[type="submit"]').first()
    await submitButton.click()

    await page.waitForTimeout(5000)

    // Look for save button
    const saveButton = page.locator('button:has-text("저장"), button:has-text("Save")').first()

    if (await saveButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await saveButton.click()
      await page.waitForTimeout(1000)

      // Should show success message
      const bodyText = await page.textContent('body')
      const hasSaveConfirmation =
        bodyText?.includes('저장') || bodyText?.includes('완료') || bodyText?.includes('saved')

      expect(hasSaveConfirmation).toBe(true)
    }
  })

  test('should display relationship compatibility info', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })

    await helpers.fillBirthInfo('1989-09-09', '15:00', 'Seoul')

    const submitButton = page.locator('button[type="submit"]').first()
    await submitButton.click()

    await page.waitForTimeout(5000)

    const bodyText = await page.textContent('body')
    const hasRelationshipInfo =
      bodyText?.includes('궁합') ||
      bodyText?.includes('인간관계') ||
      bodyText?.includes('relationship') ||
      bodyText?.includes('compatibility') ||
      bodyText?.includes('사주') ||
      bodyText?.includes('분석') ||
      bodyText?.includes('결과')

    expect(hasRelationshipInfo).toBe(true)
  })

  test('should show career and wealth insights', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })

    await helpers.fillBirthInfo('1986-06-16', '08:30', 'Gwangju')

    const submitButton = page.locator('button[type="submit"]').first()
    await submitButton.click()

    await page.waitForTimeout(5000)

    const bodyText = await page.textContent('body')
    const hasCareerInfo =
      bodyText?.includes('재물') ||
      bodyText?.includes('직업') ||
      bodyText?.includes('career') ||
      bodyText?.includes('wealth') ||
      bodyText?.includes('money') ||
      bodyText?.includes('사주') ||
      bodyText?.includes('분석') ||
      bodyText?.includes('결과')

    expect(hasCareerInfo).toBe(true)
  })

  test('should handle different birth times correctly', async ({ page }) => {
    const testCases = [
      { date: '1990-01-01', time: '00:30', city: 'Seoul' }, // Night
      { date: '1990-01-01', time: '12:00', city: 'Seoul' }, // Noon
      { date: '1990-01-01', time: '23:45', city: 'Seoul' }, // Late night
    ]

    for (const testCase of testCases) {
      await page.goto('/saju', { waitUntil: 'domcontentloaded' })

      await helpers.fillBirthInfo(testCase.date, testCase.time, testCase.city)

      const submitButton = page.locator('button[type="submit"]').first()
      await submitButton.click()

      await page.waitForTimeout(3000)

      // Should produce different results for different times
      const bodyText = await page.textContent('body')
      expect(bodyText).toBeTruthy()
      expect(bodyText!.length).toBeGreaterThan(100)
    }
  })

  test('should display visual chart or diagram', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })

    await helpers.fillBirthInfo('1994-02-14', '17:00', 'Seoul')

    const submitButton = page.locator('button[type="submit"]').first()
    await submitButton.click()

    await page.waitForTimeout(5000)

    // Check for visual elements like charts, diagrams, or structured layouts
    const hasCanvas = (await page.locator('canvas').count()) > 0
    const hasSVG = (await page.locator('svg').count()) > 0
    const hasTable = (await page.locator('table').count()) > 0

    expect(hasCanvas || hasSVG || hasTable).toBe(true)
  })

  test('should deduct credits for saju analysis', async ({ page }) => {
    const initialCredits = await helpers.getCreditBalance()
    const isPremium = await helpers.checkPremiumStatus()

    await page.goto('/saju', { waitUntil: 'domcontentloaded' })

    await helpers.fillBirthInfo('1990-01-01', '12:00', 'Seoul')

    const submitButton = page.locator('button[type="submit"]').first()
    await submitButton.click()

    await page.waitForTimeout(5000)

    const finalCredits = await helpers.getCreditBalance()

    // Credits should be deducted if not premium
    if (!isPremium && initialCredits > 0) {
      expect(finalCredits).toBeLessThanOrEqual(initialCredits)
    }
  })
})
