#!/usr/bin/env node

const BASE_URL = process.env.SSR_TEST_BASE_URL || 'http://127.0.0.1:3000'

const KO_FORBIDDEN_EN_TOKENS = ['Pricing', 'Get started', "Today's", 'Total Visitors', 'Members']
const HOME_FORBIDDEN_STRINGS = ['#### 주요 키워드']
const MOJIBAKE_TOKENS = ['ðŸ', 'âœ¨', 'ï¸']

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

async function fetchPage(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, options)
  return {
    status: response.status,
    html: await response.text(),
    location: response.headers.get('location') || '',
  }
}

function checkConsecutiveQuestionMarks(path, html) {
  if (/\?{4,}/.test(html)) {
    throw new Error(`${path} contains repeated question-mark placeholders`)
  }
}

function checkHomeSeoDump(html) {
  const found = HOME_FORBIDDEN_STRINGS.filter((needle) => html.includes(needle))
  if (found.length > 0) {
    throw new Error(`/ contains forbidden SEO keyword dump: ${found.join(', ')}`)
  }
}

function checkKoPurity(visibleText) {
  const found = KO_FORBIDDEN_EN_TOKENS.filter((token) =>
    new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(visibleText)
  )
  if (found.length > 0) {
    throw new Error(`/ KO HTML contains forbidden EN tokens: ${found.join(', ')}`)
  }
}

function checkEnPurity(visibleText) {
  if (/[가-힣]/.test(visibleText)) {
    throw new Error('/ EN HTML contains Korean characters')
  }
}

function checkDestinyMapMojibake(html) {
  const found = MOJIBAKE_TOKENS.filter((token) => html.includes(token))
  if (found.length > 0) {
    throw new Error(`/destiny-map contains mojibake token(s): ${found.join(', ')}`)
  }
}

async function main() {
  let failed = false

  try {
    const enHome = await fetchPage('/', {
      headers: { 'accept-language': 'en' },
      redirect: 'follow',
    })
    if (enHome.status !== 200) {
      throw new Error(`/ EN returned status ${enHome.status}`)
    }
    const enVisible = extractVisibleText(enHome.html)
    checkEnPurity(enVisible)
    checkConsecutiveQuestionMarks('/', enHome.html)
    checkHomeSeoDump(enHome.html)
    console.log('[PASS] / EN language purity + placeholder checks')
  } catch (error) {
    failed = true
    console.error(`[FAIL] ${error.message}`)
  }

  try {
    const koHome = await fetchPage('/', {
      headers: { 'accept-language': 'ko-KR,ko;q=0.9' },
      redirect: 'follow',
    })
    if (koHome.status !== 200) {
      throw new Error(`/ KO returned status ${koHome.status}`)
    }
    const koVisible = extractVisibleText(koHome.html)
    checkKoPurity(koVisible)
    checkConsecutiveQuestionMarks('/', koHome.html)
    console.log('[PASS] / KO language purity + placeholder checks')
  } catch (error) {
    failed = true
    console.error(`[FAIL] ${error.message}`)
  }

  try {
    const destinyMap = await fetchPage('/destiny-map', { redirect: 'follow' })
    if (destinyMap.status !== 200) {
      throw new Error(`/destiny-map returned status ${destinyMap.status}`)
    }
    checkConsecutiveQuestionMarks('/destiny-map', destinyMap.html)
    checkDestinyMapMojibake(destinyMap.html)
    console.log('[PASS] /destiny-map mojibake + placeholder checks')
  } catch (error) {
    failed = true
    console.error(`[FAIL] ${error.message}`)
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
