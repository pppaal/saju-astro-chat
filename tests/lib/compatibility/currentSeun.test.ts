/**
 * 궁합 currentSeun — 세운 간지·연도는 절기(입춘) 기준이어야 한다.
 *
 * 회귀: 예전 currentSeun 은 2/4 고정 근사 + Gregorian 필드로 직접 산출해,
 *  (1) 입춘 실제 날짜(연마다 2/3~2/5)와 어긋나고,
 *  (2) 연도 라벨이 본명/월운/일진 차트의 절기 convention 과 달랐다.
 * 이제 datePillars SSOT(getYearPillarForDate/getSajuYearForDate)에 위임한다.
 */
import { describe, it, expect } from 'vitest'
import { currentSeun } from '@/lib/compatibility/sajuSynastryData'
import { getYearPillarForDate, getSajuYearForDate } from '@/lib/saju/datePillars'

describe('currentSeun — 절기(입춘) 기준 세운', () => {
  it('입춘 후(6/10): 그 해 간지 + 그 해 연도', () => {
    const d = new Date(2026, 5, 10)
    const s = currentSeun(d)
    expect({ stem: s.stem, branch: s.branch }).toEqual(getYearPillarForDate(d))
    expect(s.year).toBe(getSajuYearForDate(d))
    expect(s).toEqual({ stem: '丙', branch: '午', year: 2026 })
  })

  it('입춘 전(1/15): 간지·연도 모두 직전 사주연으로 롤백', () => {
    const d = new Date(2026, 0, 15)
    const s = currentSeun(d)
    // Gregorian getFullYear 였다면 2026 / 丙午 로 잘못 떴을 구간.
    expect({ stem: s.stem, branch: s.branch }).toEqual(getYearPillarForDate(d))
    expect(s).toEqual({ stem: '乙', branch: '巳', year: 2025 })
  })
})

describe('getSajuYearForDate — 입춘에 연도가 바뀐다', () => {
  it('1/1~입춘 구간은 직전 해, 입춘 이후는 당해', () => {
    expect(getSajuYearForDate(new Date(2026, 0, 1))).toBe(2025)
    expect(getSajuYearForDate(new Date(2026, 5, 10))).toBe(2026)
    // 간지 인덱스와 연도가 항상 정합(乙巳=2025, 丙午=2026).
    expect(getYearPillarForDate(new Date(2026, 0, 1))).toEqual({ stem: '乙', branch: '巳' })
  })
})
