// astrology/timing/lifetime.ts
// Secondary Progressions 해석 wrapper. 사주에는 직접 대응이 없는 점성 단독 단위.
// 1일=1년 비례로 평생 진행을 보는 방식.

import type { ProgressedChart, Chart, AspectType } from '../foundation/types'
import {
  getProgressionSummary,
  findProgressedToNatalAspects,
  findProgressedMoonAspects,
} from '../foundation/progressions'
import { getAspectInterpretation } from '../interpretations'
import type { AstroTimingAnalysis, AstroTimingHighlight, AstroTimingTone } from './types'

const HARD_ASPECTS = new Set<AspectType>(['square', 'opposition'])
const SOFT_ASPECTS = new Set<AspectType>(['trine', 'sextile'])

function aspectTone(kind: AspectType): AstroTimingTone {
  if (SOFT_ASPECTS.has(kind)) return 'positive'
  if (HARD_ASPECTS.has(kind)) return 'cautious'
  return 'mixed'
}

function angleToAspectType(angle: number): AspectType | null {
  const a = Math.round(angle)
  if (a === 0) return 'conjunction'
  if (a === 60) return 'sextile'
  if (a === 90) return 'square'
  if (a === 120) return 'trine'
  if (a === 180) return 'opposition'
  return null
}

export function interpretProgression(progressed: ProgressedChart, natal: Chart): AstroTimingAnalysis {
  const base = getProgressionSummary(progressed)
  const highlights: AstroTimingHighlight[] = []

  highlights.push({
    source: `Progressed ASC ${base.asc} | Progressed MC ${base.mc}`,
    meaning: `${base.type === 'secondary' ? 'Secondary Progression' : 'Solar Arc Direction'} 기준 평생 진행 결.`,
    tone: 'neutral',
  })

  // Progressed → Natal aspects (가장 영향 큰 단위)
  const aspectsByPlanet = findProgressedToNatalAspects(progressed, natal)
  for (const planet of aspectsByPlanet) {
    for (const a of planet.aspects.slice(0, 2)) {
      // angle은 라이브러리 내부 표현 — 표시용으로만 보존
      highlights.push({
        source: `Progressed ${planet.planet} → natal ${a.target} (${a.angle}°)`,
        meaning: `진행 행성과 출생 행성의 만남 — 평생 단위 변환점.`,
        tone: 'mixed',
      })
    }
  }

  // Progressed Moon — 28-29년 주기, 가장 빠른 progression 시그널
  const moonAspects = findProgressedMoonAspects(progressed, natal)
  for (const a of moonAspects.slice(0, 3)) {
    const kind = angleToAspectType(a.angle)
    highlights.push({
      source: `Progressed Moon ${kind ?? `${a.angle}°`} natal ${a.target}`,
      meaning: kind ? getAspectInterpretation(kind as never) : '진행 달 주기 — 정서·일상의 변환점.',
      tone: kind ? aspectTone(kind) : 'mixed',
    })
  }

  return {
    unit: 'lifetime',
    periodLabel: `Progression ${base.progressedDate} (${base.type})`,
    highlights,
    summary: `${base.progressedDate} 진행 — ${highlights.length}개 transit 포인트.`,
  }
}
