// astrology/timing/daily.ts
// Daily Transit 해석 wrapper. 사주 일진(日辰) 해석과 mirror.
// 핵심: 트랜짓 차트(현재 시점) × natal 차트의 어스펙트 강조점.

import type { Chart, AspectHit, AspectType } from '../foundation/types'
import { getAspectInterpretation } from '../interpretations'
import type { AstroTimingAnalysis, AstroTimingHighlight } from './types'

const HARD_ASPECTS = new Set<AspectType>(['square', 'opposition'])
const SOFT_ASPECTS = new Set<AspectType>(['trine', 'sextile'])
const NEUTRAL_ASPECTS = new Set<AspectType>(['conjunction'])

function aspectTone(kind: AspectType): 'positive' | 'cautious' | 'mixed' | 'neutral' {
  if (SOFT_ASPECTS.has(kind)) return 'positive'
  if (HARD_ASPECTS.has(kind)) return 'cautious'
  if (NEUTRAL_ASPECTS.has(kind)) return 'mixed'
  return 'neutral'
}

interface DailyInput {
  isoDate: string
  transitChart: Chart
  transitToNatalAspects: AspectHit[]   // 사용자가 미리 계산해 넘김
}

export function interpretDailyTransit(input: DailyInput): AstroTimingAnalysis {
  const { isoDate, transitToNatalAspects } = input
  const highlights: AstroTimingHighlight[] = []

  // Tight aspects (orb ≤ 1°) 만 강조 — daily 단위라 tight 우선
  const tight = transitToNatalAspects
    .filter((a) => a.orb <= 1)
    .sort((a, b) => a.orb - b.orb)
    .slice(0, 5)

  for (const a of tight) {
    const interp = getAspectInterpretation(a.type as never)
    highlights.push({
      source: `${a.from.name}(t) ${a.type} ${a.to.name}(n) — orb ${a.orb.toFixed(2)}°`,
      meaning: interp,
      tone: aspectTone(a.type),
    })
  }

  if (highlights.length === 0) {
    highlights.push({
      source: '오늘 tight transit 없음',
      meaning: '큰 변동 없음. 평이한 흐름.',
      tone: 'neutral',
    })
  }

  return {
    unit: 'daily',
    periodLabel: `Daily ${isoDate}`,
    highlights,
    summary: `${isoDate}: ${highlights[0].source}`,
  }
}
