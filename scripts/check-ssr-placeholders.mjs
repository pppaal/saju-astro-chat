#!/usr/bin/env node

const BASE_URL = process.env.SSR_TEST_BASE_URL || 'http://127.0.0.1:3000'

const TARGETS = [
  { path: '/', required: ['Know yourself', 'Shape tomorrow'] },
  { path: '/pricing', required: ['Pricing', 'Credit'] },
  { path: '/destiny-map', required: ['Destiny Map', 'Birth Date'] },
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

    const missingRequired = target.required.filter((needle) => !html.includes(needle))
    if (missingRequired.length > 0) {
      failed = true
      console.error(`[FAIL] ${target.path} missing expected SSR text: ${missingRequired.join(', ')}`)
    } else {
      console.log(`[PASS] ${target.path} includes expected SSR text`)
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
