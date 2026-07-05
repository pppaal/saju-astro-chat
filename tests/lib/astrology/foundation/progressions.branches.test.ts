// @vitest-environment node
// tests/lib/astrology/foundation/progressions.branches.test.ts
//
// progressions.ts 미커버 분기:
//  - calculateSecondaryProgressions 폴백 (null/undefined, natal 누락,
//    targetDate 누락, 유효하지 않은 natal) → createFallbackProgressedChart
//  - getProgressedMoonPhase 8개 위상 arm 전부
//  - findProgressedToNatalAspects / Internal / Moon(없음 분기)
//  - calculateSolarArcChart (1년≈1° 근사) + findSolarArcAspects (break/orb)
// swisseph 는 전역 mock(@/lib/astrology/foundation/ephe)로 결정적.
import { describe, it, expect } from 'vitest'
import {
  calculateSecondaryProgressions,
  getProgressedMoonPhase,
  getProgressionSummary,
  findProgressedToNatalAspects,
  findProgressedInternalAspects,
  findProgressedMoonAspects,
  findProgressedAspectKeywords,
  calculateSolarArcChart,
  findSolarArcAspects,
} from '@/lib/astrology/foundation/progressions'
import type { Chart, PlanetBase, ProgressedChart, ZodiacKo } from '@/lib/astrology/foundation/types'

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

function planet(name: string, longitude: number): PlanetBase {
  return {
    name,
    longitude,
    sign: SIGNS[Math.floor((((longitude % 360) + 360) % 360) / 30)],
    degree: 0,
    minute: 0,
    formatted: '',
    house: 1,
    speed: 1,
  }
}

function baseChart(planets: PlanetBase[]): Chart {
  return {
    planets,
    ascendant: planet('Ascendant', 0),
    mc: planet('MC', 90),
    houses: Array.from({ length: 12 }, (_, i) => ({
      index: i + 1,
      cusp: i * 30,
      sign: SIGNS[i],
      formatted: '',
    })),
  } as Chart
}

describe('calculateSecondaryProgressions — 폴백 분기', () => {
  it('returns fallback for null input / null 입력 폴백', async () => {
    const r = await calculateSecondaryProgressions(null)
    expect(r.planets).toEqual([])
    expect(r.yearsProgressed).toBe(0)
    expect(r.progressionType).toBe('secondary')
    expect(r.houses).toHaveLength(12)
    // 폴백은 isFallback 로 표시돼 호출자가 실제 차트와 구분 가능해야 한다.
    expect(r.isFallback).toBe(true)
  })

  it('returns fallback for undefined input / undefined 입력 폴백', async () => {
    const r = await calculateSecondaryProgressions(undefined)
    expect(r.planets).toEqual([])
  })

  it('returns fallback when natal missing / natal 누락', async () => {
    const r = await calculateSecondaryProgressions({ targetDate: '2020-01-01' } as never)
    expect(r.planets).toEqual([])
    expect(r.progressedDate).toBe('2020-01-01')
  })

  it('returns fallback when targetDate missing / targetDate 누락', async () => {
    const r = await calculateSecondaryProgressions({
      natal: {
        year: 1990,
        month: 1,
        date: 1,
        hour: 0,
        minute: 0,
        latitude: 0,
        longitude: 0,
        timeZone: 'UTC',
      },
    } as never)
    expect(r.planets).toEqual([])
  })

  it('returns fallback for invalid natal (missing fields) / 불완전 natal', async () => {
    const r = await calculateSecondaryProgressions({
      natal: { year: 1990 } as never,
      targetDate: '2020-06-01',
    } as never)
    expect(r.planets).toEqual([])
    expect(r.progressedDate).toBe('2020-06-01')
  })

  it('computes a real progressed chart for valid input / 정상 입력 계산', async () => {
    const r = await calculateSecondaryProgressions({
      natal: {
        year: 1990,
        month: 6,
        date: 15,
        hour: 12,
        minute: 0,
        latitude: 37.5,
        longitude: 127,
        timeZone: 'Asia/Seoul',
      },
      targetDate: '2020-06-15',
    })
    expect(r.planets.length).toBeGreaterThan(0)
    expect(r.progressionType).toBe('secondary')
    // 30년 진행 → yearsProgressed ~ 30
    expect(r.yearsProgressed).toBeGreaterThan(29)
    expect(r.yearsProgressed).toBeLessThan(31)
    // 정상 차트는 폴백 표시가 없어야 한다.
    expect(r.isFallback).toBeFalsy()
  })
})

describe('getProgressedMoonPhase — 8개 위상 arm', () => {
  const cases: Array<[number, string]> = [
    [10, 'New/Waxing Crescent'],
    [70, 'First Quarter'],
    [110, 'Waxing Gibbous'],
    [170, 'Full Moon'],
    [200, 'Waning Gibbous'],
    [260, 'Last Quarter'],
    [300, 'Waning Crescent'],
    [340, 'Dark Moon'],
  ]
  it.each(cases)('moon-sun angle %d → %s', (moonLon, expected) => {
    // sun=0 → angle == moonLon
    expect(getProgressedMoonPhase(moonLon, 0)).toBe(expected)
  })

  it('boundary exactly 45 → New/Waxing Crescent / 경계 45', () => {
    expect(getProgressedMoonPhase(45, 0)).toBe('New/Waxing Crescent')
  })

  it('boundary exactly 180 → Full Moon / 경계 180', () => {
    expect(getProgressedMoonPhase(180, 0)).toBe('Full Moon')
  })
})

describe('getProgressionSummary / keywords', () => {
  it('summarizes asc/mc/date/type / 요약', () => {
    const prog: ProgressedChart = {
      planets: [],
      ascendant: {
        name: 'Ascendant',
        longitude: 0,
        sign: 'Aries',
        degree: 0,
        minute: 0,
        formatted: 'ASC-FMT',
        house: 1,
      },
      mc: {
        name: 'MC',
        longitude: 90,
        sign: 'Cancer',
        degree: 0,
        minute: 0,
        formatted: 'MC-FMT',
        house: 10,
      },
      houses: [],
      progressionType: 'secondary',
      yearsProgressed: 5,
      progressedDate: '2020-01-01',
    } as ProgressedChart
    const s = getProgressionSummary(prog)
    expect(s.asc).toBe('ASC-FMT')
    expect(s.mc).toBe('MC-FMT')
    expect(s.type).toBe('secondary')
    expect(s.progressedDate).toBe('2020-01-01')
  })

  it('returns aspect keyword map / 어스펙트 키워드 맵', () => {
    const k = findProgressedAspectKeywords()
    expect(k.conjunction).toBe('강력한 합')
    expect(k.trine).toBe('조화')
  })
})

describe('findProgressedToNatalAspects / Internal / Moon', () => {
  const progressed = {
    ...baseChart([planet('Sun', 100), planet('Moon', 200)]),
    progressionType: 'secondary',
    yearsProgressed: 1,
    progressedDate: '2020-01-01',
  } as ProgressedChart

  it('finds aspects within 3° / 3도 이내', () => {
    const natal = baseChart([planet('Sun', 102), planet('Venus', 250)])
    const res = findProgressedToNatalAspects(progressed, natal)
    const sunRow = res.find((r) => r.planet === 'Sun')!
    expect(sunRow.aspects.some((a) => a.target === 'Sun' && a.angle <= 3)).toBe(true)
    const moonRow = res.find((r) => r.planet === 'Moon')!
    // Moon(200) vs Venus(250) = 50° → filtered out
    expect(moonRow.aspects.length).toBe(0)
  })

  it('finds internal aspects between progressed planets / 진행 내부 어스펙트', () => {
    const res = findProgressedInternalAspects(progressed)
    const pair = res.find((r) => r.pair === 'Sun-Moon')!
    expect(pair.angle).toBeCloseTo(100, 5)
  })

  it('findProgressedMoonAspects returns moon-natal hits / 진행 달 어스펙트', () => {
    const natal = baseChart([planet('Mars', 201)])
    const res = findProgressedMoonAspects(progressed, natal)
    expect(res.some((a) => a.target === 'Mars' && a.angle <= 3)).toBe(true)
  })

  it('findProgressedMoonAspects returns [] when no Moon / 달 없으면 빈 배열', () => {
    const noMoon = {
      ...baseChart([planet('Sun', 100)]),
      progressionType: 'secondary',
      yearsProgressed: 1,
      progressedDate: '2020-01-01',
    } as ProgressedChart
    expect(findProgressedMoonAspects(noMoon, baseChart([planet('Mars', 100)]))).toEqual([])
  })
})

describe('calculateSolarArcChart + findSolarArcAspects', () => {
  it('shifts all planets and angles by ~1°/yr / 모든 점을 1°/년 전진', () => {
    const natal = baseChart([planet('Sun', 100), planet('Moon', 200)])
    const arc = calculateSolarArcChart(natal, 10) // 10년 → +10°
    expect(arc.planets.find((p) => p.name === 'Sun')!.longitude).toBeCloseTo(110, 5)
    expect(arc.planets.find((p) => p.name === 'Moon')!.longitude).toBeCloseTo(210, 5)
    expect(arc.ascendant.longitude).toBeCloseTo(10, 5)
    expect(arc.mc.longitude).toBeCloseTo(100, 5)
  })

  it('normalizes shift past 360 / 360 넘으면 정규화', () => {
    const natal = baseChart([planet('Sun', 355)])
    const arc = calculateSolarArcChart(natal, 10) // 355+10=365 → 5
    expect(arc.planets.find((p) => p.name === 'Sun')!.longitude).toBeCloseTo(5, 5)
  })

  it('detects solar-arc conjunction within orb / 오브 내 합 검출', () => {
    const natal = baseChart([planet('Sun', 100), planet('Mars', 110)])
    // shift natal by 10 → arc Sun=110 conjunct natal Mars=110 (0°)
    const arc = calculateSolarArcChart(natal, 10)
    const hits = findSolarArcAspects(natal, arc, 0.5)
    expect(
      hits.some(
        (h) => h.arcPlanet === 'Sun' && h.natalPlanet === 'Mars' && h.aspect === 'conjunction'
      )
    ).toBe(true)
  })

  it('detects solar-arc square and respects orb / square 검출 + orb 존중', () => {
    const natal = baseChart([planet('Sun', 100), planet('Mars', 190)])
    // shift by 0 → arc Sun=100 vs natal Mars=190 = 90° square
    const arc = calculateSolarArcChart(natal, 0)
    const hits = findSolarArcAspects(natal, arc, 0.5)
    expect(hits.some((h) => h.aspect === 'square')).toBe(true)
  })

  it('returns no hits when outside orb / 오브 밖이면 빈 배열', () => {
    // 단일 행성 + 5° shift → arc Sun(105) vs natal Sun(100) = 5° (메이저 아님).
    const natal = baseChart([planet('Sun', 100)])
    const arc = calculateSolarArcChart(natal, 5)
    expect(findSolarArcAspects(natal, arc, 0.5)).toEqual([])
  })
})
