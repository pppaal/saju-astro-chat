import { test, expect } from '@playwright/test'

/**
 * Homepage & Navigation Tests
 *
 * Verifies that the homepage and key pages load correctly,
 * navigation works, and the site is responsive.
 */

test.describe('Homepage', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Check page loads without errors
    const title = await page.title()
    expect(title.length).toBeGreaterThan(0)

    // Check main content is visible
    await expect(page.locator('body')).toBeVisible()
  })

  test('should display navigation elements', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Check navigation or header is present
    const nav = page.locator("nav, header, [role='navigation']")
    const count = await nav.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should have proper meta tags for SEO', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Check viewport meta tag
    const viewportMeta = page.locator('meta[name="viewport"]')
    await expect(viewportMeta).toHaveCount(1)

    const content = await viewportMeta.getAttribute('content')
    expect(content).toContain('width=device-width')
  })
})

test.describe('Key Page Navigation', () => {
  const keyPages = [
    { path: '/saju', name: 'Saju' },
    { path: '/tarot', name: 'Tarot' },
    { path: '/destiny-map', name: 'Destiny Map' },
    { path: '/dream', name: 'Dream' },
    { path: '/compatibility', name: 'Compatibility' },
  ]

  for (const { path, name } of keyPages) {
    test(`should navigate to ${name} page (${path})`, async ({ page }) => {
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' })

      expect(response?.status()).toBeLessThan(500)
      await expect(page.locator('body')).toBeVisible()
    })
  }
})

test.describe('Static Pages', () => {
  const staticPages = [
    { path: '/about', name: 'About' },
    { path: '/pricing', name: 'Pricing' },
    { path: '/faq', name: 'FAQ' },
    { path: '/policy/privacy', name: 'Privacy Policy' },
    { path: '/policy/terms', name: 'Terms of Service' },
  ]

  for (const { path, name } of staticPages) {
    test(`should load ${name} page (${path})`, async ({ page }) => {
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' })

      expect(response?.status()).toBeLessThan(500)
      await expect(page.locator('body')).toBeVisible()
    })
  }
})

test.describe('Responsive Design', () => {
  const viewports = [
    { width: 375, height: 667, name: 'iPhone SE' },
    { width: 768, height: 1024, name: 'iPad' },
    { width: 1920, height: 1080, name: 'Desktop' },
  ]

  for (const { width, height, name } of viewports) {
    test(`should render correctly on ${name} (${width}x${height})`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()

      // No horizontal scroll on mobile/tablet
      if (width < 1024) {
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
        const viewportWidth = await page.evaluate(() => window.innerWidth)
        expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
      }
    })
  }
})
