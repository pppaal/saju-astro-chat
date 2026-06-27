// @vitest-environment node
import { describe, it, expect } from 'vitest'
import astroSolarArcExtractor from '@/lib/calendar-engine/extractors/astro/astro-solar-arc'
import {
  calculateSolarArcChart,
  findSolarArcAspects,
} from '@/lib/astrology/foundation/progressions'
import type { Chart, PlanetBase, ZodiacKo } from '@/lib/astrology/foundation/types'
import type {
  ExtractorContext,
  ExtractorCache,
  CalendarRange,
} from '@/lib/calendar-engine/types'
import type { NatalContext } from '@/lib/calendar-engine/context/types'

// ─── helpers ──────────────────────────────────────────────────────────────

const SIGNS: ZodiacKo[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]

function makePlanet(name: string, longitude: number, house = 1): PlanetBase {
  const norm = ((longitude % 360) + 360) % 360
  const signIdx = Math.floor(norm / 30)
  return {
    name,
    longitude: norm,
    sign: SIGNS[signIdx],
    degree: Math.floor(norm % 30),
    minute: 0,
    formatted: `${SIGNS[signIdx]} ${Math.floor(norm % 30)}deg 00'`,
    house,
    speed: 1,
  }
}

function makeChart(planets: Array<[string, number]>): Chart {
  return {
    planets: planets.map(([n, l]) => makePlanet(n, l)),
    ascendant: makePlanet('Ascendant', 0),
    mc: makePlanet('MC', 270),
    houses: Array.from({ length: 12 }, (_, i) => ({
      index: i + 1,
      cusp: i * 30,
      sign: SIGNS[i],
      formatted: `${SIGNS[i]} 0deg 00'`,
    })),
  }
}

function makeCache(): ExtractorCache {
  const store = new Map<string, unknown>()
  return {
    get<T>(key: string) {
      return store.get(key) as T | undefined
    },
    set<T>(key: string, value: T) {
      store.set(key, value as unknown)
    },
  }
}

function makeNatalContext(chart: Chart): NatalContext {
  return {
    input: {
      year: 1995,
      month: 2,
      date: 9,
      hour: 6,
      minute: 40,
      latitude: 37.5665,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
    },
    saju: {} as NatalContext['saju'],
    astro: {
      chart,
      sect: 'day',
      location: { latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul' },
    },
  }
}

// ─── tests ────────────────────────────────────────────────────────────────

describe('calculateSolarArcChart', () => {
  it('shifts every planet by ageInYears × 1°', () => {
    const natal = makeChart([
      ['Sun', 0],
      ['Moon', 90],
      ['Saturn', 200],
    ])
    const arc = calculateSolarArcChart(natal, 30)
    const sun = arc.planets.find((p) => p.name === 'Sun')!
    const moon = arc.planets.find((p) => p.name === 'Moon')!
    const saturn = arc.planets.find((p) => p.name === 'Saturn')!
    expect(sun.longitude).toBeCloseTo(30, 6)
    expect(moon.longitude).toBeCloseTo(120, 6)
    expect(saturn.longitude).toBeCloseTo(230, 6)
  })

  it('wraps around 360 correctly', () => {
    const natal = makeChart([['Mars', 350]])
    const arc = calculateSolarArcChart(natal, 30)
    const mars = arc.planets.find((p) => p.name === 'Mars')!
    expect(mars.longitude).toBeCloseTo(20, 6) // 350+30 = 380 → 20
  })

  it('shifts ascendant and MC by the same arc', () => {
    const natal = makeChart([['Sun', 10]])
    const arc = calculateSolarArcChart(natal, 5)
    expect(arc.ascendant.longitude).toBeCloseTo(5, 6)
    expect(arc.mc.longitude).toBeCloseTo(275, 6)
  })

  it('updates sign/degree/minute formatting after shift', () => {
    const natal = makeChart([['Sun', 29]])
    const arc = calculateSolarArcChart(natal, 2) // 29+2 = 31 → Taurus 1°
    const sun = arc.planets.find((p) => p.name === 'Sun')!
    expect(sun.sign).toBe('Taurus')
    expect(sun.degree).toBe(1)
  })
})

describe('findSolarArcAspects', () => {
  it('detects exact conjunction within orb', () => {
    const natal = makeChart([
      ['Sun', 100],
      ['Saturn', 130], // 30° from Sun — not a major aspect target
    ])
    // Arc 30 → Sun moves 100→130 = exact conjunction with natal Saturn
    const arc = calculateSolarArcChart(natal, 30)
    const hits = findSolarArcAspects(natal, arc, 0.5)
    const sunOnSaturn = hits.find(
      (h) => h.arcPlanet === 'Sun' && h.natalPlanet === 'Saturn' && h.aspect === 'conjunction'
    )
    expect(sunOnSaturn).toBeDefined()
    expect(sunOnSaturn!.orb).toBeLessThan(0.5)
  })

  it('detects square within tight orb', () => {
    // Place Sun at 0, Mars at 90 — arc 0 → Sun already squares Mars
    const natal = makeChart([
      ['Sun', 0],
      ['Mars', 90],
    ])
    const arc = calculateSolarArcChart(natal, 0)
    const hits = findSolarArcAspects(natal, arc, 0.5)
    // arc Sun (0) vs natal Mars (90) → 90° = square
    const sunSquareMars = hits.find(
      (h) => h.arcPlanet === 'Sun' && h.natalPlanet === 'Mars' && h.aspect === 'square'
    )
    expect(sunSquareMars).toBeDefined()
  })

  it('respects orb — 1° apart conjunction is rejected at orb 0.5', () => {
    const natal = makeChart([
      ['Sun', 100],
      ['Saturn', 131], // 31° offset
    ])
    // Arc 30 → Sun moves 100→130, natal Saturn is at 131 → 1° apart
    const arc = calculateSolarArcChart(natal, 30)
    const hits = findSolarArcAspects(natal, arc, 0.5)
    const tightHit = hits.find(
      (h) => h.arcPlanet === 'Sun' && h.natalPlanet === 'Saturn' && h.aspect === 'conjunction'
    )
    expect(tightHit).toBeUndefined()
    // … but allowed at orb 1.5
    const loose = findSolarArcAspects(natal, arc, 1.5)
    expect(
      loose.find(
        (h) => h.arcPlanet === 'Sun' && h.natalPlanet === 'Saturn' && h.aspect === 'conjunction'
      )
    ).toBeDefined()
  })
})

describe('astroSolarArcExtractor', () => {
  it('declares kind "solar-arc" and source "astro"', () => {
    expect(astroSolarArcExtractor.kind).toBe('solar-arc')
    expect(astroSolarArcExtractor.source).toBe('astro')
  })

  it('emits solar-arc signals when arc aspects hit natal planets', async () => {
    // Construct a chart where age-30 solar arc moves natal Sun (0°) onto
    // natal Mars (30°) → exact conjunction.
    const natal = makeChart([
      ['Sun', 0],
      ['Mars', 30],
      ['Saturn', 200],
    ])
    const ctx: ExtractorContext = {
      natal: makeNatalContext(natal),
      // Natal year 1995 → age 30 lands on 2025-02-09; pick a Feb 2025 window.
      range: {
        start: '2025-02-01T00:00:00.000Z',
        end: '2025-02-28T23:59:59.000Z',
        granularity: 'day',
      } as CalendarRange,
      cache: makeCache(),
    }
    const signals = await astroSolarArcExtractor.extract(ctx)
    expect(Array.isArray(signals)).toBe(true)
    // At least the Sun→Mars conjunction (or an extremely close orb hit) should fire
    const arcSunOnMars = signals.find(
      (s) =>
        s.evidence.module === 'astro-solar-arc' &&
        s.evidence.aspectType === 'conjunction' &&
        s.evidence.planets?.includes('Sun') &&
        s.evidence.planets?.includes('Mars')
    )
    expect(arcSunOnMars).toBeDefined()
    expect(arcSunOnMars!.kind).toBe('solar-arc')
    expect(arcSunOnMars!.layer).toBe('decadal')
    expect(arcSunOnMars!.polarity).toBe(2) // conjunction → big transit
    expect(arcSunOnMars!.weight).toBeGreaterThan(0)
    expect(arcSunOnMars!.weight).toBeLessThanOrEqual(0.7)
    expect(arcSunOnMars!.name).toMatch(/Solar Arc Sun conjunction natal Mars/)
  })

  it('caches solar arc chart per month (no double calculation)', async () => {
    const natal = makeChart([
      ['Sun', 0],
      ['Mars', 30],
    ])
    const cache = makeCache()
    let writes = 0
    const wrapped: ExtractorCache = {
      get: (k) => cache.get(k),
      set: (k, v) => {
        writes += 1
        cache.set(k, v)
      },
    }
    const ctx: ExtractorContext = {
      natal: makeNatalContext(natal),
      range: {
        start: '2025-02-01T00:00:00.000Z',
        end: '2025-02-28T23:59:59.000Z',
        granularity: 'day',
      } as CalendarRange,
      cache: wrapped,
    }
    await astroSolarArcExtractor.extract(ctx)
    const firstWrites = writes
    // Second call within same range → cache hits, no new writes for the same key
    await astroSolarArcExtractor.extract(ctx)
    expect(writes).toBe(firstWrites)
  })

  it('returns no signals when natal chart is empty', async () => {
    const empty = makeChart([])
    empty.planets = []
    const ctx: ExtractorContext = {
      natal: makeNatalContext(empty),
      range: {
        start: '2025-02-01T00:00:00.000Z',
        end: '2025-02-28T23:59:59.000Z',
        granularity: 'day',
      } as CalendarRange,
      cache: makeCache(),
    }
    const signals = await astroSolarArcExtractor.extract(ctx)
    expect(signals).toEqual([])
  })

  it('skips months before birth (ageInYears < 0)', async () => {
    const natal = makeChart([['Sun', 0], ['Mars', 30]])
    const ctx: ExtractorContext = {
      natal: makeNatalContext(natal),
      // Range entirely before 1995-02-09 birth → no signals expected.
      range: {
        start: '1990-01-01T00:00:00.000Z',
        end: '1990-01-31T23:59:59.000Z',
        granularity: 'day',
      } as CalendarRange,
      cache: makeCache(),
    }
    const signals = await astroSolarArcExtractor.extract(ctx)
    expect(signals).toEqual([])
  })
})
