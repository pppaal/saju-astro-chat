import { test, expect } from '@playwright/test'

/**
 * Mobile-specific tests
 */

test.describe('Mobile Viewport Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE
  })

  test('homepage should render on mobile', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)
  })

  test('saju page should render on mobile', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('tarot page should render on mobile', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('destiny-map page should render on mobile', async ({ page }) => {
    await page.goto('/destiny-map', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('dream page should render on mobile', async ({ page }) => {
    await page.goto('/dream', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('compatibility page should render on mobile', async ({ page }) => {
    await page.goto('/compatibility', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('pricing page should render on mobile', async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('profile page should render on mobile', async ({ page }) => {
    await page.goto('/profile', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Mobile No Horizontal Scroll', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
  })

  test('homepage should not have horizontal scroll', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
  })

  test('saju page should not have horizontal scroll', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
  })

  test('tarot page should not have horizontal scroll', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
  })
})

test.describe('Tablet Viewport Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }) // iPad
  })

  test('homepage should render on tablet', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('saju page should render on tablet', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('tarot page should render on tablet', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('destiny-map page should render on tablet', async ({ page }) => {
    await page.goto('/destiny-map', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Large Mobile Viewport Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 414, height: 896 }) // iPhone 11 Pro Max
  })

  test('homepage should render on large mobile', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('saju page should render on large mobile', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('pricing page should render on large mobile', async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Mobile Touch Targets', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
  })

  test('buttons should have adequate tap target size', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const buttons = page.locator('button')
    const count = await buttons.count()

    // Check first few buttons have reasonable size
    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i)
      if (await button.isVisible()) {
        const box = await button.boundingBox()
        if (box) {
          // Touch targets should be at least 44x44 (Apple HIG) or close
          expect(box.width).toBeGreaterThanOrEqual(30)
          expect(box.height).toBeGreaterThanOrEqual(30)
        }
      }
    }
  })
})

test.describe('Mobile Input Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
  })

  test('text inputs should be usable on mobile', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })

    const inputs = page.locator("input[type='text']")
    const count = await inputs.count()

    if (count > 0) {
      const input = inputs.first()
      if (await input.isVisible()) {
        await input.tap()
        await input.fill('테스트')
        await expect(input).toHaveValue('테스트')
      }
    }
  })

  test('textarea should be usable on mobile', async ({ page }) => {
    await page.goto('/dream', { waitUntil: 'domcontentloaded' })

    const textareas = page.locator('textarea')
    const count = await textareas.count()

    if (count > 0) {
      const textarea = textareas.first()
      if (await textarea.isVisible()) {
        await textarea.tap()
        await textarea.fill('꿈 내용 테스트')
        await expect(textarea).toHaveValue('꿈 내용 테스트')
      }
    }
  })
})

test.describe('Landscape Mode Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 667, height: 375 }) // iPhone landscape
  })

  test('homepage should render in landscape', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('saju page should render in landscape', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('tarot page should render in landscape', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })
})
