/**
 * 크레딧 팩 체크아웃 — 머니패스 크리티컬 플로우.
 *
 * 이 제품은 구독이 없다(크레딧 팩 단건 결제 전용, src/lib/config/pricing.ts).
 * 예전 버전은 구독 모델 기준 + `expect([200, 401, 403])` 식 광폭 단언이라
 * 인증이 깨져도 통과했다. 여기서는 로그인/DB 없이도 결정적인 것만 강하게
 * 단언한다:
 *
 *  - 비로그인 POST /api/checkout 은 *어떤 입력이든* 세션 URL 을 발급하지
 *    않는다 (401 — auth 가드가 validation 보다 앞).
 *  - Origin/Referer 없는 cross-site 형태 요청도 발급 불가 (CSRF 403 또는
 *    auth 401 — 서버 모드에 따라 갈리지만 "url 미발급"은 불변식).
 *  - /pricing 은 SSOT 5팩 그리드(mini~ultimate)를 렌더하고 starter(첫구매
 *    임펄스 팩)는 그리드에 없다.
 *  - 비로그인 구매 클릭 → 로그인 모달 (Stripe 로 새지 않음).
 */
import { test, expect } from '@playwright/test'

// /pricing 그리드의 SSOT 팩 목록 (src/lib/config/pricing.ts 와 동기 —
// PricingPageClient.tsx 의 creditPacks 배열이 같은 목록을 렌더한다).
const GRID_PACKS = ['mini', 'standard', 'plus', 'mega', 'ultimate'] as const

test.describe('Credit-pack checkout — auth wall (API)', () => {
  test('unauthenticated checkout is rejected with 401 and never returns a session URL', async ({
    page,
    baseURL,
  }) => {
    const response = await page.request.post('/api/checkout', {
      data: { creditPack: 'standard' },
      // same-origin Origin 을 명시해 CSRF 가드를 통과시키고, 순수하게
      // auth 가드만 검증한다 (dev/prod 서버 모두 동일 결과).
      headers: { origin: baseURL! },
      timeout: 30000,
    })

    expect(response.status()).toBe(401)
    const body = await response.json().catch(() => ({}))
    expect(body).not.toHaveProperty('url')
  })

  test('every valid pack id is equally rejected when unauthenticated', async ({
    page,
    baseURL,
  }) => {
    for (const pack of GRID_PACKS) {
      const response = await page.request.post('/api/checkout', {
        data: { creditPack: pack },
        headers: { origin: baseURL! },
        timeout: 30000,
      })
      expect(response.status(), `pack=${pack}`).toBe(401)
      const body = await response.json().catch(() => ({}))
      expect(body, `pack=${pack} leaked a checkout URL`).not.toHaveProperty('url')
    }
  })

  test('request without Origin/Referer cannot mint a checkout session (CSRF or auth wall)', async ({
    page,
  }) => {
    const response = await page.request.post('/api/checkout', {
      data: { creditPack: 'standard' },
      timeout: 30000,
    })

    // dev 서버(localhost 허용)는 auth 401, prod 서버는 CSRF 403 — 어느 쪽이든
    // 거부여야 하고, 성공(2xx)이나 URL 발급은 절대 불가.
    expect([401, 403]).toContain(response.status())
    const body = await response.json().catch(() => ({}))
    expect(body).not.toHaveProperty('url')
  })

  test('invalid pack id is rejected (never 2xx)', async ({ page, baseURL }) => {
    const response = await page.request.post('/api/checkout', {
      data: { creditPack: 'invalid_pack' },
      headers: { origin: baseURL! },
      timeout: 30000,
    })

    // 비로그인이라 auth(401)가 validation(400)보다 먼저 걸린다. 로그인 상태
    // validation 은 유닛 테스트(zodValidation)가 커버.
    expect(response.status()).toBe(401)
  })

  test('legacy subscription-shaped payload is not accepted', async ({ page, baseURL }) => {
    // 제거된 구독 모델의 페이로드가 다시 통하게 되는 회귀 방지.
    const response = await page.request.post('/api/checkout', {
      data: { plan: 'premium', billingCycle: 'monthly' },
      headers: { origin: baseURL! },
      timeout: 30000,
    })

    expect(response.ok()).toBe(false)
    const body = await response.json().catch(() => ({}))
    expect(body).not.toHaveProperty('url')
  })
})

test.describe('Credit-pack checkout — pricing page (UI)', () => {
  test('renders the 5-pack SSOT grid, and starter is not in the grid', async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'domcontentloaded' })

    for (const pack of GRID_PACKS) {
      await expect(page.getByTestId(`buy-pack-${pack}`)).toBeVisible({ timeout: 15000 })
    }
    // starter 는 첫구매 전용 임펄스 팩 — /pricing 그리드에서 제외 (pricing.ts).
    await expect(page.getByTestId('buy-pack-starter')).toHaveCount(0)
  })

  test('shows credit wording and currency (no subscription copy as the model)', async ({
    page,
  }) => {
    await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId(`buy-pack-mini`)).toBeVisible({ timeout: 15000 })

    const bodyText = (await page.textContent('body')) ?? ''
    expect(bodyText).toMatch(/크레딧|credit/i)
    expect(bodyText).toMatch(/₩|\$|원/)
  })

  test('guest buy click opens the login modal instead of leaking to Stripe', async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'domcontentloaded' })

    // 동의 배너는 클라이언트에서만 렌더된다 — 노출 = React 하이드레이션 완료.
    // SSR 버튼에 하이드레이션 전 클릭이 나가면 핸들러가 없어 모달이 안 뜨는
    // 레이스가 있어, 배너를 하이드레이션 신호로 기다렸다가 닫고 클릭한다.
    const consent = page.getByRole('dialog', { name: /Help us improve|서비스 사용 분석 동의/ })
    await expect(consent).toBeVisible({ timeout: 15000 })
    await consent.getByRole('button', { name: /^(OK|동의)$/ }).click()

    const buyButton = page.getByTestId('buy-pack-standard')
    await expect(buyButton).toBeVisible({ timeout: 15000 })
    await buyButton.click()

    // 비로그인 → LoginRequiredModal. aria-label 은 로케일별(ko '로그인 필요' /
    // en 'Sign in required') — consent 배너도 role=dialog 라 이름으로 좁힌다.
    await expect(page.getByRole('dialog', { name: /로그인 필요|Sign in required/ })).toBeVisible({
      timeout: 10000,
    })
    expect(page.url()).not.toContain('stripe')
  })

  test('cancel redirect from Stripe returns to pricing', async ({ page }) => {
    await page.goto('/pricing?canceled=true', { waitUntil: 'domcontentloaded' })
    expect(page.url()).toContain('/pricing')
    await expect(page.getByTestId('buy-pack-mini')).toBeVisible({ timeout: 15000 })
  })
})
