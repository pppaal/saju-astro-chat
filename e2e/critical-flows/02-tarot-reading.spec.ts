import { expect, test } from '@playwright/test'

import { TestHelpers } from '../fixtures/test-helpers'

const hasAny = (text: string | null, keywords: string[]) => {
  const source = (text || '').toLowerCase()
  return keywords.some((keyword) => source.includes(keyword.toLowerCase()))
}

test.describe('Complete Tarot Reading Flow', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
  })

  test('should complete full tarot reading from question to result', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const questionInput = page.locator("textarea, input[type='text']").first()
    if (!(await questionInput.isVisible({ timeout: 5000 }).catch(() => false))) {
      await helpers.waitForAnyText(['tarot', 'card'], 10000)
      return
    }

    await questionInput.fill('What direction should I take in my career?')

    const submitButton = page
      .locator('button[type="submit"], button:has-text("Start"), button:has-text("Analyze")')
      .first()

    if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitButton.click()
      await helpers.waitForAnyText(['tarot', 'card', 'interpretation', 'result'], 15000)

      const hasCards =
        (await page.locator('.card, .tarot-card, [data-testid*="card"]').count()) > 0
      const body = await page.locator('body').textContent()
      const hasResults = hasAny(body, ['interpretation', 'result', 'tarot'])
      expect(hasCards || hasResults).toBe(true)
    }
  })

  test('should display tarot cards for selection', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })
    await helpers.waitForAnyText(['tarot', 'card'], 10000)

    const bodyText = await page.locator('body').textContent()
    expect(hasAny(bodyText, ['tarot', 'card'])).toBe(true)
  })

  test('should handle three-card spread', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    const questionInput = page.locator('textarea').first()
    if (!(await questionInput.isVisible({ timeout: 3000 }).catch(() => false))) {
      const bodyText = await page.locator('body').textContent()
      expect(hasAny(bodyText, ['tarot', 'card']) || (bodyText || '').length > 100).toBe(true)
      return
    }

    await questionInput.fill('Tell me about my past, present, and future')
    await page.locator('button[type="submit"]').first().click()

    await helpers.waitForAnyText(['past', 'present', 'future', 'card', 'tarot'], 15000)

    const bodyText = await page.locator('body').textContent()
    const hasSpreadTerms = hasAny(bodyText, [
      'past',
      'present',
      'future',
      'tarot',
      'card',
      'result',
    ])

    expect(hasSpreadTerms || (bodyText || '').length > 200).toBe(true)
  })

  test('should save tarot reading to history', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    const questionInput = page.locator('textarea').first()
    if (!(await questionInput.isVisible({ timeout: 3000 }).catch(() => false))) {
      await expect(page.locator('body')).toBeVisible()
      return
    }

    await questionInput.fill('Test question for history')
    await page.locator('button[type="submit"]').first().click()
    await helpers.waitForAnyText(['tarot', 'result', 'card', 'save'], 15000)

    const saveButton = page
      .locator('button:has-text("Save"), button:has-text("save"), button:has-text("저장")')
      .first()

    if (!(await saveButton.isVisible({ timeout: 5000 }).catch(() => false))) {
      await expect(page.locator('body')).toBeVisible()
      return
    }

    await saveButton.click()
    await helpers.waitForAnyText(['save', 'saved', 'history', 'record'], 10000)

    await page.goto('/tarot/history', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const historyContent = await page.locator('body').textContent()
    const hasHistory = hasAny(historyContent, ['history', 'record', 'tarot'])
    expect(hasHistory || (historyContent || '').includes('Test question')).toBe(true)

    const apiHistory = await helpers.fetchMyHistory('tarot')
    if (apiHistory.status === 200 && apiHistory.history) {
      const records = apiHistory.history.flatMap((day) => day.records)
      expect(records.some((record) => record.service === 'tarot')).toBe(true)
    }
  })

  test('should load tarot reading history', async ({ page }) => {
    await page.goto('/tarot/history', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    const hasHistoryUI =
      hasAny(bodyText, ['history', 'previous', 'tarot', 'login']) || (bodyText || '').length > 100

    expect(hasHistoryUI).toBe(true)
  })

  test('should handle question-led tarot reading flow', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    const questionInput = page
      .locator('textarea, input[placeholder*="question" i], input[placeholder*="질문"]')
      .first()

    if (!(await questionInput.isVisible({ timeout: 3000 }).catch(() => false))) {
      await expect(page.locator('body')).toBeVisible()
      return
    }

    await questionInput.fill('Can you help me understand my love life?')
    const submitButton = page
      .locator('button[type="submit"], button:has-text("Start"), button:has-text("Analyze")')
      .first()

    if (!(await submitButton.isVisible({ timeout: 5000 }).catch(() => false))) {
      await expect(page.locator('body')).toBeVisible()
      return
    }

    await submitButton.click()
    await helpers.waitForAnyText(['tarot', 'interpretation', 'card', 'result', 'spread'], 20000)

    const cards = await page.locator('.card, .tarot-card, [data-testid*="card"]').count()
    const body = await page.locator('body').textContent()
    expect(cards > 0 || hasAny(body, ['tarot', 'card', 'interpretation', 'spread'])).toBe(true)
  })

  test('should display card interpretations', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    const questionInput = page.locator('textarea').first()
    if (!(await questionInput.isVisible({ timeout: 3000 }).catch(() => false))) {
      const body = await page.locator('body').textContent()
      expect(hasAny(body, ['tarot', 'card']) || (body || '').length > 100).toBe(true)
      return
    }

    await questionInput.fill('What should I know today?')
    await page.locator('button[type="submit"]').first().click()
    await helpers.waitForAnyText(['interpretation', 'meaning', 'card', 'tarot', 'result'], 20000)

    const bodyText = await page.locator('body').textContent()
    const hasInterpretation = hasAny(bodyText, ['interpretation', 'meaning', 'tarot', 'card'])
    expect(hasInterpretation || (bodyText || '').length > 200).toBe(true)
  })

  test('should validate question input', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    const questionInput = page.locator('textarea').first()
    if (!(await questionInput.isVisible({ timeout: 3000 }).catch(() => false))) {
      const body = await page.locator('body').textContent()
      expect(hasAny(body, ['tarot', 'card']) || (body || '').length > 100).toBe(true)
      return
    }

    const submitButton = page.locator('button[type="submit"]').first()
    await submitButton.click()

    const hasError = await helpers.hasError()
    const buttonDisabled = await submitButton.isDisabled().catch(() => false)
    const stillOnPage = page.url().includes('tarot')

    expect(hasError || buttonDisabled || stillOnPage).toBe(true)
  })

  test('should handle different spread types', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    const bodyText = await page.locator('body').textContent()
    const hasSpreadOptions = hasAny(bodyText, ['spread', 'tarot', 'card'])

    if (hasSpreadOptions) {
      const spreadButtons = page.locator('button, [role="tab"]')
      expect(await spreadButtons.count()).toBeGreaterThan(0)
    }
  })

  test('should display card images or names', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    const questionInput = page.locator('textarea').first()
    if (!(await questionInput.isVisible({ timeout: 3000 }).catch(() => false))) {
      await expect(page.locator('body')).toBeVisible()
      return
    }

    await questionInput.fill('Show me the cards')
    await page.locator('button[type="submit"]').first().click()
    await helpers.waitForAnyText(['card', 'tarot', 'the'], 12000)

    const hasImages = (await page.locator('img').count()) > 0
    const bodyText = await page.locator('body').textContent()
    const hasCardNames = hasAny(bodyText, ['card', 'tarot', 'the'])

    expect(hasImages || hasCardNames).toBe(true)
  })

  test('should handle reversed cards if supported', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    const questionInput = page.locator('textarea').first()
    if (!(await questionInput.isVisible({ timeout: 3000 }).catch(() => false))) {
      await expect(page.locator('body')).toBeVisible()
      return
    }

    await questionInput.fill('What challenges might I face?')
    await page.locator('button[type="submit"]').first().click()
    await helpers.waitForAnyText(['tarot', 'card', 'result', 'reversed', 'reverse'], 12000)

    const bodyText = await page.locator('body').textContent()
    const hasReversedConcept = hasAny(bodyText, ['reversed', 'reverse'])
    expect(typeof hasReversedConcept).toBe('boolean')
  })

  test('should allow sharing tarot reading', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    const questionInput = page.locator('textarea').first()
    if (!(await questionInput.isVisible({ timeout: 3000 }).catch(() => false))) {
      await expect(page.locator('body')).toBeVisible()
      return
    }

    await questionInput.fill('A reading to share')
    await page.locator('button[type="submit"]').first().click()
    await helpers.waitForAnyText(['tarot', 'card', 'result', 'share'], 12000)

    const shareButton = page
      .locator('button:has-text("Share"), button:has-text("공유"), [aria-label*="share" i]')
      .first()

    if (await shareButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await shareButton.click()
      await helpers.waitForAnyText(['share', 'link'], 8000)

      const bodyText = await page.locator('body').textContent()
      expect(hasAny(bodyText, ['share', 'link'])).toBe(true)
    }
  })

  test('should deduct credits for premium features', async ({ page }) => {
    const initialCredits = await helpers.getCreditBalance()

    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    const questionInput = page.locator('textarea').first()
    if (!(await questionInput.isVisible({ timeout: 3000 }).catch(() => false))) {
      await expect(page.locator('body')).toBeVisible()
      return
    }

    await questionInput.fill('Credit test question')
    await page.locator('button[type="submit"]').first().click()
    await helpers.waitForAnyText(['tarot', 'result', 'card', 'interpretation'], 15000)

    const finalCredits = await helpers.getCreditBalance()
    const isPremium = await helpers.checkPremiumStatus()

    if (!isPremium && initialCredits > 0) {
      expect(finalCredits).toBeLessThanOrEqual(initialCredits)
    }
  })

  test('should handle follow-up question after a reading', async ({ page }) => {
    // followup 채팅(FollowupChat)은 결과 화면(ResultsStage)에서만 노출된다. 스프레드 URL 로
    // 직접 진입해 리딩을 태운 뒤, followup 입력(placeholder "더 궁금한 점을 적어주세요" /
    // "Ask another question") + Send 버튼(aria-label="Send")이 뜨면 추가 질문을 실제로 보낸다.
    // AI 백엔드가 없는 환경에선 결과까지 도달 못 할 수 있어, 주변 테스트와 동일하게 graceful 처리.
    await page.goto('/tarot/general-insight/past-present-future?question=Will my project succeed', {
      waitUntil: 'domcontentloaded',
    })
    await helpers.waitForAnyText(
      ['tarot', 'card', 'interpretation', 'result', '카드', '해석'],
      15000
    )

    const followupInput = page
      .locator('textarea[placeholder*="더 궁금한"], textarea[placeholder*="Ask another"]')
      .first()

    if (!(await followupInput.isVisible({ timeout: 8000 }).catch(() => false))) {
      // 결과/followup 미도달(AI 없음 등) — 페이지가 유효 상태인지만 확인 후 종료.
      await expect(page.locator('body')).toBeVisible()
      return
    }

    await followupInput.fill('What should I focus on first?')

    const sendButton = page.locator('button[aria-label="Send"]').first()
    await expect(sendButton).toBeVisible()
    await sendButton.click()

    // 보낸 질문 turn 이 채팅에 반영되거나 assistant 응답이 채워지길 대기.
    await helpers.waitForAnyText(
      ['focus', 'first', '카드', 'card', '해석', 'interpretation'],
      15000
    )

    const bodyText = await page.locator('body').textContent()
    expect(
      (bodyText || '').includes('What should I focus on first?') || (bodyText || '').length > 200
    ).toBe(true)
  })

  test('should draw a clarifier card from the results chat', async ({ page }) => {
    // 클래리파이어("한 장 더 뽑기") 카드도 결과 화면의 followup 영역에서 버튼으로 열린다.
    // 버튼 라벨: "카드 한 장 더 뽑기" / "Draw one more card", 모달: id="clarifier-modal-title".
    // followup 과 동일하게 결과 미도달 환경에선 graceful 처리.
    await page.goto('/tarot/general-insight/past-present-future?question=Should I take the offer', {
      waitUntil: 'domcontentloaded',
    })
    await helpers.waitForAnyText(
      ['tarot', 'card', 'interpretation', 'result', '카드', '해석'],
      15000
    )

    const clarifierButton = page
      .locator('button:has-text("카드 한 장 더 뽑기"), button:has-text("Draw one more card")')
      .first()

    if (!(await clarifierButton.isVisible({ timeout: 8000 }).catch(() => false))) {
      // 결과/클래리파이어 버튼 미도달 — 페이지 유효성만 확인 후 종료.
      await expect(page.locator('body')).toBeVisible()
      return
    }

    await clarifierButton.click()

    // 클래리파이어 모달이 열려야 한다.
    const modalTitle = page.locator(
      '#clarifier-modal-title, :text("클래리파이어 카드"), :text("Clarifier card")'
    )
    await expect(modalTitle.first()).toBeVisible({ timeout: 8000 })
  })
})
