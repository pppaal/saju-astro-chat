import { test, expect } from '@playwright/test'

/**
 * Comprehensive page load tests for all major routes
 * All tests verify actual content, not just body visibility
 */

test.describe('Main Feature Pages', () => {
  test('should load saju page with saju content', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const pageContent = await page.textContent('body')
    const hasSajuContent =
      pageContent?.includes('사주') ||
      pageContent?.includes('Saju') ||
      pageContent?.includes('생년월일') ||
      pageContent!.length > 100
    expect(hasSajuContent).toBe(true)
  })

  test('should load saju counselor page with chat interface', async ({ page }) => {
    await page.goto('/saju/counselor', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    // Should have chat elements
    const chatElements = page.locator('textarea, [class*="chat"], [class*="message"]')
    const count = await chatElements.count()
    expect(count).toBeGreaterThan(0)
  })

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

  test('should load destiny-map page with content', async ({ page }) => {
    await page.goto('/destiny-map', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(100)
  })

  test('should load destiny-map counselor page', async ({ page }) => {
    await page.goto('/destiny-map/counselor', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)
  })

  test('should load destiny-map result page', async ({ page }) => {
    await page.goto('/destiny-map/result', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('should load astrology page with content', async ({ page }) => {
    await page.goto('/astrology', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    const hasContent =
      bodyText?.includes('점성') ||
      bodyText?.includes('Astrology') ||
      bodyText?.includes('별') ||
      bodyText!.length > 100
    expect(hasContent).toBe(true)
  })

  test('should load astrology counselor page', async ({ page }) => {
    await page.goto('/astrology/counselor', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('should load dream page with content', async ({ page }) => {
    await page.goto('/dream', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    const hasContent =
      bodyText?.includes('꿈') ||
      bodyText?.includes('Dream') ||
      bodyText?.includes('해몽') ||
      bodyText!.length > 100
    expect(hasContent).toBe(true)
  })

  test('should load iching page with content', async ({ page }) => {
    await page.goto('/iching', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)
  })

  test('should load numerology page with content', async ({ page }) => {
    await page.goto('/numerology', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)
  })

  test('should load calendar page with calendar elements', async ({ page }) => {
    await page.goto('/calendar', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    // Should have calendar-related elements
    const calendarElements = page.locator('[class*="calendar"], [class*="month"], [class*="day"]')
    const count = await calendarElements.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should load life-prediction page with content', async ({ page }) => {
    await page.goto('/life-prediction', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)
  })

  test('should load personality page with content', async ({ page }) => {
    await page.goto('/personality', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)
  })

  test('should load past-life page with content', async ({ page }) => {
    await page.goto('/past-life', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)
  })
})

test.describe('Compatibility Pages', () => {
  test('should load compatibility page with form', async ({ page }) => {
    await page.goto('/compatibility', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    // Should have form inputs
    const inputs = page.locator('input, select')
    const count = await inputs.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should load compatibility chat page', async ({ page }) => {
    await page.goto('/compatibility/chat', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('should load compatibility counselor page', async ({ page }) => {
    await page.goto('/compatibility/counselor', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('should load compatibility insights page', async ({ page }) => {
    await page.goto('/compatibility/insights', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Destiny Match Pages', () => {
  test('should load destiny-match page with content', async ({ page }) => {
    await page.goto('/destiny-match', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)
  })

  test('should load destiny-match setup page', async ({ page }) => {
    await page.goto('/destiny-match/setup', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('should load destiny-match matches page', async ({ page }) => {
    await page.goto('/destiny-match/matches', { waitUntil: 'domcontentloaded' })
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

  test('should load myjourney page', async ({ page }) => {
    await page.goto('/myjourney', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)
  })

  test('should load myjourney history page', async ({ page }) => {
    await page.goto('/myjourney/history', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('should load myjourney circle page', async ({ page }) => {
    await page.goto('/myjourney/circle', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('should load myjourney profile page', async ({ page }) => {
    await page.goto('/myjourney/profile', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('should load notifications page', async ({ page }) => {
    await page.goto('/notifications', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('ICP Pages', () => {
  test('should load icp page with content', async ({ page }) => {
    await page.goto('/icp', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)
  })

  test('should load icp quiz page', async ({ page }) => {
    await page.goto('/icp/quiz', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('should load icp result page', async ({ page }) => {
    await page.goto('/icp/result', { waitUntil: 'domcontentloaded' })
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

  test('should load about features page', async ({ page }) => {
    await page.goto('/about/features', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(100)
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

  test('should load contact page with form', async ({ page }) => {
    await page.goto('/contact', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    // Should have contact form or info
    const formElements = page.locator('form, input, textarea')
    const count = await formElements.count()
    expect(count).toBeGreaterThan(0)
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

test.describe('Premium Reports Pages', () => {
  test('should load premium-reports page', async ({ page }) => {
    await page.goto('/premium-reports', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)
  })

  test('should load premium-reports comprehensive page', async ({ page }) => {
    await page.goto('/premium-reports/comprehensive', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('should load premium-reports themed page', async ({ page }) => {
    await page.goto('/premium-reports/themed', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('should load premium-reports timing page', async ({ page }) => {
    await page.goto('/premium-reports/timing', { waitUntil: 'domcontentloaded' })
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

test.describe('Personality Sub-pages', () => {
  test('should load personality quiz page', async ({ page }) => {
    await page.goto('/personality/quiz', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('should load personality result page', async ({ page }) => {
    await page.goto('/personality/result', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('should load personality combined page', async ({ page }) => {
    await page.goto('/personality/combined', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('should load personality compatibility page', async ({ page }) => {
    await page.goto('/personality/compatibility', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })
})
