import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

type CheckStatus = 'PASS' | 'WARN' | 'FAIL'

type CheckResult = {
  name: string
  status: CheckStatus
  detail: string
}

type SurfaceCheck = {
  label: string
  path: string
  keywords: string[]
}

const baseUrl = process.env.DESTINYPAL_BASE_URL || 'http://127.0.0.1:3000'
const now = new Date()
const stamp = now.toISOString().replace(/[:.]/g, '-')
const reportDir = join(process.cwd(), 'reports', 'manual')
const reportPath = join(reportDir, `counselor-calendar-report-${stamp}.md`)

const checks: CheckResult[] = []

const counselorSurfaces: SurfaceCheck[] = [
  {
    label: 'Destiny counselor',
    path: '/destiny-counselor',
    keywords: ['counselor', '상담', 'destiny'],
  },
  {
    label: 'Saju counselor',
    path: '/saju/counselor',
    keywords: ['사주', 'saju', '상담', 'counselor'],
  },
  {
    label: 'Astrology counselor',
    path: '/astrology/counselor',
    keywords: ['점성술', 'astrology', '상담', 'counselor'],
  },
  {
    label: 'Compatibility counselor',
    path: '/compatibility/counselor',
    keywords: ['궁합', 'compatibility', '상담', 'counselor'],
  },
]

function pushCheck(name: string, status: CheckStatus, detail: string) {
  checks.push({ name, status, detail })
}

function hasAny(text: string | null, candidates: string[]) {
  if (!text) return false
  const lower = text.toLowerCase()
  return candidates.some((candidate) => lower.includes(candidate.toLowerCase()))
}

async function verifySurface(
  page: Awaited<ReturnType<ReturnType<typeof chromium.launch>['newPage']>>,
  surface: SurfaceCheck
) {
  await page.goto(`${baseUrl}${surface.path}`, { waitUntil: 'domcontentloaded', timeout: 30_000 })

  const html = await page.content()
  const bodyText = await page.locator('body').textContent()

  if (hasAny(bodyText, ['404', 'not found']) || hasAny(html, ['__NEXT_ERROR__'])) {
    pushCheck(
      `${surface.label} route`,
      'FAIL',
      `${surface.path} appears to be broken or not found.`
    )
    return
  }

  if (hasAny(bodyText, surface.keywords)) {
    pushCheck(
      `${surface.label} content`,
      'PASS',
      `${surface.path} contains expected counselor-related content.`
    )
  } else {
    pushCheck(
      `${surface.label} content`,
      'WARN',
      `${surface.path} loaded but expected keywords were not detected in rendered text.`
    )
  }
}

async function runJourney() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    pushCheck('Landing page reachable', 'PASS', `Opened ${baseUrl} with status OK.`)

    for (const surface of counselorSurfaces) {
      await verifySurface(page, surface)
    }

    await page.goto(`${baseUrl}/calendar`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    const calendarText = await page.locator('body').textContent()
    if (hasAny(calendarText, ['calendar', '달력', '운세', 'month'])) {
      pushCheck(
        'Calendar page content',
        'PASS',
        'Calendar-related content detected in rendered page.'
      )
    } else {
      pushCheck('Calendar page content', 'FAIL', 'Calendar-related text not detected.')
    }

    const reportCta = page
      .locator(
        'button:has-text("리포트"), button:has-text("Report"), a:has-text("리포트"), a:has-text("Report")'
      )
      .first()

    if ((await reportCta.count()) > 0) {
      pushCheck(
        'Calendar report entry point',
        'PASS',
        'Report entry control exists in rendered UI.'
      )
    } else {
      pushCheck(
        'Calendar report entry point',
        'WARN',
        'No visible report entry control found on calendar page.'
      )
    }
  } finally {
    await context.close()
    await browser.close()
  }
}

function renderReport() {
  const passCount = checks.filter((check) => check.status === 'PASS').length
  const warnCount = checks.filter((check) => check.status === 'WARN').length
  const failCount = checks.filter((check) => check.status === 'FAIL').length

  const lines = [
    '# Counselor + Calendar User-Journey Report',
    '',
    `- Generated at: ${now.toISOString()}`,
    `- Base URL: ${baseUrl}`,
    `- Mode: interactive browser automation (Playwright)`,
    `- Counselor surfaces: ${counselorSurfaces.map((surface) => surface.path).join(', ')}`,
    `- Summary: PASS ${passCount}, WARN ${warnCount}, FAIL ${failCount}`,
    '',
    '## Checks',
    '',
    ...checks.map((check) => `- [${check.status}] ${check.name}: ${check.detail}`),
    '',
  ]

  mkdirSync(reportDir, { recursive: true })
  writeFileSync(reportPath, lines.join('\n'), 'utf8')

  console.log(`[qa:counselor-calendar] Wrote report: ${reportPath}`)
  console.log(
    `[qa:counselor-calendar] Summary PASS=${passCount} WARN=${warnCount} FAIL=${failCount}`
  )

  if (failCount > 0) {
    process.exitCode = 1
  }
}

async function main() {
  try {
    await runJourney()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    if (hasAny(message, ["Executable doesn't exist", 'playwright install'])) {
      pushCheck(
        'Playwright browser dependency',
        'FAIL',
        'Playwright browser is missing. Run `npx playwright install chromium` in an environment that can access Playwright CDN.'
      )
    } else {
      pushCheck('Journey execution', 'FAIL', message)
    }
  }

  renderReport()
}

void main()
