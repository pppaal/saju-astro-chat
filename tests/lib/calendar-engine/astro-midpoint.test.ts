// @vitest-environment node
// tests/lib/calendar-engine/astro-midpoint.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  calculateMidpoints,
  findTransitsToMidpoints,
} from '@/lib/astrology/foundation/midpoints'
import type { Chart, PlanetBase, ZodiacKo } from '@/lib/astrology/foundation/types'

// ephe-cache 는 Swiss Ephemeris 를 실제 호출 → 테스트에선 mock 으로 대체.
vi.mock('@/lib/calendar-engine/ephe-cache', () => ({
  getCachedTransitChart: vi.fn(),
}))

import astroMidpointExtractor from '@/lib/calendar-engine/extractors/astro-midpoint'
import { getCachedTransitChart } from '@/lib/calendar-engine/ephe-cache'
import { InMemoryCache } from '@/lib/calendar-engine/cache'
import type { NatalContext } from '@/lib/calendar-engine/context/types'

// ─── 헬퍼 ──────────────────────────────────────────────────────────────
const SIGNS: ZodiacKo[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]

function makePlanet(name: string, longitude: number): PlanetBase {
  const idx = Math.floor(((longitude % 360) + 360) % 360 / 30)
  return {
    name,
    longitude: ((longitude % 360) + 360) % 360,
    sign: SIGNS[idx],
    degree: Math.floor(longitude % 30),
    minute: 0,
    formatted: `${SIGNS[idx]} ${Math.floor(longitude % 30)}deg`,
    house: idx + 1,
    speed: 1,
    retrograde: false,
  }
}

function makeChart(planets: PlanetBase[], ascLon = 0, mcLon = 90): Chart {
  return {
    planets,
    ascendant: makePlanet('Ascendant', ascLon),
    mc: makePlanet('MC', mcLon),
    houses: Array.from({ length: 12 }, (_, i) => ({
      index: i + 1,
      cusp: i * 30,
      sign: SIGNS[i],
      formatted: `${SIGNS[i]} 0deg`,
    })),
  }
}

function makeNatalContext(natalChart: Chart): NatalContext {
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
      // 미드포인트 extractor 는 saju 정보 사용 안 함 — 최소 구조만.
      pillars: {} as never,
      dayMaster: {} as never,
      yongsin: { primary: '木', avoid: [] },
      strength: 'medium',
      natalShinsal: [],
      natalRelations: [],
      daeun: [],
    },
    astro: {
      chart: natalChart,
      sect: 'day',
      location: { latitude: 37.5, longitude: 127, timeZone: 'Asia/Seoul' },
    },
  }
}

// ─── findTransitsToMidpoints (foundation) ─────────────────────────────
describe('findTransitsToMidpoints (foundation/midpoints)', () => {
  it('detects conjunction within orb', () => {
    // 본명 Sun=0°, Moon=60° → Sun/Moon midpoint = 30°
    const natal = makeChart([makePlanet('Sun', 0), makePlanet('Moon', 60)])
    const midpoints = calculateMidpoints(natal)

    // 트랜짓 Mercury at 30.3° (orb 0.3° conjunction)
    const transit = makeChart([makePlanet('Mercury', 30.3)])

    const hits = findTransitsToMidpoints(transit, midpoints, 1.0)
    const sunMoonHit = hits.find(
      (h) => h.midpoint.id === 'Sun/Moon' && h.transitPlanet === 'Mercury'
    )
    expect(sunMoonHit).toBeDefined()
    expect(sunMoonHit?.aspectType).toBe('conjunction')
    expect(sunMoonHit?.orb).toBeCloseTo(0.3, 1)
  })

  it('detects opposition within orb', () => {
    const natal = makeChart([makePlanet('Sun', 0), makePlanet('Moon', 60)]) // mp = 30
    // 트랜짓 Mars at 210° (180° from 30°)
    const transit = makeChart([makePlanet('Mars', 210.5)])

    const hits = findTransitsToMidpoints(transit, calculateMidpoints(natal), 1.0)
    const oppHit = hits.find(
      (h) => h.midpoint.id === 'Sun/Moon' && h.transitPlanet === 'Mars'
    )
    expect(oppHit).toBeDefined()
    expect(oppHit?.aspectType).toBe('opposition')
    expect(oppHit?.orb).toBeLessThanOrEqual(1.0)
  })

  it('detects square within orb', () => {
    const natal = makeChart([makePlanet('Sun', 0), makePlanet('Moon', 60)]) // mp = 30
    // 트랜짓 Saturn at 120° (90° from 30°)
    const transit = makeChart([makePlanet('Saturn', 120)])

    const hits = findTransitsToMidpoints(transit, calculateMidpoints(natal), 1.0)
    const sqHit = hits.find(
      (h) => h.midpoint.id === 'Sun/Moon' && h.transitPlanet === 'Saturn'
    )
    expect(sqHit).toBeDefined()
    expect(sqHit?.aspectType).toBe('square')
  })

  it('respects tight orb of 1° — outside orb returns no hit for that pair', () => {
    const natal = makeChart([makePlanet('Sun', 0), makePlanet('Moon', 60)]) // mp = 30
    // 트랜짓 Mercury at 32° (2° from 30° — outside orb 1°)
    const transit = makeChart([makePlanet('Mercury', 32)])

    const hits = findTransitsToMidpoints(transit, calculateMidpoints(natal), 1.0)
    const sunMoonHit = hits.find(
      (h) => h.midpoint.id === 'Sun/Moon' && h.transitPlanet === 'Mercury'
    )
    expect(sunMoonHit).toBeUndefined()
  })

  it('sorts hits by orb ascending', () => {
    const natal = makeChart([makePlanet('Sun', 0), makePlanet('Moon', 60)]) // mp = 30
    const transit = makeChart([
      makePlanet('Mercury', 30.8),   // orb 0.8
      makePlanet('Venus', 30.1),     // orb 0.1
      makePlanet('Mars', 30.5),      // orb 0.5
    ])

    const hits = findTransitsToMidpoints(transit, calculateMidpoints(natal), 1.0)
    const sunMoonHits = hits.filter((h) => h.midpoint.id === 'Sun/Moon')
    expect(sunMoonHits.length).toBeGreaterThanOrEqual(3)
    for (let i = 1; i < sunMoonHits.length; i++) {
      expect(sunMoonHits[i].orb).toBeGreaterThanOrEqual(sunMoonHits[i - 1].orb)
    }
  })

  it('handles longitude wrapping (midpoint near 0°)', () => {
    // 본명 Sun=350°, Moon=10° → midpoint ≈ 0°
    const natal = makeChart([makePlanet('Sun', 350), makePlanet('Moon', 10)])
    const mps = calculateMidpoints(natal)
    const sunMoon = mps.find((m) => m.id === 'Sun/Moon')
    expect(sunMoon?.longitude).toBeCloseTo(0, 1)

    // 트랜짓 Mercury at 359° → conjunction within 1°
    const transit = makeChart([makePlanet('Mercury', 359.7)])
    const hits = findTransitsToMidpoints(transit, mps, 1.0)
    const hit = hits.find(
      (h) => h.midpoint.id === 'Sun/Moon' && h.transitPlanet === 'Mercury'
    )
    expect(hit).toBeDefined()
    expect(hit?.aspectType).toBe('conjunction')
  })

  it('returns empty when no transits within orb', () => {
    const natal = makeChart([makePlanet('Sun', 0), makePlanet('Moon', 60)])
    // 모든 트랜짓 행성이 mp(30) 또는 그 ±90/180 에서 멀음
    const transit = makeChart([makePlanet('Mercury', 50)]) // 20° off
    const hits = findTransitsToMidpoints(transit, calculateMidpoints(natal), 1.0)
    const sunMoonHits = hits.filter((h) => h.midpoint.id === 'Sun/Moon')
    expect(sunMoonHits).toHaveLength(0)
  })
})

// ─── astro-midpoint extractor ──────────────────────────────────────────
describe('astroMidpointExtractor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('has the expected source/kind metadata', () => {
    expect(astroMidpointExtractor.source).toBe('astro')
    expect(astroMidpointExtractor.kind).toBe('midpoint')
  })

  it('emits ActiveSignal[] when transit hits a natal midpoint', async () => {
    const natalChart = makeChart([
      makePlanet('Sun', 0),
      makePlanet('Moon', 60),
      makePlanet('Venus', 90),
      makePlanet('Mars', 180),
    ])
    // 트랜짓 Mercury at 30.1° → conjunct natal Sun/Moon midpoint (30°)
    const transitChart = makeChart([
      makePlanet('Sun', 100),
      makePlanet('Moon', 200),
      makePlanet('Mercury', 30.1),
      makePlanet('Venus', 120),
      makePlanet('Mars', 250),
      makePlanet('Jupiter', 310),
      makePlanet('Saturn', 280),
      makePlanet('Uranus', 60),
      makePlanet('Neptune', 350),
      makePlanet('Pluto', 295),
    ])
    vi.mocked(getCachedTransitChart).mockResolvedValue(transitChart)

    const cache = new InMemoryCache()
    const signals = await astroMidpointExtractor.extract({
      natal: makeNatalContext(natalChart),
      range: {
        start: '2026-05-15T00:00:00.000Z',
        end: '2026-05-15T00:00:00.000Z',
        granularity: 'day',
      },
      cache,
    })

    expect(Array.isArray(signals)).toBe(true)
    expect(signals.length).toBeGreaterThan(0)

    // Mercury → Sun/Moon midpoint 신호가 떠야 함
    const mercurySunMoon = signals.find(
      (s) =>
        s.id.includes('Sun-Moon.Mercury.conjunction') ||
        (s.name.includes('Mercury') && s.name.includes('Sun/Moon')),
    )
    expect(mercurySunMoon).toBeDefined()
    if (mercurySunMoon) {
      expect(mercurySunMoon.source).toBe('astro')
      expect(mercurySunMoon.kind).toBe('midpoint')
      expect(mercurySunMoon.polarity).toBeGreaterThan(0) // Sun/Moon conjunction = 우호
      expect(mercurySunMoon.themes).toContain('growth')
      expect(mercurySunMoon.weight).toBeGreaterThan(0)
      expect(mercurySunMoon.weight).toBeLessThanOrEqual(1)
      expect(mercurySunMoon.evidence.module).toBe('astro-midpoint')
      expect(mercurySunMoon.evidence.aspectType).toBe('conjunction')
      expect(mercurySunMoon.evidence.detail.midpointId).toBe('Sun/Moon')
    }
  })

  it('caches natal midpoints — calculateMidpoints inferred once across days', async () => {
    const natalChart = makeChart([
      makePlanet('Sun', 0),
      makePlanet('Moon', 60),
    ])
    const transitChart = makeChart([makePlanet('Mercury', 100)]) // 안 닿음
    vi.mocked(getCachedTransitChart).mockResolvedValue(transitChart)

    const cache = new InMemoryCache()
    await astroMidpointExtractor.extract({
      natal: makeNatalContext(natalChart),
      range: {
        start: '2026-05-01T00:00:00.000Z',
        end: '2026-05-05T00:00:00.000Z',
        granularity: 'day',
      },
      cache,
    })

    // 캐시에 본명 미드포인트가 저장됐는지
    const cached = cache.get('astro-midpoint:natal-midpoints')
    expect(cached).toBeDefined()
    expect(Array.isArray(cached)).toBe(true)
  })

  it('square aspect yields lower / negative-leaning polarity', async () => {
    const natalChart = makeChart([
      makePlanet('Sun', 0),
      makePlanet('Moon', 60), // Sun/Moon midpoint = 30
    ])
    // 트랜짓 Saturn at 120 (square to mp 30)
    const transitChart = makeChart([makePlanet('Saturn', 120)])
    vi.mocked(getCachedTransitChart).mockResolvedValue(transitChart)

    const cache = new InMemoryCache()
    const signals = await astroMidpointExtractor.extract({
      natal: makeNatalContext(natalChart),
      range: {
        start: '2026-05-15T00:00:00.000Z',
        end: '2026-05-15T00:00:00.000Z',
        granularity: 'day',
      },
      cache,
    })

    const sqSig = signals.find((s) => s.evidence.aspectType === 'square')
    expect(sqSig).toBeDefined()
    if (sqSig) {
      // square / opposition → conjunction polarity 보다 낮아야 함
      expect(sqSig.polarity).toBeLessThanOrEqual(0)
    }
  })

  it('emits no signals when no midpoint contacts in range', async () => {
    const natalChart = makeChart([
      makePlanet('Sun', 0),
      makePlanet('Moon', 60),
    ])
    // 트랜짓 행성들이 모두 mp(30) / +90 / +180 에서 충분히 멀음
    const transitChart = makeChart([
      makePlanet('Mercury', 50), // 20° off 30
      makePlanet('Venus', 70),   // 40° off
    ])
    vi.mocked(getCachedTransitChart).mockResolvedValue(transitChart)

    const cache = new InMemoryCache()
    const signals = await astroMidpointExtractor.extract({
      natal: makeNatalContext(natalChart),
      range: {
        start: '2026-05-15T00:00:00.000Z',
        end: '2026-05-15T00:00:00.000Z',
        granularity: 'day',
      },
      cache,
    })

    // 정확한 hit 이 없어야 함 (직접 매칭되는 pair 없음)
    const sunMoonHits = signals.filter((s) => s.evidence.detail.midpointId === 'Sun/Moon')
    expect(sunMoonHits).toHaveLength(0)
  })

  it('uses planet-appropriate layer (Jupiter → monthly)', async () => {
    const natalChart = makeChart([
      makePlanet('Sun', 0),
      makePlanet('Moon', 60),
    ])
    // 트랜짓 Jupiter conjunct mp
    const transitChart = makeChart([makePlanet('Jupiter', 30.0)])
    vi.mocked(getCachedTransitChart).mockResolvedValue(transitChart)

    const cache = new InMemoryCache()
    const signals = await astroMidpointExtractor.extract({
      natal: makeNatalContext(natalChart),
      range: {
        start: '2026-05-15T00:00:00.000Z',
        end: '2026-05-15T00:00:00.000Z',
        granularity: 'day',
      },
      cache,
    })
    const jupSig = signals.find((s) =>
      (s.evidence.planets ?? []).includes('Jupiter'),
    )
    expect(jupSig).toBeDefined()
    expect(jupSig?.layer).toBe('monthly')
  })
})
