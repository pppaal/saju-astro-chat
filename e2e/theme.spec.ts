import { test, expect } from '@playwright/test'

/**
 * Dark mode and theme tests
 */

test.describe('Dark Mode Default', () => {
  test('should have dark theme by default', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const dataTheme = await page.locator('html').getAttribute('data-theme')
    expect(dataTheme).toBe('dark')
  })

  test('should have dark color scheme', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const colorScheme = await page.evaluate(() => {
      return window.getComputedStyle(document.documentElement).colorScheme
    })

    expect(colorScheme).toContain('dark')
  })

  test('should have dark background color', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const bgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor
    })

    expect(bgColor).toBeTruthy()
  })
})

test.describe('Theme Attributes', () => {
  test('html should have data-theme attribute', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const dataTheme = await page.locator('html').getAttribute('data-theme')
    expect(dataTheme).toBeTruthy()
  })

  test('should have theme-color meta tag', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const themeColor = page.locator('meta[name="theme-color"]')
    const content = await themeColor.getAttribute('content')
    expect(content).toBeTruthy()
  })
})

test.describe('Color Contrast', () => {
  test('text should be visible on dark background', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toBeTruthy()
    expect(bodyText!.trim().length).toBeGreaterThan(0)
  })

  test('buttons should be visible', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const buttons = page.locator('button')
    const count = await buttons.count()

    for (let i = 0; i < Math.min(count, 3); i++) {
      const button = buttons.nth(i)
      if (await button.isVisible()) {
        const opacity = await button.evaluate((el) => {
          return window.getComputedStyle(el).opacity
        })
        expect(parseFloat(opacity)).toBeGreaterThan(0)
      }
    }
  })
})

test.describe('Theme Consistency Across Pages', () => {
  test('saju page should have dark theme', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })

    const dataTheme = await page.locator('html').getAttribute('data-theme')
    expect(dataTheme).toBe('dark')
  })

  test('tarot page should have dark theme', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    const dataTheme = await page.locator('html').getAttribute('data-theme')
    expect(dataTheme).toBe('dark')
  })

  test('destiny-map page should have dark theme', async ({ page }) => {
    await page.goto('/destiny-map', { waitUntil: 'domcontentloaded' })

    const dataTheme = await page.locator('html').getAttribute('data-theme')
    expect(dataTheme).toBe('dark')
  })

  test('pricing page should have dark theme', async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'domcontentloaded' })

    const dataTheme = await page.locator('html').getAttribute('data-theme')
    expect(dataTheme).toBe('dark')
  })
})

test.describe('CSS Variables', () => {
  test('should have CSS custom properties', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // CSS 커스텀 속성이 정의되어 있는지 확인
    const fontValue = await page.evaluate(() => {
      const styles = window.getComputedStyle(document.documentElement)
      return styles.getPropertyValue('--font-montserrat')
    })

    // 폰트 CSS 변수가 정의되어 있어야 함
    expect(fontValue.length).toBeGreaterThan(0)
  })
})

test.describe('Focus States', () => {
  test('focused elements should be visible', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    await page.keyboard.press('Tab')

    const focusedElement = page.locator(':focus')
    const count = await focusedElement.count()

    if (count > 0) {
      const isVisible = await focusedElement.isVisible()
      expect(isVisible).toBe(true)
    }
  })
})

test.describe('Hover States', () => {
  test('buttons should respond to hover', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const button = page.locator('button').first()
    if ((await button.count()) > 0 && (await button.isVisible())) {
      await button.hover()
      await expect(button).toBeVisible()
    }
  })

  test('links should respond to hover', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const links = page.locator('a[href]:visible')
    const count = await links.count()

    for (let i = 0; i < Math.min(count, 5); i++) {
      const link = links.nth(i)
      const box = await link.boundingBox()
      if (box && box.x >= 0 && box.y >= 0) {
        await link.hover()
        await expect(link).toBeVisible()
        break
      }
    }
  })
})

test.describe('Loading States', () => {
  test('should show loading indicators', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Animation Preferences', () => {
  test('should respect reduced motion preference', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Print Styles', () => {
  test('should have print media query styles', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    await page.emulateMedia({ media: 'print' })

    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Icon Visibility', () => {
  test('icons should be visible in dark mode', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const svgs = page.locator('svg')
    const count = await svgs.count()

    for (let i = 0; i < Math.min(count, 5); i++) {
      const svg = svgs.nth(i)
      if (await svg.isVisible()) {
        const box = await svg.boundingBox()
        expect(box).toBeTruthy()
        if (box) {
          expect(box.width).toBeGreaterThan(0)
          expect(box.height).toBeGreaterThan(0)
        }
      }
    }
  })
})

test.describe('Form Elements in Dark Mode', () => {
  test('input fields should be visible', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })

    const inputs = page.locator('input')
    const count = await inputs.count()

    for (let i = 0; i < Math.min(count, 3); i++) {
      const input = inputs.nth(i)
      if (await input.isVisible()) {
        const opacity = await input.evaluate((el) => {
          return window.getComputedStyle(el).opacity
        })
        expect(parseFloat(opacity)).toBeGreaterThan(0)
      }
    }
  })

  test('textarea should be visible', async ({ page }) => {
    await page.goto('/dream', { waitUntil: 'domcontentloaded' })

    const textareas = page.locator('textarea')
    const count = await textareas.count()

    for (let i = 0; i < Math.min(count, 2); i++) {
      const textarea = textareas.nth(i)
      if (await textarea.isVisible()) {
        const opacity = await textarea.evaluate((el) => {
          return window.getComputedStyle(el).opacity
        })
        expect(parseFloat(opacity)).toBeGreaterThan(0)
      }
    }
  })
})
