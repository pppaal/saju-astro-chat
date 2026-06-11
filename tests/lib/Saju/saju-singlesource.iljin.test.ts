/**
 * 일진(日辰) single-source 교차검증.
 *
 * STEP 2 consolidation: 일간/일지 산정 공식은 dayPillar.ts 의
 * computeDayPillarIndices(JDN+49) 한 곳만 정답으로 둔다. 이전엔 unse.ts 의
 * getIljinCalendar 가 1984-02-04 KST 기준 epoch-days 공식을 따로 들고 있어
 * (calculateSajuData / dayPillar 와는 다른 산식) 한쪽만 고치면 일진이 갈라질
 * 위험이 있었다.
 *
 * 이 테스트는 (a) unse.getIljinCalendar 의 각 날 간지가
 * computeDayPillarIndices 와 정확히 일치하고, (b) saju.ts 의 standalone
 * getIljinCalendar 와도 byte-단위로 동일함을 — 1940~2050 경계 포함 — 잠근다.
 * 누가 한쪽 공식만 바꾸면 깨진다.
 */

import { describe, expect, it } from 'vitest'
import { getIljinCalendar as iljinFromUnse } from '@/lib/saju/unse'
import { getIljinCalendar as iljinFromSaju } from '@/lib/saju/saju'
import { computeDayPillarIndices } from '@/lib/saju/dayPillar'
import { STEMS, BRANCHES } from '@/lib/saju/constants'
import type { DayMaster } from '@/lib/saju/types'

const DAY_MASTER: DayMaster = { name: '丙', element: '화', yin_yang: '양' }

// 윤년 2월, 31/30일 월, 12월, 그리고 지원범위 끝단(1940/2050) 포함.
const SAMPLE_MONTHS: ReadonlyArray<[number, number]> = [
  [1940, 1],
  [1984, 2], // epoch base 가 들어있는 달
  [2024, 1],
  [2024, 2], // 윤년 29일
  [2023, 2], // 평년 28일
  [2024, 4], // 30일
  [2024, 12],
  [2050, 12],
]

describe('일진 single-source — dayPillar(JDN) 가 유일한 산식', () => {
  it.each(SAMPLE_MONTHS)(
    'unse.getIljinCalendar(%i-%i) 의 각 날이 computeDayPillarIndices 와 일치',
    (year, month) => {
      const cal = iljinFromUnse(year, month, DAY_MASTER)
      // 날짜 수 = 그레고리력 일수.
      const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
      expect(cal).toHaveLength(daysInMonth)

      for (const entry of cal) {
        const { stemIndex, branchIndex } = computeDayPillarIndices(year, month, entry.day)
        expect(entry.heavenlyStem).toBe(STEMS[stemIndex].name)
        expect(entry.earthlyBranch).toBe(BRANCHES[branchIndex].name)
      }
    }
  )

  it.each(SAMPLE_MONTHS)(
    'unse.getIljinCalendar(%i-%i) == saju.getIljinCalendar (이전 divergent 두 공식이 합쳐짐)',
    (year, month) => {
      const a = iljinFromUnse(year, month, DAY_MASTER)
      const b = iljinFromSaju(year, month, DAY_MASTER)
      expect(a).toHaveLength(b.length)
      for (let i = 0; i < a.length; i++) {
        expect(a[i].day).toBe(b[i].day)
        expect(a[i].heavenlyStem).toBe(b[i].heavenlyStem)
        expect(a[i].earthlyBranch).toBe(b[i].earthlyBranch)
      }
    }
  )
})
