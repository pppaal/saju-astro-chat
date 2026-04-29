// Debug script — fills form, hits calendar, then probes the DOM:
//   1) does the theme toggle button exist?
//   2) what is data-cal-theme on the container?
//   3) what classes does CrossAugmentCard's container have? (none expected without lat/lng)
//   4) what is the theme toggle's aria-label / innerText?
import { chromium } from 'playwright'

const BASE = 'http://localhost:3210'
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: true,
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1900 }, locale: 'ko-KR' })
const page = await ctx.newPage()
page.on('pageerror', (e) => console.error('[PAGE-ERR]', e.message))

await page.goto(`${BASE}/calendar`, { waitUntil: 'domcontentloaded', timeout: 45000 })
await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
await page.waitForTimeout(500)
await page.selectOption('select[aria-label*="year" i], select[aria-label*="연도" i]', '1995')
await page.selectOption('select[aria-label*="month" i], select[aria-label*="월" i]', '2')
await page.selectOption('select[aria-label*="day" i], select[aria-label*="일" i]', '9')
const submit = page.getByRole('button', { name: /월간 흐름 보기|View Monthly Flow/i }).first()
for (let i = 0; i < 15; i++) {
  if (await submit.isEnabled()) break
  await page.waitForTimeout(300)
}
await submit.click()
await page.waitForFunction(
  () => !!document.querySelector('[class*="dayCell"], [class*="calendarGrid"]'),
  null,
  { timeout: 30000 },
).catch(() => {})
await page.waitForTimeout(2000)

const probe = await page.evaluate(() => {
  const out = {}
  const themeAttr = document.querySelector('[data-cal-theme]')
  out.dataCalTheme = themeAttr ? themeAttr.getAttribute('data-cal-theme') : null
  const allButtons = Array.from(document.querySelectorAll('button')).map((b) => ({
    aria: b.getAttribute('aria-label'),
    text: (b.textContent || '').trim().slice(0, 40),
    cls: b.className.slice(0, 60),
  }))
  out.buttonsWithSunMoon = allButtons.filter(
    (b) => (b.text && /[☀️🌙]/.test(b.text)) || (b.aria && /(라이트|다크|theme|light|dark)/i.test(b.aria))
  )
  out.totalButtons = allButtons.length
  // Check augment card presence
  out.augmentCardsCount = document.querySelectorAll('[class*="CrossAugmentCard"], [class*="card_"]').length
  // Probe AugmentSection by finding sections with "흐름" aria-label
  out.augmentSections = Array.from(document.querySelectorAll('section[aria-label]'))
    .map((s) => s.getAttribute('aria-label'))
    .filter((a) => a)
  return out
})

console.log(JSON.stringify(probe, null, 2))
await browser.close()
