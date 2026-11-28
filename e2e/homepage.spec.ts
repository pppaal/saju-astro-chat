import { test, expect } from '@playwright/test'

test.describe('Homepage & Navigation', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Check page loads without errors
    const title = await page.title()
    expect(title.length).toBeGreaterThan(0)

    // Check main content is visible
    const mainContent = page.locator('main, body')
    await expect(mainContent.first()).toBeVisible()

    // Verify homepage has actual content
    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(100)
  })

  test('should display navigation menu', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Check navigation or header is present
    const nav = page.locator("nav, header, [role='navigation']")
    const count = await nav.count()
    expect(count).toBeGreaterThan(0)

    // Verify navigation has links
    const links = page.locator('nav a, header a')
    const linkCount = await links.count()
    expect(linkCount).toBeGreaterThan(0)
  })

  test('should navigate to key pages', async ({ page }) => {
    // v9.2 의 핵심 화면 — 인생 흐름(/destiny), 운세 달력(/calendar), 타로, 운명 상담사.
    // /saju · /dream 은 삭제된 서비스라 proxy 가 홈으로 보낸다(enabledServices
    // REMOVED_PUBLIC_SERVICE_PREFIXES).
    await page.goto('/destiny', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
    expect(page.url()).toContain('/destiny')

    await page.goto('/calendar', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
    expect(page.url()).toContain('/calendar')

    // Navigate to tarot page
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
    expect(page.url()).toContain('/tarot')

    // Verify tarot page has content
    const tarotText = await page.locator('body').textContent()
    expect(
      tarotText!.includes('타로') || tarotText!.includes('Tarot') || tarotText!.length > 100
    ).toBe(true)

    // 옛 /destiny-map 은 운명 상담사(/destiny-counselor)로 영구 리다이렉트된다(next.config.ts).
    await page.goto('/destiny-map', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
    expect(page.url()).toContain('/destiny-counselor')
  })

  test('removed services redirect to home', async ({ page }) => {
    for (const route of ['/saju', '/dream']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      expect(new URL(page.url()).pathname).toBe('/')
    }
  })

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Check page renders on mobile viewport
    await expect(page.locator('body')).toBeVisible()

    // No horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10)
  })

  test('should have proper meta tags for SEO', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Check viewport meta tag
    const viewportMeta = page.locator('meta[name="viewport"]')
    const count = await viewportMeta.count()
    expect(count).toBeGreaterThan(0)

    const content = await viewportMeta.getAttribute('content')
    expect(content).toContain('width=device-width')
  })

  test('should display feature cards or sections on homepage', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Homepage should have multiple sections or feature cards
    const sections = page.locator('section, [class*="card"], [class*="feature"]')
    const sectionCount = await sections.count()
    expect(sectionCount).toBeGreaterThan(0)
  })

  test('should have clickable links that work', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Find first internal link and click it
    const internalLinks = page.locator('a[href^="/"]').first()
    if ((await internalLinks.count()) > 0) {
      const href = await internalLinks.getAttribute('href')
      await internalLinks.click()
      await page.waitForLoadState('domcontentloaded')

      // Should have navigated
      expect(page.url()).toContain(href!.split('?')[0])
    }
  })
})

test.describe('Static Pages', () => {
  test('should load about page with content', async ({ page }) => {
    await page.goto('/about', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)

    // About page should have headings
    const headings = page.locator('h1, h2, h3')
    const headingCount = await headings.count()
    expect(headingCount).toBeGreaterThan(0)
  })

  test('should load pricing page with pricing info', async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)

    // Pricing page should have price-related content
    const hasPricingContent =
      bodyText!.includes('₩') ||
      bodyText!.includes('가격') ||
      bodyText!.includes('구독') ||
      bodyText!.includes('프리미엄') ||
      bodyText!.includes('Premium') ||
      bodyText!.includes('Price')
    expect(hasPricingContent).toBe(true)
  })

  test('should load FAQ page with questions', async ({ page }) => {
    await page.goto('/faq', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    // Should have question/answer content
    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(100)

    // FAQ page should have question-related content
    const hasFAQContent =
      bodyText!.includes('질문') ||
      bodyText!.includes('자주') ||
      bodyText!.includes('FAQ') ||
      bodyText!.includes('문의')
    expect(hasFAQContent).toBe(true)
  })

  test('should load privacy policy with legal text', async ({ page }) => {
    await page.goto('/policy/privacy', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(200)

    // Privacy policy should have privacy-related content
    const hasPrivacyContent =
      bodyText!.includes('개인정보') ||
      bodyText!.includes('Privacy') ||
      bodyText!.includes('정보') ||
      bodyText!.includes('보호')
    expect(hasPrivacyContent).toBe(true)
  })

  test('should load terms of service with legal text', async ({ page }) => {
    await page.goto('/policy/terms', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(200)

    // Terms should have terms-related content
    const hasTermsContent =
      bodyText!.includes('이용약관') ||
      bodyText!.includes('Terms') ||
      bodyText!.includes('서비스') ||
      bodyText!.includes('약관')
    expect(hasTermsContent).toBe(true)
  })

  test('should load contact page with an email link', async ({ page }) => {
    await page.goto('/contact', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    // 문의 폼은 없다 — 지원 메일 링크(mailto:)와 응답 시간 안내가 있다.
    const mailLinks = page.locator('a[href^="mailto:"]')
    expect(await mailLinks.count()).toBeGreaterThan(0)
  })
})
