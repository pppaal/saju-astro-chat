// astrology/timing/decadal.ts
// 점성 측 "장기 시기" 분석 — Zodiacal Releasing 기반.
// 사주 timing/decadal (대운, 10년 단위) 와 cross 가능한 점성 도구.
// ZR period 길이는 행성년수에 따라 8·12·15·19·20·25·27 — 사주 대운 10년과 정확 일치는 X 지만
// "장기 시기 분배"라는 기능은 mirror.

import type { Chart, ZodiacKo } from '../foundation/types'
import {
  calculateZodiacalReleasing,
  getActiveZRPeriod,
  getZRPeriodInterpretation,
  type ZRPeriod,
} from '../foundation/zodiacalReleasing'
import { calculateArabicLots } from '../foundation/arabicParts'
import type { AstroTimingAnalysis, AstroTimingHighlight } from './types'

export interface DecadalAstroOptions {
  isDayChart?: boolean        // 미지정 시 Sun house 로 추정
  startFrom?: 'Spirit' | 'Fortune'  // 기본 Spirit (진로·행적)
  yearsToProject?: number     // 기본 90
  age?: number                // 활성 period 강조용
}

function inferDayChart(chart: Chart): boolean {
  const sun = chart.planets.find((p) => p.name === 'Sun')
  if (!sun) return true
  return sun.house >= 7 && sun.house <= 12
}

export function analyzeDecadalAstro(natal: Chart, options?: DecadalAstroOptions): AstroTimingAnalysis {
  const isDay = options?.isDayChart ?? inferDayChart(natal)
  const startFrom = options?.startFrom ?? 'Spirit'
  const yearsToProject = options?.yearsToProject ?? 90

  const lots = calculateArabicLots(natal, isDay)
  const startLot = lots.find((l) => l.name === startFrom)
  const startSign = (startLot?.sign ?? 'Aries') as ZodiacKo

  const periods: ZRPeriod[] = calculateZodiacalReleasing(startSign, yearsToProject)
  const highlights: AstroTimingHighlight[] = []

  // 활성 period 가 있으면 강조
  if (options?.age != null) {
    const active = getActiveZRPeriod(periods, options.age)
    if (active) {
      highlights.push({
        source: `현재 active ZR (age ${options.age}): ${active.sign} 챕터 (${active.ruler}, ${active.durationYears}년)`,
        meaning: getZRPeriodInterpretation(active),
        tone: 'neutral',
      })
    }
  }

  // 처음 5개 period 미리보기
  for (const p of periods.slice(0, 5)) {
    highlights.push({
      source: `Period ${p.index + 1}: ${p.sign} (${p.ruler})`,
      meaning: getZRPeriodInterpretation(p),
      tone: 'neutral',
    })
  }

  return {
    unit: 'lifetime',  // ZR 은 평생 chronology — lifetime unit 으로 분류
    periodLabel: `ZR from Lot of ${startFrom} (${startSign}, ${isDay ? 'day' : 'night'} chart)`,
    highlights,
    summary: `${periods.length} period 산출. 첫 챕터: ${periods[0]?.sign ?? '없음'} (${periods[0]?.durationYears ?? 0}년).`,
  }
}
