// Saju/timing/hourly.ts
// 시진 (1시간) 분석 wrapper. astrology/timing/hourly.ts:analyzeHourlyAstro 와 mirror.

import { getYearPillarForDate, getMonthPillarForDate } from '../foundation/datePillars'
import {
  getSibsinInterpretation,
  getTwelveStageInterpretation,
} from '../interpretations'
import { getTwelveStage } from '../foundation/shinsal'
import type { SajuTimingAnalysis, SajuTimingHighlight, SajuTimingTone } from './types'

// 일간 기준 시간 천간 → 십신 산식 (실제 정밀 계산은 datePillars 의 getHourPillar 등 사용 가능 —
// 본 wrapper 는 caller 가 시주 + dayMaster 넘겨주는 패턴)
import { getStemElement, getStemYinYang } from '../foundation/stemBranchUtils'

const FIVE_ELEMENT_RELATIONS_KO = {
  same: { samePolarity: '비견', diffPolarity: '겁재' },
  generate: { samePolarity: '식신', diffPolarity: '상관' },
  controlled: { samePolarity: '편재', diffPolarity: '정재' },
  controls: { samePolarity: '편관', diffPolarity: '정관' },
  born: { samePolarity: '편인', diffPolarity: '정인' },
}

const ELEMENT_GENERATES: Record<string, string> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }
const ELEMENT_CONTROLS: Record<string, string> = { 목: '토', 화: '금', 토: '수', 금: '목', 수: '화' }

function calcSibsin(dayMaster: string, target: string): string {
  const dayEl = getStemElement(dayMaster)
  const targetEl = getStemElement(target)
  const dayYinYang = getStemYinYang(dayMaster)
  const targetYinYang = getStemYinYang(target)
  const same = dayYinYang === targetYinYang
  if (dayEl === targetEl) return same ? '비견' : '겁재'
  if (ELEMENT_GENERATES[dayEl] === targetEl) return same ? '식신' : '상관'
  if (ELEMENT_CONTROLS[dayEl] === targetEl) return same ? '편재' : '정재'
  if (ELEMENT_GENERATES[targetEl] === dayEl) return same ? '편인' : '정인'
  if (ELEMENT_CONTROLS[targetEl] === dayEl) return same ? '편관' : '정관'
  return '비견'
}

function toneFromSibsin(sibsin: string): SajuTimingTone {
  if (['정관', '정인', '정재', '식신'].includes(sibsin)) return 'positive'
  if (['편관', '상관', '겁재'].includes(sibsin)) return 'cautious'
  return 'neutral'
}

export interface HourlyInput {
  date: Date
  hourPillar: { stem: string; branch: string }   // 시주 (외부에서 계산해 넘김)
  dayMaster: string                               // 일간
}

export function analyzeHourlySaju(input: HourlyInput): SajuTimingAnalysis {
  const { date, hourPillar, dayMaster } = input
  const yearPillar = getYearPillarForDate(date)
  const monthPillar = getMonthPillarForDate(date)

  const stemSibsin = calcSibsin(dayMaster, hourPillar.stem)
  const stemInterp = getSibsinInterpretation(stemSibsin as never)
  const stage = getTwelveStage(dayMaster, hourPillar.branch)
  const stageInterp = getTwelveStageInterpretation(stage as never)

  const highlights: SajuTimingHighlight[] = [
    {
      source: `시주 ${hourPillar.stem}${hourPillar.branch}`,
      meaning: '해당 시진의 천간·지지 기운.',
      tone: 'neutral',
    },
    {
      source: `시간 ${hourPillar.stem} (십신: ${stemSibsin})`,
      meaning: stemInterp
        ? `${stemInterp.name} — ${stemInterp.meaning ?? ''}`
        : `${stemSibsin} 작용`,
      tone: toneFromSibsin(stemSibsin),
    },
    {
      source: `12운성: ${stage}`,
      meaning: stageInterp
        ? `${stageInterp.name ?? stage} — ${stageInterp.meaning ?? ''}`
        : `${stage} 단계`,
      tone: ['장생', '관대', '임관', '제왕'].includes(stage) ? 'positive'
          : ['병', '사', '묘', '절'].includes(stage) ? 'cautious'
          : 'neutral',
    },
    {
      source: `년주 ${yearPillar.stem}${yearPillar.branch} / 월주 ${monthPillar.stem}${monthPillar.branch}`,
      meaning: '해당 일자의 년·월주 — 시진 기운의 무대.',
      tone: 'neutral',
    },
  ]

  return {
    unit: 'hourly',
    periodLabel: `${date.toISOString()} 시진 ${hourPillar.stem}${hourPillar.branch}`,
    highlights,
    summary: `${hourPillar.stem}${hourPillar.branch} — ${stemSibsin}, 12운성 ${stage}`,
  }
}
