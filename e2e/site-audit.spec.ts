import { expect, test } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

type PageRecord = {
  route: string
  visitedUrl: string
  finalUrl: string
  redirected: boolean
  status: number | null
  loadTimeMs: number
  title: string
  screenshot: string
  htmlFile: string
  jsonFile: string
  consoleErrors: string[]
  failedRequests: Array<{ url: string; method: string; failure: string | null }>
  checks: {
    placeholderLeak: string[]
    mojibake: string[]
    mixedLanguage: boolean
  }
  discoveredLinks: string[]
}

type BrokenLink = {
  from: string
  link: string
  status: number | null
  error?: string
}

const ROOT = process.cwd()
const DUMPS_DIR = path.join(ROOT, 'qa-dumps')
const SCREENS_DIR = path.join(DUMPS_DIR, 'screens')
const HTML_DIR = path.join(DUMPS_DIR, 'html')
const PAGES_DIR = path.join(DUMPS_DIR, 'pages')
const ROUTES_JSON = path.join(DUMPS_DIR, 'routes.json')
const SUMMARY_MD = path.join(DUMPS_DIR, 'AUDIT_SUMMARY.md')

const PLACEHOLDER_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: 'heroTitle', re: /\bheroTitle\b/i },
  { name: 'getStarted', re: /\bgetStarted\b/i },
  { name: 'destinyMap', re: /\bdestinyMap\b/i },
  { name: 'placeholder_title', re: /\bHero Title\b/i },
  { name: 'placeholder_subtitle', re: /\bSubtitle\b/ },
  { name: 'placeholder_visual_title', re: /\bVisual Title\b/ },
  { name: 'placeholder_visual_desc', re: /\bVisual Desc\b/ },
  { name: 'placeholder_grid_title', re: /\bGrid Title\b/ },
  { name: 'placeholder_grid_sub', re: /\bGrid Sub\b/ },
  { name: 'q1_plus', re: /\bq1\+\b/i },
  { name: 'misc_dot', re: /\bmisc\./i },
  { name: 't_call', re: /t\(".*?"\)/i },
]

const MOJIBAKE_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: 'utf8_emoji_artifact_1', re: /\u00f0\u0178/g },
  { name: 'utf8_emdash_artifact', re: /\u00e2\u20ac\u201d/g },
  { name: 'utf8_symbol_artifact', re: /\u00e2\u0153/g },
  { name: 'utf8_variation_artifact', re: /\u00ef\u00b8/g },
]

const START_ROUTES = [
  '/',
  '/pricing',
  '/about',
  '/faq',
  '/calendar',
  '/destiny-map',
  '/tarot',
  '/compatibility',
  '/report',
]

const MAX_PAGES_TO_VISIT = 180
const MAX_LINKS_PER_PAGE = 200
const MAX_BROKEN_LINK_CHECKS = 600
const EXCLUDED_PREFIXES = ['/api', '/admin', '/auth', '/_next']

function slugFromRoute(route: string): string {
  const normalized = route
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/^\/+/, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+/g, '-')
  return normalized.length === 0
    ? 'root'
    : normalized.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
}

function normalizeRoute(baseUrl: string, href: string): string | null {
  try {
    const abs = new URL(href, baseUrl)
    const base = new URL(baseUrl)
    if (abs.origin !== base.origin) return null
    const pathname = abs.pathname.replace(/\/+$/, '') || '/'
    return `${pathname}${abs.search || ''}`
  } catch {
    return null
  }
}

function shouldCrawlRoute(route: string): boolean {
  const withoutQuery = route.split('?')[0] || '/'
  if (
    EXCLUDED_PREFIXES.some(
      (prefix) => withoutQuery === prefix || withoutQuery.startsWith(`${prefix}/`)
    )
  ) {
    return false
  }
  if (/\[[^/]+]/.test(withoutQuery)) {
    return false
  }
  return true
}

function hasMixedLanguage(text: string): boolean {
  const hasHangul = /[\uac00-\ud7a3]/.test(text)
  const englishTokenCount = (text.match(/[A-Za-z]{4,}/g) || []).length
  return hasHangul && englishTokenCount >= 30
}

function findPatternMatches(text: string, patterns: Array<{ name: string; re: RegExp }>): string[] {
  const hits: string[] = []
  for (const pattern of patterns) {
    if (pattern.re.test(text)) hits.push(pattern.name)
  }
  return hits
}

function toRel(p: string): string {
  return path.relative(ROOT, p).split(path.sep).join('/')
}

async function readInventoryRoutes(): Promise<string[]> {
  try {
    const raw = await fs.readFile(ROUTES_JSON, 'utf8')
    const parsed = JSON.parse(raw) as { pages?: Array<{ route: string }> }
    return (parsed.pages || []).map((p) => p.route).filter((route) => shouldCrawlRoute(route))
  } catch {
    return []
  }
}

async function ensureDumpDirs() {
  await fs.mkdir(SCREENS_DIR, { recursive: true })
  await fs.mkdir(HTML_DIR, { recursive: true })
  await fs.mkdir(PAGES_DIR, { recursive: true })
}

test.describe('site audit crawl', () => {
  test.setTimeout(45 * 60 * 1000)

  test('crawl site and emit QA artifacts', async ({ page, baseURL, context }) => {
    const rootBase =
      process.env.BASE_URL || process.env.PLAYWRIGHT_BASE_URL || baseURL || 'http://localhost:3000'
    const base = rootBase.replace(/\/+$/, '')
    await ensureDumpDirs()

    const inventoryRoutes = await readInventoryRoutes()
    const queue = new Set<string>(
      [...START_ROUTES, ...inventoryRoutes].filter((r) => shouldCrawlRoute(r))
    )
    const visited = new Set<string>()
    const records: PageRecord[] = []
    const brokenLinks: BrokenLink[] = []
    const infraWarnings: string[] = []
    const allInternalLinks = new Map<string, Set<string>>()

    while (queue.size > 0) {
      if (visited.size >= MAX_PAGES_TO_VISIT) break

      const nextRoute = [...queue][0]!
      queue.delete(nextRoute)
      if (visited.has(nextRoute) || !shouldCrawlRoute(nextRoute)) continue
      visited.add(nextRoute)

      const url = `${base}${nextRoute}`
      const consoleErrors: string[] = []
      const failedRequests: Array<{ url: string; method: string; failure: string | null }> = []

      const onConsole = (msg: { type: () => string; text: () => string }) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text())
      }
      const onRequestFailed = (req: {
        url: () => string
        method: () => string
        failure: () => { errorText?: string } | null
      }) => {
        failedRequests.push({
          url: req.url(),
          method: req.method(),
          failure: req.failure()?.errorText || null,
        })
      }

      page.on('console', onConsole)
      page.on('requestfailed', onRequestFailed)

      const startedAt = Date.now()
      let status: number | null = null
      let finalUrl = url
      try {
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
        await page.waitForLoadState('networkidle', { timeout: 3500 }).catch(() => {})
        status = response?.status() ?? null
        finalUrl = page.url()
      } catch {
        finalUrl = page.url()
      }
      const loadTimeMs = Date.now() - startedAt

      const title = await page.title().catch(() => '')
      const html = await page.content().catch(() => '')
      const mainText = await page
        .locator('main')
        .first()
        .innerText()
        .catch(async () =>
          page
            .locator('body')
            .innerText()
            .catch(() => '')
        )
      const visibleText = `${title}\n${mainText}`

      const placeholderLeak = findPatternMatches(visibleText, PLACEHOLDER_PATTERNS)
      const mojibake = findPatternMatches(visibleText, MOJIBAKE_PATTERNS)
      const mixedLanguage = hasMixedLanguage(mainText)
      const links = await page
        .locator('a[href]')
        .evaluateAll((nodes) =>
          nodes
            .map((n) => (n as HTMLAnchorElement).getAttribute('href'))
            .filter((href): href is string => Boolean(href))
        )
        .catch(() => [] as string[])

      const discoveredLinks = Array.from(
        new Set(
          links
            .map((href) => normalizeRoute(base, href))
            .filter((href): href is string => Boolean(href))
            .map((href) => href.split('#')[0] || '/')
            .filter((href) => href.length > 0)
        )
      ).slice(0, MAX_LINKS_PER_PAGE)

      for (const discovered of discoveredLinks) {
        if (!visited.has(discovered) && shouldCrawlRoute(discovered)) queue.add(discovered)
      }
      allInternalLinks.set(nextRoute, new Set(discoveredLinks))

      const slug = slugFromRoute(nextRoute)
      const screenshotPath = path.join(SCREENS_DIR, `${slug}.png`)
      const htmlPath = path.join(HTML_DIR, `${slug}.html`)
      const jsonPath = path.join(PAGES_DIR, `${slug}.json`)

      await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {})
      await fs.writeFile(htmlPath, html, 'utf8')

      const record: PageRecord = {
        route: nextRoute,
        visitedUrl: url,
        finalUrl,
        redirected: finalUrl !== url,
        status,
        loadTimeMs,
        title,
        screenshot: toRel(screenshotPath),
        htmlFile: toRel(htmlPath),
        jsonFile: toRel(jsonPath),
        consoleErrors,
        failedRequests,
        checks: {
          placeholderLeak,
          mojibake,
          mixedLanguage,
        },
        discoveredLinks: discoveredLinks.slice(0, 300),
      }
      records.push(record)
      await fs.writeFile(jsonPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8')

      page.off('console', onConsole)
      page.off('requestfailed', onRequestFailed)
    }

    const uniqueLinks = new Set<string>()
    const firstSeenFrom = new Map<string, string>()
    for (const [from, linkSet] of allInternalLinks.entries()) {
      for (const link of linkSet) {
        if (!uniqueLinks.has(link)) {
          uniqueLinks.add(link)
          firstSeenFrom.set(link, from)
        }
      }
    }

    let checked = 0
    for (const link of uniqueLinks) {
      if (checked >= MAX_BROKEN_LINK_CHECKS) break
      checked += 1
      if (link.startsWith('/api/')) continue
      const from = firstSeenFrom.get(link) || '/'
      const target = `${base}${link}`
      try {
        const res = await context.request.get(target, { timeout: 25000, failOnStatusCode: false })
        const status = res.status()
        if (status >= 400) brokenLinks.push({ from, link, status })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (/ECONNREFUSED|CONNECTION_REFUSED|ERR_CONNECTION_REFUSED/i.test(errorMessage)) {
          infraWarnings.push(`Link check aborted after connection refusal at ${target}`)
          break
        }
        brokenLinks.push({
          from,
          link,
          status: null,
          error: errorMessage,
        })
      }
    }

    const p0: string[] = []
    const p1: string[] = []
    const p2: string[] = []

    for (const r of records) {
      if (
        (r.status && r.status >= 400) ||
        r.checks.placeholderLeak.length > 0 ||
        r.checks.mojibake.length > 0
      ) {
        p0.push(
          `- [P0] \`${r.route}\` status=${r.status ?? 'n/a'} placeholder=${r.checks.placeholderLeak.join('|') || 'none'} mojibake=${r.checks.mojibake.join('|') || 'none'} evidence: \`${r.screenshot}\`, \`${r.htmlFile}\`, \`${r.jsonFile}\``
        )
      } else if (r.checks.mixedLanguage) {
        p2.push(
          `- [P2] \`${r.route}\` mixed-language heuristic flagged evidence: \`${r.htmlFile}\`, \`${r.jsonFile}\``
        )
      }
    }

    for (const b of brokenLinks) {
      p0.push(
        `- [P0] broken internal link from \`${b.from}\` -> \`${b.link}\` status=${b.status ?? 'n/a'} ${b.error ? `error=${b.error}` : ''}`
      )
    }

    const consoleErrorTop = records
      .flatMap((r) => r.consoleErrors.map((e) => ({ route: r.route, message: e })))
      .slice(0, 20)
    const requestFailTop = records
      .flatMap((r) =>
        r.failedRequests.map((f) => ({
          route: r.route,
          message: `${f.method} ${f.url} (${f.failure || 'requestfailed'})`,
        }))
      )
      .slice(0, 20)

    const summary = [
      '# Audit Summary',
      '',
      `Generated: ${new Date().toISOString()}`,
      `Base URL: ${base}`,
      '',
      '## Totals',
      '',
      `- Total pages visited: ${records.length}`,
      `- Unique internal links discovered: ${uniqueLinks.size}`,
      `- Internal links checked: ${Math.min(uniqueLinks.size, MAX_BROKEN_LINK_CHECKS)}`,
      `- Broken links found: ${brokenLinks.length}`,
      '',
      '## Findings',
      '',
      `- P0 count: ${p0.length}`,
      `- P1 count: ${p1.length}`,
      `- P2 count: ${p2.length}`,
      '',
      '### P0',
      '',
      ...(p0.length > 0 ? p0 : ['- none']),
      '',
      '### P1',
      '',
      ...(p1.length > 0 ? p1 : ['- none']),
      '',
      '### P2',
      '',
      ...(p2.length > 0 ? p2 : ['- none']),
      '',
      '## Infrastructure Warnings',
      '',
      ...(infraWarnings.length > 0 ? infraWarnings.map((w) => `- ${w}`) : ['- none']),
      '',
      '## Top Console Errors (20)',
      '',
      ...(consoleErrorTop.length > 0
        ? consoleErrorTop.map((e) => `- \`${e.route}\` ${e.message}`)
        : ['- none']),
      '',
      '## Top Network Failures (20)',
      '',
      ...(requestFailTop.length > 0
        ? requestFailTop.map((e) => `- \`${e.route}\` ${e.message}`)
        : ['- none']),
      '',
      '## Artifacts',
      '',
      `- Screenshots: \`${toRel(SCREENS_DIR)}\``,
      `- HTML dumps: \`${toRel(HTML_DIR)}\``,
      `- Per-page JSON: \`${toRel(PAGES_DIR)}\``,
    ].join('\n')

    await fs.writeFile(SUMMARY_MD, `${summary}\n`, 'utf8')
    expect(records.length).toBeGreaterThan(0)
  })
})
