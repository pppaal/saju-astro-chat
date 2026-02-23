const baseUrl = (
  process.env.SITE_BASE_URL ||
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  'http://localhost:3000'
).replace(/\/$/, '')

const routes = (
  process.env.MOJIBAKE_SMOKE_ROUTES ||
  '/,/pricing,/blog,/compatibility,/destiny-map,/calendar'
)
  .split(',')
  .map((route) => route.trim())
  .filter(Boolean)

const MOJIBAKE_REGEX =
  /(?:[\u00C2\u00C3][^\sA-Za-z0-9]|[\u00E2][^\sA-Za-z0-9]|\u00EA[\u00B0-\u00BF]|\u00EB[\u0080-\u00BF]|\u00EC[\u0080-\u00BF]|\u00ED[\u0080-\u00BF]|\u00C2\u00B7|[\u0080-\u009F]|\uFFFD)/u

function stripScriptsAndStyles(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
}

function snippetAround(text, index, span = 80) {
  const start = Math.max(0, index - span)
  const end = Math.min(text.length, index + span)
  return text.slice(start, end).replace(/\s+/g, ' ').trim()
}

async function main() {
  const failures = []

  for (const route of routes) {
    const url = `${baseUrl}${route}`
    const response = await fetch(url, {
      headers: { 'cache-control': 'no-cache' },
    })

    if (!response.ok) {
      failures.push({
        route,
        reason: `HTTP ${response.status}`,
      })
      continue
    }

    const html = await response.text()
    const textOnly = stripScriptsAndStyles(html)
    const match = MOJIBAKE_REGEX.exec(textOnly)

    if (match && typeof match.index === 'number') {
      failures.push({
        route,
        reason: `Suspicious token "${match[0]}"`,
        snippet: snippetAround(textOnly, match.index),
      })
    }
  }

  if (failures.length === 0) {
    console.log(`Mojibake smoke test passed for ${routes.length} route(s).`)
    return
  }

  console.error(`Mojibake smoke test failed on ${failures.length} route(s):`)
  for (const failure of failures) {
    console.error(`- ${failure.route}: ${failure.reason}`)
    if (failure.snippet) {
      console.error(`  snippet: ${failure.snippet}`)
    }
  }

  process.exit(1)
}

main().catch((error) => {
  console.error('Mojibake smoke test crashed:', error)
  process.exit(1)
})
