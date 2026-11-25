/**
 * Solar arc on the real ephemeris (engine audit E5, ASTRO-2 and ASTRO-9).
 *
 * The arc is λ☉(natal JD + age in years as days) − λ☉(natal), the secondary-
 * progressed Sun's motion, not age × 1°. For a July birth the 1°/yr shortcut
 * runs about 2.5° ahead by age 60, so with the 0.5° orb the old extractor
 * fired a completely different hit set. Reference values come from
 * tests/golden/engine-golden.json (astronomy-engine, never engine output).
 *
 * The global test setup mocks swisseph, so this file unmocks it and runs under
 * the node environment; it is skipped where the native module cannot load (E16).
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest'
import golden from '../../golden/engine-golden.json'

vi.unmock('swisseph')
vi.unmock('@/lib/astrology/foundation/ephe')

const swissephAvailable = await import('swisseph').then(
  () => true,
  () => false
)

const { calculateNatalChart, toChart } = await import('@/lib/astrology/foundation/astrologyService')
const { solarArcDegrees } = await import('@/lib/astrology/foundation/progressions')
const { default: astroSolarArcExtractor } =
  await import('@/lib/calendar-engine/extractors/astro-solar-arc')
const { createCache } = await import('@/lib/calendar-engine/cache')

type ExtractorArg = Parameters<typeof astroSolarArcExtractor.extract>[0]

const SA = golden.timing.solarArc
const INPUT = {
  year: 1960,
  month: 7,
  date: 4,
  hour: 12,
  minute: 0,
  latitude: SA.input.lat,
  longitude: SA.input.lon,
  timeZone: SA.input.tz,
}

describe.skipIf(!swissephAvailable)('astro-solar-arc — real ephemeris', () => {
  it('solarArcDegrees matches the progressed-Sun arc at ages 20/40/60', async () => {
    const raw = await calculateNatalChart(INPUT)
    for (const { age, arc } of SA.arcs) {
      expect(Math.abs(solarArcDegrees(raw.meta!.jdUT, age) - arc), `age ${age}`).toBeLessThan(
        SA.toleranceDeg
      )
    }
    // 1960-07-04 → 2020-07-04 is exactly 60 years: ≈57.51°, not 60°
    expect(solarArcDegrees(raw.meta!.jdUT, 60)).toBeCloseTo(57.51, 2)
  })

  it('the extractor emits the true-arc hit set around age 60, with no self-aspects', async () => {
    const chart = toChart(await calculateNatalChart(INPUT))
    const signals = (await astroSolarArcExtractor.extract({
      natal: {
        input: INPUT,
        astro: {
          chart,
          location: {
            latitude: INPUT.latitude,
            longitude: INPUT.longitude,
            timeZone: INPUT.timeZone,
          },
        },
      },
      range: {
        start: '2020-07-01T00:00:00.000Z',
        end: '2020-07-31T23:59:59.000Z',
        granularity: 'day',
      },
      cache: createCache(),
    } as unknown as ExtractorArg)) as Array<{
      evidence: { planets?: string[]; aspectType?: string; detail?: { arcDegrees?: number } }
    }>

    // the 2020-07-01 cursor is ~3 days short of age 60
    for (const s of signals) expect(s.evidence.detail?.arcDegrees).toBeCloseTo(57.5, 1)
    const keys = [
      ...new Set(
        signals.map(
          (s) => `${s.evidence.planets![0]} ${s.evidence.aspectType} ${s.evidence.planets![1]}`
        )
      ),
    ].sort()
    expect(keys).toEqual(SA.age60.hits)
    expect(signals.filter((s) => s.evidence.planets![0] === s.evidence.planets![1])).toEqual([])
  })
})
