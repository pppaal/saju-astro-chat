// Saju/sajuLayers.ts
// 사주 엔진 — 특정 날짜·시간의 모든 타이밍 layer 를 한 번에 반환.
//
// fusion adapter (forCalendar 등) 가 raw 계산 함수를 직접 호출하는 대신,
// 이 파일을 통해 "그 날·그 시각의 사주 layer 들"을 받아 쓰도록 한다.
//
// natal 4기둥 + 대운 list 는 calculateSajuData() 에서 받아 별도로 들고 있고,
// 이 함수는 그것을 입력으로 받아 그 시점의 layer 들을 계산한다.

import { getIljinCalendar, getMonthlyCycles } from './foundation/unse'
import { getYearPillarForDate } from './foundation/datePillars'
import { STEMS, TIME_STEM_LOOKUP } from './foundation/constants'
import { getTimeBranchFromHour } from './foundation/validation'
import { analyzeDailySaju } from './timing/daily'
import { analyzeMonthlySaju } from './timing/monthly'
import { analyzeHourlySaju } from './timing/hourly'
import type { DayMaster, IljinData, WolunData } from './foundation/types'
import type { SajuTimingAnalysis } from './timing/types'

const STEM_NAMES = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
const BRANCH_NAMES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']

export interface SajuLayersInput {
  /** 일간 (예: '辛') */
  dayMaster: string
  /** 그 사람 대운 list (calculateSajuData 결과의 daeWoon.list) */
  daeunList?: Array<{ stem: string; branch: string; startAge: number }>
  /** 출생년도 (세운 계산용) */
  birthYear?: number
  /** 그 시점 만나이 */
  age?: number
  /** 목표 시점 */
  year: number
  month: number      // 1-12
  day?: number       // 1-31, 미지정 시 day/hourly 미산출
  hour?: number      // 0-23, 미지정 시 hourly 미산출
}

export interface SajuLayersBundle {
  decadal?: SajuTimingAnalysis    // 대운 (10년)
  yearly?: SajuTimingAnalysis     // 세운 (1년)
  monthly?: SajuTimingAnalysis    // 월운 (1개월)
  daily?: SajuTimingAnalysis      // 일진 (1일) — day 지정 시
  hourly?: SajuTimingAnalysis     // 시진 (1시간) — hour 지정 시
  /** 그 날 일진 raw (label·신살용) */
  iljinRaw?: IljinData
  /** 그 시각 시주 raw */
  hourPillar?: { stem: string; branch: string }
}

function getDayMasterObj(stemName: string): DayMaster | null {
  const found = STEMS.find((s) => s.name === stemName)
  return found ? (found as DayMaster) : null
}

function calcHourPillar(dayStem: string, hour: number): { stem: string; branch: string } | null {
  const firstHourStem = TIME_STEM_LOOKUP[dayStem]
  if (!firstHourStem) return null
  const branch = getTimeBranchFromHour(hour)
  const branchIdx = BRANCH_NAMES.indexOf(branch)
  const stemStartIdx = STEM_NAMES.indexOf(firstHourStem)
  if (stemStartIdx < 0 || branchIdx < 0) return null
  return { stem: STEM_NAMES[(stemStartIdx + branchIdx) % 10], branch }
}

/**
 * 그 시점의 사주 모든 layer 를 한 번에 반환.
 *
 * 호출 예:
 *   getSajuLayersForDate({
 *     dayMaster: '辛', daeunList, birthYear: 1995, age: 31,
 *     year: 2026, month: 5, day: 15, hour: 12,
 *   })
 */
export function getSajuLayersForDate(input: SajuLayersInput): SajuLayersBundle {
  const bundle: SajuLayersBundle = {}
  const dm = getDayMasterObj(input.dayMaster)
  if (!dm) return bundle

  // 대운 (decadal) — daeunList + age 제공 시 활성 period
  if (input.daeunList && input.age != null) {
    const active = input.daeunList.find(
      (d) => input.age! >= d.startAge && input.age! < d.startAge + 10,
    )
    if (active) {
      bundle.decadal = {
        unit: 'decadal',
        periodLabel: `대운 ${active.stem}${active.branch} (age ${active.startAge}-${active.startAge + 9})`,
        highlights: [{
          source: `대운 ${active.stem}${active.branch}`,
          meaning: `${active.startAge}-${active.startAge + 9}세 대운 — ${active.stem}${active.branch} 10년 backdrop.`,
          tone: 'neutral',
        }],
        summary: `대운 ${active.stem}${active.branch}`,
      }
    }
  }

  // 세운 (yearly) — 입춘 절기 boundary 정확 (KASI)
  if (input.birthYear != null) {
    try {
      const sampleDate = new Date(input.year, input.month - 1, input.day ?? 15)
      const yp = getYearPillarForDate(sampleDate)
      bundle.yearly = {
        unit: 'yearly',
        periodLabel: `세운 ${input.year} ${yp.stem}${yp.branch}`,
        highlights: [{
          source: `세운 ${yp.stem}${yp.branch}`,
          meaning: `${input.year}년 천간 ${yp.stem}, 지지 ${yp.branch} — 본명과 작용.`,
          tone: 'neutral',
        }],
        summary: `${input.year} 세운 ${yp.stem}${yp.branch}`,
      }
    } catch { /* skip */ }
  }

  // 월운 (monthly)
  try {
    const monthCycles = getMonthlyCycles(input.year, dm) as WolunData[]
    const thisMonth = monthCycles.find((m) => m.month === input.month)
    if (thisMonth) {
      bundle.monthly = analyzeMonthlySaju({ month: thisMonth, dayMaster: input.dayMaster })
    }
  } catch { /* skip */ }

  // 일진 (daily) — day 제공 시
  if (input.day != null) {
    try {
      const iljins = getIljinCalendar(input.year, input.month, dm)
      const iljin = iljins.find((i) => i.day === input.day)
      if (iljin) {
        bundle.iljinRaw = iljin
        bundle.daily = analyzeDailySaju({ iljin, dayMaster: input.dayMaster })
      }
    } catch { /* skip */ }
  }

  // 시진 (hourly) — hour 제공 시
  if (input.hour != null && input.day != null) {
    const hp = calcHourPillar(input.dayMaster, input.hour)
    if (hp) {
      bundle.hourPillar = hp
      try {
        const dt = new Date(input.year, input.month - 1, input.day, input.hour, 0, 0)
        bundle.hourly = analyzeHourlySaju({ date: dt, hourPillar: hp, dayMaster: input.dayMaster })
      } catch { /* skip */ }
    }
  }

  return bundle
}

/**
 * 그 달의 모든 일진을 한 번에 가져오기 (월 캘린더용).
 * 30번 getIljinCalendar 호출 피하기 위한 batch 헬퍼.
 */
export function getSajuMonthDailyLayers(input: {
  dayMaster: string
  year: number
  month: number
}): Map<string, { daily: SajuTimingAnalysis; iljinRaw: IljinData }> {
  const map = new Map<string, { daily: SajuTimingAnalysis; iljinRaw: IljinData }>()
  const dm = getDayMasterObj(input.dayMaster)
  if (!dm) return map
  try {
    const iljins = getIljinCalendar(input.year, input.month, dm)
    for (const iljin of iljins) {
      const date = `${iljin.year}-${String(iljin.month).padStart(2, '0')}-${String(iljin.day).padStart(2, '0')}`
      map.set(date, {
        daily: analyzeDailySaju({ iljin, dayMaster: input.dayMaster }),
        iljinRaw: iljin,
      })
    }
  } catch { /* skip */ }
  return map
}
