/**
 * 궁합 currentSeun — 상담사 '오늘'(보는 사람의 현지 민용 날짜 D)과 출생 tz 의 세운.
 *
 * 운명상담사·캘린더와 같은 헬퍼(pillarsForLocalDate)라 立春이 든 그 현지 날이 새 세운이다
 * (오너 결정 17 '그날부터 새 기운'). 예전엔 요청 순간을 절입 순간과 비교해(getYearPillarForDate)
 * 立春 당일 절입 시각 전에는 운명상담사와 다른 해를 말했다. 그보다 전엔 2/4 고정 근사였다.
 */
import { describe, it, expect } from 'vitest'
import { currentSeun } from '@/lib/compatibility/sajuSynastryData'
import { getYearPillarForDate, getSajuYearForDate } from '@/lib/saju/datePillars'
import { pillarsForLocalDate } from '@/lib/calendar-engine/periodPillars'

describe('currentSeun — 현지 날짜 D · 출생 tz 의 세운 (pillarsForLocalDate)', () => {
  it('입춘 후(6/10): 그 해 간지 + 그 해 연도', () => {
    expect(currentSeun({ year: 2026, month: 6, day: 10 }, 'Asia/Seoul')).toEqual({
      stem: '丙',
      branch: '午',
      year: 2026,
    })
  })

  it('입춘 전(1/15): 간지·연도 모두 직전 사주연으로 롤백', () => {
    // Gregorian getFullYear 였다면 2026 / 丙午 로 잘못 떴을 구간.
    expect(currentSeun({ year: 2026, month: 1, day: 15 }, 'Asia/Seoul')).toEqual({
      stem: '乙',
      branch: '巳',
      year: 2025,
    })
  })

  // 2026 立春 = 2026-02-04 05:02 KST = 2026-02-03T20:02Z (LA 현지 2/3 12:02).
  it('立春 당일은 절입 시각과 무관하게 새 세운 — 출생 tz 의 현지 날짜로', () => {
    expect(currentSeun({ year: 2026, month: 2, day: 4 }, 'Asia/Seoul').year).toBe(2026)
    expect(currentSeun({ year: 2026, month: 2, day: 3 }, 'Asia/Seoul').year).toBe(2025)
    // LA 출생이면 立春 현지 날이 2/3 — 그날부터 丙午.
    expect(currentSeun({ year: 2026, month: 2, day: 3 }, 'America/Los_Angeles')).toEqual({
      stem: '丙',
      branch: '午',
      year: 2026,
    })
    expect(currentSeun({ year: 2026, month: 2, day: 2 }, 'America/Los_Angeles').year).toBe(2025)
    // 순간 비교(예전 규칙)는 서울 2/4 03:00 에 아직 乙巳 였다 — 운명상담사·캘린더와 갈림.
    expect(getYearPillarForDate(new Date('2026-02-03T18:00:00Z'))).toEqual({
      stem: '乙',
      branch: '巳',
    })
  })

  it('운명상담사·캘린더와 같은 헬퍼 — 2026 한 해 매일 pillarsForLocalDate 의 세운과 같다', () => {
    for (const tz of ['Asia/Seoul', 'America/New_York', 'Pacific/Kiritimati']) {
      for (let t = Date.UTC(2026, 0, 1); t <= Date.UTC(2026, 11, 31); t += 86_400_000) {
        const d = new Date(t)
        const day = { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }
        const want = pillarsForLocalDate(day.year, day.month, day.day, tz).year
        expect(currentSeun(day, tz)).toEqual({
          stem: want.stem,
          branch: want.branch,
          year: want.sajuYear,
        })
      }
    }
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
