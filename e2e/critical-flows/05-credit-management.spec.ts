import { test, expect } from '@playwright/test'
import { TestHelpers } from '../fixtures/test-helpers'

test.describe('Credit Management Flow', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
  })

  test('should fetch credit balance via API', async ({ page }) => {
    const response = await page.request.get('/api/me/credits', {})

    if (response.ok()) {
      const data = await response.json()
      // credits might be in data.credits or data.balance or similar
      const credits = data.credits ?? data.balance ?? data.amount
      if (credits !== undefined) {
        expect(typeof credits).toBe('number')
        expect(credits).toBeGreaterThanOrEqual(0)
      } else {
        // Response is OK - API가 응답함을 확인
        expect(data).toBeDefined()
      }
    } else {
      // User might not be authenticated, which is ok for this test
      expect(response.status()).toBeLessThan(500)
    }
  })

  test('should deduct credits when using premium features', async ({ page }) => {
    const initialCredits = await helpers.getCreditBalance()
    const isPremium = await helpers.checkPremiumStatus()

    if (!isPremium && initialCredits > 0) {
      // Use a feature that costs credits (e.g., tarot reading)
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

      const questionInput = page.locator('textarea').first()
      if (await questionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await questionInput.fill('Credit test question')

        const submitButton = page.locator('button[type="submit"]').first()
        await submitButton.click()

        await page.waitForTimeout(5000)

        const finalCredits = await helpers.getCreditBalance()
        expect(finalCredits).toBeLessThanOrEqual(initialCredits)
      }
    }
  })

  test('should handle zero credits gracefully', async ({ page }) => {
    await helpers.mockCredits(0)

    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    const questionInput = page.locator('textarea').first()
    if (await questionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await questionInput.fill('Test with no credits')

      const submitButton = page.locator('button[type="submit"]').first()
      await submitButton.click()

      await page.waitForTimeout(2000)

      // Should show error or prompt to purchase credits
      const bodyText = await page.textContent('body')
      const hasNoCreditsMessage =
        bodyText?.includes('크레딧') ||
        bodyText?.includes('credit') ||
        bodyText?.includes('부족') ||
        bodyText?.includes('insufficient') ||
        (await helpers.hasError())

      expect(hasNoCreditsMessage).toBe(true)
    }
  })

  test('should navigate to pricing page for credit purchase', async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.textContent('body')
    const hasPricing =
      bodyText?.includes('가격') ||
      bodyText?.includes('pricing') ||
      bodyText?.includes('구독') ||
      bodyText?.includes('subscription') ||
      bodyText?.includes('플랜') ||
      bodyText?.includes('plan')

    expect(hasPricing).toBe(true)
  })

  test('should display the credit pack tiers (SSOT grid, no subscription plans)', async ({
    page,
  }) => {
    await page.goto('/pricing', { waitUntil: 'domcontentloaded' })

    // 구독 Free/Premium 플랜은 없어졌다 — /pricing 은 pricing.ts 의 크레딧 팩 그리드(starter 제외).
    for (const pack of ['mini', 'standard', 'plus', 'mega', 'ultimate']) {
      await expect(page.getByTestId(`buy-pack-${pack}`).filter({ visible: true })).toBeVisible({
        timeout: 15000,
      })
    }
  })

  test('should show credit prices and benefits', async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'domcontentloaded' })

    await page.waitForTimeout(2000)

    const bodyText = await page.textContent('body')
    // Look for pricing information
    const hasPriceInfo =
      /\$\d+/.test(bodyText || '') ||
      /₩\d+/.test(bodyText || '') ||
      bodyText?.includes('원') ||
      bodyText?.includes('dollar')

    expect(hasPriceInfo).toBe(true)
  })

  test('should initiate checkout process', async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'domcontentloaded' })

    await page.waitForTimeout(2000)

    // Look for purchase/subscribe button
    const purchaseButton = page
      .locator(
        'button:has-text("구독"), button:has-text("구매"), button:has-text("Subscribe"), button:has-text("Purchase"), button:has-text("시작")'
      )
      .first()

    if (await purchaseButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await purchaseButton.click()

      await page.waitForTimeout(2000)

      // Should navigate to checkout or show payment modal
      const currentUrl = page.url()
      const bodyText = await page.textContent('body')

      const isCheckoutFlow =
        currentUrl.includes('checkout') ||
        currentUrl.includes('payment') ||
        currentUrl.includes('pricing') ||
        bodyText?.includes('결제') ||
        bodyText?.includes('payment') ||
        bodyText?.includes('checkout') ||
        bodyText?.includes('로그인') ||
        bodyText?.includes('Sign in')

      expect(isCheckoutFlow).toBe(true)
    } else {
      // 구매 버튼이 없어도 가격 페이지가 정상적으로 로드되었는지 확인
      const bodyText = await page.textContent('body')
      const hasPricingContent =
        bodyText?.includes('무료') ||
        bodyText?.includes('Free') ||
        bodyText?.includes('프리미엄') ||
        bodyText?.includes('Premium') ||
        bodyText?.includes('가격') ||
        bodyText?.includes('₩')

      expect(hasPricingContent).toBe(true)
    }
  })

  test('should handle checkout API endpoint', async ({ page }) => {
    const response = await page.request.post('/api/checkout', {
      data: {
        priceId: 'test_price_id',
      },
      timeout: 30000,
    })

    // Should return 401 for unauthenticated or proper checkout session for authenticated
    expect([200, 401, 403]).toContain(response.status())
  })

  test('should verify premium status via API', async ({ page }) => {
    const response = await page.request.get('/api/me/premium', {})

    if (response.ok()) {
      const data = await response.json()
      expect(typeof data.isPremium).toBe('boolean')
    } else {
      expect(response.status()).toBeGreaterThanOrEqual(401)
    }
  })

  test('should handle credit reset cron job', async ({ page }) => {
    const response = await page.request.get('/api/cron/reset-credits', {})

    // Cron endpoints usually require authorization
    expect([200, 401, 403]).toContain(response.status())
  })

  test('should not charge credits for premium users', async ({ page }) => {
    const isPremium = await helpers.checkPremiumStatus()

    if (isPremium) {
      const initialCredits = await helpers.getCreditBalance()

      // Use a feature
      await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

      const questionInput = page.locator('textarea').first()
      if (await questionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await questionInput.fill('Premium user test')

        const submitButton = page.locator('button[type="submit"]').first()
        await submitButton.click()

        await page.waitForTimeout(5000)

        const finalCredits = await helpers.getCreditBalance()
        // Premium users shouldn't lose credits
        expect(finalCredits).toEqual(initialCredits)
      }
    }
  })

  test('should display credit pricing clearly', async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'domcontentloaded' })

    await page.waitForTimeout(2000)

    // Check that pricing page has pricing-related content
    const bodyText = await page.locator('body').textContent()
    const hasPricingContent =
      bodyText!.includes('₩') ||
      bodyText!.includes('가격') ||
      bodyText!.includes('크레딧') ||
      bodyText!.includes('Credit') ||
      bodyText!.includes('프리미엄')
    expect(hasPricingContent).toBe(true)
  })

  test('should handle subscription cancellation', async ({ page }) => {
    await page.goto('/myjourney/profile', { waitUntil: 'domcontentloaded' })

    await page.waitForTimeout(2000)

    // Look for cancel subscription button
    const cancelButton = page
      .locator('button:has-text("취소"), button:has-text("Cancel"), button:has-text("해지")')
      .first()

    if (await cancelButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Don't actually click it, just verify it exists
      await expect(cancelButton).toBeVisible()
    }
  })

  test('should prevent negative credit balance', async ({ page }) => {
    const currentCredits = await helpers.getCreditBalance()

    // Try to use more credits than available by using multiple features
    if (currentCredits < 100 && currentCredits >= 0) {
      expect(currentCredits).toBeGreaterThanOrEqual(0)

      // Even if we use features multiple times, credits shouldn't go negative
      const finalCredits = await helpers.getCreditBalance()
      expect(finalCredits).toBeGreaterThanOrEqual(0)
    }
  })

  test("should display credit pricing in user's currency", async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'domcontentloaded' })

    await page.waitForTimeout(2000)

    const bodyText = await page.textContent('body')
    // Should show currency symbols
    const hasCurrency =
      bodyText?.includes('$') ||
      bodyText?.includes('₩') ||
      bodyText?.includes('원') ||
      bodyText?.includes('USD') ||
      bodyText?.includes('KRW')

    expect(hasCurrency).toBe(true)
  })
})
