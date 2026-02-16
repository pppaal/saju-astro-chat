#!/usr/bin/env node

const BASE_URL = process.env.SSR_TEST_BASE_URL || 'http://127.0.0.1:3000'

const ROUTES = ['/', '/pricing', '/destiny-map', '/myjourney', '/destiny-match']
const KO_FORBIDDEN_ENGLISH = [
  'Pricing',
  'Sign in required',
  'Sign in',
  'required',
  'Total Visitors',
  'Members',
  'Get started',
  'View Pricing',
  'Explore Destiny Map',
]
const MOJIBAKE_TOKENS = ['ðŸ', 'âœ¨', 'ï¸\u008f']

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

async function fetchWithLanguage(path, acceptLanguage) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'accept-language': acceptLanguage },
    redirect: 'follow',
  })
  const html = await response.text()
  return { status: response.status, html, visibleText: extractVisibleText(html) }
}

async function main() {
  let failed = false

  for (const path of ROUTES) {
    const en = await fetchWithLanguage(path, 'en')
    const ko = await fetchWithLanguage(path, 'ko-KR,ko;q=0.9')

    if (en.status !== 200) {
      failed = true
      console.error(`[FAIL] ${path} EN returned status ${en.status}`)
      continue
    }
    if (ko.status !== 200) {
      failed = true
      console.error(`[FAIL] ${path} KO returned status ${ko.status}`)
      continue
    }

    if (/[가-힣]/.test(en.visibleText)) {
      failed = true
      console.error(`[FAIL] ${path} EN contains Korean text`)
    } else {
      console.log(`[PASS] ${path} EN has no Korean text`)
    }

    const foundEnglishInKo = KO_FORBIDDEN_ENGLISH.filter((token) =>
      new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(ko.visibleText)
    )
    if (foundEnglishInKo.length > 0) {
      failed = true
      console.error(
        `[FAIL] ${path} KO contains forbidden English UI tokens: ${foundEnglishInKo.join(', ')}`
      )
    } else {
      console.log(`[PASS] ${path} KO has no forbidden English UI tokens`)
    }

    const mojibakeFound = MOJIBAKE_TOKENS.filter(
      (token) => en.html.includes(token) || ko.html.includes(token)
    )
    if (mojibakeFound.length > 0) {
      failed = true
      console.error(`[FAIL] ${path} contains mojibake token(s): ${mojibakeFound.join(', ')}`)
    } else {
      console.log(`[PASS] ${path} has no mojibake tokens`)
    }
  }

  if (failed) {
    process.exit(1)
  }

  console.log('Language purity check passed.')
}

main().catch((error) => {
  console.error(`Language purity check failed: ${error.message}`)
  process.exit(1)
})

