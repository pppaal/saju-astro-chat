import { test } from '@playwright/test'

test('calendar visual check', async ({ page }) => {
  await page.goto('/calendar', { waitUntil: 'networkidle' })
  await page.setViewportSize({ width: 1365, height: 900 })
  await page.screenshot({ path: 'artifacts/calendar-check-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 412, height: 915 })
  await page.goto('/calendar', { waitUntil: 'networkidle' })
  await page.screenshot({ path: 'artifacts/calendar-check-mobile.png', fullPage: true })
})
