// Visual smoke test for Destiny Calendar with cross-augment.
// Fills the birth form via UI, switches Detailed mode for time/city/gender,
// submits, then captures dark + light snapshots for the monthly view and
// for a day-selected view (which renders daily + weekly augment cards).

import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE_URL || 'http://localhost:3210'
const OUT = '/tmp/calendar-shots'
mkdirSync(OUT, { recursive: true })

const log = (...a) => console.log('[shot]', ...a)

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: true,
})
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 1900 },
  locale: 'ko-KR',
})
const page = await ctx.newPage()

page.on('pageerror', (e) => console.error('[PAGE-ERR]', e.message))
page.on('console', (m) => {
  if (m.type() === 'error') {
    const text = m.text()
    if (!text.includes('next-auth') && !text.includes('Failed to load resource')) {
      console.error('[CONSOLE-ERR]', text)
    }
  }
})

try {
  log('opening calendar')
  await page.goto(`${BASE}/calendar`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(800)

  // Switch to Detailed mode so time / city / gender appear.
  const detailedBtn = page.getByRole('button', { name: /Detailed|상세/i }).first()
  if (await detailedBtn.count()) {
    await detailedBtn.click()
    log('switched to Detailed mode')
    await page.waitForTimeout(500)
  }

  // Fill date via aria-labeled selects.
  await page.selectOption('select[aria-label*="year" i], select[aria-label*="연도" i]', '1995')
  await page.selectOption('select[aria-label*="month" i], select[aria-label*="월" i]', '2')
  await page.selectOption('select[aria-label*="day" i], select[aria-label*="일" i]', '9')
  log('filled date 1995-02-09')

  // Gender — click Male button.
  const maleBtn = page.locator('button[aria-label="Male"], button[aria-label="남성"]').first()
  if (await maleBtn.count()) {
    await maleBtn.click()
    log('selected Male')
  }

  // Time — TimePicker selects don't have aria-labels; pick by position within the time fieldGroup.
  // Strategy: select the 4th, 5th, 6th selects (after year/month/day).
  const allSelects = page.locator('select')
  const selectCount = await allSelects.count()
  log(`total selects: ${selectCount}`)
  if (selectCount >= 6) {
    // 6:40 AM => hour=6, min=40, period=AM
    await allSelects.nth(3).selectOption('6')
    await allSelects.nth(4).selectOption('40')
    await allSelects.nth(5).selectOption('AM')
    log('filled time 06:40 AM')
  }

  // City — expand the optional city section if collapsed.
  const cityToggle = page.locator('button:has-text("도시"), button:has-text("Birth City")').first()
  if (await cityToggle.count()) {
    await cityToggle.click().catch(() => {})
    await page.waitForTimeout(300)
  }
  const cityInput = page.locator('input[placeholder*="city" i], input[placeholder*="도시"], input[type="search"]').first()
  if (await cityInput.count()) {
    await cityInput.fill('Seoul')
    await page.waitForTimeout(1500)
    // Pick first suggestion
    const firstOption = page.locator('[role="option"], li[class*="suggestion"], button[class*="suggestion"]').first()
    if (await firstOption.count()) {
      await firstOption.click().catch(() => {})
      log('picked Seoul')
    }
  }

  await page.screenshot({ path: `${OUT}/01-form-filled.png`, fullPage: true })
  log('saved 01-form-filled.png')

  // Submit
  const submit = page.getByRole('button', { name: /월간 흐름 보기|View Monthly Flow/i }).first()
  await submit.waitFor({ state: 'visible', timeout: 5000 })
  // Wait for it to be enabled (validation)
  for (let i = 0; i < 15; i++) {
    if (await submit.isEnabled()) break
    await page.waitForTimeout(400)
  }
  await submit.click()
  log('clicked submit')

  // Wait for the calendar grid to appear (any class with calendar/dayCell).
  await page.waitForFunction(
    () => !!document.querySelector('[class*="dayCell"], [class*="domainsGrid"], [class*="calendarGrid"]'),
    null,
    { timeout: 30000 }
  ).catch(() => log('grid wait timed out'))
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {})
  await page.waitForTimeout(3500) // allow augment fetch to finish

  await page.screenshot({ path: `${OUT}/02-calendar-dark.png`, fullPage: true })
  log('saved 02-calendar-dark.png')

  // Theme toggle button.
  const themeToggle = page.locator('button[aria-label*="라이트"], button[aria-label*="light" i], button[aria-label*="다크"], button[aria-label*="dark" i]').first()
  if (await themeToggle.count()) {
    await themeToggle.click()
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${OUT}/03-calendar-light.png`, fullPage: true })
    log('saved 03-calendar-light.png')
  } else {
    log('theme toggle not found')
  }

  // Click a day cell.
  const dayCells = page.locator('[class*="dayCell"]:not([class*="emptyCell"])')
  const dayCount = await dayCells.count()
  log(`day cells: ${dayCount}`)
  if (dayCount > 0) {
    const idx = Math.min(15, dayCount - 1)
    await dayCells.nth(idx).click({ force: true })
    await page.waitForTimeout(3500)
    await page.screenshot({ path: `${OUT}/04-day-selected-light.png`, fullPage: true })
    log('saved 04-day-selected-light.png')

    if (await themeToggle.count()) {
      await themeToggle.click()
      await page.waitForTimeout(800)
      await page.screenshot({ path: `${OUT}/05-day-selected-dark.png`, fullPage: true })
      log('saved 05-day-selected-dark.png')
    }
  }

  log('done')
} catch (e) {
  console.error('[fatal]', e)
  await page.screenshot({ path: `${OUT}/error.png`, fullPage: true }).catch(() => {})
  process.exitCode = 1
} finally {
  await browser.close()
}
