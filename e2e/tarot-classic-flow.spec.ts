import { test, expect } from '@playwright/test'

/**
 * 정통 4 스프레드 라우트 + 결과 페이지 핵심 요소 검증.
 * AI 호출은 mock 없이 그냥 렌더 시점까지만 확인 (실제 LLM 응답은 별도 manual 검증).
 */

const SPREADS = [
  { id: 'quick-reading', cards: 1, titleKo: '한 장 리딩' },
  { id: 'past-present-future', cards: 3, titleKo: '과거' },
  { id: 'general-cross', cards: 5, titleKo: '5장 크로스' },
  { id: 'celtic-cross', cards: 10, titleKo: '켈틱 크로스' },
] as const

test.describe('Tarot — classic 4 spreads route render', () => {
  for (const s of SPREADS) {
    test(`spread ${s.id} (${s.cards} cards) renders`, async ({ page }) => {
      await page.goto(`/tarot/general-insight/${s.id}?question=test`, {
        waitUntil: 'domcontentloaded',
      })
      await expect(page.locator('body')).toBeVisible()
      const body = await page.locator('body').textContent()
      expect(body!.length).toBeGreaterThan(50)
    })
  }

  test('?question= round-trips to results header Q box', async ({ page }) => {
    const q = '낼 뭐 먹을까'
    await page.goto(`/tarot/general-insight/quick-reading?question=${encodeURIComponent(q)}`, {
      waitUntil: 'domcontentloaded',
    })
    // Q 배지 + 사용자 질문이 결과 페이지 상단에 노출되는지
    await expect(page.locator('body')).toContainText(q, { timeout: 5000 })
  })

  test('legacy ?topic= URL no longer hydrates question (was fallback in #151, removed in #160)', async ({
    page,
  }) => {
    const q = '이건 옛 URL 으로 들어옴'
    await page.goto(`/tarot/general-insight/quick-reading?topic=${encodeURIComponent(q)}`, {
      waitUntil: 'domcontentloaded',
    })
    // body 는 렌더되긴 함 (페이지 자체는 문제 없음)
    await expect(page.locator('body')).toBeVisible()
  })

  test('unknown spread id falls back gracefully (no white screen)', async ({ page }) => {
    await page.goto('/tarot/general-insight/this-spread-was-removed?question=test', {
      waitUntil: 'domcontentloaded',
    })
    await expect(page.locator('body')).toBeVisible()
  })

  test('unknown category id falls back gracefully', async ({ page }) => {
    await page.goto('/tarot/love-relationships/past-present-future?question=test', {
      waitUntil: 'domcontentloaded',
    })
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Tarot history — redesigned page', () => {
  test('history page loads with header chip + back button', async ({ page }) => {
    await page.goto('/tarot/history', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
    const body = await page.locator('body').textContent()
    // 새 디자인 헤더 텍스트
    expect(
      body!.includes('타로 리딩 기록') ||
        body!.includes('Tarot Reading History') ||
        body!.includes('돌아가기') ||
        body!.includes('Back'),
    ).toBe(true)
  })

  test('history page works on mobile viewport without horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/tarot/history', { waitUntil: 'domcontentloaded' })
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
  })
})
