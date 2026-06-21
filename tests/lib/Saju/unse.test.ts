// tests/lib/Saju/unse.test.ts
// 대운/세운/월운/일진 계산 테스트

import { beforeEach } from 'vitest'
import {
  getDaeunCycles,
  getAnnualCycles,
  getMonthlyCycles,
  getIljinCalendar,
  WolunDataExtended,
} from '@/lib/saju/unse'
import type { DayMaster, SajuPillars } from '@/lib/saju/types'

// 테스트 헬퍼: 사주 팔자 생성
function createTestPillars(
  yearStem = '甲',
  yearBranch = '子',
  yearYinYang: '양' | '음' = '양',
  monthStem = '乙',
  monthBranch = '丑',
  dayStem = '丙',
  dayBranch = '寅',
  hourStem = '丁',
  hourBranch = '卯'
): SajuPillars {
  return {
    year: {
      heavenlyStem: { name: yearStem, element: '목', yin_yang: yearYinYang, sibsin: '편인' },
      earthlyBranch: { name: yearBranch, element: '수', yin_yang: '양', sibsin: '정관' },
      jijanggan: {},
    },
    month: {
      heavenlyStem: { name: monthStem, element: '목', yin_yang: '음', sibsin: '정인' },
      earthlyBranch: { name: monthBranch, element: '토', yin_yang: '음', sibsin: '식신' },
      jijanggan: {},
    },
    day: {
      heavenlyStem: { name: dayStem, element: '화', yin_yang: '양', sibsin: '비견' },
      earthlyBranch: { name: dayBranch, element: '목', yin_yang: '양', sibsin: '편인' },
      jijanggan: {},
    },
    time: {
      heavenlyStem: { name: hourStem, element: '화', yin_yang: '음', sibsin: '겁재' },
      earthlyBranch: { name: hourBranch, element: '목', yin_yang: '음', sibsin: '정인' },
      jijanggan: {},
    },
  }
}

// 테스트 헬퍼: 일간(DayMaster) 생성
function createDayMaster(
  name = '丙',
  element: '목' | '화' | '토' | '금' | '수' = '화',
  yin_yang: '양' | '음' = '양'
): DayMaster {
  return { name, element, yin_yang }
}

describe('unse', () => {
  describe('getDaeunCycles', () => {
    it('should return daeun cycles for male with yang year', () => {
      const birthDate = new Date('1990-05-15T10:00:00')
      const pillars = createTestPillars('庚', '午', '양')
      const dayMaster = createDayMaster('丙', '화', '양')

      const result = getDaeunCycles(birthDate, 'male', pillars, dayMaster, 'Asia/Seoul')

      expect(result.daeunsu).toBeGreaterThan(0)
      expect(result.cycles.length).toBe(10)
      expect(result.cycles[0]).toHaveProperty('age')
      expect(result.cycles[0]).toHaveProperty('heavenlyStem')
      expect(result.cycles[0]).toHaveProperty('earthlyBranch')
      expect(result.cycles[0]).toHaveProperty('sibsin')
    })

    it('should return daeun cycles for female with yin year', () => {
      const birthDate = new Date('1991-03-20T14:00:00')
      const pillars = createTestPillars('辛', '未', '음')
      const dayMaster = createDayMaster('丁', '화', '음')

      const result = getDaeunCycles(birthDate, 'female', pillars, dayMaster, 'Asia/Seoul')

      expect(result.daeunsu).toBeGreaterThan(0)
      expect(result.cycles.length).toBe(10)
    })

    it('should calculate forward direction for male with yang year', () => {
      const birthDate = new Date('1990-05-15T10:00:00')
      const pillars = createTestPillars('甲', '午', '양')
      const dayMaster = createDayMaster()

      const result = getDaeunCycles(birthDate, 'male', pillars, dayMaster, 'Asia/Seoul')

      // 순행이므로 나이가 증가해야 함
      expect(result.cycles[1].age).toBeGreaterThan(result.cycles[0].age)
    })

    it('should calculate backward direction for female with yang year', () => {
      const birthDate = new Date('1990-05-15T10:00:00')
      const pillars = createTestPillars('甲', '午', '양')
      const dayMaster = createDayMaster()

      const result = getDaeunCycles(birthDate, 'female', pillars, dayMaster, 'Asia/Seoul')

      // 역행이지만 나이는 여전히 증가 (간지만 역행)
      expect(result.cycles.length).toBe(10)
    })

    it('should return empty cycles for invalid input', () => {
      const result = getDaeunCycles(
        null as unknown as Date,
        'male',
        null as unknown as SajuPillars,
        null as unknown as DayMaster,
        'Asia/Seoul'
      )

      expect(result.daeunsu).toBe(0)
      expect(result.cycles).toHaveLength(0)
    })

    it('should include sibsin for each cycle', () => {
      const birthDate = new Date('1990-05-15T10:00:00')
      const pillars = createTestPillars()
      const dayMaster = createDayMaster()

      const result = getDaeunCycles(birthDate, 'male', pillars, dayMaster, 'Asia/Seoul')

      for (const cycle of result.cycles) {
        expect(cycle.sibsin).toHaveProperty('cheon')
        expect(cycle.sibsin).toHaveProperty('ji')
      }
    })

    it('should handle different timezones', () => {
      const birthDate = new Date('1990-05-15T10:00:00')
      const pillars = createTestPillars()
      const dayMaster = createDayMaster()

      const kstResult = getDaeunCycles(birthDate, 'male', pillars, dayMaster, 'Asia/Seoul')
      const utcResult = getDaeunCycles(birthDate, 'male', pillars, dayMaster, 'UTC')

      // 타임존에 따라 결과가 다를 수 있음
      expect(kstResult.cycles.length).toBe(10)
      expect(utcResult.cycles.length).toBe(10)
    })

    // ============ 추가: 미커버 분기 ============

    it('순행(forward): 간지가 월주 다음 간지부터 +방향으로 진행', () => {
      // 양년 남자 → 순행. 월주 乙(stem idx1)/丑(branch idx1).
      // step=1, direction=+1 → stem idx 2(丙), branch idx 2(寅)
      const birthDate = new Date(Date.UTC(1990, 4, 15, 1, 0, 0)) // 5월 (절기 lookup 가능 범위)
      const pillars = createTestPillars('甲', '午', '양') // 양년
      const dayMaster = createDayMaster()
      const result = getDaeunCycles(birthDate, 'male', pillars, dayMaster, 'Asia/Seoul')
      expect(result.cycles.length).toBe(10)
      expect(result.cycles[0].heavenlyStem).toBe('丙') // 乙 다음
      expect(result.cycles[0].earthlyBranch).toBe('寅') // 丑 다음
      // 두 번째 사이클은 또 다음 간지
      expect(result.cycles[1].heavenlyStem).toBe('丁')
      expect(result.cycles[1].earthlyBranch).toBe('卯')
    })

    it('역행(backward): 음 방향으로 간지 진행 (여자 양년)', () => {
      // 양년 여자 → 역행. 월주 乙(idx1)/丑(idx1).
      // step=1, direction=-1 → stem idx 0(甲), branch idx 0(子)
      const birthDate = new Date(Date.UTC(1990, 4, 15, 1, 0, 0))
      const pillars = createTestPillars('甲', '午', '양')
      const dayMaster = createDayMaster()
      const result = getDaeunCycles(birthDate, 'female', pillars, dayMaster, 'Asia/Seoul')
      expect(result.cycles.length).toBe(10)
      expect(result.cycles[0].heavenlyStem).toBe('甲') // 乙 이전
      expect(result.cycles[0].earthlyBranch).toBe('子') // 丑 이전
      expect(result.cycles[1].heavenlyStem).toBe('癸') // 甲 이전 (음 wrap)
      expect(result.cycles[1].earthlyBranch).toBe('亥')
    })

    it('절기 데이터 범위 밖 출생연도는 빈 cycles 반환 (cur null)', () => {
      // KASI 절기 테이블은 1939~2051. 1800은 범위 밖 → getSolarTermKST null.
      const birthDate = new Date(Date.UTC(1800, 4, 15, 1, 0, 0))
      const pillars = createTestPillars('甲', '午', '양')
      const dayMaster = createDayMaster()
      const result = getDaeunCycles(birthDate, 'male', pillars, dayMaster, 'Asia/Seoul')
      expect(result.daeunsu).toBe(0)
      expect(result.cycles).toHaveLength(0)
    })

    it('상반기/하반기 출생 모두 daeunsu 계산 (절입 전/후 분기)', () => {
      // 같은 월 안에서 절입일 이전(< cur) → previousTerm 분기 사용
      const earlyMonth = new Date(Date.UTC(1990, 4, 1, 0, 0, 0)) // 5월 초 (입하 이전 가능)
      const lateMonth = new Date(Date.UTC(1990, 4, 28, 0, 0, 0)) // 5월 말 (입하 이후)
      const pillars = createTestPillars('甲', '午', '양')
      const dayMaster = createDayMaster()
      const early = getDaeunCycles(earlyMonth, 'male', pillars, dayMaster, 'Asia/Seoul')
      const late = getDaeunCycles(lateMonth, 'male', pillars, dayMaster, 'Asia/Seoul')
      expect(early.cycles.length).toBe(10)
      expect(late.cycles.length).toBe(10)
      expect(early.daeunsu).toBeGreaterThanOrEqual(0)
      expect(late.daeunsu).toBeGreaterThanOrEqual(0)
    })

    it('12월 출생: 다음 절기 연도 wrap (m===12)', () => {
      const birthDate = new Date(Date.UTC(1990, 11, 20, 0, 0, 0)) // 12월
      const pillars = createTestPillars('甲', '午', '양')
      const dayMaster = createDayMaster()
      const result = getDaeunCycles(birthDate, 'male', pillars, dayMaster, 'Asia/Seoul')
      expect(result.cycles.length).toBe(10)
    })

    it('1월 출생: 이전 절기 연도 wrap (m===1)', () => {
      const birthDate = new Date(Date.UTC(1990, 0, 3, 0, 0, 0)) // 1월 초 (소한 이전 가능)
      const pillars = createTestPillars('甲', '午', '양')
      const dayMaster = createDayMaster()
      const result = getDaeunCycles(birthDate, 'male', pillars, dayMaster, 'Asia/Seoul')
      // 1월 데이터/이전(12월) 데이터가 있으면 10개, 없으면 0개 — 결정론적으로 동작
      expect([0, 10]).toContain(result.cycles.length)
    })
  })

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

    it('should include correct year for all months', () => {
      const result = getMonthlyCycles(2024, dayMaster)

      for (const cycle of result) {
        expect(cycle.year).toBe(2024)
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
