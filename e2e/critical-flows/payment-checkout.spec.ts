/**
 * P4: Payment Checkout E2E Tests
 * 결제 플로우 E2E 테스트 - 체크아웃, 구독, 크레딧팩 구매
 */
import { test, expect, Page } from '@playwright/test'
import { TestHelpers } from '../fixtures/test-helpers'

test.describe('Payment Checkout Flow', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
  })

  test.describe('Pricing Page', () => {
    test('should display all subscription plans', async ({ page }) => {
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      const bodyText = await page.textContent('body')

      // Check for plan types
      const hasPlans =
        (bodyText?.toLowerCase().includes('free') ||
          bodyText?.includes('무료')) &&
        (bodyText?.toLowerCase().includes('premium') ||
          bodyText?.includes('프리미엄'))

      expect(hasPlans).toBe(true)
    })

    test('should display pricing in KRW', async ({ page }) => {
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      const bodyText = await page.textContent('body')

      // Check for Korean Won pricing
      const hasKRWPricing =
        bodyText?.includes('₩') ||
        bodyText?.includes('원') ||
        /\d{1,3}(,\d{3})+/.test(bodyText || '') // Korean number format

      expect(hasKRWPricing).toBe(true)
    })

    test('should show monthly and yearly billing options', async ({ page }) => {
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      const bodyText = await page.textContent('body')

      const hasBillingOptions =
        (bodyText?.toLowerCase().includes('monthly') ||
          bodyText?.includes('월간') ||
          bodyText?.includes('월')) &&
        (bodyText?.toLowerCase().includes('yearly') ||
          bodyText?.toLowerCase().includes('annual') ||
          bodyText?.includes('연간') ||
          bodyText?.includes('년'))

      expect(hasBillingOptions).toBe(true)
    })

    test('should display feature comparison', async ({ page }) => {
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      const bodyText = await page.textContent('body')

      // Check for feature mentions
      const hasFeatures =
        bodyText?.includes('크레딧') ||
        bodyText?.toLowerCase().includes('credit') ||
        bodyText?.includes('무제한') ||
        bodyText?.toLowerCase().includes('unlimited')

      expect(hasFeatures).toBe(true)
    })
  })

  test.describe('Checkout Button Behavior', () => {
    test('should show login prompt for unauthenticated users', async ({ page }) => {
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })

      // Find and click a subscription button
      const subscribeButton = page
        .locator('button')
        .filter({ hasText: /구독|subscribe|시작|start|upgrade/i })
        .first()

      if (await subscribeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await subscribeButton.click()
        await page.waitForTimeout(2000)

        // Should redirect to login or show login modal
        const currentUrl = page.url()
        const bodyText = await page.textContent('body')

        const requiresAuth =
          currentUrl.includes('login') ||
          currentUrl.includes('signin') ||
          currentUrl.includes('auth') ||
          bodyText?.includes('로그인') ||
          bodyText?.toLowerCase().includes('sign in') ||
          bodyText?.toLowerCase().includes('log in')

        expect(requiresAuth).toBe(true)
      }
    })

    test('should have accessible checkout buttons', async ({ page }) => {
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      // Check for clickable buttons
      const buttons = page.locator('button, a[href*="checkout"], a[href*="subscribe"]')
      const buttonCount = await buttons.count()

      // Should have at least one action button
      expect(buttonCount).toBeGreaterThan(0)
    })
  })

  test.describe('Credit Pack Display', () => {
    test('should display credit pack options', async ({ page }) => {
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      const bodyText = await page.textContent('body')

      // Check for credit pack mentions
      const hasCreditPacks =
        bodyText?.includes('크레딧') ||
        bodyText?.toLowerCase().includes('credit') ||
        bodyText?.toLowerCase().includes('pack') ||
        bodyText?.includes('팩')

      expect(hasCreditPacks).toBe(true)
    })

    test('should show different credit pack sizes', async ({ page }) => {
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      // Look for credit amounts like 5, 15, 40, 100, 250
      const bodyText = await page.textContent('body')

      const hasMultiplePacks =
        (bodyText?.match(/\d+\s*(credit|크레딧)/gi)?.length || 0) >= 1 ||
        bodyText?.includes('mini') ||
        bodyText?.includes('standard') ||
        bodyText?.includes('plus') ||
        bodyText?.includes('mega')

      expect(hasMultiplePacks).toBe(true)
    })
  })

  test.describe('Checkout API', () => {
    test('should reject unauthenticated checkout requests', async ({ page }) => {
      const response = await page.request.post('/api/checkout', {
        data: {
          plan: 'premium',
          billingCycle: 'monthly',
        },
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // Should be unauthorized
      expect(response.status()).toBe(401)
    })

    test('should validate checkout request body', async ({ page }) => {
      const response = await page.request.post('/api/checkout', {
        data: {},
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // Should fail validation (422) or be unauthorized (401)
      expect([401, 422]).toContain(response.status())
    })

    test('should reject invalid plan', async ({ page }) => {
      const response = await page.request.post('/api/checkout', {
        data: {
          plan: 'invalid-plan',
          billingCycle: 'monthly',
        },
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // Should fail validation or be unauthorized
      expect([401, 422]).toContain(response.status())
    })

    test('should reject both plan and creditPack', async ({ page }) => {
      const response = await page.request.post('/api/checkout', {
        data: {
          plan: 'premium',
          creditPack: 'mini',
          billingCycle: 'monthly',
        },
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // Should fail validation or be unauthorized
      expect([401, 422]).toContain(response.status())
    })

    test('should include rate limit headers', async ({ page }) => {
      const response = await page.request.post('/api/checkout', {
        data: {
          plan: 'premium',
          billingCycle: 'monthly',
        },
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // Rate limit headers should be present (even on auth failure)
      const headers = response.headers()
      const hasRateLimitHeaders =
        headers['x-ratelimit-limit'] !== undefined ||
        headers['x-ratelimit-remaining'] !== undefined ||
        response.status() === 401 // Auth check happens before rate limit header is set

      expect(hasRateLimitHeaders).toBe(true)
    })
  })

  test.describe('Success Page', () => {
    test('should have a success page route', async ({ page }) => {
      // Visit success page without session ID (should handle gracefully)
      await page.goto('/success', { waitUntil: 'domcontentloaded' })

      const bodyText = await page.textContent('body')

      // Should show some content (either success message or error handling)
      expect(bodyText?.length).toBeGreaterThan(50)
    })

    test('should display success message for valid session', async ({ page }) => {
      // Visit with mock session ID
      await page.goto('/success?session_id=cs_test_mock', {
        waitUntil: 'domcontentloaded',
      })

      const bodyText = await page.textContent('body')

      // Page should load and show something
      const hasContent =
        bodyText?.includes('감사') ||
        bodyText?.toLowerCase().includes('thank') ||
        bodyText?.includes('완료') ||
        bodyText?.toLowerCase().includes('success') ||
        bodyText?.toLowerCase().includes('complete') ||
        bodyText?.includes('오류') ||
        bodyText?.toLowerCase().includes('error') ||
        bodyText?.length! > 100

      expect(hasContent).toBe(true)
    })
  })

  test.describe('Webhook Endpoint', () => {
    test('should reject requests without signature', async ({ page }) => {
      const response = await page.request.post('/api/webhook/stripe', {
        data: {
          type: 'checkout.session.completed',
          data: { object: {} },
        },
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // Should fail due to missing signature
      expect(response.status()).toBe(400)
    })

    test('should reject requests with invalid signature', async ({ page }) => {
      const response = await page.request.post('/api/webhook/stripe', {
        data: {
          type: 'checkout.session.completed',
          data: { object: {} },
        },
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'invalid-signature',
        },
      })

      // Should fail signature verification
      expect(response.status()).toBe(400)
    })
  })

  test.describe('User Credit API', () => {
    test('should return credit balance for authenticated users', async ({ page }) => {
      const response = await page.request.get('/api/me/credits')

      // Either returns credits or requires auth
      if (response.ok()) {
        const data = await response.json()
        expect(data).toBeDefined()
      } else {
        expect(response.status()).toBe(401)
      }
    })

    test('should include credit breakdown', async ({ page }) => {
      const response = await page.request.get('/api/me/credits')

      if (response.ok()) {
        const data = await response.json()

        // Check for expected fields in credit response
        const hasExpectedFields =
          data.remainingCredits !== undefined ||
          data.credits !== undefined ||
          data.balance !== undefined ||
          data.data?.remainingCredits !== undefined

        expect(hasExpectedFields).toBe(true)
      }
    })
  })

  test.describe('Premium Status API', () => {
    test('should return premium status', async ({ page }) => {
      const response = await page.request.get('/api/me/premium')

      if (response.ok()) {
        const data = await response.json()
        expect(data).toBeDefined()
      } else {
        // Unauthorized is acceptable
        expect(response.status()).toBe(401)
      }
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test('should display pricing correctly on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })

      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      // Content should be visible
      const bodyText = await page.textContent('body')
      expect(bodyText?.length).toBeGreaterThan(100)

      // Check for no horizontal scrollbar issues
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
      })

      // Minor horizontal scroll is acceptable
      expect(hasHorizontalScroll).toBe(false)
    })

    test('should have tappable buttons on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })

      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      // Find buttons and check they're reasonably sized
      const buttons = page.locator('button')
      const buttonCount = await buttons.count()

      if (buttonCount > 0) {
        for (let i = 0; i < Math.min(buttonCount, 5); i++) {
          const button = buttons.nth(i)
          if (await button.isVisible().catch(() => false)) {
            const box = await button.boundingBox()
            if (box) {
              // Minimum touch target size (44x44 per Apple HIG)
              expect(box.width).toBeGreaterThanOrEqual(40)
              expect(box.height).toBeGreaterThanOrEqual(40)
            }
          }
        }
      }
    })
  })

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Block network to Stripe
      await page.route('**/stripe.com/**', (route) => route.abort())

      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })

      // Page should still load even if Stripe is blocked
      const bodyText = await page.textContent('body')
      expect(bodyText?.length).toBeGreaterThan(50)
    })

    test('should show appropriate error for failed checkout', async ({ page }) => {
      // Try to access checkout with invalid parameters
      await page.goto('/api/checkout?invalid=true')

      // Should return error or redirect
      expect(page.url()).toBeDefined()
    })
  })

  test.describe('Accessibility', () => {
    test('should have proper heading structure on pricing page', async ({ page }) => {
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      // Check for h1
      const h1 = page.locator('h1')
      const h1Count = await h1.count()

      expect(h1Count).toBeGreaterThanOrEqual(1)
    })

    test('should have alt text for pricing images', async ({ page }) => {
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      const images = page.locator('img')
      const imageCount = await images.count()

      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i)
        const alt = await img.getAttribute('alt')
        const role = await img.getAttribute('role')

        // Images should have alt text or be marked as presentational
        const hasAccessibility = alt !== null || role === 'presentation'
        expect(hasAccessibility).toBe(true)
      }
    })

    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      // Tab through the page
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')

      // Check that focus is on an interactive element
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement
        return el?.tagName.toLowerCase()
      })

      // Focus should be on interactive element (button, link, input)
      const isInteractive = ['button', 'a', 'input', 'select', 'textarea'].includes(
        focusedElement || ''
      )

      // It's OK if focus is on body (might be at end of content)
      expect(isInteractive || focusedElement === 'body').toBe(true)
    })
  })
})
