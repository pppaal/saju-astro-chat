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
    // Navigate to saju page
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
    expect(page.url()).toContain('/saju')

    // Verify saju page has content
    const sajuText = await page.locator('body').textContent()
    expect(sajuText!.includes('사주') || sajuText!.includes('Saju') || sajuText!.length > 100).toBe(
      true
    )

    // Navigate to tarot page
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
    expect(page.url()).toContain('/tarot')

    // Verify tarot page has content
    const tarotText = await page.locator('body').textContent()
    expect(
      tarotText!.includes('타로') || tarotText!.includes('Tarot') || tarotText!.length > 100
    ).toBe(true)

    // Navigate to destiny-map page
    await page.goto('/destiny-map', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
    expect(page.url()).toContain('/destiny-map')
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

  test('should load contact page with form', async ({ page }) => {
    await page.goto('/contact', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    // Contact page should have form elements or contact info
    const formElements = page.locator('form, input, textarea, [class*="contact"]')
    const count = await formElements.count()
    expect(count).toBeGreaterThan(0)
  })
})
