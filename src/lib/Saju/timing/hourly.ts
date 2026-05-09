// Saju/timing/hourly.ts
// 시진 (1시간) 분석 wrapper. astrology/timing/hourly.ts:analyzeHourlyAstro 와 mirror.
// 사주 12시진은 datePillars 에서 시간 기둥 계산 — 본 wrapper 는 thin 노출.

import { getYearPillarForDate, getMonthPillarForDate } from '../foundation/datePillars'
import type { SajuTimingAnalysis, SajuTimingHighlight } from './types'

export interface HourlyInput {
  date: Date
  hourPillar: { stem: string; branch: string }  // 시주 (외부에서 계산해 넘김)
}

export function analyzeHourlySaju(input: HourlyInput): SajuTimingAnalysis {
  const { date, hourPillar } = input
  const yearPillar = getYearPillarForDate(date)
  const monthPillar = getMonthPillarForDate(date)

  const highlights: SajuTimingHighlight[] = [
    {
      source: `시주 ${hourPillar.stem}${hourPillar.branch}`,
      meaning: '해당 시진의 천간·지지 기운.',
      tone: 'neutral',
    },
    {
      source: `년주 ${yearPillar.stem}${yearPillar.branch} / 월주 ${monthPillar.stem}${monthPillar.branch}`,
      meaning: '해당 일자의 년·월주 — 시진 기운의 무대.',
      tone: 'neutral',
    },
  ]

  return {
    unit: 'hourly',
    periodLabel: `Hourly ${date.toISOString()}`,
    highlights,
    summary: `${hourPillar.stem}${hourPillar.branch} 시진 — 년주·월주 무대 위.`,
  }
}
