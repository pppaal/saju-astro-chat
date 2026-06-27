// @vitest-environment node
/**
 * astro-asteroid extractor — 4대 소행성(Ceres/Pallas/Juno/Vesta) 트랜짓 추출기.
 *
 * Swiss Ephemeris 의존부(getCachedTransitChart, calculateAllAsteroids,
 * findAsteroidAspects)는 mock 으로 대체해 extract() 오케스트레이션을 결정론적으로
 * 구동하고, 순수 헬퍼(splitConsecutive/polarity/weight/symbol/korean)는 직접 단위
 * 테스트한다. (astro-midpoint.test.ts 의 mock 하니스 패턴을 따름.)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Chart, PlanetBase, ZodiacKo, AspectHit } from '@/lib/astrology/foundation/types'
import type { Asteroid, AsteroidName } from '@/lib/astrology/foundation/asteroids'

vi.mock('@/lib/calendar-engine/ephe-cache', () => ({
  getCachedTransitChart: vi.fn(),
}))
vi.mock('@/lib/astrology/foundation/asteroids', () => ({
  calculateAllAsteroids: vi.fn(),
  findAsteroidAspects: vi.fn(),
}))

import astroAsteroidExtractor, {
  splitConsecutive,
  polarityForAsteroid,
  weightForAsteroid,
  aspectSymbol,
  aspectKorean,
} from '@/lib/calendar-engine/extractors/astro/astro-asteroid'
import { getCachedTransitChart } from '@/lib/calendar-engine/ephe-cache'
import { calculateAllAsteroids, findAsteroidAspects } from '@/lib/astrology/foundation/asteroids'
import { InMemoryCache } from '@/lib/calendar-engine/cache'
import type { NatalContext } from '@/lib/calendar-engine/context/types'

const SIGNS: ZodiacKo[] = [
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

function makePlanet(name: string, longitude: number): PlanetBase {
  const lon = ((longitude % 360) + 360) % 360
  const idx = Math.floor(lon / 30)
  return {
    name,
    longitude: lon,
    sign: SIGNS[idx],
    degree: Math.floor(lon % 30),
    minute: 0,
    formatted: `${SIGNS[idx]} ${Math.floor(lon % 30)}deg`,
    house: idx + 1,
    speed: 1,
    retrograde: false,
  }
}

function makeChart(planets: PlanetBase[]): Chart {
  return {
    planets,
    ascendant: makePlanet('Ascendant', 0),
    mc: makePlanet('MC', 90),
    houses: Array.from({ length: 12 }, (_, i) => ({
      index: i + 1,
      cusp: i * 30,
      sign: SIGNS[i],
      formatted: `${SIGNS[i]} 0deg`,
    })),
  }
}

function makeNatalContext(): NatalContext {
  return {
    input: {
      year: 1990,
      month: 6,
      date: 15,
      hour: 12,
      minute: 0,
      latitude: 37.5,
      longitude: 127,
      timeZone: 'Asia/Seoul',
    },
    saju: {
      pillars: {} as never,
      dayMaster: {} as never,
      yongsin: { primary: '木', avoid: [] },
      strength: 'medium',
      natalShinsal: [],
      natalRelations: [],
      daeun: [],
    },
    astro: {
      chart: makeChart([makePlanet('Sun', 0), makePlanet('Moon', 60), makePlanet('Mars', 120)]),
      sect: 'day',
      location: { latitude: 37.5, longitude: 127, timeZone: 'Asia/Seoul' },
    },
  } as unknown as NatalContext
}

function asteroid(name: AsteroidName, longitude: number): Asteroid {
  const lon = ((longitude % 360) + 360) % 360
  const idx = Math.floor(lon / 30)
  return {
    name,
    longitude: lon,
    sign: SIGNS[idx],
    degree: Math.floor(lon % 30),
    minute: 0,
    formatted: `${SIGNS[idx]} ${Math.floor(lon % 30)}deg`,
    house: idx + 1,
  }
}

function asteroidCollection() {
  return {
    Ceres: asteroid('Ceres', 10),
    Pallas: asteroid('Pallas', 100),
    Juno: asteroid('Juno', 200),
    Vesta: asteroid('Vesta', 300),
  }
}

function aspectTo(planetName: string, type: AspectHit['type'], orb: number): AspectHit {
  return {
    from: { name: 'src', longitude: 0 } as never,
    to: { name: planetName, longitude: 0 } as never,
    type,
    orb,
  }
}

// ─── 순수 헬퍼 ────────────────────────────────────────────────────────────
describe('splitConsecutive', () => {
  it('returns [] for no hits', () => {
    expect(splitConsecutive([])).toEqual([])
  })

  it('keeps consecutive days (gap ≤ 1.5) in one segment', () => {
    const hits = [
      { iso: '2026-05-01T12:00:00.000Z' },
      { iso: '2026-05-02T12:00:00.000Z' },
      { iso: '2026-05-03T12:00:00.000Z' },
    ]
    const segs = splitConsecutive(hits)
    expect(segs).toHaveLength(1)
    expect(segs[0]).toHaveLength(3)
  })

  it('splits into separate segments when a gap exceeds 1.5 days', () => {
    const hits = [
      { iso: '2026-05-01T12:00:00.000Z' },
      { iso: '2026-05-02T12:00:00.000Z' },
      { iso: '2026-05-10T12:00:00.000Z' }, // 8-day gap → new segment
      { iso: '2026-05-11T12:00:00.000Z' },
    ]
    const segs = splitConsecutive(hits)
    expect(segs).toHaveLength(2)
    expect(segs[0]).toHaveLength(2)
    expect(segs[1]).toHaveLength(2)
  })
})

describe('polarityForAsteroid', () => {
  it('returns +1 for conjunction and harmonic aspects', () => {
    expect(polarityForAsteroid('Ceres', 'conjunction')).toBe(1)
    expect(polarityForAsteroid('Pallas', 'trine')).toBe(1)
    expect(polarityForAsteroid('Juno', 'sextile')).toBe(1)
  })

  it('returns -1 for hard aspects', () => {
    expect(polarityForAsteroid('Vesta', 'square')).toBe(-1)
    expect(polarityForAsteroid('Ceres', 'opposition')).toBe(-1)
  })

  it('returns 0 for unrecognized aspects', () => {
    expect(polarityForAsteroid('Ceres', 'quincunx')).toBe(0)
  })
})

describe('weightForAsteroid', () => {
  it('weights a tight conjunction highest and clamps to ≤1', () => {
    const w = weightForAsteroid('conjunction', 0) // base 0.7, tightness 1
    expect(w).toBeCloseTo(0.7, 5)
    expect(w).toBeLessThanOrEqual(1)
  })

  it('applies a 0.4 floor on tightness at the orb edge', () => {
    // orb == ORB_DEG (3) → tightness floored at 0.4 → 0.65 * 0.4
    expect(weightForAsteroid('trine', 3)).toBeCloseTo(0.65 * 0.4, 5)
  })

  it('uses the 0.4 base for unknown aspect types', () => {
    expect(weightForAsteroid('mystery', 0)).toBeCloseTo(0.4, 5)
  })
})

describe('aspectSymbol / aspectKorean', () => {
  it('maps known aspect types', () => {
    expect(aspectSymbol('conjunction')).toBe('☌')
    expect(aspectSymbol('trine')).toBe('△')
    expect(aspectKorean('square')).toBe('스퀘어')
    expect(aspectKorean('opposition')).toBe('어포지션')
  })

  it('falls back to the raw string for unknown types', () => {
    expect(aspectSymbol('quincunx')).toBe('quincunx')
    expect(aspectKorean('quincunx')).toBe('quincunx')
  })
})

// ─── extract() 오케스트레이션 (mocked ephemeris) ──────────────────────────
describe('astroAsteroidExtractor.extract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(calculateAllAsteroids).mockReturnValue(asteroidCollection() as never)
    vi.mocked(getCachedTransitChart).mockResolvedValue(
      makeChart([makePlanet('Jupiter', 50), makePlanet('Saturn', 250)])
    )
  })

  it('declares the expected source/kind metadata', () => {
    expect(astroAsteroidExtractor.source).toBe('astro')
    expect(astroAsteroidExtractor.kind).toBe('asteroid')
  })

  it('emits well-formed signals for both transit flavors', async () => {
    // both findAsteroidAspects calls return one conjunction hit
    vi.mocked(findAsteroidAspects).mockReturnValue([aspectTo('Mars', 'conjunction', 1.0)])

    const signals = await astroAsteroidExtractor.extract({
      natal: makeNatalContext(),
      range: {
        start: '2026-05-01T00:00:00.000Z',
        end: '2026-05-03T00:00:00.000Z',
        granularity: 'day',
      },
      cache: new InMemoryCache(),
    })

    expect(signals.length).toBeGreaterThan(0)
    const flavors = new Set(signals.map((s) => (s.evidence?.detail as { flavor?: string }).flavor))
    expect(flavors).toContain('transit-planet-to-natal-asteroid')
    expect(flavors).toContain('transit-asteroid-to-natal-planet')

    for (const s of signals) {
      expect(s.source).toBe('astro')
      expect(s.kind).toBe('asteroid')
      expect(s.layer).toBe('monthly')
      expect(s.id.startsWith('astro.asteroid.')).toBe(true)
      expect(s.evidence?.module).toBe('astro-asteroid')
      expect(s.weight).toBeGreaterThan(0)
      expect(s.weight).toBeLessThanOrEqual(1)
      expect(s.active.start <= s.active.peak).toBe(true)
      expect(s.active.peak <= s.active.end).toBe(true)
    }
  })

  it('propagates aspect polarity (square → negative, trine → positive)', async () => {
    vi.mocked(findAsteroidAspects).mockReturnValue([
      aspectTo('Mars', 'trine', 0.5),
      aspectTo('Venus', 'square', 0.5),
    ])

    const signals = await astroAsteroidExtractor.extract({
      natal: makeNatalContext(),
      range: {
        start: '2026-05-01T00:00:00.000Z',
        end: '2026-05-01T00:00:00.000Z',
        granularity: 'day',
      },
      cache: new InMemoryCache(),
    })

    expect(signals.some((s) => s.polarity === 1)).toBe(true)
    expect(signals.some((s) => s.polarity === -1)).toBe(true)
  })

  it('caches the natal asteroid set (computed once, stored in cache)', async () => {
    vi.mocked(findAsteroidAspects).mockReturnValue([])
    const cache = new InMemoryCache()

    await astroAsteroidExtractor.extract({
      natal: makeNatalContext(),
      range: {
        start: '2026-05-01T00:00:00.000Z',
        end: '2026-05-04T00:00:00.000Z',
        granularity: 'day',
      },
      cache,
    })

    const cached = cache.get('asteroids:natal:1990-6-15:37.5:127')
    expect(cached).toBeDefined()
  })

  it('returns [] when the natal asteroid calculation throws', async () => {
    vi.mocked(calculateAllAsteroids).mockImplementation(() => {
      throw new Error('swisseph unavailable')
    })
    vi.mocked(findAsteroidAspects).mockReturnValue([aspectTo('Mars', 'conjunction', 1)])

    const signals = await astroAsteroidExtractor.extract({
      natal: makeNatalContext(),
      range: {
        start: '2026-05-01T00:00:00.000Z',
        end: '2026-05-02T00:00:00.000Z',
        granularity: 'day',
      },
      cache: new InMemoryCache(),
    })
    expect(signals).toEqual([])
  })

  it('skips a day when the transit chart fetch fails', async () => {
    vi.mocked(findAsteroidAspects).mockReturnValue([aspectTo('Mars', 'conjunction', 1)])
    vi.mocked(getCachedTransitChart).mockRejectedValue(new Error('ephemeris down'))

    const signals = await astroAsteroidExtractor.extract({
      natal: makeNatalContext(),
      range: {
        start: '2026-05-01T00:00:00.000Z',
        end: '2026-05-02T00:00:00.000Z',
        granularity: 'day',
      },
      cache: new InMemoryCache(),
    })
    expect(signals).toEqual([])
  })
})
