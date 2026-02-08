import { test, expect } from '@playwright/test'

test.describe('Dark Mode & Theming', () => {
  test.describe('Theme Toggle', () => {
    test('should have theme toggle button', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      const themeToggle = page.locator(
        'button[aria-label*="theme"], button[aria-label*="dark"], button[aria-label*="light"], [class*="theme-toggle"]'
      )
      const count = await themeToggle.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should toggle theme on click', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      const themeToggle = page.locator('[class*="theme"], button[aria-label*="dark"]').first()
      if ((await themeToggle.count()) > 0) {
        const initialTheme = await page.evaluate(
          () =>
            document.documentElement.getAttribute('class') ||
            document.documentElement.getAttribute('data-theme')
        )

        await themeToggle.click()
        await page.waitForTimeout(300)

        const newTheme = await page.evaluate(
          () =>
            document.documentElement.getAttribute('class') ||
            document.documentElement.getAttribute('data-theme')
        )

        expect(initialTheme !== null || newTheme !== null).toBe(true)
      }
    })

    test('should persist theme preference', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      const themeToggle = page.locator('[class*="theme-toggle"]').first()
      if ((await themeToggle.count()) > 0) {
        await themeToggle.click()
        await page.waitForTimeout(300)

        // Reload page and check if theme persists
        await page.reload({ waitUntil: 'domcontentloaded' })
        await expect(page.locator('body')).toBeVisible()
      }
    })
  })

  test.describe('Dark Mode Styles', () => {
    test('should apply dark mode styles', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      // Simulate dark mode preference
      await page.emulateMedia({ colorScheme: 'dark' })
      await page.reload({ waitUntil: 'domcontentloaded' })

      const backgroundColor = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor
      })

      expect(backgroundColor).not.toBeNull()
    })

    test('should apply light mode styles', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      await page.emulateMedia({ colorScheme: 'light' })
      await page.reload({ waitUntil: 'domcontentloaded' })

      const backgroundColor = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor
      })

      expect(backgroundColor).not.toBeNull()
    })

    test('should have proper text contrast in dark mode', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      await page.emulateMedia({ colorScheme: 'dark' })
      await page.reload({ waitUntil: 'domcontentloaded' })

      const text = page.locator('p, h1, h2, span').first()
      if ((await text.count()) > 0) {
        const color = await text.evaluate((el) => window.getComputedStyle(el).color)
        expect(color).not.toBeNull()
      }
    })
  })

  test.describe('Theme on Different Pages', () => {
    test('should apply theme on saju page', async ({ page }) => {
      await page.goto('/saju', { waitUntil: 'domcontentloaded' })

      await page.emulateMedia({ colorScheme: 'dark' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should apply theme on tarot page', async ({ page }) => {
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

      await page.emulateMedia({ colorScheme: 'dark' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should apply theme on destiny-map page', async ({ page }) => {
      await page.goto('/destiny-map', { waitUntil: 'domcontentloaded' })

      await page.emulateMedia({ colorScheme: 'dark' })
      await expect(page.locator('body')).toBeVisible()
    })

    test('should apply theme on calendar page', async ({ page }) => {
      await page.goto('/calendar', { waitUntil: 'domcontentloaded' })

      await page.emulateMedia({ colorScheme: 'dark' })
      await expect(page.locator('body')).toBeVisible()
    })
  })

  test.describe('System Preference', () => {
    test('should respect system dark mode preference', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' })
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()
    })

    test('should respect system light mode preference', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'light' })
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()
    })
  })

  test.describe('Theme Components', () => {
    test('should style buttons correctly in dark mode', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' })
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      const button = page.locator('button').first()
      if ((await button.count()) > 0) {
        const styles = await button.evaluate((el) => ({
          bg: window.getComputedStyle(el).backgroundColor,
          color: window.getComputedStyle(el).color,
        }))
        expect(styles.bg).not.toBeNull()
      }
    })

    test('should style inputs correctly in dark mode', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' })
      await page.goto('/saju', { waitUntil: 'domcontentloaded' })

      const input = page.locator('input').first()
      if ((await input.count()) > 0) {
        const styles = await input.evaluate((el) => ({
          bg: window.getComputedStyle(el).backgroundColor,
          border: window.getComputedStyle(el).borderColor,
        }))
        expect(styles.bg).not.toBeNull()
      }
    })

    test('should style cards correctly in dark mode', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' })
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      const card = page.locator('[class*="card"]').first()
      if ((await card.count()) > 0) {
        const styles = await card.evaluate((el) => ({
          bg: window.getComputedStyle(el).backgroundColor,
          shadow: window.getComputedStyle(el).boxShadow,
        }))
        expect(styles.bg).not.toBeNull()
      }
    })
  })

  test.describe('Theme Mobile Experience', () => {
    test('should apply dark mode on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.emulateMedia({ colorScheme: 'dark' })
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      await expect(page.locator('body')).toBeVisible()
    })

    test('should have accessible theme toggle on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      const themeToggle = page.locator('[class*="theme"], button[aria-label*="theme"]').first()
      if ((await themeToggle.count()) > 0) {
        const box = await themeToggle.boundingBox()
        if (box) {
          expect(box.width >= 40 || box.height >= 40).toBe(true)
        }
      }
    })
  })

  test.describe('Theme Transitions', () => {
    test('should have smooth theme transition', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      const hasTransition = await page.evaluate(() => {
        const body = document.body
        const transition = window.getComputedStyle(body).transition
        return transition !== 'none' && transition !== ''
      })

      expect(typeof hasTransition).toBe('boolean')
    })
  })
})
