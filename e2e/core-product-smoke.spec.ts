import { expect, test } from '@playwright/test'

const KEY_LEAK_PATTERNS = [
  /\bheroTitle\b/,
  /\bheroSub\b/,
  /\bsubscribe\b/,
  /\bdestinyMap\b/,
  /\btitleAstrology\b/,
  /\bsubtitleAstrology\b/,
  /\bcreditPacksDesc\b/,
]

const CORE_ROUTES: Array<{ path: string; marker: RegExp }> = [
  { path: '/tarot', marker: /(Tarot|타로)/i },
  { path: '/calendar', marker: /(Calendar|캘린더)/i },
  { path: '/destiny-map/matrix', marker: /(Matrix|매트릭스|Destiny)/i },
  { path: '/compatibility', marker: /(Compatibility|궁합)/i },
]

function hasAllowedConsoleError(message: string): boolean {
  if (
    message.includes('Failed to load resource: the server responded with a status of 404') &&
    (message.includes('favicon') || message.includes('apple-touch-icon'))
  ) {
    return true
  }
  return (
    message.includes('hydrated but some attributes of the server rendered HTML') &&
    message.includes('react.dev/link/hydration-mismatch')
  )
}

function isKnownNoisyError(message: string): boolean {
  return (
    message.includes('[next-auth][error][CLIENT_FETCH_ERROR]') ||
    message.includes('/api/auth/session')
  )
}

test.describe('Core product smoke', () => {
  test.setTimeout(180000)

  for (const route of CORE_ROUTES) {
    test(`loads ${route.path} without i18n/mojibake/loading traps`, async ({ page }) => {
      const consoleErrors: string[] = []
      const networkErrors: string[] = []

      page.on('console', (msg) => {
        if (
          msg.type() === 'error' &&
          !hasAllowedConsoleError(msg.text()) &&
          !isKnownNoisyError(msg.text())
        ) {
          consoleErrors.push(msg.text())
        }
      })
      page.on('requestfailed', (req) => {
        const failure = req.failure()
        networkErrors.push(`${req.method()} ${req.url()} :: ${failure?.errorText || 'unknown'}`)
      })

      await page.goto(route.path, { waitUntil: 'domcontentloaded', timeout: 120000 })
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
      await page.waitForTimeout(1200)

      const body = await page.locator('body').innerText()

      expect(body).toMatch(route.marker)
      expect(body).not.toContain('â')
      expect(body).not.toContain('Ã')
      expect(body).not.toContain('ï¿½')
      for (const keyPattern of KEY_LEAK_PATTERNS) {
        expect(body).not.toMatch(keyPattern)
      }

      await page
        .waitForFunction(() => !document.body.innerText.includes('Loading...'), undefined, {
          timeout: 10000,
        })
        .catch(() => {})

      expect(body).not.toContain('Loading...')
      expect(consoleErrors, `console errors on ${route.path}`).toEqual([])
      expect(networkErrors, `request failures on ${route.path}`).toEqual([])
    })
  }
})
