import { chromium, type Browser, type Page } from 'playwright'
import { writeFileSync } from 'fs'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3737'

const errors: string[] = []
const consoleMsgs: string[] = []

function note(msg: string): void {
  console.log(msg)
  consoleMsgs.push(msg)
}

async function smoke(): Promise<void> {
  const browser: Browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'ko-KR',
  })
  const page: Page = await ctx.newPage()
  page.on('console', (m) => {
    const txt = `[${m.type()}] ${m.text()}`
    consoleMsgs.push(txt)
    if (m.type() === 'error') errors.push(txt)
  })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('requestfailed', (r) =>
    errors.push(`reqfail: ${r.url()} ${r.failure()?.errorText}`)
  )

  note(`▶ goto ${BASE}/calendar`)
  await page.goto(`${BASE}/calendar`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {})
  await page.screenshot({ path: '/tmp/cal-1-initial.png', fullPage: true })

  // 캘린더 폼이 보이는지
  const formInputs = await page.locator('input').count()
  note(`inputs visible: ${formInputs}`)

  // 생년월일 입력 시도
  const dateInput = page.locator('input[type="date"]').first()
  if (await dateInput.count() > 0) {
    await dateInput.fill('1995-02-09')
    note('birthDate filled')
  }
  const timeInput = page.locator('input[type="time"]').first()
  if (await timeInput.count() > 0) {
    await timeInput.fill('14:30')
    note('birthTime filled')
  }

  // 제출 버튼 (한국어 또는 영어 모두 시도)
  const submitButton = page
    .locator('button')
    .filter({ hasText: /확인|시작|제출|submit|view|보기|조회/i })
    .first()
  if (await submitButton.count() > 0) {
    note(`submit click: "${await submitButton.textContent()}"`)
    await submitButton.click()
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {})
    await page.screenshot({ path: '/tmp/cal-2-submitted.png', fullPage: true })
  } else {
    note('no submit button found; capturing form state only')
  }

  // 캘린더 그리드 또는 ActionPlan 뷰가 떴는지
  const dayCells = await page.locator('[class*="day"]').count()
  note(`day cells: ${dayCells}`)

  // 날짜 하나 클릭 시도
  const firstClickableDay = page
    .locator('button')
    .filter({ hasText: /^\d{1,2}$/ })
    .first()
  if (await firstClickableDay.count() > 0) {
    note(`day click: "${await firstClickableDay.textContent()}"`)
    await firstClickableDay.click()
    await page.waitForTimeout(800)
    await page.screenshot({ path: '/tmp/cal-3-day-clicked.png', fullPage: true })
  }

  // 행동플랜 탭 클릭 시도
  const actionPlanTab = page
    .locator('button, a')
    .filter({ hasText: /행동|action plan|타임라인/i })
    .first()
  if (await actionPlanTab.count() > 0) {
    note(`action tab click: "${await actionPlanTab.textContent()}"`)
    await actionPlanTab.click()
    await page.waitForTimeout(2500)
    await page.screenshot({ path: '/tmp/cal-4-action-plan.png', fullPage: true })
  }

  // date-detail 호출이 떴는지 확인
  const detailRequests = consoleMsgs.filter((m) => m.includes('date-detail'))
  note(`date-detail traces: ${detailRequests.length}`)

  await browser.close()
}

void (async () => {
  try {
    await smoke()
  } catch (err) {
    errors.push(`fatal: ${err instanceof Error ? err.message : String(err)}`)
  }
  const summary = {
    errors,
    msgs: consoleMsgs.slice(-50),
  }
  writeFileSync('/tmp/cal-smoke.json', JSON.stringify(summary, null, 2))
  console.log('\n=== SUMMARY ===')
  console.log('errors:', errors.length)
  for (const e of errors.slice(0, 20)) console.log('  -', e)
  console.log('msgs (last):', consoleMsgs.slice(-12).join('\n  '))
})()
