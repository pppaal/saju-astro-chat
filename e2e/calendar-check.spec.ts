import { test } from '@playwright/test'

test('calendar visual check', async ({ page }) => {
  test.setTimeout(180000)

  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: 'null',
    })
  })

  await page.goto('/calendar', { waitUntil: 'domcontentloaded' })
  await page.setViewportSize({ width: 1365, height: 900 })
  await page.screenshot({ path: 'artifacts/calendar-check-desktop.png' })
  await page.setViewportSize({ width: 412, height: 915 })
  await page.waitForTimeout(300)
  await page.screenshot({ path: 'artifacts/calendar-check-mobile.png' })
})
