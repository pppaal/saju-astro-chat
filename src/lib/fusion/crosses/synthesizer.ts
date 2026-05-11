// fusion/crosses/synthesizer.ts
// 사주 측 + 점성 측 → cross consensus 합성.
//
// 핵심 변경 (다수결 → 가중합산):
//   - 'neutral' tone 은 정보 없음으로 간주 (weight 0)
//   - 'positive' = +1, 'cautious' = -1, 'mixed' = 0 (양면)
//   - 가중 평균 → -1..+1 → 0..100 점수 변환
//   - tone bucket 은 score 에서 파생 (back-compat)

import type {
  CrossTone,
  ThemeKey,
  TimingUnit,
} from './types'
import type { SajuThemeAnalysis } from '@/lib/saju/themes/types'
import type { AstroThemeAnalysis } from '@/lib/astrology/themes/types'
import type { SajuTimingAnalysis, SajuTimingTone } from '@/lib/saju/timing/types'
import type { AstroTimingAnalysis, AstroTimingTone } from '@/lib/astrology/timing/types'

type Tone = 'positive' | 'mixed' | 'cautious' | 'neutral'
type FactorLike = { tone: Tone | SajuTimingTone | AstroTimingTone }

function toneValue(t: string): number {
  if (t === 'positive') return 1
  if (t === 'cautious') return -1
  if (t === 'mixed') return 0          // 중립 — 양면
  return 0                              // neutral
}

function toneWeight(t: string): number {
  if (t === 'neutral') return 0         // 정보 없음 → 가중치 0 (편향 안 일으킴)
  if (t === 'mixed') return 0.5         // 양면 — 약한 가중
  return 1                              // positive/cautious — 강한 신호
}

/** factor 들의 weighted score, -1..+1. weight 0이면 0 반환. */
function weightedScore(items: FactorLike[]): number {
  let sum = 0
  let weight = 0
  for (const it of items) {
    const w = toneWeight(it.tone)
    sum += toneValue(it.tone) * w
    weight += w
  }
  if (weight === 0) return 0
  return Math.max(-1, Math.min(1, sum / weight))
}

/** -1..+1 → 0..100 */
function toDisplayScore(normalized: number): number {
  return Math.round((normalized + 1) * 50)
}

/** 합쳐진 점수 → 6-tier tone (UI back-compat) */
function scoreToTone(score: number): CrossTone {
  if (score >= 75) return 'strong-positive'
  if (score >= 60) return 'positive'
  if (score >= 45 && score <= 55) return 'neutral'
  if (score <= 25) return 'strong-negative'
  if (score <= 40) return 'cautious'
  return 'mixed'    // 양극 신호 (사주·점성 엇갈림) — 별도 처리됨
}

export function synthesizeThemeCross(input: {
  theme: ThemeKey
  timing: { unit: TimingUnit; periodLabel?: string }
  sajuTheme: SajuThemeAnalysis
  astroTheme: AstroThemeAnalysis
  sajuTimings?: SajuTimingAnalysis[]
  astroTimings?: AstroTimingAnalysis[]
}): {
  tone: CrossTone
  score: number
  sajuScore: number
  astroScore: number
  consensus: string
  factors: string[]
} {
  const { theme, timing, sajuTheme, astroTheme, sajuTimings = [], astroTimings = [] } = input

  // 모든 factor 합산
  const sajuFactors: FactorLike[] = [
    ...sajuTheme.factors,
    ...sajuTimings.flatMap((t) => t.highlights),
  ]
  const astroFactors: FactorLike[] = [
    ...astroTheme.factors,
    ...astroTimings.flatMap((t) => t.highlights),
  ]

  const sajuScore = weightedScore(sajuFactors)   // -1..+1
  const astroScore = weightedScore(astroFactors) // -1..+1

  // 둘 합치기: 단순 평균. 한쪽 score==0 (정보없음) 면 다른 쪽이 90% 결정
  let combined: number
  const sw = sajuFactors.some(f => f.tone !== 'neutral') ? 1 : 0.1
  const aw = astroFactors.some(f => f.tone !== 'neutral') ? 1 : 0.1
  if (sw + aw === 0) combined = 0
  else combined = (sajuScore * sw + astroScore * aw) / (sw + aw)

  // 사주·점성 엇갈림 감지 (mixed 시그널)
  const isContrast = Math.abs(sajuScore - astroScore) > 0.7
  const score = toDisplayScore(combined)
  const tone: CrossTone = isContrast && Math.abs(combined) < 0.3
    ? 'mixed'
    : scoreToTone(score)

  // narrative
  const periodLabel = timing.periodLabel ?? timing.unit
  const sajuLabel = sajuScore > 0.3 ? '우호' : sajuScore < -0.3 ? '주의' : '평이'
  const astroLabel = astroScore > 0.3 ? '우호' : astroScore < -0.3 ? '주의' : '평이'

  let consensus: string
  if (tone === 'strong-positive') {
    consensus = `${theme} × ${periodLabel}: 사주·점성 모두 강하게 우호 (${score}점) — 길.`
  } else if (tone === 'strong-negative') {
    consensus = `${theme} × ${periodLabel}: 사주·점성 모두 강하게 주의 (${score}점) — 신중.`
  } else if (tone === 'mixed') {
    consensus = `${theme} × ${periodLabel}: 사주(${sajuLabel}) vs 점성(${astroLabel}) 양면 (${score}점) — 분별 필요.`
  } else if (tone === 'positive') {
    consensus = `${theme} × ${periodLabel}: 우호 (${score}점).`
  } else if (tone === 'cautious') {
    consensus = `${theme} × ${periodLabel}: 주의 (${score}점).`
  } else {
    consensus = `${theme} × ${periodLabel}: 평이 (${score}점).`
  }

  const factors = [
    `사주 ${theme}: ${sajuTheme.summary} (점수 ${toDisplayScore(sajuScore)})`,
    `점성 ${theme}: ${astroTheme.summary} (점수 ${toDisplayScore(astroScore)})`,
  ]
  for (const t of sajuTimings) factors.push(`사주 ${t.unit}: ${t.summary}`)
  for (const t of astroTimings) factors.push(`점성 ${t.unit}: ${t.summary}`)

  return { tone, score, sajuScore, astroScore, consensus, factors }
}
