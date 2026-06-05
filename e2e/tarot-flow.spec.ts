import { test, expect } from '@playwright/test'

// 타로 스모크 — 페이지 로드/입력/탐색/모바일/성능의 얕은 검증.
// 깊은 리딩 플로우(질문→결과→저장→히스토리·크레딧)는 critical-flows/02-tarot-reading.spec.ts,
// 4 스프레드 라우팅/쿼리파람은 tarot-classic-flow.spec.ts, 대형 스프레드 해석은
// tarot-large-spread.spec.ts 가 담당.
//
// (audit 2026-06) 이전엔 이 파일이 이름과 달리 Dream/I-Ching/Compatibility/Calendar
// 까지 함께 스모크해 전용 스펙과 중복됐음 — 해당 섹션 제거하고 타로 전용으로 축소.
//   Dream        → dream-flow.spec.ts
//   I-Ching      → iching-flow.spec.ts
//   Calendar     → calendar-flow.spec.ts
//   Compatibility→ pages-load / chat-interactions / form-validation 등

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

  // /tarot/love + /tarot/career 같은 카테고리 경로는 PR #150 에서 제거됨 (정통 4 스프레드로 축소).
  // 카테고리 단위 테스트는 tarot-classic-flow.spec.ts 에 4 스프레드 라우트 검증으로 대체.
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
})
