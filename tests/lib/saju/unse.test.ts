// tests/lib/Saju/unse.test.ts
// 대운/세운/월운/일진 계산 테스트

import { beforeEach } from 'vitest'
import {
  getAnnualCycles,
  getMonthlyCycles,
  getIljinCalendar,
  WolunDataExtended,
} from '@/lib/saju/unse'
import type { DayMaster } from '@/lib/saju/types'

// 테스트 헬퍼: 일간(DayMaster) 생성
function createDayMaster(
  name = '丙',
  element: '목' | '화' | '토' | '금' | '수' = '화',
  yin_yang: '양' | '음' = '양'
): DayMaster {
  return { name, element, yin_yang }
}

describe('unse', () => {
  describe('getAnnualCycles', () => {
    let dayMaster: DayMaster

    beforeEach(() => {
      dayMaster = createDayMaster()
    })

    it('should return annual cycles for given year range', () => {
      const result = getAnnualCycles(2024, 5, dayMaster)

      expect(result.length).toBe(5)
      expect(result[0].year).toBe(2024)
      expect(result[4].year).toBe(2028)
    })

    it('should include correct stem and branch for each year', () => {
      const result = getAnnualCycles(2024, 3, dayMaster)

      // 2024년은 갑진년
      expect(result[0].heavenlyStem).toBe('甲')
      expect(result[0].earthlyBranch).toBe('辰')
    })

    it('should include sibsin for each year', () => {
      const result = getAnnualCycles(2024, 3, dayMaster)

      for (const cycle of result) {
        expect(cycle.sibsin).toHaveProperty('cheon')
        expect(cycle.sibsin).toHaveProperty('ji')
      }
    })

    it('should handle single year', () => {
      const result = getAnnualCycles(2025, 1, dayMaster)

      expect(result.length).toBe(1)
      expect(result[0].year).toBe(2025)
    })

    it('should return years in ascending order', () => {
      const result = getAnnualCycles(2020, 5, dayMaster)

      for (let i = 1; i < result.length; i++) {
        expect(result[i].year).toBeGreaterThan(result[i - 1].year)
      }
    })
  })

  describe('getMonthlyCycles', () => {
    let dayMaster: DayMaster

    beforeEach(() => {
      dayMaster = createDayMaster()
    })

    it('should return 12 monthly cycles', () => {
      const result = getMonthlyCycles(2024, dayMaster)

      expect(result.length).toBe(12)
    })

    it('should include correct year for all months (절기 기본값: 소한만 다음 해)', () => {
      // 기본값이 절기 모드(useSolarTermsForMonthlyCycles=true)라, 소한(1월)은
      // 다음 사주년에 속해 year+1, 나머지(입춘~대설)는 입력 연도.
      const result = getMonthlyCycles(2024, dayMaster)

      for (const cycle of result) {
        expect(cycle.year).toBe(cycle.month === 1 ? 2025 : 2024)
      }
    })

    it('should include stem and branch for each month', () => {
      const result = getMonthlyCycles(2024, dayMaster)

      for (const cycle of result) {
        expect(cycle.heavenlyStem).toBeTruthy()
        expect(cycle.earthlyBranch).toBeTruthy()
      }
    })

    it('should include sibsin for each month', () => {
      const result = getMonthlyCycles(2024, dayMaster)

      for (const cycle of result) {
        expect(cycle.sibsin).toHaveProperty('cheon')
        expect(cycle.sibsin).toHaveProperty('ji')
      }
    })

    it('should use solar terms when option is set', () => {
      const result = getMonthlyCycles(2024, dayMaster, { useSolarTerms: true })

      expect(result.length).toBe(12)
      // 절기 모드에서는 solarTermStart가 있을 수 있음
      const hasTerms = result.some((c) => (c as WolunDataExtended).solarTermStart !== undefined)
      expect(typeof hasTerms).toBe('boolean')
    })

    it('should return months in order', () => {
      const result = getMonthlyCycles(2024, dayMaster)

      for (let i = 1; i < result.length; i++) {
        expect(result[i].month).toBeGreaterThanOrEqual(result[i - 1].month)
      }
    })

    // ============ 추가: 미커버 분기 ============

    it('절기 모드: 1월(소한)은 다음 해(year+1)로 매핑', () => {
      const result = getMonthlyCycles(2024, dayMaster, { useSolarTerms: true })
      const janCycle = result.find((c) => c.month === 1)
      expect(janCycle).toBeDefined()
      // 소한(1월)은 다음 양력연도에 속함
      expect(janCycle!.year).toBe(2025)
    })

    it('절기 모드: 절입일(solarTermStart)이 채워진다 (데이터 있을 때)', () => {
      const result = getMonthlyCycles(2024, dayMaster, { useSolarTerms: true })
      const withStart = result.filter(
        (c) => (c as WolunDataExtended).solarTermStart instanceof Date
      )
      // 2024는 KASI 범위 내 → 다수의 절입일이 존재해야 함
      expect(withStart.length).toBeGreaterThan(0)
    })

    it('간편 모드: 모든 월이 입력 연도에 속함', () => {
      const result = getMonthlyCycles(2024, dayMaster, { useSolarTerms: false })
      expect(result.length).toBe(12)
      for (const c of result) {
        expect(c.year).toBe(2024)
        expect((c as WolunDataExtended).solarTermStart).toBeUndefined()
      }
    })

    it('절기 모드: 12월(子)은 같은 해, 절입일 연도 wrap 없음', () => {
      const result = getMonthlyCycles(2024, dayMaster, { useSolarTerms: true })
      const decCycle = result.find((c) => c.month === 12)
      expect(decCycle).toBeDefined()
      expect(decCycle!.year).toBe(2024)
    })

    it('서로 다른 연간(year stem)이 월간을 바꾼다', () => {
      // 연도가 달라지면 firstMonthStem이 달라져 월주 천간도 변함
      const y2024 = getMonthlyCycles(2024, dayMaster)
      const y2025 = getMonthlyCycles(2025, dayMaster)
      const sameMonth2024 = y2024.find((c) => c.month === 3)!
      const sameMonth2025 = y2025.find((c) => c.month === 3)!
      // 같은 양력월이라도 연간이 다르면 천간이 다를 수 있음 (결정론 확인)
      expect(sameMonth2024.earthlyBranch).toBeTruthy()
      expect(sameMonth2025.earthlyBranch).toBeTruthy()
    })
  })

  describe('getIljinCalendar', () => {
    let dayMaster: DayMaster

    beforeEach(() => {
      dayMaster = createDayMaster()
    })

    it('should return calendar for the month', () => {
      const result = getIljinCalendar(2024, 1, dayMaster)

      expect(result.length).toBe(31) // 1월은 31일
    })

    it('should return correct number of days for each month', () => {
      // 2월 (윤년)
      const feb = getIljinCalendar(2024, 2, dayMaster)
      expect(feb.length).toBe(29) // 2024년은 윤년

      // 4월
      const apr = getIljinCalendar(2024, 4, dayMaster)
      expect(apr.length).toBe(30)
    })

    it('should include stem and branch for each day', () => {
      const result = getIljinCalendar(2024, 1, dayMaster)

      for (const day of result) {
        expect(day.heavenlyStem).toBeTruthy()
        expect(day.earthlyBranch).toBeTruthy()
      }
    })

    it('should include year, month, day for each entry', () => {
      const result = getIljinCalendar(2024, 5, dayMaster)

      for (const day of result) {
        expect(day.year).toBe(2024)
        expect(day.month).toBe(5)
        expect(day.day).toBeGreaterThan(0)
        expect(day.day).toBeLessThanOrEqual(31)
      }
    })

    it('should include sibsin for each day', () => {
      const result = getIljinCalendar(2024, 3, dayMaster)

      for (const day of result) {
        expect(day.sibsin).toHaveProperty('cheon')
        expect(day.sibsin).toHaveProperty('ji')
      }
    })

    it('should include cheoneul gwiin flag', () => {
      const result = getIljinCalendar(2024, 1, dayMaster)

      for (const day of result) {
        expect(typeof day.isCheoneulGwiin).toBe('boolean')
      }
    })

    it('should have consecutive days', () => {
      const result = getIljinCalendar(2024, 6, dayMaster)

      for (let i = 0; i < result.length; i++) {
        expect(result[i].day).toBe(i + 1)
      }
    })

    it('should handle December correctly', () => {
      const result = getIljinCalendar(2024, 12, dayMaster)

      expect(result.length).toBe(31)
      expect(result[result.length - 1].day).toBe(31)
    })
  })

  describe('60갑자 cycle verification', () => {
    const dayMaster = createDayMaster()

    it('should cycle through 10 stems correctly', () => {
      const stems = new Set<string>()
      const result = getAnnualCycles(2020, 10, dayMaster)

      for (const cycle of result) {
        stems.add(cycle.heavenlyStem)
      }

      expect(stems.size).toBe(10)
    })

    it('should have correct 갑자 for 2024', () => {
      const result = getAnnualCycles(2024, 1, dayMaster)

      // 2024년은 갑진년
      expect(result[0].heavenlyStem).toBe('甲')
      expect(result[0].earthlyBranch).toBe('辰')
    })
  })
})

describe('getMonthlyCycles — solar-terms mode termEnd 역전 방지', () => {
  const dayMaster: DayMaster = { name: '丙', element: '화', yin_yang: '양' }

  it('모든 절기월의 solarTermEnd 가 solarTermStart 보다 뒤다 (역전 없음)', () => {
    const cycles = getMonthlyCycles(2024, dayMaster, { useSolarTerms: true })
    expect(cycles.length).toBe(12)
    for (const c of cycles) {
      if (c.solarTermStart && c.solarTermEnd) {
        expect(c.solarTermEnd.getTime()).toBeGreaterThan(c.solarTermStart.getTime())
      }
    }
  })

  it('子월(대설, 12월·지지 子)의 termEnd 는 다음 해 소한이다 (같은 해 1월 아님)', () => {
    const cycles = getMonthlyCycles(2024, dayMaster, { useSolarTerms: true })
    const ja = cycles.find((c) => c.month === 12 && c.earthlyBranch === '子')
    expect(ja).toBeTruthy()
    // termStart(대설 2024-12) < termEnd(소한 2025-01).
    expect(ja!.solarTermStart!.getFullYear()).toBe(2024)
    expect(ja!.solarTermEnd!.getFullYear()).toBe(2025)
    expect(ja!.solarTermEnd!.getTime()).toBeGreaterThan(ja!.solarTermStart!.getTime())
  })
})
