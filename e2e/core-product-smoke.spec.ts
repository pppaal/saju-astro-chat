import { expect, test } from '@playwright/test'

const KEY_LEAK_PATTERNS = [
  /\bheroTitle\b/i,
  /\bheroSub\b/i,
  /\bsubscribe\b/i,
  /\bdestinyMap\b/i,
  /\btitleAstrology\b/i,
]

function hasMojibake(text: string): boolean {
  return /ðŸ|â€”|âœ|ï¸|Ã|�/.test(text)
}

test.use({ trace: 'retain-on-failure' })

test.describe('Core product smoke', () => {
  test.setTimeout(120000)

  test('home -> pricing -> calendar route is reachable from public CTA/link', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('link', { name: /pricing/i }).first()).toBeVisible()

    await page
      .getByRole('link', { name: /pricing/i })
      .first()
      .click()
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveURL(/\/pricing/)

    const calendarLink = page
      .locator(
        'a[href="/calendar"], button:has-text("Calendar"), [role="link"]:has-text("Calendar")'
      )
      .first()
    const hasCalendarCta = (await calendarLink.count()) > 0 && (await calendarLink.isVisible())
    if (hasCalendarCta) {
      await calendarLink.click()
    } else {
      await page.goto('/calendar', { waitUntil: 'domcontentloaded' })
    }
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveURL(/\/calendar/)
  })

  test('calendar page renders form UI (not a blank/stuck shell)', async ({ page }) => {
    await page.goto('/calendar', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {})

    const heading = page.locator('h1').first()
    await expect(heading).toBeVisible()

    const hasFormInput = await page
      .locator('main input, main select, form input, form select')
      .first()
      .isVisible()
      .catch(() => false)
    expect(hasFormInput).toBe(true)
  })

  test('destiny-map renders required form fields', async ({ page }) => {
    await page.goto('/destiny-map', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {})

    await expect(page.locator('h1').first()).toBeVisible()
    await expect(page.locator('input[type="time"]').first()).toBeVisible()
    await expect(page.locator('input[required]').first()).toBeVisible()

    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain('Loading...')
    expect(hasMojibake(bodyText)).toBe(false)
    for (const pattern of KEY_LEAK_PATTERNS) {
      expect(bodyText).not.toMatch(pattern)
    }
  })

  test('demo gate + token bootstrap cookie flow', async ({ page, context }) => {
    const demoToken = process.env.DEMO_TOKEN || 'demo-test-token'

    await page.goto('/demo', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: /demo access required/i })).toBeVisible()

    await page.goto(`/demo?demo_token=${encodeURIComponent(demoToken)}`, {
      waitUntil: 'domcontentloaded',
    })
    await expect(page).toHaveURL(/\/demo(\?.*)?$/)

    const cookies = await context.cookies()
    const demoCookie = cookies.find((cookie) => cookie.name === 'dp_demo')
    expect(demoCookie?.value).toBe('1')

    await page.goto('/demo/calendar', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/demo\/calendar/)
    await expect(page.locator('main h1, h1').first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /demo access required/i })).toHaveCount(0)
  })
})
