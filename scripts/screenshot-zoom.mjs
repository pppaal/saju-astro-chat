// Zoom-in screenshots for augment cards (dark + light) at full width.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:3210'
const OUT = '/tmp/calendar-shots'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: true,
})
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 1200 },
  deviceScaleFactor: 1.5,
  locale: 'ko-KR',
})
const page = await ctx.newPage()

await page.goto(`${BASE}/calendar`, { waitUntil: 'domcontentloaded', timeout: 45000 })
await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
await page.selectOption('select[aria-label*="연도"]', '1995')
await page.selectOption('select[aria-label*="월"]', '2')
await page.selectOption('select[aria-label*="일"]', '9')
const submit = page.getByRole('button', { name: /월간 흐름 보기/i }).first()
for (let i = 0; i < 15; i++) {
  if (await submit.isEnabled()) break
  await page.waitForTimeout(300)
}
await submit.click()
await page.waitForFunction(() => !!document.querySelector('[class*="dayCell"]'), null, { timeout: 30000 }).catch(() => {})
await page.waitForTimeout(4500) // augment fetch

// Click a day so daily + weekly augment also render.
const dayCells = page.locator('[class*="day"][role="button"], [class*="day_"]').filter({ hasNot: page.locator('[class*="emptyDay"]') })
const dayCount = await dayCells.count()
if (dayCount > 0) {
  await dayCells.nth(Math.min(15, dayCount - 1)).click({ force: true })
  await page.waitForTimeout(4500)
}

// Find the FIRST augment card (monthly) and snapshot it.
const augment = page.locator('section[aria-label*="흐름"], section[class*="card_"]').first()
if (await augment.count()) {
  await augment.scrollIntoViewIfNeeded().catch(() => {})
  const box = await augment.boundingBox()
  if (box) {
    await page.screenshot({
      path: `${OUT}/zoom-augment-dark.png`,
      clip: { x: 0, y: box.y - 20, width: 1440, height: Math.min(1500, box.height + 40) },
    })
    console.log('saved zoom-augment-dark.png')
  }
}

// Toggle to light + same shot.
const themeToggle = page.locator('button[aria-label*="라이트"]').first()
if (await themeToggle.count()) {
  await themeToggle.click()
  await page.waitForTimeout(1200)
  await augment.scrollIntoViewIfNeeded().catch(() => {})
  await page.waitForTimeout(400)
  const box2 = await augment.boundingBox()
  if (box2 && box2.height > 50) {
    const yClip = Math.max(0, box2.y - 20)
    await page.screenshot({
      path: `${OUT}/zoom-augment-light.png`,
      clip: { x: 0, y: yClip, width: 1440, height: Math.min(1180, box2.height + 40) },
    })
    console.log('saved zoom-augment-light.png')
  } else {
    console.log('augment box invalid in light mode', box2)
    await page.screenshot({ path: `${OUT}/zoom-augment-light-fallback.png`, fullPage: true })
  }
}

// Top-of-page header zoom in light mode.
await page.evaluate(() => window.scrollTo(0, 0))
await page.waitForTimeout(400)
await page.screenshot({
  path: `${OUT}/zoom-header-light.png`,
  clip: { x: 0, y: 0, width: 1440, height: 600 },
})
console.log('saved zoom-header-light.png')

await browser.close()
