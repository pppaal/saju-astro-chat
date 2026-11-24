/**
 * 연운/월운/일진 single-source 교차검증.
 *
 * CONSOLIDATION: getAnnualCycles / getMonthlyCycles / getIljinCalendar 의
 * stem-branch 산술이 saju.ts(standalone export + calculateSajuData 내부 inline
 * 블록) 와 unse.ts 에 각각 복제돼 있던 것을 cycles.ts(single source) 로 합쳤다.
 *
 * 이 테스트는:
 *  (a) saju.getAnnualCycles == unse.getAnnualCycles  (byte 동일)
 *  (b) saju.getIljinCalendar == unse.getIljinCalendar (byte 동일)
 *  (c) cycles.ts 의 canonical 구현이 두 경로와 모두 일치
 *  (d) saju 의 사주월(寅-first) 월운 == cycles.getSajuMonthlyCycles
 *      (unse.getMonthlyCycles 는 양력월(丑-first)/절기 convention 이라 값이
 *       다르므로 의도적으로 합치지 않음 — 그 분리를 명시적으로 잠근다.)
 * 누가 한쪽 산식만 바꾸면 깨진다.
 */

import { describe, expect, it } from 'vitest'
import {
  getAnnualCycles as annualFromSaju,
  getMonthlyCycles as monthlyFromSaju,
  getIljinCalendar as iljinFromSaju,
} from '@/lib/saju/saju'
import {
  getAnnualCycles as annualFromUnse,
  getMonthlyCycles as monthlyFromUnse,
  getIljinCalendar as iljinFromUnse,
} from '@/lib/saju/unse'
import {
  getAnnualCycles as annualCanonical,
  getSajuMonthlyCycles as monthlyCanonical,
  getIljinCalendar as iljinCanonical,
} from '@/lib/saju/cycles'
import type { DayMaster } from '@/lib/saju/types'

const DAY_MASTERS: ReadonlyArray<DayMaster> = [
  { name: '丙', element: '화', yin_yang: '양' },
  { name: '戊', element: '토', yin_yang: '양' },
  { name: '癸', element: '수', yin_yang: '음' },
  { name: '甲', element: '목', yin_yang: '양' },
]

const YEARS: ReadonlyArray<number> = [1940, 1984, 2000, 2020, 2024, 2025, 2050]
const ILJIN_MONTHS: ReadonlyArray<[number, number]> = [
  [1984, 2],
  [2020, 2],
  [2024, 1],
  [2024, 4],
  [2025, 12],
  [2050, 6],
]

describe('cycles single-source 교차검증', () => {
  it('getAnnualCycles: saju == unse == cycles (byte 동일)', () => {
    for (const dm of DAY_MASTERS) {
      for (const y of YEARS) {
        const sa = JSON.stringify(annualFromSaju(y, 8, dm))
        const un = JSON.stringify(annualFromUnse(y, 8, dm))
        const ca = JSON.stringify(annualCanonical(y, 8, dm))
        expect(sa).toBe(un)
        expect(sa).toBe(ca)
      }
    }
  })

  it('getIljinCalendar: saju == unse == cycles (byte 동일)', () => {
    for (const dm of DAY_MASTERS) {
      for (const [y, m] of ILJIN_MONTHS) {
        const sa = JSON.stringify(iljinFromSaju(y, m, dm))
        const un = JSON.stringify(iljinFromUnse(y, m, dm))
        const ca = JSON.stringify(iljinCanonical(y, m, dm))
        expect(sa).toBe(un)
        expect(sa).toBe(ca)
      }
    }
  })

  it('사주월(寅-first) 월운: saju == cycles.getSajuMonthlyCycles', () => {
    for (const dm of DAY_MASTERS) {
      for (const y of YEARS) {
        const sa = JSON.stringify(monthlyFromSaju(y, dm))
        const ca = JSON.stringify(monthlyCanonical(y, dm))
        expect(sa).toBe(ca)
      }
    }
  })

  it('unse 월운(丑-first/절기)은 사주월(寅-first)과 의도적으로 다르다', () => {
    const dm = DAY_MASTERS[0]
    // 월 1 의 지지: 사주월 = 寅, 양력월(unse 기본) = 丑.
    const saju = monthlyFromSaju(2024, dm)
    const unse = monthlyFromUnse(2024, dm)
    expect(saju[0].earthlyBranch).toBe('寅')
    expect(unse[0].earthlyBranch).toBe('丑')
  })
})
