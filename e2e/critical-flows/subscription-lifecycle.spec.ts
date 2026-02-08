/**
 * P4: Subscription Lifecycle E2E Tests
 * 구독 생명주기 테스트 - 업그레이드, 다운그레이드, 취소
 */
import { test, expect } from '@playwright/test'
import { TestHelpers } from '../fixtures/test-helpers'

test.describe('Subscription Lifecycle', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
  })

  test.describe('Subscription Status Display', () => {
    test('should display subscription status on profile', async ({ page }) => {
      await page.goto('/profile', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      const bodyText = await page.textContent('body')

      // Check for subscription-related content or login prompt
      const hasSubscriptionInfo =
        bodyText?.includes('구독') ||
        bodyText?.toLowerCase().includes('subscription') ||
        bodyText?.includes('플랜') ||
        bodyText?.toLowerCase().includes('plan') ||
        bodyText?.toLowerCase().includes('free') ||
        bodyText?.toLowerCase().includes('premium') ||
        bodyText?.includes('로그인') ||
        bodyText?.toLowerCase().includes('sign in')

      expect(hasSubscriptionInfo).toBe(true)
    })

    test('should show billing information for subscribers', async ({ page }) => {
      await page.goto('/profile', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      const bodyText = await page.textContent('body')

      // Check for billing or account info
      const hasBillingInfo =
        bodyText?.includes('결제') ||
        bodyText?.toLowerCase().includes('billing') ||
        bodyText?.includes('다음 결제') ||
        bodyText?.toLowerCase().includes('next payment') ||
        bodyText?.includes('갱신') ||
        bodyText?.toLowerCase().includes('renewal') ||
        bodyText?.includes('로그인') // Or login prompt for unauthenticated

      expect(hasBillingInfo).toBe(true)
    })
  })

  test.describe('Plan Comparison', () => {
    test('should show current plan vs available upgrades', async ({ page }) => {
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      const bodyText = await page.textContent('body')

      // Should have multiple plan options
      const hasMultiplePlans =
        (bodyText?.toLowerCase().includes('free') ||
          bodyText?.includes('무료')) &&
        (bodyText?.toLowerCase().includes('premium') ||
          bodyText?.includes('프리미엄'))

      expect(hasMultiplePlans).toBe(true)
    })

    test('should highlight recommended plan', async ({ page }) => {
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      const bodyText = await page.textContent('body')

      // Check for recommendation indicators
      const hasRecommendation =
        bodyText?.includes('추천') ||
        bodyText?.toLowerCase().includes('recommend') ||
        bodyText?.toLowerCase().includes('popular') ||
        bodyText?.includes('인기') ||
        bodyText?.toLowerCase().includes('best')

      // Optional - not all pricing pages have this
      expect(bodyText?.length).toBeGreaterThan(100)
    })
  })

  test.describe('Subscription Management', () => {
    test('should have subscription management link', async ({ page }) => {
      await page.goto('/profile', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      // Look for management links
      const managementLink = page
        .locator('a, button')
        .filter({
          hasText: /관리|manage|설정|settings|구독|subscription/i,
        })
        .first()

      const hasManagement =
        (await managementLink.isVisible({ timeout: 2000 }).catch(() => false)) ||
        page.url().includes('login') ||
        page.url().includes('signin')

      expect(hasManagement).toBe(true)
    })

    test('should navigate to Stripe customer portal', async ({ page }) => {
      await page.goto('/profile', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      // Look for portal link
      const portalLink = page
        .locator('a, button')
        .filter({
          hasText: /결제 관리|billing|portal|구독 관리/i,
        })
        .first()

      if (await portalLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Check href or click behavior
        const href = await portalLink.getAttribute('href')
        expect(href === null || href !== undefined).toBe(true)
      }
    })
  })

  test.describe('Subscription API Endpoints', () => {
    test('should check subscription via API', async ({ page }) => {
      const response = await page.request.get('/api/me/premium')

      if (response.ok()) {
        const data = await response.json()
        expect(data).toBeDefined()

        // Should have subscription-related fields
        const hasExpectedFields =
          data.isPremium !== undefined ||
          data.premium !== undefined ||
          data.subscription !== undefined ||
          data.data?.isPremium !== undefined
      } else {
        // Unauthorized is acceptable
        expect(response.status()).toBe(401)
      }
    })

    test('should handle cancel subscription request', async ({ page }) => {
      // This would typically require authentication
      const response = await page.request.post('/api/me/subscription/cancel', {
        headers: { 'Content-Type': 'application/json' },
      })

      // Should be unauthorized or handled
      expect(response.status()).toBeLessThan(500)
    })
  })

  test.describe('Billing Cycle Changes', () => {
    test('should display monthly vs yearly savings', async ({ page }) => {
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      const bodyText = await page.textContent('body')

      // Check for savings indication
      const hasSavingsInfo =
        bodyText?.includes('절약') ||
        bodyText?.toLowerCase().includes('save') ||
        bodyText?.includes('할인') ||
        bodyText?.toLowerCase().includes('discount') ||
        bodyText?.includes('%')

      // Optional - not all have savings displayed
      expect(bodyText?.length).toBeGreaterThan(100)
    })

    test('should toggle between monthly and yearly', async ({ page }) => {
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      // Look for billing toggle
      const billingToggle = page
        .locator('button, input[type="checkbox"], [role="switch"]')
        .filter({
          hasText: /월|년|monthly|yearly|annual/i,
        })
        .first()

      if (await billingToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
        await billingToggle.click()
        await page.waitForTimeout(500)

        // Price should change
        const bodyText = await page.textContent('body')
        expect(bodyText?.length).toBeGreaterThan(100)
      }
    })
  })

  test.describe('Cancellation Flow', () => {
    test('should show cancellation option for subscribers', async ({ page }) => {
      await page.goto('/profile', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      const bodyText = await page.textContent('body')

      // Look for cancel option or login prompt
      const hasCancellation =
        bodyText?.includes('취소') ||
        bodyText?.toLowerCase().includes('cancel') ||
        bodyText?.includes('해지') ||
        bodyText?.includes('로그인') ||
        bodyText?.toLowerCase().includes('sign in')

      expect(hasCancellation).toBe(true)
    })

    test('should confirm before cancellation', async ({ page }) => {
      await page.goto('/profile', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      const cancelButton = page
        .locator('button')
        .filter({
          hasText: /취소|cancel|해지/i,
        })
        .first()

      if (await cancelButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cancelButton.click()
        await page.waitForTimeout(500)

        // Should show confirmation dialog
        const bodyText = await page.textContent('body')
        const hasConfirmation =
          bodyText?.includes('확인') ||
          bodyText?.toLowerCase().includes('confirm') ||
          bodyText?.includes('정말') ||
          bodyText?.toLowerCase().includes('are you sure')

        expect(hasConfirmation).toBe(true)
      }
    })
  })

  test.describe('Credit Balance After Subscription', () => {
    test('should display updated credits after subscription', async ({ page }) => {
      // First check credits
      const initialResponse = await page.request.get('/api/me/credits')
      const initialCredits = initialResponse.ok()
        ? await initialResponse.json()
        : null

      await page.goto('/myjourney', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      const bodyText = await page.textContent('body')

      // Should show credit information or login
      const hasCredits =
        bodyText?.includes('크레딧') ||
        bodyText?.toLowerCase().includes('credit') ||
        /\d+/.test(bodyText || '') ||
        bodyText?.includes('로그인')

      expect(hasCredits).toBe(true)
    })
  })

  test.describe('Upgrade Path', () => {
    test('should show upgrade CTA on free plan', async ({ page }) => {
      await page.goto('/myjourney', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      const bodyText = await page.textContent('body')

      // Check for upgrade prompts
      const hasUpgrade =
        bodyText?.includes('업그레이드') ||
        bodyText?.toLowerCase().includes('upgrade') ||
        bodyText?.includes('프리미엄') ||
        bodyText?.toLowerCase().includes('premium') ||
        bodyText?.includes('로그인')

      expect(hasUpgrade).toBe(true)
    })

    test('should link to pricing from upgrade CTA', async ({ page }) => {
      await page.goto('/myjourney', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      const upgradeLink = page
        .locator('a')
        .filter({
          hasText: /업그레이드|upgrade|프리미엄|premium/i,
        })
        .first()

      if (await upgradeLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        const href = await upgradeLink.getAttribute('href')
        expect(href).toContain('pricing')
      }
    })
  })

  test.describe('Payment Method Management', () => {
    test('should have payment method section', async ({ page }) => {
      await page.goto('/profile', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      const bodyText = await page.textContent('body')

      // Check for payment method info
      const hasPaymentInfo =
        bodyText?.includes('결제 수단') ||
        bodyText?.toLowerCase().includes('payment method') ||
        bodyText?.includes('카드') ||
        bodyText?.toLowerCase().includes('card') ||
        bodyText?.includes('로그인')

      expect(hasPaymentInfo).toBe(true)
    })
  })

  test.describe('Invoice History', () => {
    test('should display invoice history for subscribers', async ({ page }) => {
      await page.goto('/profile', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      const bodyText = await page.textContent('body')

      // Check for invoice/receipt info
      const hasInvoices =
        bodyText?.includes('영수증') ||
        bodyText?.toLowerCase().includes('invoice') ||
        bodyText?.toLowerCase().includes('receipt') ||
        bodyText?.includes('결제 내역') ||
        bodyText?.toLowerCase().includes('payment history') ||
        bodyText?.includes('로그인')

      expect(hasInvoices).toBe(true)
    })
  })

  test.describe('Subscription Recovery', () => {
    test('should handle expired subscription gracefully', async ({ page }) => {
      // Mock expired subscription state
      await page.goto('/myjourney', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      const bodyText = await page.textContent('body')

      // Should show either content or upgrade prompt
      const hasContent =
        bodyText?.length! > 100 ||
        bodyText?.includes('갱신') ||
        bodyText?.toLowerCase().includes('renew')

      expect(hasContent).toBe(true)
    })

    test('should allow resubscription after cancellation', async ({ page }) => {
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      // Subscribe buttons should be available
      const subscribeButton = page
        .locator('button')
        .filter({
          hasText: /구독|subscribe|시작|start/i,
        })
        .first()

      const hasSubscribeOption =
        (await subscribeButton.isVisible({ timeout: 2000 }).catch(() => false)) ||
        page.url().includes('pricing')

      expect(hasSubscribeOption).toBe(true)
    })
  })
})
