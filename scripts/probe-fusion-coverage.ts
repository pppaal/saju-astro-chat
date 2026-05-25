// Fusion-engine coverage & calibration probe.
//
// Runs runFortune across a diverse grid of charts and reports:
//   1. Dead rules — rules that never fire across the whole sweep (a sign of a
//      broken predicate or an obsolete rule).
//   2. Per-domain tone distribution — tone should be informative, not stuck on
//      one bucket. Use this to re-tune TONE_THRESHOLDS in aggregator.ts.
//   3. Theme (metaRule) fire rates — positive themes should be reachable.
//
//   DATABASE_URL='postgresql://placeholder:placeholder@localhost:5432/placeholder' \
//     npx tsx scripts/probe-fusion-coverage.ts

import { runFortune, allRules } from '../src/lib/fusion'
import type { Domain } from '../src/lib/fusion/types'

const CITIES = [
  { lat: 37.5665, lon: 126.978, tz: 'Asia/Seoul' },
  { lat: 40.7128, lon: -74.006, tz: 'America/New_York' },
  { lat: 51.5074, lon: -0.1278, tz: 'Europe/London' },
  { lat: -33.8688, lon: 151.2093, tz: 'Australia/Sydney' },
]
const pad = (n: number) => String(n).padStart(2, '0')

async function main() {
  const years: number[] = []
  for (let y = 1955; y <= 2005; y += 5) years.push(y)
  const months = [1, 4, 7, 10]
  const hours = [3, 9, 15, 21]
  const genders: Array<'male' | 'female'> = ['male', 'female']

  const fire = new Map<string, number>(allRules.map((r) => [r.id, 0]))
  const tone: Record<string, Record<string, number>> = {}
  const themeCount = new Map<string, number>()
  let cityIdx = 0
  let charts = 0
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1)

  for (const y of years)
    for (const mo of months)
      for (const h of hours)
        for (const g of genders) {
          const city = CITIES[cityIdx++ % CITIES.length]
          let report
          try {
            report = await runFortune({
              birth: {
                birthDate: `${y}-${pad(mo)}-14`,
                birthTime: `${pad(h)}:00`,
                gender: g,
                timezone: city.tz,
                latitude: city.lat,
                longitude: city.lon,
                astroTimezone: city.tz,
              },
              queryDate: new Date('2026-05-25'),
              skipReturns: true,
            })
          } catch (e) {
            console.error('chart failed', y, mo, h, g, (e as Error).message)
            continue
          }
          charts++
          for (const t of report.themes) bump(themeCount, t.rule.id)
          for (const [domain, agg] of Object.entries(report.byDomain) as Array<
            [Domain, (typeof report.byDomain)[Domain]]
          >) {
            tone[domain] = tone[domain] ?? {}
            tone[domain][agg.tone] = (tone[domain][agg.tone] ?? 0) + 1
            for (const m of [...agg.confirms, ...agg.conflicts, ...agg.silents])
              bump(fire, m.rule.id)
          }
        }

  const dead = allRules.filter((r) => (fire.get(r.id) ?? 0) === 0)

  console.log(`\n=== ${charts} charts, ${allRules.length} rules ===`)
  console.log('\ntone dist per domain:')
  for (const [d, t] of Object.entries(tone)) console.log(`  ${d}:`, t)
  console.log('\ntheme fire rate:')
  for (const [id, c] of [...themeCount.entries()].sort((a, b) => b[1] - a[1]))
    console.log(`  ${((c / charts) * 100).toFixed(1)}%  ${id}`)
  console.log(`\nDEAD RULES (never fire): ${dead.length}`)
  for (const r of dead) console.log(`  [${r.layer}/${r.domain}] ${r.id}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
