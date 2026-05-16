// Saju/timing/daily.ts
// 일진 (1일) 분석 wrapper. astrology/timing/daily.ts:analyzeDailyAstro 와 mirror.

import type { IljinData } from '../types'
import { getIljinCalendar } from '../unse'
import {
  getSibsinInterpretation,
  getTwelveStageInterpretation,
} from '../interpretations'
import { getTwelveStage } from '../shinsal'
import type { SajuTimingAnalysis, SajuTimingHighlight, SajuTimingTone } from './types'

export type { IljinData }
export { getIljinCalendar as getIljinCalendarRaw }

function toneFromSibsin(sibsin: string): SajuTimingTone {
  if (['정관', '정인', '정재', '식신'].includes(sibsin)) return 'positive'
  if (['편관', '상관', '겁재'].includes(sibsin)) return 'cautious'
  return 'neutral'
}

export interface DailyInput {
  iljin: IljinData
  dayMaster: string
}

export function analyzeDailySaju(input: DailyInput): SajuTimingAnalysis {
  const { iljin, dayMaster } = input
  const highlights: SajuTimingHighlight[] = []

  const stemSibsin = iljin.sibsin.cheon
  const branchSibsin = iljin.sibsin.ji
  const stemInterp = getSibsinInterpretation(stemSibsin as never)
  const branchInterp = getSibsinInterpretation(branchSibsin as never)

  highlights.push({
    source: `일주 ${iljin.heavenlyStem}${iljin.earthlyBranch}`,
    meaning: '오늘의 60갑자 일진.',
    tone: 'neutral',
  })

  highlights.push({
    source: `일진 천간 ${iljin.heavenlyStem} (십신: ${stemSibsin})`,
    meaning: stemInterp
      ? `${stemInterp.name} — ${stemInterp.meaning ?? ''}`
      : `${stemSibsin} 작용`,
    tone: toneFromSibsin(stemSibsin),
  })

  highlights.push({
    source: `일진 지지 ${iljin.earthlyBranch} (십신: ${branchSibsin})`,
    meaning: branchInterp
      ? `${branchInterp.name} — ${branchInterp.meaning ?? ''}`
      : `${branchSibsin} 작용`,
    tone: toneFromSibsin(branchSibsin),
  })

  const stage = getTwelveStage(dayMaster, iljin.earthlyBranch)
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

  if (iljin.isCheoneulGwiin) {
    highlights.push({
      source: '천을귀인',
      meaning: '오늘은 천을귀인 — 귀인의 도움·중요 일 처리에 길.',
      tone: 'positive',
    })
  }

  return {
    unit: 'daily',
    periodLabel: `${iljin.year}-${String(iljin.month).padStart(2, '0')}-${String(iljin.day).padStart(2, '0')} 일진 ${iljin.heavenlyStem}${iljin.earthlyBranch}`,
    highlights,
    summary: `${iljin.heavenlyStem}${iljin.earthlyBranch} 일진 — 천간 ${stemSibsin}, 지지 ${branchSibsin}, 12운성 ${stage}${iljin.isCheoneulGwiin ? ', 천을귀인' : ''}`,
  }
}
