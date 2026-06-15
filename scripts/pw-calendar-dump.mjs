import { chromium } from 'playwright'

const BASE = 'http://127.0.0.1:3111'

async function dumpLocale(browser, locale) {
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 915 },
    locale: locale === 'ko' ? 'ko-KR' : 'en-US',
    extraHTTPHeaders: {
      'Accept-Language': locale === 'ko' ? 'ko-KR,ko;q=0.9,en;q=0.8' : 'en-US,en;q=0.9',
    },
  })
  await ctx.addCookies([
    { name: 'locale', value: locale, url: BASE },
  ])
  const page = await ctx.newPage()
  await page.goto(`${BASE}/calendar/preview`, { waitUntil: 'networkidle', timeout: 120000 })
  await page.waitForTimeout(1500)

  // 모든 <details> 펼치기 (자세히 보기 = 전문 섹션).
  await page.evaluate(() => {
    document.querySelectorAll('details').forEach((d) => (d.open = true))
  })
  await page.waitForTimeout(300)

  const layers = await page.$$eval('[class*="tierScroll"]', (els) =>
    els.map((el) => el.innerText)
  )

  // 일(day) 타이어로 다이브 — '2' 키.
  await page.keyboard.press('2')
  await page.waitForTimeout(1200)
  await page.evaluate(() => {
    document.querySelectorAll('details').forEach((d) => (d.open = true))
  })
  await page.waitForTimeout(400)
  const layersAfter = await page.$$eval('[class*="tierScroll"]', (els) =>
    els.map((el) => el.innerText)
  )

  await ctx.close()
  return { layers, layersAfter }
}

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
})
const out = {}
for (const loc of ['ko', 'en']) {
  out[loc] = await dumpLocale(browser, loc)
}
await browser.close()
process.stdout.write(JSON.stringify(out, null, 2))
