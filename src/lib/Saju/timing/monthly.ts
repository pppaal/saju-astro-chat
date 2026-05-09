// Saju/timing/monthly.ts
// 월운 (1개월) 분석 wrapper. astrology/timing/monthly.ts:analyzeMonthlyAstro 와 mirror.
//
// 공개:
//   getMonthlyCyclesRaw  — raw 12개월 cycle (foundation/unse 의 getMonthlyCycles 노출)
//   analyzeMonthlySaju   — 한 달치 데이터 → SajuTimingAnalysis (highlight + summary)

import type { WolunDataExtended } from '../foundation/unse'
import { getMonthlyCycles } from '../foundation/unse'
import {
  getSibsinInterpretation,
  getTwelveStageInterpretation,
} from '../interpretations'
import { getTwelveStage } from '../foundation/shinsal'
import type { SajuTimingAnalysis, SajuTimingHighlight, SajuTimingTone } from './types'

export type { WolunDataExtended }
export { getMonthlyCycles as getMonthlyCyclesRaw }

function toneFromSibsin(sibsin: string): SajuTimingTone {
  if (['정관', '정인', '정재', '식신'].includes(sibsin)) return 'positive'
  if (['편관', '상관', '겁재'].includes(sibsin)) return 'cautious'
  return 'neutral'
}

export interface MonthlyInput {
  month: WolunDataExtended
  dayMaster: string  // 일간 (예: '갑', '甲')
}

export function analyzeMonthlySaju(input: MonthlyInput): SajuTimingAnalysis {
  const { month, dayMaster } = input
  const highlights: SajuTimingHighlight[] = []

  const stemSibsin = month.sibsin.cheon
  const branchSibsin = month.sibsin.ji
  const sibsinInterp = getSibsinInterpretation(stemSibsin as never)
  highlights.push({
    source: `월간 ${month.heavenlyStem} (십신: ${stemSibsin})`,
    meaning: sibsinInterp
      ? `${sibsinInterp.name} — ${sibsinInterp.meaning ?? ''}`
      : `${stemSibsin} 작용`,
    tone: toneFromSibsin(stemSibsin),
  })

  const branchInterp = getSibsinInterpretation(branchSibsin as never)
  highlights.push({
    source: `월지 ${month.earthlyBranch} (십신: ${branchSibsin})`,
    meaning: branchInterp
      ? `${branchInterp.name} — ${branchInterp.meaning ?? ''}`
      : `${branchSibsin} 작용`,
    tone: toneFromSibsin(branchSibsin),
  })

  // 일간 기준 12운성 — 월지가 일간을 어느 단계로 받는가
  const stage = getTwelveStage(dayMaster, month.earthlyBranch)
  const stageInterp = getTwelveStageInterpretation(stage as never)
  if (stageInterp) {
    highlights.push({
      source: `12운성: ${stage}`,
      meaning: `${stageInterp.name ?? stage} — ${stageInterp.meaning ?? ''}`,
      tone: ['장생', '관대', '임관', '제왕'].includes(stage) ? 'positive'
          : ['병', '사', '묘', '절'].includes(stage) ? 'cautious'
          : 'neutral',
    })
  }

  if (month.solarTermStart) {
    highlights.push({
      source: `절기월: ${month.solarTermStart.toISOString().slice(0, 10)} 입절`,
      meaning: '절기 기준 월 시작점 — 기운 전환 분기.',
      tone: 'neutral',
    })
  }

  return {
    unit: 'monthly',
    periodLabel: `${month.year}-${String(month.month).padStart(2, '0')} 월운 ${month.heavenlyStem}${month.earthlyBranch}`,
    highlights,
    summary: `${month.year}.${month.month} ${month.heavenlyStem}${month.earthlyBranch} — ${stemSibsin}/${branchSibsin}, 12운성 ${stage}`,
  }
}
