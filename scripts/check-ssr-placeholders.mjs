#!/usr/bin/env node

const BASE_URL = process.env.SSR_TEST_BASE_URL || 'http://127.0.0.1:3000'

const TARGETS = [
  { path: '/', required: ['Know yourself', 'Shape tomorrow'] },
  { path: '/pricing', required: ['Pricing', 'Credit'] },
  { path: '/destiny-map', required: ['Destiny Map', 'Birth Date'] },
  { path: '/blog' },
  { path: '/blog/numerology-life-path-numbers-explained', allowedStatus: [200, 404, 410] },
  { path: '/faq', requiredAny: ['3 months', '3\uAC1C\uC6D4'] },
  { path: '/policy/refund', requiredAny: ['3 months', '3\uAC1C\uC6D4'] },
  { path: '/policy/terms', requiredAny: ['3 months', '3\uAC1C\uC6D4'] },
]

const BLOCKED_PATTERNS = [
  'Hero Title',
  'Search Placeholder',
  'Credit Packs Desc',
  'One Reading Desc',
  'Subtitle',
  'Q1',
  'Q2',
  'Keywords List',
  'Destiny Map Section Title',
  'landing.heroTitle',
  'landing.searchPlaceholder',
  'landing.statsToday',
]

const POLICY_FORBIDDEN_PATTERNS = [
  'never expire',
  'Credits never expire',
  '\uB9CC\uB8CC\uB418\uC9C0 \uC54A\uB294\uB2E4',
  '\uB9CC\uB8CC\uB418\uC9C0 \uC54A',
]

const HOME_BLOCKED_REGEXES = [
  /Today\s+\.\.\./i,
  /Total Visitors\s+\.\.\./i,
  /Members\s+\.\.\./i,
  /\uC624\uB298\s+\.\.\./,
  /\uB204\uC801 \uBC29\uBB38\uC790\s+\.\.\./,
  /\uD68C\uC6D0\s+\.\.\./,
]

const SCOPE_FORBIDDEN_BY_PATH = {
  '/faq': ['and numerology into one comprehensive view'],
  '/policy/terms': ['- Dream interpretation', '- Numerology', '- I Ching'],
  '/policy/refund': ['- Dream analysis', '- Numerology reports', '- I Ching readings'],
}

function extractVisibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchHtml(url) {
  const response = await fetch(url, { redirect: 'follow' })
  const html = await response.text()
  return { status: response.status, html }
}

async function main() {
  let failed = false

  for (const target of TARGETS) {
    const url = `${BASE_URL}${target.path}`
    const { status, html } = await fetchHtml(url)
    const visibleText = extractVisibleText(html)

    const allowedStatus = Array.isArray(target.allowedStatus) ? target.allowedStatus : [200]
    if (!allowedStatus.includes(status)) {
      failed = true
      console.error(`[FAIL] ${target.path} returned unexpected status: ${status}`)
      continue
    }

    if (target.path === '/blog' || target.path === '/blog/numerology-life-path-numbers-explained') {
      if (html.includes('Numerology') || html.includes('numerology')) {
        failed = true
        console.error(`[FAIL] ${target.path} contains forbidden numerology content`)
      } else {
        console.log(`[PASS] ${target.path} contains no numerology content`)
      }
    }

    const foundBlocked = BLOCKED_PATTERNS.filter((pattern) => visibleText.includes(pattern))
    if (foundBlocked.length > 0) {
      failed = true
      console.error(`[FAIL] ${target.path} contains blocked placeholders: ${foundBlocked.join(', ')}`)
    } else {
      console.log(`[PASS] ${target.path} contains no blocked placeholders`)
    }

    const required = Array.isArray(target.required) ? target.required : []
    const missingRequired = required.filter((needle) => !html.includes(needle))
    if (required.length > 0) {
      if (missingRequired.length > 0) {
        failed = true
        console.error(`[FAIL] ${target.path} missing expected SSR text: ${missingRequired.join(', ')}`)
      } else {
        console.log(`[PASS] ${target.path} includes expected SSR text`)
      }
    }

    const requiredAny = Array.isArray(target.requiredAny) ? target.requiredAny : []
    if (requiredAny.length > 0) {
      const hasAny = requiredAny.some((needle) => visibleText.includes(needle))
      if (!hasAny) {
        failed = true
        console.error(`[FAIL] ${target.path} missing required text (any of): ${requiredAny.join(', ')}`)
      } else {
        console.log(`[PASS] ${target.path} includes required text`)
      }
    }

    if (['/faq', '/policy/refund', '/policy/terms'].includes(target.path)) {
      const foundForbidden = POLICY_FORBIDDEN_PATTERNS.filter((pattern) => visibleText.includes(pattern))
      if (foundForbidden.length > 0) {
        failed = true
        console.error(
          `[FAIL] ${target.path} contains forbidden no-expiry claim(s): ${foundForbidden.join(', ')}`
        )
      } else {
        console.log(`[PASS] ${target.path} contains no no-expiry contradiction`)
      }

      const scopeForbidden = SCOPE_FORBIDDEN_BY_PATH[target.path] || []
      const foundScopeForbidden = scopeForbidden.filter((pattern) => visibleText.includes(pattern))
      if (foundScopeForbidden.length > 0) {
        failed = true
        console.error(
          `[FAIL] ${target.path} contains removed scope strings: ${foundScopeForbidden.join(', ')}`
        )
      } else {
        console.log(`[PASS] ${target.path} contains no removed scope strings`)
      }
    }

    if (target.path === '/') {
      const matchedHomeRegexes = HOME_BLOCKED_REGEXES.filter((re) => re.test(visibleText)).map((re) =>
        re.toString()
      )
      if (matchedHomeRegexes.length > 0) {
        failed = true
        console.error(
          `[FAIL] / contains unfinished stats placeholders: ${matchedHomeRegexes.join(', ')}`
        )
      } else {
        console.log('[PASS] / contains no unfinished stats placeholders')
      }
    }
  }

  if (failed) {
    process.exit(1)
  }

  console.log('SSR placeholder check passed.')
}

main().catch((error) => {
  console.error(`SSR placeholder check failed: ${error.message}`)
  process.exit(1)
})
