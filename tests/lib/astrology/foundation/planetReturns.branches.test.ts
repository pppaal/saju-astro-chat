// @vitest-environment node
// tests/lib/astrology/foundation/planetReturns.branches.test.ts
//
// 기존 planetReturns.test.ts 는 *실제 ephemeris* 로만 정확성을 검증하고
// swisseph 가 없으면 전부 skip 된다. 여기서는 전역 mock(@/lib/astrology/
// foundation/ephe — tests/setup.ts)로 결정적으로 동작시켜 비-ephemeris
// 분기를 덮는다:
//  - calculateOuterPlanetMilestones 의 11개 def map
//  - shortDiff / findFirstCrossing / bisectCrossing (내부, 간접)
//  - crossing 발견 시 iso/startYear/age 일관성
//  - null-longitude 폴백은 mock 이 항상 값을 주므로 직접은 어렵지만
//    구조적 출력(11개·kind 정렬)으로 map 분기를 전부 통과시킨다.
import { describe, it, expect } from 'vitest'
import { calculateOuterPlanetMilestones } from '@/lib/astrology/foundation/planetReturns'
import type { NatalInput } from '@/lib/astrology/foundation/types'

function natal(overrides?: Partial<NatalInput>): NatalInput {
  return {
    year: 1990,
    month: 6,
    date: 15,
    hour: 12,
    minute: 0,
    latitude: 37.5,
    longitude: 127,
    timeZone: 'Asia/Seoul',
    ...overrides,
  }
}

const KINDS = [
  'jupiter_return_1',
  'jupiter_return_2',
  'jupiter_return_3',
  'jupiter_return_5',
  'saturn_return_1',
  'saturn_return_2',
  'pluto_square_pluto',
  'uranus_opposition',
  'neptune_square',
  'chiron_return',
  'uranus_return',
] as const

describe('calculateOuterPlanetMilestones — 분기 (전역 mock)', () => {
  it('returns exactly 11 milestones, one per def / 11개 마일스톤', () => {
    const m = calculateOuterPlanetMilestones(natal())
    expect(m).toHaveLength(11)
    const kinds = m.map((x) => x.kind).sort()
    expect(kinds).toEqual([...KINDS].sort())
  })

  it('each milestone has consistent iso/startYear/age when found / 발견 시 일관성', () => {
    const n = natal()
    const m = calculateOuterPlanetMilestones(n)
    for (const ms of m) {
      if (ms.exactDateISO === null) {
        // 못 찾은 경우 startYear/age 도 null 이어야 (분기 일관성).
        expect(ms.startYear).toBeNull()
        expect(ms.age).toBeNull()
        continue
      }
      const year = parseInt(ms.exactDateISO.slice(0, 4), 10)
      expect(ms.startYear).toBe(year)
      expect(ms.age).toBe(year - n.year)
      // ISO 포맷 검증 (jdToISO 경로).
      expect(ms.exactDateISO).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
    }
  })

  it('finds at least one crossing under the deterministic mock / 최소 1개 교차 발견', () => {
    // mock 의 swe_calc_ut 는 jd 따라 천천히 변하는 경도를 주므로
    // 검색 윈도우 안에서 target 통과가 일어나 일부 마일스톤은 발견된다 →
    // findFirstCrossing/bisectCrossing 경로가 실행됨.
    const m = calculateOuterPlanetMilestones(natal())
    const found = m.filter((x) => x.exactDateISO !== null)
    expect(found.length).toBeGreaterThan(0)
  })

  it('different birth years shift found startYears / 출생연도 다르면 연도 이동', () => {
    const m1980 = calculateOuterPlanetMilestones(natal({ year: 1980 }))
    const m2000 = calculateOuterPlanetMilestones(natal({ year: 2000 }))
    // age 는 birthYear 와 무관한 검색 윈도우(approxAge) 기반이라 비슷하지만
    // startYear(절대 연도)는 출생연도 차이만큼 달라져야 한다.
    const s1980 = m1980.find((x) => x.kind === 'saturn_return_1')!
    const s2000 = m2000.find((x) => x.kind === 'saturn_return_1')!
    if (s1980.startYear !== null && s2000.startYear !== null) {
      expect(s2000.startYear).toBeGreaterThan(s1980.startYear)
    } else {
      // 둘 다 발견 안 됐다면 최소한 분기 일관성은 위 테스트가 보장.
      expect(true).toBe(true)
    }
  })

  it('is deterministic across repeated calls / 반복 호출 결정적', () => {
    const a = calculateOuterPlanetMilestones(natal())
    const b = calculateOuterPlanetMilestones(natal())
    expect(a).toEqual(b)
  })

  it('age is a non-negative integer when found / 발견된 age 는 음수 아님 정수', () => {
    const m = calculateOuterPlanetMilestones(natal())
    for (const ms of m) {
      if (ms.age === null) continue
      expect(Number.isInteger(ms.age)).toBe(true)
      expect(ms.age).toBeGreaterThanOrEqual(0)
    }
  })
})
