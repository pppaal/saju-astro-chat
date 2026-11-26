import { expect, test } from '@playwright/test'

const PUBLIC_ROUTES = [
  '/',
  '/pricing',
  '/about',
  '/faq',
  '/contact',
  '/blog',
  // The routes below are intentional client-side redirect entry points, not
  // standalone public pages, so a strict toHaveURL() can never pass:
  //   - /report           → redirect('/destiny-map/result')
  //   - /destiny-map       → router.replace('/?openBirth=1&next=…' | '/destiny-map/counselor?…')
  //   - /calendar          → router.replace('/?openBirth=1&next=…') when no birth info
  // They redirect on mount (collecting birth info from the home modal as the
  // single source of truth), so they're excluded from this static smoke.
  '/tarot',
  '/compatibility',
  '/policy/terms',
  '/policy/privacy',
  '/policy/refund',
  // 프로그램매틱 SEO 표면 — 무로그인·무DB 서버 렌더 페이지들.
  // 색인 대상이라 여기서 렌더 깨짐을 조기에 잡는다.
  // (/free 는 홈으로 308 통합 — 아래 redirect 테스트가 따로 본다.)
  '/fortune',
  '/fortune/horse',
  '/tarot/cards',
  '/tarot/cards/the-fool',
  // v9.2 운세 달력 공개 샘플(고정 본명 · 2026-11-19) — 로그인·본명 없이 서버 렌더.
  '/calendar/preview',
]

const KEY_LEAK_PATTERNS = [
  /\bheroTitle\b/,
  /\bheroSub\b/,
  /\bsubscribe\b/,
  /\bdestinyMap\b/,
  /\btitleAstrology\b/,
  /\bsubtitleAstrology\b/,
  /\bcreditPacksDesc\b/,
]

test.describe('Public pages smoke', () => {
  test.setTimeout(120000)

  for (const route of PUBLIC_ROUTES) {
    test(`no key leak/mojibake/permanent loading: ${route}`, async ({ page }, testInfo) => {
      try {
        await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60000 })
        await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {})
        await page.waitForTimeout(1000)
        await expect(page).toHaveURL(
          new RegExp(route === '/' ? '/$' : route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        )

        await page
          .waitForFunction(() => !document.body.innerText.includes('Loading...'), undefined, {
            timeout: 11000,
          })
          .catch(() => {})

        const text = await page.locator('body').innerText()
        for (const keyPattern of KEY_LEAK_PATTERNS) {
          expect(text).not.toMatch(keyPattern)
        }

        expect(text).not.toContain('â')
        expect(text).not.toContain('Ã')
        expect(text).not.toContain('ï¿½')
        expect(text).not.toContain('Loading...')

        const headingCount = await page.locator('main h1, h1').count()
        expect(headingCount).toBeGreaterThan(0)
        const headingText = (await page.locator('main h1, h1').first().innerText()).trim()
        expect(headingText.length).toBeGreaterThan(0)
      } catch (error) {
        const safeRouteName = route === '/' ? 'home' : route.replace(/[\/:.?&=]/g, '_')
        try {
          await page.screenshot({
            path: `tmp/test-results/public/public-smoke-${safeRouteName}.png`,
            fullPage: true,
          })
        } catch {
          // no-op
        }

        testInfo.attach(`failure-route-${safeRouteName}`, {
          body: Buffer.from(String(error)),
          contentType: 'text/plain',
        })
        throw error
      }
    })
  }

  test('blog index is not empty when posts exist', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {})
    await page.waitForTimeout(800)

    const cards = await page.locator('a[href^="/blog/"]').count()
    const emptyMessage = page.getByText('No posts in this category yet')
    const hasEmptyMessage = await emptyMessage.isVisible().catch(() => false)

    expect(cards).toBeGreaterThan(0)
    expect(hasEmptyMessage).toBe(false)
  })

  // /free 는 홈으로 통합됐다(next.config redirects). 308 이고 쿼리를 그대로 넘겨야
  // 소셜 바이오·공유 QR(?s=card)·푸시 링크가 끊기지 않는다.
  for (const [from, to] of [
    ['/free?s=card', '/?s=card'],
    ['/ko/free?s=card', '/ko?s=card'],
  ] as const) {
    test(`${from} permanently redirects to ${to}`, async ({ request }) => {
      const res = await request.get(from, { maxRedirects: 0 })
      expect(res.status()).toBe(308)
      const location = new URL(res.headers()['location'] ?? '', res.url())
      expect(`${location.pathname}${location.search}`).toBe(to)
    })
  }
})
