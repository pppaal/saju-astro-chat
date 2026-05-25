import { describe, it, expect } from 'vitest'
import { allRules, runFortuneWithRaw } from '@/lib/fusion'

const DOMAINS = new Set([
  'self',
  'love',
  'money',
  'career',
  'health',
  'family',
  'children',
  'wisdom',
  'creativity',
  'spirituality',
])
const LAYERS = new Set(['state', 'relation', 'timing'])
const SURFACED = [
  'money',
  'career',
  'love',
  'family',
  'health',
  'children',
  'wisdom',
  'creativity',
  'spirituality',
] as const
// Floors sit just below current counts: the test fails only if a domain is
// silently thinned, not on normal additions.
const STATE_FLOOR: Record<(typeof SURFACED)[number], number> = {
  money: 12,
  career: 25,
  love: 12,
  family: 14,
  health: 12,
  children: 2,
  wisdom: 2,
  creativity: 2,
  spirituality: 2,
}

describe('rule set integrity', () => {
  it('every rule id is unique', () => {
    const ids = allRules.map((r) => r.id)
    const dup = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))]
    expect(dup).toEqual([])
  })

  it('every rule has a valid shape (domain/layer/confirm/predicates/scale)', () => {
    const bad: string[] = []
    for (const r of allRules) {
      if (!DOMAINS.has(r.domain)) bad.push(`${r.id}: bad domain ${r.domain}`)
      if (!LAYERS.has(r.layer)) bad.push(`${r.id}: bad layer ${r.layer}`)
      if (!r.narrative?.confirm?.trim()) bad.push(`${r.id}: empty confirm`)
      if (typeof r.sajuPredicate !== 'function' || typeof r.astroPredicate !== 'function')
        bad.push(`${r.id}: predicate not a function`)
      if (r.layer === 'timing' && !r.scale) bad.push(`${r.id}: timing rule without scale`)
    }
    expect(bad).toEqual([])
  })

  it('keeps a floor of state rules per surfaced domain (no silent thinning)', () => {
    const counts: Record<string, number> = {}
    for (const r of allRules)
      if (r.layer === 'state') counts[r.domain] = (counts[r.domain] ?? 0) + 1
    const under = SURFACED.filter((d) => (counts[d] ?? 0) < STATE_FLOOR[d]).map(
      (d) => `${d}: ${counts[d] ?? 0} < ${STATE_FLOOR[d]}`
    )
    expect(under).toEqual([])
  })
})

describe('no dead rules', () => {
  // Every rule must fire (confirm/conflict/silent) for at least one realistic
  // chart. A dead rule = a 빈틈: a broken predicate or an obsolete rule.
  it('fires all rules across a diverse chart sweep', async () => {
    const CITIES = [
      { lat: 37.5665, lon: 126.978, tz: 'Asia/Seoul' },
      { lat: 40.7128, lon: -74.006, tz: 'America/New_York' },
      { lat: 51.5074, lon: -0.1278, tz: 'Europe/London' },
      { lat: -33.8688, lon: 151.2093, tz: 'Australia/Sydney' },
    ]
    const pad = (n: number) => String(n).padStart(2, '0')
    const years = Array.from({ length: 12 }, (_, i) => 1960 + i * 4)
    const months = [2, 5, 8, 11]
    const hours = [5, 13, 21]
    const genders = ['male', 'female'] as const
    const fired = new Set<string>()
    let ci = 0
    for (const y of years)
      for (const mo of months)
        for (const h of hours)
          for (const g of genders) {
            const c = CITIES[ci++ % CITIES.length]
            try {
              const { report } = await runFortuneWithRaw({
                birth: {
                  birthDate: `${y}-${pad(mo)}-14`,
                  birthTime: `${pad(h)}:00`,
                  gender: g,
                  timezone: c.tz,
                  latitude: c.lat,
                  longitude: c.lon,
                  astroTimezone: c.tz,
                },
                queryDate: new Date('2026-05-25'),
                skipReturns: true,
              })
              for (const agg of Object.values(report.byDomain))
                for (const m of [...agg.confirms, ...agg.conflicts, ...agg.silents])
                  fired.add(m.rule.id)
            } catch {
              /* a single chart failing must not mask coverage */
            }
          }
    const dead = allRules.filter((r) => !fired.has(r.id)).map((r) => r.id)
    expect(dead).toEqual([])
  }, 120_000)
})
