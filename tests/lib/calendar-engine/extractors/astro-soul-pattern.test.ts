// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Chart, PlanetBase } from '@/lib/astrology/foundation/types'
import type { NatalContext } from '@/lib/calendar-engine/context/types'
import type { ExtractorCache } from '@/lib/calendar-engine/types'
import { InMemoryCache } from '@/lib/calendar-engine/cache'

/**
 * 영혼·패턴 결 extractor 회귀 테스트.
 *
 * 트랜짓 차트 계산을 ephe-cache 레이어에서 mock — 미리 정의된 위치로 강제 — 한 뒤
 * 추출기가 (1) Draconic 컨택, (2) Harmonic 4/5/7/9 컨택을 모두 신호로 뱉는지,
 * (3) polarity / weight / kind / layer 가 사양대로인지 확인한다.
 */

const transitChartFixture: Chart = (() => {
  // 트랜짓 행성 위치는 본명 결의 Draconic / Harmonic 좌표와 컨정션 떨어지도록
  // 설정한다. 본명 차트(아래 createNatal)는 노드 = 0° 라 Draconic = natal.
  // 그래서 트랜짓 Sun = 본명 Sun(45°) 컨정션이면 Draconic Sun(45°)도 컨정션.
  // Harmonic 4의 Sun = 45 * 4 = 180. Harmonic 5의 Sun = 45 * 5 = 225, etc.
  const planet = (name: string, lon: number): PlanetBase => ({
    name,
    longitude: lon,
    sign: 'Aries',
    degree: 0,
    minute: 0,
    formatted: '00°00\' Aries',
    house: 1,
  })

  return {
    planets: [
      planet('Sun', 45),     // Draconic Sun(45°) hit
      planet('Mars', 180),   // H4 Sun(45*4=180) hit
      planet('Venus', 225),  // H5 Sun(45*5=225 mod 360=225) hit
      planet('Neptune', 315),// H7 Sun(45*7=315) hit
      planet('Jupiter', 45), // H9 Sun(45*9=405 mod 360=45) hit
      planet('Moon', 0),     // no hit (well outside orb)
    ],
    ascendant: planet('Ascendant', 270),
    mc: planet('MC', 300),
    houses: [],
  }
})()

vi.mock('@/lib/calendar-engine/ephe-cache', () => ({
  getCachedTransitChart: vi.fn(async () => transitChartFixture),
}))

function createNatal(): NatalContext {
  const p = (name: string, lon: number, house = 1): PlanetBase => ({
    name,
    longitude: lon,
    sign: 'Aries',
    degree: 0,
    minute: 0,
    formatted: '00°00\' Aries',
    house,
  })

  const chart: Chart = {
    planets: [
      p('Sun', 45),
      p('Moon', 120),
      p('Mercury', 30),
      p('Venus', 60),
      p('Mars', 90),
      p('Jupiter', 200),
      p('Saturn', 300),
      p('Uranus', 150),
      p('Neptune', 250),
      p('Pluto', 270),
      p('True Node', 0), // Draconic offset = 0 ⇒ Draconic == natal
    ],
    ascendant: p('Ascendant', 0),
    mc: p('MC', 270, 10),
    houses: [],
  }

  return {
    input: {
      year: 1995, month: 2, date: 9, hour: 6, minute: 40,
      latitude: 37.5665, longitude: 126.9780, timeZone: 'Asia/Seoul',
    },
    saju: {
      pillars: {} as never,
      dayMaster: {} as never,
      yongsin: { primary: 'Water', avoid: [] },
      strength: 'medium',
      natalShinsal: [],
      natalRelations: [],
      daeun: [],
    },
    astro: {
      chart,
      sect: 'day',
      location: { latitude: 37.5665, longitude: 126.9780, timeZone: 'Asia/Seoul' },
    },
  }
}

describe('astro-soul-pattern extractor', () => {
  let cache: ExtractorCache

  beforeEach(() => {
    cache = new InMemoryCache()
  })

  it('emits draconic + harmonic signals for a single day', async () => {
    const mod = await import('@/lib/calendar-engine/extractors/astro/astro-soul-pattern')
    const extractor = mod.default

    const signals = await extractor.extract({
      natal: createNatal(),
      range: { start: '2026-05-15T00:00:00.000Z', end: '2026-05-15T00:00:00.000Z', granularity: 'day' },
      cache,
    })

    expect(signals.length).toBeGreaterThan(0)

    const kinds = new Set(signals.map((s) => s.kind))
    expect(kinds.has('draconic')).toBe(true)
    expect(kinds.has('harmonic')).toBe(true)

    // Draconic Sun(45°) ↔ transit Sun(45°) 컨정션 발견
    const draconicSun = signals.find(
      (s) => s.kind === 'draconic' && /Sun .* Draconic Sun/.test(s.name)
    )
    expect(draconicSun).toBeDefined()
    expect(draconicSun!.layer).toBe('monthly')
    expect(draconicSun!.polarity).toBeGreaterThanOrEqual(1) // 영혼 결 floor
    expect(draconicSun!.weight).toBeGreaterThan(0)
    expect(draconicSun!.weight).toBeLessThanOrEqual(0.45)
    expect(draconicSun!.source).toBe('astro')

    // Harmonic 4 Mars ↔ transit Mars on H4 Sun(180°) 컨정션
    const h4 = signals.find(
      (s) => s.kind === 'harmonic' && s.name.includes('H4') && s.evidence.planets?.[0] === 'Mars'
    )
    expect(h4).toBeDefined()
    expect(h4!.layer).toBe('monthly')
    expect(h4!.evidence.detail).toMatchObject({ harmonic: 4, layer: 'harmonic' })

    // Harmonic 5 Venus 결 컨택
    const h5 = signals.find(
      (s) => s.kind === 'harmonic' && s.name.includes('H5') && s.evidence.planets?.[0] === 'Venus'
    )
    expect(h5).toBeDefined()
    // 재능 결(+1) + Venus benefic Conjunction Self → +2 = positive
    expect(h5!.polarity).toBeGreaterThan(0)

    // Harmonic 7 Neptune (영감)
    const h7 = signals.find(
      (s) => s.kind === 'harmonic' && s.name.includes('H7') && s.evidence.planets?.[0] === 'Neptune'
    )
    expect(h7).toBeDefined()

    // Harmonic 9 Jupiter (영성·완성)
    const h9 = signals.find(
      (s) => s.kind === 'harmonic' && s.name.includes('H9') && s.evidence.planets?.[0] === 'Jupiter'
    )
    expect(h9).toBeDefined()
    expect(h9!.polarity).toBeGreaterThan(0)
  })

  it('caches draconic and harmonic charts after first day (single calculation)', async () => {
    const mod = await import('@/lib/calendar-engine/extractors/astro/astro-soul-pattern')
    const extractor = mod.default

    await extractor.extract({
      natal: createNatal(),
      range: { start: '2026-05-15T00:00:00.000Z', end: '2026-05-17T00:00:00.000Z', granularity: 'day' },
      cache,
    })

    // 5개의 캐시 키 (draconic + harmonic 4/5/7/9) + 트랜짓 캐시(mock 통과)
    const inMem = cache as InMemoryCache
    // 캐시에 draconic / harmonic 4 / 5 / 7 / 9 키가 모두 들어있어야 함
    expect(inMem.size()).toBeGreaterThanOrEqual(5)
  })

  it('all signal ids are unique', async () => {
    const mod = await import('@/lib/calendar-engine/extractors/astro/astro-soul-pattern')
    const extractor = mod.default
    const signals = await extractor.extract({
      natal: createNatal(),
      range: { start: '2026-05-15T00:00:00.000Z', end: '2026-05-15T00:00:00.000Z', granularity: 'day' },
      cache,
    })

    const ids = signals.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
