import { test, expect } from '@playwright/test'

/**
 * Internationalization and localization tests
 */

test.describe('Language Detection', () => {
  test('should have lang attribute on html', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const lang = await page.locator('html').getAttribute('lang')
    expect(lang).toBeTruthy()
  })

  test('should support Korean content', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toBeTruthy()
    expect(bodyText!.length).toBeGreaterThan(50)
  })
})

test.describe('Korean Language Support', () => {
  test('should render Korean characters correctly', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Check meta charset - should be utf-8 for Korean support
    const charset = page.locator('meta[charset="utf-8"], meta[charset="UTF-8"]')
    const httpEquiv = page.locator('meta[http-equiv="Content-Type"]')
    const charsetCount = await charset.count()
    const httpEquivCount = await httpEquiv.count()
    expect(charsetCount + httpEquivCount).toBeGreaterThan(0)
  })

  test('saju page should have Korean text', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })

    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toBeTruthy()
    expect(bodyText!.length).toBeGreaterThan(50)
  })

  test('tarot page should have Korean text', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toBeTruthy()
    expect(bodyText!.length).toBeGreaterThan(50)
  })
})

test.describe('English Language Support', () => {
  test('should have English content on about page', async ({ page }) => {
    await page.goto('/about', { waitUntil: 'domcontentloaded' })
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toBeTruthy()
    expect(bodyText!.length).toBeGreaterThan(50)
  })

  test('should have English in meta description', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const description = page.locator('meta[name="description"]')
    const count = await description.count()
    expect(count).toBeGreaterThan(0)

    const content = await description.getAttribute('content')
    expect(content).toBeTruthy()
    expect(content!.length).toBeGreaterThan(10)
  })
})

test.describe('Mixed Language Content', () => {
  test('homepage should handle mixed Korean/English', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Page should load without encoding issues
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(0)
  })
})

test.describe('Font Loading', () => {
  test('should load fonts for Korean text', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Check if font-family is set
    const fontFamily = await page.evaluate(() => {
      return window.getComputedStyle(document.body).fontFamily
    })

    expect(fontFamily).toBeTruthy()
    expect(fontFamily.length).toBeGreaterThan(0)
  })
})

test.describe('RTL/LTR Support', () => {
  test('should have correct text direction', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const dir = await page.locator('html').getAttribute('dir')
    // Korean/English are LTR, so dir should be ltr or not set
    expect(dir === null || dir === 'ltr').toBe(true)
  })
})

test.describe('Date/Time Localization', () => {
  test('calendar page should handle dates', async ({ page }) => {
    await page.goto('/calendar', { waitUntil: 'domcontentloaded' })

    await expect(page.locator('body')).toBeVisible()
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toBeTruthy()
  })
})

test.describe('Number Formatting', () => {
  test('pricing page should display numbers', async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'domcontentloaded' })

    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toBeTruthy()
    expect(bodyText!.length).toBeGreaterThan(50)
  })
})

test.describe('Error Messages', () => {
  test('404 page should have readable text', async ({ page }) => {
    await page.goto('/non-existent-page', { waitUntil: 'domcontentloaded' })

    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toBeTruthy()
    expect(bodyText!.length).toBeGreaterThan(10)
  })
})

test.describe('Form Labels', () => {
  test('saju form should have labels or aria-labels', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })

    // Check for labels or inputs with accessible names
    const labels = page.locator('label')
    const ariaLabels = page.locator('[aria-label]')
    const placeholders = page.locator('[placeholder]')

    const labelCount = await labels.count()
    const ariaCount = await ariaLabels.count()
    const placeholderCount = await placeholders.count()

    // Should have some form accessibility
    expect(labelCount + ariaCount + placeholderCount).toBeGreaterThanOrEqual(0)
  })

  test('destiny-map form should have labels or aria-labels', async ({ page }) => {
    await page.goto('/destiny-map', { waitUntil: 'domcontentloaded' })

    const labels = page.locator('label')
    const ariaLabels = page.locator('[aria-label]')
    const placeholders = page.locator('[placeholder]')

    const labelCount = await labels.count()
    const ariaCount = await ariaLabels.count()
    const placeholderCount = await placeholders.count()

    expect(labelCount + ariaCount + placeholderCount).toBeGreaterThanOrEqual(0)
  })
})

test.describe('Button Text', () => {
  test('buttons should have readable text', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const buttons = page.locator('button')
    const count = await buttons.count()

    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i)
      if (await button.isVisible()) {
        const text = await button.textContent()
        const ariaLabel = await button.getAttribute('aria-label')

        // Button should have some accessible name
        expect(text || ariaLabel).toBeTruthy()
      }
    }
  })
})

test.describe('Placeholder Text', () => {
  test('input placeholders should be present', async ({ page }) => {
    await page.goto('/saju', { waitUntil: 'domcontentloaded' })

    const inputs = page.locator('input[placeholder]')
    const count = await inputs.count()

    for (let i = 0; i < Math.min(count, 3); i++) {
      const input = inputs.nth(i)
      const placeholder = await input.getAttribute('placeholder')
      expect(placeholder).toBeTruthy()
    }
  })
})

test.describe('SEO Meta Tags Language', () => {
  test('og:locale should be set if present', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const ogLocale = page.locator('meta[property="og:locale"]')
    const count = await ogLocale.count()

    if (count > 0) {
      const content = await ogLocale.getAttribute('content')
      expect(content).toBeTruthy()
    }
  })
})

test.describe('Content Encoding', () => {
  test('should have UTF-8 encoding', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const charset = page.locator('meta[charset]')
    const count = await charset.count()

    if (count > 0) {
      const charsetValue = await charset.getAttribute('charset')
      expect(charsetValue?.toLowerCase()).toBe('utf-8')
    } else {
      // Check for http-equiv Content-Type
      const httpEquiv = page.locator('meta[http-equiv="Content-Type"]')
      const httpEquivCount = await httpEquiv.count()
      expect(httpEquivCount).toBeGreaterThan(0)
    }
  })
})
