// @vitest-environment node
// tests/lib/astrology/foundation/extraPoints.branches.test.ts
//
// 기존 extraPoints.test.ts 는 전역 mock(항상 vertex 반환, 항상 P 성공) 으로
// happy-path 만 덮는다. 여기서는 *로컬* ephe mock 을 써서 calculateVertex 의
// 미커버 분기를 강제한다:
//  - swe_houses('P') 실패 → 'W' 폴백 성공
//  - 두 시스템 모두 실패 → throw
//  - vertex 없음 + armc 있음 → vertexFromArmc 경로 (SE_ECL_NUT 호출)
//  - vertex 없음 + armc 없음 → throw
//  - Chiron/Lilith swe_calc_ut error → throw
// 또한 PoF 주간/야간 공식을 고정 숫자로 단정한다.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockState: {
  housesResults: unknown[]
  housesIdx: number
  calcResult: Record<string, unknown> | { error: string }
  eclResult: Record<string, unknown>
} = {
  housesResults: [],
  housesIdx: 0,
  calcResult: { longitude: 100 },
  eclResult: { longitude: 23.4392911 },
}

const mockSwisseph = {
  SEFLG_SPEED: 256,
  SE_SUN: 0,
  SE_MOON: 1,
  SE_CHIRON: 15,
  SE_MEAN_APOG: 12,
  SE_OSCU_APOG: 13,
  SE_ECL_NUT: -1,
  swe_houses: vi.fn(() => {
    const r = mockState.housesResults[mockState.housesIdx] ?? mockState.housesResults.at(-1)
    mockState.housesIdx += 1
    return r
  }),
  swe_calc_ut: vi.fn((_jd: number, body: number) => {
    if (body === -1) return mockState.eclResult // SE_ECL_NUT
    return mockState.calcResult
  }),
}

vi.mock('@/lib/astrology/foundation/ephe', () => ({
  getSwisseph: () => mockSwisseph,
}))

// inferHouseOf 는 별도 모듈 — 결정적으로 1 반환.
vi.mock('@/lib/astrology/foundation/houses', () => ({
  inferHouseOf: vi.fn(() => 1),
}))

import {
  calculateVertex,
  calculatePartOfFortune,
  calculateChiron,
  calculateLilith,
} from '@/lib/astrology/foundation/extraPoints'

const cusps = Array.from({ length: 12 }, (_, i) => i * 30)

describe('extraPoints — calculateVertex 미커버 분기', () => {
  beforeEach(() => {
    mockState.housesIdx = 0
    mockState.calcResult = { longitude: 100 }
    mockState.eclResult = { longitude: 23.4392911 }
    vi.clearAllMocks()
  })

  it('uses Placidus vertex when available / P 성공 시 vertex 사용', () => {
    mockState.housesResults = [{ vertex: 210.5, armc: 120, ascendant: 0, mc: 90 }]
    const v = calculateVertex(2451545, 37.5, 127, cusps)
    expect(v.name).toBe('Vertex')
    expect(v.longitude).toBeCloseTo(210.5, 5)
    // swe_houses 는 P 한 번만 호출돼야 한다 (폴백 없음).
    expect(mockSwisseph.swe_houses).toHaveBeenCalledTimes(1)
  })

  it('falls back to Whole Sign when Placidus errors / P 실패 → W 폴백', () => {
    mockState.housesResults = [
      { error: 'placidus failed' },
      { vertex: 333.0, armc: 50, ascendant: 0, mc: 90 },
    ]
    const v = calculateVertex(2451545, 80, 10, cusps) // 극권 위도 흉내
    expect(v.longitude).toBeCloseTo(333.0, 5)
    expect(mockSwisseph.swe_houses).toHaveBeenCalledTimes(2)
  })

  it('throws when both systems error / 두 시스템 모두 실패하면 throw', () => {
    mockState.housesResults = [{ error: 'P fail' }, { error: 'W fail' }]
    expect(() => calculateVertex(2451545, 80, 10, cusps)).toThrow('Vertex calculation error')
  })

  it('computes vertex from armc when swe vertex missing / vertex 없으면 armc 공식', () => {
    // vertex 누락, armc 만 존재 → vertexFromArmc 경로 (SE_ECL_NUT 로 eps 조회).
    mockState.housesResults = [{ armc: 120, ascendant: 0, mc: 90 }]
    const v = calculateVertex(2451545, 37.5, 127, cusps)
    expect(v.name).toBe('Vertex')
    expect(v.longitude).toBeGreaterThanOrEqual(0)
    expect(v.longitude).toBeLessThan(360)
    // SE_ECL_NUT(-1) 로 swe_calc_ut 가 호출돼 eps 를 얻었는지.
    expect(mockSwisseph.swe_calc_ut).toHaveBeenCalledWith(2451545, -1, 0)
  })

  it('armc path uses fallback eps when ecl longitude not a number / eps 폴백', () => {
    mockState.housesResults = [{ armc: 200, ascendant: 0, mc: 90 }]
    mockState.eclResult = { latitude: 0 } // longitude 없음 → 23.4392911 폴백
    const v = calculateVertex(2451545, 45, 0, cusps)
    expect(Number.isFinite(v.longitude)).toBe(true)
  })

  it('vertex non-finite + armc present → armc path / vertex 가 NaN 이면 armc', () => {
    mockState.housesResults = [{ vertex: NaN, armc: 90, ascendant: 0, mc: 90 }]
    const v = calculateVertex(2451545, 30, 0, cusps)
    expect(Number.isFinite(v.longitude)).toBe(true)
    expect(mockSwisseph.swe_calc_ut).toHaveBeenCalledWith(2451545, -1, 0)
  })

  it('throws when neither vertex nor armc present / 둘 다 없으면 throw', () => {
    mockState.housesResults = [{ ascendant: 0, mc: 90 }]
    expect(() => calculateVertex(2451545, 30, 0, cusps)).toThrow('Vertex unavailable')
  })
})

describe('extraPoints — Chiron/Lilith error 분기', () => {
  beforeEach(() => {
    mockState.housesIdx = 0
    mockState.calcResult = { longitude: 100 }
    vi.clearAllMocks()
  })

  it('calculateChiron returns valid point on success / 정상 Chiron', () => {
    mockState.calcResult = { longitude: 200.5 }
    const c = calculateChiron(2451545, cusps)
    expect(c.name).toBe('Chiron')
    expect(c.longitude).toBeCloseTo(200.5, 5)
    expect(c.description).toContain('치유')
  })

  it('calculateChiron throws on swisseph error / Chiron 에러 throw', () => {
    mockState.calcResult = { error: 'chiron boom' }
    expect(() => calculateChiron(2451545, cusps)).toThrow('Chiron calculation error')
  })

  it('calculateLilith returns valid point on success / 정상 Lilith', () => {
    mockState.calcResult = { longitude: 47.0 }
    const l = calculateLilith(2451545, cusps)
    expect(l.name).toBe('Lilith')
    expect(l.longitude).toBeCloseTo(47.0, 5)
    expect(l.description).toContain('릴리스')
  })

  it('calculateLilith throws on swisseph error / Lilith 에러 throw', () => {
    mockState.calcResult = { error: 'lilith boom' }
    expect(() => calculateLilith(2451545, cusps)).toThrow('Lilith calculation error')
  })
})

describe('extraPoints — calculatePartOfFortune 공식 분기 (고정 숫자)', () => {
  it('day formula: ASC + Moon - Sun / 주간 공식', () => {
    // ASC=100, Moon=200, Sun=50 → 100+200-50=250
    const pof = calculatePartOfFortune(100, 50, 200, false, cusps)
    expect(pof.longitude).toBeCloseTo(250, 5)
  })

  it('night formula: ASC + Sun - Moon / 야간 공식', () => {
    // ASC=100, Sun=50, Moon=200 → 100+50-200=-50 → normalize → 310
    const pof = calculatePartOfFortune(100, 50, 200, true, cusps)
    expect(pof.longitude).toBeCloseTo(310, 5)
  })

  it('normalizes result above 360 / 360 초과 정규화', () => {
    // ASC=350, Moon=350, Sun=10 → 690 → 330
    const pof = calculatePartOfFortune(350, 10, 350, false, cusps)
    expect(pof.longitude).toBeCloseTo(330, 5)
    expect(pof.description).toContain('행운')
  })
})
