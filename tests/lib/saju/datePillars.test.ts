/**
 * datePillars — 절기 기반 연/월주 해석 골든 + 서버-tz 독립성 회귀.
 *
 * getMonthRefForDate 의 후보-연도 seed 가 date.getFullYear()(서버 로컬)였다가
 * getUTCFullYear()로 바뀌었다. getSolarTermKST 는 절대 instant(UTC)를 돌려주고
 * 비교도 절대값이라, seed 가 서버 tz 에 의존하면 로컬-tz 서버에서 연말연초
 * 경계가 흔들렸다. 아래 골든은 입춘/절기 경계 해석을 결정적으로 잠근다.
 */
import { describe, it, expect } from 'vitest'
import {
  getYearPillarForDate,
  getSajuYearForDate,
  getMonthPillarForDate,
} from '@/lib/saju/datePillars'

describe('datePillars — 입춘 기준 연주', () => {
  it('입춘 전(1/1)은 직전 사주연, 입춘 후(6/10)는 당해', () => {
    expect(getSajuYearForDate(new Date('2026-01-01T12:00:00Z'))).toBe(2025)
    expect(getSajuYearForDate(new Date('2026-06-10T12:00:00Z'))).toBe(2026)
    expect(getYearPillarForDate(new Date('2026-01-01T12:00:00Z'))).toEqual({
      stem: '乙',
      branch: '巳',
    })
    expect(getYearPillarForDate(new Date('2026-06-10T12:00:00Z'))).toEqual({
      stem: '丙',
      branch: '午',
    })
  })

  it('서버 로컬 tz 와 무관하게 UTC instant 만으로 결정적', () => {
    // 같은 절대 instant 는 어떤 표현(Z / +09:00)으로 줘도 같은 결과.
    const utc = new Date('2026-06-10T03:00:00Z')
    const kstLabel = new Date('2026-06-10T12:00:00+09:00') // 동일 instant
    expect(getYearPillarForDate(kstLabel)).toEqual(getYearPillarForDate(utc))
    expect(getMonthPillarForDate(kstLabel)).toEqual(getMonthPillarForDate(utc))
  })
})

describe('datePillars — 절기 기준 월주(달력월 아님)', () => {
  it('6/10 은 午월(달력 6월=未로 밀리지 않음)', () => {
    // 절기상 6/10 은 망종(6/6경)~소서(7/7경) 사이 = 午월.
    expect(getMonthPillarForDate(new Date('2026-06-10T12:00:00Z')).branch).toBe('午')
  })

  it('월주는 결정적(같은 날 동일)', () => {
    const a = getMonthPillarForDate(new Date('2026-03-20T00:00:00Z'))
    const b = getMonthPillarForDate(new Date('2026-03-20T00:00:00Z'))
    expect(a).toEqual(b)
  })
})
