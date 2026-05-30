// @vitest-environment node
// Verifies the progression extractor surfaces the 5 minor aspect types
// (semisextile, quincunx, quintile, biquintile, sesquiquadrate) when the
// progressed Moon lines up with a natal planet within ±1.5°.
//
// calculateSecondaryProgressions is mocked so this test runs without
// Swiss Ephemeris and stays deterministic.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Chart, PlanetBase, ZodiacKo } from '@/lib/astrology/foundation/types'

// hoisted so vi.mock factory can close over the chart
const { progressedChart } = vi.hoisted(() => {
  const signs = [
    'Aries',
    'Taurus',
    'Gemini',
    'Cancer',
    'Leo',
    'Virgo',
    'Libra',
    'Scorpio',
    'Sagittarius',
    'Capricorn',
    'Aquarius',
    'Pisces',
  ] as const

  const norm = (x: number) => ((x % 360) + 360) % 360
  const planet = (name: string, longitude: number) => {
    const lon = norm(longitude)
    return {
      name,
      longitude: lon,
      sign: signs[Math.floor(lon / 30) % 12],
      degree: Math.floor(lon % 30),
      minute: 0,
      formatted: `0°00'`,
      house: 1,
      speed: 0.1,
    }
  }
  return {
    progressedChart: {
      progressionType: 'secondary' as const,
      planets: [planet('Moon', 0)],
      ascendant: { ...planet('Ascendant', 0), house: 1 },
      mc: { ...planet('MC', 90), house: 10 },
      houses: Array.from({ length: 12 }, (_, i) => ({
        index: i + 1,
        cusp: i * 30,
        sign: signs[i],
        formatted: `${i * 30}deg`,
      })),
    },
  }
})

vi.mock('@/lib/astrology/foundation/progressions', async (importActual) => {
  // Keep the real findProgressedMoonAspects (this is exactly what the test
  // exercises — minor aspects between the progressed Moon and natal planets);
  // only stub the ephemeris-backed chart calc with the fixture.
  const actual = await importActual<typeof import('@/lib/astrology/foundation/progressions')>()
  return {
    ...actual,
    calculateSecondaryProgressions: vi.fn().mockResolvedValue(progressedChart),
  }
})

import astroProgressionExtractor from '@/lib/calendar-engine/extractors/astro-progression'
import type { ExtractorContext, ExtractorCache } from '@/lib/calendar-engine/types'

const signs: ZodiacKo[] = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
]

const norm = (x: number) => ((x % 360) + 360) % 360

const makePlanet = (name: string, longitude: number): PlanetBase => {
  const lon = norm(longitude)
  return {
    name,
    longitude: lon,
    sign: signs[Math.floor(lon / 30) % 12],
    degree: Math.floor(lon % 30),
    minute: 0,
    formatted: `0°00'`,
    house: 1,
    speed: 0.1,
  }
}

// Natal planets positioned so progressed Moon at 0° hits every minor target
// within 1.5° orb:
//   Venus 30° → semisextile
//   Mercury 72° → quintile
//   Uranus 135° → sesquiquadrate
//   Saturn 144° → biquintile
//   Jupiter 150° → quincunx
// Plus Mars 90° as a clean square (major) for sanity.
const natalChart: Chart = {
  planets: [
    makePlanet('Venus', 30),
    makePlanet('Mercury', 72),
    makePlanet('Mars', 90),
    makePlanet('Uranus', 135),
    makePlanet('Saturn', 144),
    makePlanet('Jupiter', 150),
  ],
  ascendant: { ...makePlanet('Ascendant', 0), house: 1 },
  mc: { ...makePlanet('MC', 90), house: 10 },
  houses: Array.from({ length: 12 }, (_, i) => ({
    index: i + 1,
    cusp: i * 30,
    sign: signs[i],
    formatted: `${i * 30}deg`,
  })),
  meta: {
    jdUT: 0,
    isoUTC: '2026-01-01T00:00:00Z',
    timeZone: 'UTC',
    latitude: 0,
    longitude: 0,
    houseSystem: 'Placidus',
  },
}

const cache: ExtractorCache & { store: Map<string, unknown> } = {
  store: new Map<string, unknown>(),
  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined
  },
  set<T>(key: string, value: T): void {
    this.store.set(key, value)
  },
}

const ctx: ExtractorContext = {
  natal: {
    input: { year: 1990, month: 6, date: 15, hour: 12, minute: 0 },
    astro: {
      chart: natalChart,
      location: { latitude: 0, longitude: 0, timeZone: 'UTC' },
      extraPoints: [],
    },
  } as unknown as ExtractorContext['natal'],
  range: { start: '2026-01-01T00:00:00.000Z', end: '2026-01-31T23:59:59.000Z' },
  cache,
}

const aspectTypeOf = (s: { evidence?: { aspectType?: string } }) =>
  s.evidence?.aspectType ?? ''

describe('astro-progression extractor (minor aspects)', () => {
  beforeEach(() => {
    cache.store.clear()
  })

  it('surfaces all 5 minor aspect types when the progressed Moon lines up', async () => {
    const signals = await astroProgressionExtractor.extract(ctx)
    const aspectTypes = new Set(signals.map(aspectTypeOf))
    expect(aspectTypes.has('semisextile')).toBe(true)
    expect(aspectTypes.has('quincunx')).toBe(true)
    expect(aspectTypes.has('quintile')).toBe(true)
    expect(aspectTypes.has('biquintile')).toBe(true)
    expect(aspectTypes.has('sesquiquadrate')).toBe(true)
    // Major square (Mars at 90°) still detected.
    expect(aspectTypes.has('square')).toBe(true)
  })

  it('applies task-spec polarity overrides to minor aspects', async () => {
    const signals = await astroProgressionExtractor.extract(ctx)
    const polarityOf = (aspect: string): number | null => {
      const hit = signals.find((s) => aspectTypeOf(s) === aspect)
      return hit ? hit.polarity : null
    }
    // task spec → integer Polarity rounding:
    //   semisextile 0 → 0
    //   quincunx -0.5 → -1
    //   quintile +0.5 → +1
    //   biquintile +0.5 → +1
    //   sesquiquadrate -0.3 → -1
    expect(polarityOf('semisextile')).toBe(0)
    expect(polarityOf('quincunx')).toBe(-1)
    expect(polarityOf('quintile')).toBe(1)
    expect(polarityOf('biquintile')).toBe(1)
    expect(polarityOf('sesquiquadrate')).toBe(-1)
  })
})
