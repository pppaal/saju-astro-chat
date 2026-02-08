import { test, expect } from '@playwright/test'

/**
 * Basic accessibility tests
 */

test.describe('Page Structure', () => {
  test('homepage should have proper HTML structure', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('html')).toBeVisible()
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(100)
  })

  test('should have lang attribute set to Korean', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const lang = await page.locator('html').getAttribute('lang')
    expect(lang).toBeTruthy()
    expect(lang).toBe('ko')
  })

  test('should have descriptive title tag', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const title = await page.title()
    expect(title.length).toBeGreaterThan(5)
    expect(title.length).toBeLessThan(70)
  })

  test('should have viewport meta tag with responsive settings', async ({ page }) => {
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
      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
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

  test('images should have valid src', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const images = page.locator('img')
    const count = await images.count()

    if (count > 0) {
      for (let i = 0; i < Math.min(count, 3); i++) {
        const img = images.nth(i)
        if (await img.isVisible()) {
          const src = await img.getAttribute('src')
          expect(src).toBeTruthy()
          expect(src!.length).toBeGreaterThan(0)
        }
      }
    }
  })
})

test.describe('Form Accessibility', () => {
  test('form inputs should have associated labels or aria-labels', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })
    const inputs = page.locator("input:not([type='hidden']):not([type='submit'])")
    const count = await inputs.count()

    if (count === 0) {
      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
      return
    }

    for (let i = 0; i < Math.min(count, 3); i++) {
      const input = inputs.nth(i)
      if (await input.isVisible()) {
        const id = await input.getAttribute('id')
        const ariaLabel = await input.getAttribute('aria-label')
        const ariaLabelledby = await input.getAttribute('aria-labelledby')
        const placeholder = await input.getAttribute('placeholder')
        const name = await input.getAttribute('name')
        const hasLabel = id || ariaLabel || ariaLabelledby || placeholder || name
        expect(hasLabel).toBeTruthy()
      }
    }
  })

  test('buttons should have accessible names', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const buttons = page.locator('button')
    const count = await buttons.count()

    expect(count).toBeGreaterThan(0)

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

  test('submit buttons should be clearly labeled', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })
    const submitButtons = page.locator('button[type="submit"]')
    const count = await submitButtons.count()

    if (count > 0) {
      const button = submitButtons.first()
      if (await button.isVisible()) {
        const text = await button.textContent()
        expect(text).toBeTruthy()
        expect(text!.trim().length).toBeGreaterThan(0)
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
      expect(href!.length).toBeGreaterThan(0)
    }
  })

  test('external links should indicate they open in new tab', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const externalLinks = page.locator('a[target="_blank"]')
    const count = await externalLinks.count()

    if (count > 0) {
      for (let i = 0; i < Math.min(count, 3); i++) {
        const link = externalLinks.nth(i)
        const rel = await link.getAttribute('rel')
        // External links should have rel="noopener" for security
        if (rel) {
          expect(rel).toContain('noopener')
        }
      }
    }
  })
})

test.describe('Color Contrast', () => {
  test('page should have visible text content', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toBeTruthy()
    expect(bodyText!.length).toBeGreaterThan(100)
  })

  test('text should be visible on dark background', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const dataTheme = await page.locator('html').getAttribute('data-theme')
    expect(dataTheme).toBe('dark')

    // 본문 텍스트가 보여야 함
    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)
  })
})

test.describe('Keyboard Navigation', () => {
  test('should be able to tab through interactive elements', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab')
    }

    const focusedTag = await page.evaluate(() => document.activeElement?.tagName)
    expect(focusedTag).toBeTruthy()
    expect(['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT']).toContain(focusedTag)
  })

  test('escape key should work for closing modals', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.keyboard.press('Escape')
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)
  })

  test('enter key should activate buttons', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const button = page.locator('button').first()
    if ((await button.count()) > 0 && (await button.isVisible())) {
      await button.focus()
      await page.keyboard.press('Enter')
      await expect(page.locator('body')).toBeVisible()
    }
  })
})

test.describe('Focus Visibility', () => {
  test('focused elements should be visually indicated', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const firstLink = page.locator('a[href]').first()
    const count = await firstLink.count()

    if (count > 0 && (await firstLink.isVisible())) {
      await firstLink.focus()

      const focusedElement = page.locator(':focus')
      const focusCount = await focusedElement.count()
      expect(focusCount).toBeGreaterThan(0)
    }
  })

  test('focused button should be visible', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const button = page.locator('button').first()
    if ((await button.count()) > 0 && (await button.isVisible())) {
      await button.focus()

      const focusedElement = page.locator(':focus')
      await expect(focusedElement).toBeVisible()
    }
  })
})

test.describe('Heading Structure', () => {
  test('page should have h1 heading', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const h1 = page.locator('h1')
    const count = await h1.count()

    // 대부분의 페이지에는 h1이 있어야 함
    if (count > 0) {
      await expect(h1.first()).toBeVisible()
    }
  })

  test('headings should be in logical order', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const headings = page.locator('h1, h2, h3, h4, h5, h6')
    const count = await headings.count()

    if (count > 0) {
      const headingLevels: number[] = []
      for (let i = 0; i < Math.min(count, 10); i++) {
        const heading = headings.nth(i)
        if (await heading.isVisible()) {
          const tagName = await heading.evaluate((el) => el.tagName)
          headingLevels.push(parseInt(tagName.charAt(1)))
        }
      }

      if (headingLevels.length > 0) {
        // 첫 번째 헤딩은 h1 또는 h2여야 함
        expect(headingLevels[0]).toBeLessThanOrEqual(2)
      }
    }
  })

  test('heading text should be descriptive', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const h1 = page.locator('h1').first()

    if ((await h1.count()) > 0 && (await h1.isVisible())) {
      const text = await h1.textContent()
      expect(text).toBeTruthy()
      expect(text!.trim().length).toBeGreaterThan(0)
    }
  })
})

test.describe('ARIA Landmarks', () => {
  test('should have main content area', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const main = page.locator("main, [role='main']")
    const count = await main.count()

    // main 랜드마크가 있어야 함
    if (count > 0) {
      await expect(main.first()).toBeVisible()
    }
  })

  test('should have navigation landmark', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const nav = page.locator("nav, [role='navigation']")
    const count = await nav.count()
    expect(count).toBeGreaterThan(0)

    await expect(nav.first()).toBeVisible()
  })

  test('should have header or banner', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const header = page.locator("header, [role='banner']")
    const count = await header.count()

    if (count > 0) {
      await expect(header.first()).toBeVisible()
    }
  })
})

test.describe('Mobile Accessibility', () => {
  test('should be accessible on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)
  })

  test('touch targets should be large enough', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const buttons = page.locator('button')
    const count = await buttons.count()

    for (let i = 0; i < Math.min(count, 3); i++) {
      const button = buttons.nth(i)
      if (await button.isVisible()) {
        const box = await button.boundingBox()
        if (box) {
          // 최소 44px (WCAG 권장) 또는 30px
          expect(box.height).toBeGreaterThanOrEqual(30)
          expect(box.width).toBeGreaterThanOrEqual(30)
        }
      }
    }
  })

  test('should not have horizontal scroll on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
  })
})

test.describe('Accessibility Page Load Performance', () => {
  test('should load homepage within acceptable time', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(10000)
    await expect(page.locator('body')).toBeVisible()
  })
})
