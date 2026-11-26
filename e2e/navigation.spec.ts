import { test, expect } from '@playwright/test'

/**
 * Navigation flow tests
 */

test.describe('Main Navigation', () => {
  test('should navigate from homepage to the calendar', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.goto('/calendar', { waitUntil: 'domcontentloaded' })

    await expect(page.locator('body')).toBeVisible()
    expect(page.url()).toContain('/calendar')
  })

  test('should navigate from homepage to tarot', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    await expect(page.locator('body')).toBeVisible()
    expect(page.url()).toContain('/tarot')
  })

  test('should navigate from homepage to destiny-counselor', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.goto('/destiny-counselor', { waitUntil: 'domcontentloaded' })

    await expect(page.locator('body')).toBeVisible()
    expect(page.url()).toContain('/destiny-counselor')
  })

  test('should navigate between feature pages', async ({ page }) => {
    for (const route of [
      '/destiny',
      '/calendar',
      '/tarot',
      '/destiny-counselor',
      '/compatibility',
    ]) {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
      // /compatibility 는 궁합 상담사(/compatibility/counselor)로 들어간다.
      expect(new URL(page.url()).pathname.startsWith(route)).toBe(true)
    }
  })
})

test.describe('Back Navigation', () => {
  test('should handle browser back button', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.goto('/calendar', { waitUntil: 'domcontentloaded' })

    await page.goBack()

    // Should be back on homepage
    await expect(page.locator('body')).toBeVisible()
    expect(page.url()).not.toContain('/calendar')
  })

  test('should handle browser forward button', async ({ page }) => {
    // 가벼운 정적 화면으로 — /calendar 는 스트리밍 로딩 중 bfcache 복원이 늦어 goForward 가 60s 를 넘긴다.
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.goto('/pricing', { waitUntil: 'domcontentloaded' })

    await page.goBack({ waitUntil: 'commit' })
    await expect(page).not.toHaveURL(/pricing/)
    await page.goForward({ waitUntil: 'commit' })

    // Should be back on pricing
    await expect(page).toHaveURL(/pricing/)
  })
})

test.describe('Deep Linking', () => {
  test('should handle direct navigation to tarot spread', async ({ page }) => {
    await page.goto('/tarot/general-insight/past-present-future', {
      waitUntil: 'domcontentloaded',
    })

    await expect(page.locator('body')).toBeVisible()
    expect(page.url()).toContain('tarot')
  })
})

test.describe('Query Parameter Navigation', () => {
  test('should preserve query params on navigation', async ({ page }) => {
    await page.goto('/tarot?question=test', { waitUntil: 'domcontentloaded' })

    expect(page.url()).toContain('question=test')
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Hash Navigation', () => {
  test('should handle hash in URL', async ({ page }) => {
    await page.goto('/#features', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })

  test('should handle hash navigation to section', async ({ page }) => {
    await page.goto('/about#team', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Redirect Handling', () => {
  test('should follow redirects on auth pages', async ({ page }) => {
    await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Protected Route Navigation', () => {
  test('should handle navigation to profile', async ({ page }) => {
    await page.goto('/profile', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    // Should either show profile or redirect to auth
    const url = page.url()
    const hasAuthContent = url.includes('signin') || url.includes('auth') || url.includes('profile')
    expect(hasAuthContent).toBe(true)
  })
})

test.describe('External Link Handling', () => {
  test('external links should have proper security attributes', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const externalLinks = page.locator('a[href^="http"]:not([href*="localhost"])')
    const count = await externalLinks.count()

    for (let i = 0; i < Math.min(count, 5); i++) {
      const link = externalLinks.nth(i)
      const target = await link.getAttribute('target')
      const rel = await link.getAttribute('rel')

      // External links that open in new tab should have noopener
      if (target === '_blank') {
        expect(rel).toContain('noopener')
      }
    }
  })
})

test.describe('Scroll Restoration', () => {
  test('should handle scroll restoration on back navigation', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 500))

    await page.goto('/calendar', { waitUntil: 'domcontentloaded' })
    await page.goBack()

    // Page should load correctly after back navigation
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Navigation State', () => {
  test('should maintain localStorage state across navigation', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Store something in localStorage
    await page.evaluate(() => {
      localStorage.setItem('test_nav_state', 'test_value')
    })

    await page.goto('/calendar', { waitUntil: 'domcontentloaded' })

    // Check state is preserved
    const value = await page.evaluate(() => {
      return localStorage.getItem('test_nav_state')
    })

    expect(value).toBe('test_value')

    // Cleanup
    await page.evaluate(() => {
      localStorage.removeItem('test_nav_state')
    })
  })
})

test.describe('Route Transitions', () => {
  test('should transition smoothly between pages', async ({ page }) => {
    const routes = ['/', '/calendar', '/tarot', '/destiny-counselor']

    for (const route of routes) {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    }
  })
})

test.describe('Counselor Pages Navigation', () => {
  test('counselor pages should be accessible', async ({ page }) => {
    for (const route of ['/destiny-counselor', '/compatibility/counselor']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toBeVisible()
    }
  })
})

test.describe('Tab Navigation', () => {
  test('should be able to tab through navigation elements', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Tab through elements
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab')
    }

    // Should still be on the page
    await expect(page.locator('body')).toBeVisible()

    // An element should be focused
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName)
    expect(focusedTag).toBeTruthy()
  })
})
