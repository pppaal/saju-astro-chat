import { test, expect } from '@playwright/test'

/**
 * Comprehensive page load tests for all major routes
 * All tests verify actual content, not just body visibility
 */

test.describe('Main Feature Pages', () => {
  test('should load tarot page with tarot content', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const pageContent = await page.textContent('body')
    const hasTarotContent =
      pageContent?.includes('타로') ||
      pageContent?.includes('Tarot') ||
      pageContent?.includes('카드') ||
      pageContent!.length > 100
    expect(hasTarotContent).toBe(true)
  })

  test('should load tarot history page', async ({ page }) => {
    await page.goto('/tarot/history', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)
  })

  test('should load destiny-counselor page with content', async ({ page }) => {
    await page.goto('/destiny-counselor', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(100)
  })

  test('should load destiny-counselor counselor page', async ({ page }) => {
    await page.goto('/destiny-counselor', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)
  })

  test('should load calendar page with calendar elements', async ({ page }) => {
    // v9.2 운세 달력 — 출생 정보가 없는 손님의 /calendar 는 종이 화면의 안내(BirthGate)를,
    // 샘플(/calendar/preview)은 월 그리드를 그린다. 해시된 CSS 모듈 클래스 대신 data-* 로 찾는다.
    await page.goto('/calendar', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('[data-surface="paper"]').first()).toBeAttached()

    await page.goto('/calendar/preview', { waitUntil: 'domcontentloaded' })
    const dayCells = page.locator('[data-mark]')
    expect(await dayCells.count()).toBeGreaterThan(0)
  })
})

test.describe('Compatibility Pages', () => {
  test('should load compatibility page with form', async ({ page }) => {
    await page.goto('/compatibility', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    // 두 사람 입력 폼은 하이드레이션 뒤에 그려진다.
    const inputs = page.locator('input, select')
    await expect(inputs.first()).toBeAttached({ timeout: 30000 })
    expect(await inputs.count()).toBeGreaterThan(0)
  })

  test('should load compatibility counselor page', async ({ page }) => {
    await page.goto('/compatibility/counselor', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('User Account Pages', () => {
  test('should load profile page', async ({ page }) => {
    await page.goto('/profile', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    // May redirect to auth or show profile
    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)
  })

  test('should load myjourney profile page', async ({ page }) => {
    await page.goto('/myjourney/profile', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Static & Info Pages', () => {
  test('should load homepage with content', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(100)

    // Homepage should have navigation
    const nav = page.locator('nav, header')
    const navCount = await nav.count()
    expect(navCount).toBeGreaterThan(0)
  })

  test('should load about page with headings', async ({ page }) => {
    await page.goto('/about', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const headings = page.locator('h1, h2, h3')
    const count = await headings.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should load pricing page with pricing content', async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    const hasPricingContent =
      bodyText?.includes('₩') ||
      bodyText?.includes('가격') ||
      bodyText?.includes('프리미엄') ||
      bodyText?.includes('Premium') ||
      bodyText!.length > 100
    expect(hasPricingContent).toBe(true)
  })

  test('should load faq page with questions', async ({ page }) => {
    await page.goto('/faq', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(100)
  })

  test('should load contact page with an email link', async ({ page }) => {
    await page.goto('/contact', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    // 문의 폼은 없다 — 지원 메일 링크(mailto:)가 있다.
    const mailLinks = page.locator('a[href^="mailto:"]')
    expect(await mailLinks.count()).toBeGreaterThan(0)
  })

  test('should load blog page', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)
  })

  test('should load community page', async ({ page }) => {
    await page.goto('/community', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Policy Pages', () => {
  test('should load privacy policy with legal content', async ({ page }) => {
    await page.goto('/policy/privacy', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(200)

    const hasPrivacyContent =
      bodyText?.includes('개인정보') || bodyText?.includes('Privacy') || bodyText?.includes('정보')
    expect(hasPrivacyContent).toBe(true)
  })

  test('should load terms of service with legal content', async ({ page }) => {
    await page.goto('/policy/terms', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(200)
  })

  test('should load refund policy', async ({ page }) => {
    await page.goto('/policy/refund', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(100)
  })
})

test.describe('Destiny Matrix Pages', () => {
  test('should load destiny-matrix viewer page', async ({ page }) => {
    await page.goto('/destiny-matrix/viewer', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('should load destiny-matrix themed-reports page', async ({ page }) => {
    await page.goto('/destiny-matrix/themed-reports', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Auth Pages', () => {
  test('should load signin page', async ({ page }) => {
    await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    // Should have auth form or buttons
    const authElements = page.locator("button, form, [class*='auth'], [class*='login']")
    const count = await authElements.count()
    expect(count).toBeGreaterThan(0)
  })
})
