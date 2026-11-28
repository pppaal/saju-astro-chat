import { expect, test, type Page } from '@playwright/test'

/**
 * v9.2 인생 흐름 · 운세 달력 스모크 — 좁은 화면(390 · 280)에서 세 surface 가 깨지지 않는지.
 *
 *  - /calendar/preview           공개 샘플(고정 본명 · 2026-11-19)
 *  - /destiny?date=…             익명 override(로그인 없이 그 사람 기준) — 인생 흐름
 *  - /calendar?date=…            익명 override — 운세 달력
 *
 * 각 화면: h1 이 있고 비어 있지 않다 · 가로 스크롤(넘침)이 없다 · 'Loading...' 이 남지 않는다.
 * 서버가 Swiss Ephemeris 로 그 자리에서 계산하므로 첫 진입은 느릴 수 있다(넉넉한 타임아웃).
 * override 빌드는 IP 당 분당 20회 한도라 화면 수(6)는 그 안이다.
 */

// 샘플 본명(합성 데이터) — 1997-03-21 14:30 서울, 여.
const OVERRIDE = 'date=1997-03-21&time=14:30&lat=37.5665&lng=126.978&tz=Asia%2FSeoul&gender=female'

const ROUTES = [
  { name: 'calendar preview', path: '/calendar/preview' },
  { name: 'destiny override', path: `/destiny?${OVERRIDE}` },
  { name: 'calendar override', path: `/calendar?${OVERRIDE}` },
] as const

const WIDTHS = [390, 280] as const

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const doc = document.documentElement
    return Math.max(doc.scrollWidth, document.body.scrollWidth) - doc.clientWidth
  })
}

test.describe('Life · Calendar smoke (v9.2)', () => {
  test.setTimeout(180_000)

  for (const width of WIDTHS) {
    for (const route of ROUTES) {
      test(`${route.name} @ ${width}px — h1, no overflow, no Loading...`, async ({ page }) => {
        await page.setViewportSize({ width, height: 844 })
        await page.goto(route.path, { waitUntil: 'domcontentloaded', timeout: 150_000 })
        await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})

        const h1 = page.locator('h1').first()
        await expect(h1).toBeVisible({ timeout: 60_000 })
        expect((await h1.innerText()).trim().length).toBeGreaterThan(0)

        await page
          .waitForFunction(() => !document.body.innerText.includes('Loading...'), undefined, {
            timeout: 15_000,
          })
          .catch(() => {})
        const text = await page.locator('body').innerText()
        expect(text).not.toContain('Loading...')

        // 1px 반올림 오차만 허용.
        expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1)
      })
    }
  }

  test('calendar preview — Monthly | Daily switch keeps the page intact', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/calendar/preview', { waitUntil: 'domcontentloaded', timeout: 150_000 })
    await expect(page.locator('[data-cal-view="month"]')).toBeVisible({ timeout: 60_000 })
    const daily = page.locator('[data-v9-topbar] ~ div [role="group"] button').nth(1)
    await daily.click()
    await expect(page.locator('[data-cal-view="day"]')).toBeVisible()
    await expect(page.locator('h1').first()).toBeVisible()
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1)
  })
})
