// @vitest-environment node
// tests/lib/astrology/foundation/transit.aspects.test.ts
//
// 기존 transit.test.ts 는 calculateTransitChart 만 덮는다. 여기서는
// findTransitAspects / findMajorTransits / determineApplying(간접) 의
// 미커버 분기를 *순수 함수* 로 직접 단정한다. swisseph 불필요 —
// Chart 객체를 고정 숫자로 만들어 넣는다. (전역 ephe mock 은 영향 없음.)
import { describe, it, expect } from 'vitest'
import { findTransitAspects, findMajorTransits } from '@/lib/astrology/foundation/transit'
import type { Chart, PlanetBase } from '@/lib/astrology/foundation/types'

function planet(name: string, longitude: number, speed: number, house = 1): PlanetBase {
  return {
    name,
    longitude,
    sign: 'Aries',
    degree: 0,
    minute: 0,
    formatted: '',
    house,
    speed,
    retrograde: speed < 0,
  }
}

function chart(planets: PlanetBase[]): Chart {
  return {
    planets,
    ascendant: {
      name: 'Ascendant',
      longitude: 0,
      sign: 'Aries',
      degree: 0,
      minute: 0,
      formatted: '',
      house: 1,
    },
    mc: {
      name: 'MC',
      longitude: 90,
      sign: 'Cancer',
      degree: 0,
      minute: 0,
      formatted: '',
      house: 10,
    },
    houses: Array.from({ length: 12 }, (_, i) => ({
      index: i + 1,
      cusp: i * 30,
      sign: 'Aries',
      formatted: '',
    })),
  } as Chart
}

describe('findTransitAspects — 분기 커버', () => {
  it('detects an exact conjunction (orb 0) / 정확한 합', () => {
    const transit = chart([planet('Sun', 100, 1.0)])
    const natal = chart([planet('Sun', 100, 1.0)])
    const aspects = findTransitAspects(transit, natal, ['conjunction'])
    const hit = aspects.find((a) => a.type === 'conjunction')
    expect(hit).toBeDefined()
    expect(hit!.orb).toBeCloseTo(0, 6)
    expect(hit!.score).toBeCloseTo(1, 6) // 1 - 0/limit
    expect(hit!.from.kind).toBe('transit')
    expect(hit!.to.kind).toBe('natal')
  })

  it('rejects aspect outside orb / 오브 밖이면 제외', () => {
    // Sun conjunction orb = 6 * 1.0(Sun mult) * 1.0 = 6°. 10° 떨어지면 거부.
    const transit = chart([planet('Sun', 110, 1.0)])
    const natal = chart([planet('Sun', 100, 1.0)])
    const aspects = findTransitAspects(transit, natal, ['conjunction'])
    expect(aspects.find((a) => a.type === 'conjunction')).toBeUndefined()
  })

  it('detects opposition / 대립(180°)', () => {
    const transit = chart([planet('Mars', 280, 1.0)])
    const natal = chart([planet('Mars', 100, 1.0)])
    const aspects = findTransitAspects(transit, natal, ['opposition'])
    expect(aspects.find((a) => a.type === 'opposition')).toBeDefined()
  })

  it('marks applying when transit moves toward exact (forward + positive speed) / 접근', () => {
    // natal Sun at 100, transit Sun at 96 with +speed → moving forward toward 100 = applying
    const transit = chart([planet('Sun', 96, 1.0)])
    const natal = chart([planet('Sun', 100, 1.0)])
    const hit = findTransitAspects(transit, natal, ['conjunction']).find(
      (a) => a.type === 'conjunction'
    )!
    expect(hit.isApplying).toBe(true)
  })

  it('marks separating when transit moves away (past exact + positive speed) / 분리', () => {
    // transit Sun at 104 with +speed → already past 100, moving away = separating
    const transit = chart([planet('Sun', 104, 1.0)])
    const natal = chart([planet('Sun', 100, 1.0)])
    const hit = findTransitAspects(transit, natal, ['conjunction']).find(
      (a) => a.type === 'conjunction'
    )!
    expect(hit.isApplying).toBe(false)
  })

  it('retrograde transit (negative speed) applying toward exact / 역행 접근', () => {
    // transit at 104 moving backward (negative speed) toward 100 = applying
    const transit = chart([planet('Sun', 104, -1.0)])
    const natal = chart([planet('Sun', 100, 1.0)])
    const hit = findTransitAspects(transit, natal, ['conjunction']).find(
      (a) => a.type === 'conjunction'
    )!
    expect(hit.from.longitude).toBe(104)
    expect(hit.isApplying).toBe(true)
  })

  it('zero-speed transit is never applying / 속도 0 이면 applying=false', () => {
    const transit = chart([planet('Sun', 100, 0)])
    const natal = chart([planet('Sun', 100, 1.0)])
    const hit = findTransitAspects(transit, natal, ['conjunction']).find(
      (a) => a.type === 'conjunction'
    )!
    expect(hit.isApplying).toBe(false)
  })

  it('applies orbMultiplier to tighten window / orbMultiplier 가 윈도우 좁힘', () => {
    // 4° apart conjunction: default limit 6 → accepted; with multiplier 0.5 → limit 3 → rejected.
    const transit = chart([planet('Sun', 104, 1.0)])
    const natal = chart([planet('Sun', 100, 1.0)])
    expect(
      findTransitAspects(transit, natal, ['conjunction'], 1.0).find((a) => a.type === 'conjunction')
    ).toBeDefined()
    expect(
      findTransitAspects(transit, natal, ['conjunction'], 0.5).find((a) => a.type === 'conjunction')
    ).toBeUndefined()
  })

  it('uses transit-planet orb multiplier (Pluto wider) / 행성별 오브 배율', () => {
    // Pluto conjunction base orb 6 * 1.4 = 8.4°. 8° apart accepted.
    const transit = chart([planet('Pluto', 108, 0.01)])
    const natal = chart([planet('Sun', 100, 1.0)])
    const hit = findTransitAspects(transit, natal, ['conjunction']).find(
      (a) => a.type === 'conjunction'
    )
    expect(hit).toBeDefined()
  })

  it('includes aspects to natal ASC and MC / 네이탈 ASC·MC 도 대상', () => {
    // natal ASC at 0, transit Saturn at 0 → conjunction to Ascendant
    const transit = chart([planet('Saturn', 0, 0.03)])
    const natal = chart([planet('Sun', 200, 1.0)])
    const aspects = findTransitAspects(transit, natal, ['conjunction'])
    expect(aspects.some((a) => a.natalPoint === 'Ascendant')).toBe(true)
  })

  it('sorts results by score descending / 점수 내림차순 정렬', () => {
    const transit = chart([planet('Sun', 100, 1.0), planet('Moon', 103, 13.0)])
    const natal = chart([planet('Sun', 100, 1.0)])
    const aspects = findTransitAspects(transit, natal, ['conjunction'])
    for (let i = 1; i < aspects.length; i++) {
      expect(aspects[i - 1].score ?? 0).toBeGreaterThanOrEqual(aspects[i].score ?? 0)
    }
  })

  it('handles undefined transit speed (defaults 0) / 속도 undefined 면 0 처리', () => {
    const p = planet('Sun', 100, 0)
    delete (p as { speed?: number }).speed
    const transit = chart([p])
    const natal = chart([planet('Sun', 100, 1.0)])
    const hit = findTransitAspects(transit, natal, ['conjunction']).find(
      (a) => a.type === 'conjunction'
    )!
    expect(hit.isApplying).toBe(false)
  })
})

describe('findMajorTransits — 외행성→내행성 필터', () => {
  it('keeps outer-planet transits to inner points / 외행성→내행성만 유지', () => {
    const transit = chart([
      planet('Saturn', 100, 0.03), // outer → natal Sun (inner) : kept
      planet('Mercury', 200, 1.0), // inner → natal Mars (inner): dropped (not outer)
    ])
    const natal = chart([planet('Sun', 100, 1.0), planet('Mars', 200, 1.0)])
    const majors = findMajorTransits(transit, natal)
    expect(majors.length).toBeGreaterThan(0)
    expect(
      majors.every((a) =>
        ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'].includes(a.transitPlanet)
      )
    ).toBe(true)
    expect(majors.some((a) => a.transitPlanet === 'Mercury')).toBe(false)
  })

  it('drops outer-to-outer transits (natal point not inner) / 외행성→외행성 제외', () => {
    const transit = chart([planet('Saturn', 100, 0.03)])
    const natal = chart([planet('Jupiter', 100, 0.08)]) // Jupiter is not in innerPoints
    const majors = findMajorTransits(transit, natal)
    expect(majors.length).toBe(0)
  })

  it('passes orbMultiplier through / orbMultiplier 전달', () => {
    const transit = chart([planet('Pluto', 104, 0.01)])
    const natal = chart([planet('Sun', 100, 1.0)])
    expect(findMajorTransits(transit, natal, 1.0).length).toBeGreaterThan(0)
    expect(findMajorTransits(transit, natal, 0.3).length).toBe(0)
  })
})
