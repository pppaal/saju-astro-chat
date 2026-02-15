#!/usr/bin/env node

const BASE_URL = process.env.SSR_TEST_BASE_URL || 'http://127.0.0.1:3000'

const TARGETS = [
  { path: '/', required: ['Know yourself', 'Shape tomorrow'] },
  { path: '/pricing', required: ['Pricing', 'Credit'] },
  { path: '/destiny-map', required: ['Destiny Map', 'Birth Date'] },
  { path: '/faq', requiredAny: ['3 months', '3\uAC1C\uC6D4'] },
  { path: '/policy/refund', requiredAny: ['3 months', '3\uAC1C\uC6D4'] },
  { path: '/policy/terms', requiredAny: ['3 months', '3\uAC1C\uC6D4'] },
  { path: '/myjourney', requiredAny: ['Sign in required', '\uB85C\uADF8\uC778\uC774 \uD544\uC694'] },
  { path: '/destiny-match', requiredAny: ['Sign in required', '\uB85C\uADF8\uC778\uC774 \uD544\uC694'] },
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
]

const POLICY_FORBIDDEN_PATTERNS = [
  'never expire',
  'Credits never expire',
  '\uB9CC\uB8CC\uB418\uC9C0 \uC54A\uB294\uB2E4',
  '\uB9CC\uB8CC\uB418\uC9C0 \uC54A',
]

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
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`)
  }
  return response.text()
}

async function main() {
  let failed = false

  for (const target of TARGETS) {
    const url = `${BASE_URL}${target.path}`
    const html = await fetchHtml(url)
    const visibleText = extractVisibleText(html)

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