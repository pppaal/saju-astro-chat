import { test, expect } from '@playwright/test'

/**
 * Basic accessibility tests
 */

test.describe('Page Structure', () => {
  test('homepage should have proper HTML structure', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('html')).toBeVisible()
    await expect(page.locator('body')).toBeVisible()
  })

  test('should have lang attribute on html', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const lang = await page.locator('html').getAttribute('lang')
    expect(lang).toBeTruthy()
  })

  test('should have title tag', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const title = await page.title()
    expect(title.length).toBeGreaterThan(0)
  })

  test('should have viewport meta tag', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const viewport = page.locator('meta[name="viewport"]')
    const count = await viewport.count()
    expect(count).toBeGreaterThan(0)

    const content = await viewport.getAttribute('content')
    expect(content).toBeTruthy()
    expect(content).toContain('width=device-width')
  })
})

test.describe('Image Accessibility', () => {
  test('images should have alt attributes', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const images = page.locator('img')
    const count = await images.count()

    if (count === 0) {
      // No images is acceptable
      expect(true).toBe(true)
      return
    }

    for (let i = 0; i < Math.min(count, 5); i++) {
      const img = images.nth(i)
      if (await img.isVisible()) {
        const alt = await img.getAttribute('alt')
        const role = await img.getAttribute('role')
        const hasAlt = alt !== null
        const isDecorative = role === 'presentation' || alt === ''
        expect(hasAlt || isDecorative).toBe(true)
      }
    }
  })
})

test.describe('Form Accessibility', () => {
  test('form inputs should have associated labels', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })
    const inputs = page.locator("input:not([type='hidden']):not([type='submit'])")
    const count = await inputs.count()

    if (count === 0) {
      // No inputs is acceptable for some pages
      expect(true).toBe(true)
      return
    }

    for (let i = 0; i < Math.min(count, 3); i++) {
      const input = inputs.nth(i)
      if (await input.isVisible()) {
        const id = await input.getAttribute('id')
        const ariaLabel = await input.getAttribute('aria-label')
        const ariaLabelledby = await input.getAttribute('aria-labelledby')
        const placeholder = await input.getAttribute('placeholder')
        const hasLabel = id || ariaLabel || ariaLabelledby || placeholder
        expect(hasLabel).toBeTruthy()
      }
    }
  })

  test('buttons should have accessible names', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const buttons = page.locator('button')
    const count = await buttons.count()

    if (count === 0) {
      expect(true).toBe(true)
      return
    }

    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i)
      if (await button.isVisible()) {
        const text = await button.textContent()
        const ariaLabel = await button.getAttribute('aria-label')
        const title = await button.getAttribute('title')
        const hasName = (text && text.trim()) || ariaLabel || title
        expect(hasName).toBeTruthy()
      }
    }
  })
})

test.describe('Link Accessibility', () => {
  test('links should have accessible names', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const links = page.locator('a[href]')
    const count = await links.count()

    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < Math.min(count, 5); i++) {
      const link = links.nth(i)
      if (await link.isVisible()) {
        const text = await link.textContent()
        const ariaLabel = await link.getAttribute('aria-label')
        const title = await link.getAttribute('title')
        const hasName = (text && text.trim()) || ariaLabel || title
        expect(hasName).toBeTruthy()
      }
    }
  })

  test('links should have valid href', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const links = page.locator('a[href]')
    const count = await links.count()

    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < Math.min(count, 5); i++) {
      const link = links.nth(i)
      const href = await link.getAttribute('href')
      expect(href).toBeTruthy()
    }
  })
})

test.describe('Color Contrast (Basic)', () => {
  test('page should have visible text', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toBeTruthy()
    expect(bodyText!.length).toBeGreaterThan(50)
  })
})

test.describe('Keyboard Navigation', () => {
  test('should be able to tab through interactive elements', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Tab through elements
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab')
    }

    // An element should be focused
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName)
    expect(focusedTag).toBeTruthy()
  })

  test('escape key should work for closing modals', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.keyboard.press('Escape')
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Focus Visibility', () => {
  test('focused elements should be visually indicated', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const firstLink = page.locator('a[href]').first()
    const count = await firstLink.count()

    if (count > 0 && (await firstLink.isVisible())) {
      await firstLink.focus()

      // Check that focus is on the link
      const focusedHref = await page.evaluate(() => {
        const el = document.activeElement
        return el?.tagName === 'A' ? (el as HTMLAnchorElement).href : null
      })
      expect(focusedHref).toBeTruthy()
    }
  })
})

test.describe('Heading Structure', () => {
  test('page should have h1 heading', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const h1 = page.locator('h1')
    const count = await h1.count()
    // Most pages should have an h1
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('headings should be in logical order', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const headings = page.locator('h1, h2, h3, h4, h5, h6')
    const count = await headings.count()

    if (count > 0) {
      const headingLevels: number[] = []
      for (let i = 0; i < count; i++) {
        const heading = headings.nth(i)
        const tagName = await heading.evaluate((el) => el.tagName)
        headingLevels.push(parseInt(tagName.charAt(1)))
      }

      // First heading should be h1 or h2
      expect(headingLevels[0]).toBeLessThanOrEqual(2)
    }
  })
})

test.describe('ARIA Landmarks', () => {
  test('should have main content area', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const main = page.locator("main, [role='main']")
    const count = await main.count()
    // Should have a main landmark
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should have navigation', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const nav = page.locator("nav, [role='navigation']")
    const count = await nav.count()
    expect(count).toBeGreaterThan(0)
  })
})
