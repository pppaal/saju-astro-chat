import { expect, test } from '@playwright/test'

const CORE_ROUTES: Array<{ path: string; marker: RegExp }> = [
  { path: '/tarot', marker: /Tarot|tarot/i },
  { path: '/compatibility', marker: /Compatibility|compatibility/i },
  { path: '/icp', marker: /ICP|Relationship Style|interpersonal/i },
  { path: '/personality', marker: /Personality|Aura|personality/i },
]

test.describe('Core product smoke', () => {
  test.setTimeout(120000)

  test('home services menu includes ICP and Personality', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /our service|services|서비스/i }).click()
    await expect(page.locator('a[href="/icp"]')).toBeVisible()
    await expect(page.locator('a[href="/personality"]')).toBeVisible()
  })

  for (const route of CORE_ROUTES) {
    test(`loads ${route.path}`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: 'commit', timeout: 60000 })
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})

      expect(page.url(), `${route.path} should not redirect to home`).not.toMatch(/\/$/)

      const body = await page.locator('body').innerText()
      expect(body).toMatch(route.marker)
      expect(body).not.toContain('Ã¢')
      expect(body).not.toContain('Ãƒ')
      expect(body).not.toContain('Ã¯Â¿Â½')
    })
  }
})
