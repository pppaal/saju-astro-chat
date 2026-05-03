/**
 * Score Context — give numeric scores meaning by comparing to a typical
 * couple distribution. Lightweight heuristic: most couples cluster
 * 55-75 on overall (templates favor "괜찮음" middle band), so a normal
 * approximation with mean 65 / sd 12 covers the bulk.
 *
 * Returns a percentile bucket the user can trust at a glance.
 */

const ERF_A1 = 0.254829592
const ERF_A2 = -0.284496736
const ERF_A3 = 1.421413741
const ERF_A4 = -1.453152027
const ERF_A5 = 1.061405429
const ERF_P = 0.3275911

function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1
  const ax = Math.abs(x)
  const t = 1 / (1 + ERF_P * ax)
  const y =
    1 -
    (((((ERF_A5 * t + ERF_A4) * t) + ERF_A3) * t + ERF_A2) * t + ERF_A1) *
      t *
      Math.exp(-ax * ax)
  return sign * y
}

/** Cumulative normal — proportion of population scoring ≤ x. */
function normalCdf(x: number, mean: number, sd: number): number {
  return 0.5 * (1 + erf((x - mean) / (sd * Math.SQRT2)))
}

export interface ScoreContext {
  /** 0-100 percentile vs typical couples */
  percentile: number
  /** Plain-Korean rank label */
  rankLabel: string
  /** Difference from mean ("+12 vs 평균") */
  vsAverage: string
  /** Color hint for accent */
  accent: 'emerald' | 'cyan' | 'slate' | 'amber'
}

export interface ScoreDistribution {
  mean: number
  sd: number
}

const DISTRIBUTIONS: Record<string, ScoreDistribution> = {
  // Empirical defaults — tuned so middle-band couples (~65) sit at ~50th %ile
  overall: { mean: 65, sd: 12 },
  saju: { mean: 64, sd: 13 },
  astro: { mean: 64, sd: 12 },
  fusion: { mean: 65, sd: 11 },
  cross: { mean: 65, sd: 13 },
  marriage: { mean: 62, sd: 14 },
  longevity: { mean: 63, sd: 13 },
  // 5-dimension fusion subscores tend to spread more
  dayMaster: { mean: 60, sd: 15 },
  sunMoon: { mean: 60, sd: 15 },
  venusMars: { mean: 58, sd: 16 },
  intellectual: { mean: 60, sd: 15 },
  spiritual: { mean: 58, sd: 16 },
}

export function getScoreContext(
  score: number | null | undefined,
  kind: keyof typeof DISTRIBUTIONS = 'overall'
): ScoreContext | null {
  if (score == null || !Number.isFinite(score)) return null
  const dist = DISTRIBUTIONS[kind] || DISTRIBUTIONS.overall
  const safe = Math.max(0, Math.min(100, score))
  const cdf = normalCdf(safe, dist.mean, dist.sd)
  const percentile = Math.round(cdf * 100)
  const diff = safe - dist.mean

  let rankLabel: string
  let accent: ScoreContext['accent']
  if (percentile >= 90) {
    rankLabel = `상위 ${100 - percentile}%`
    accent = 'emerald'
  } else if (percentile >= 75) {
    rankLabel = `상위 ${100 - percentile}%`
    accent = 'cyan'
  } else if (percentile >= 50) {
    rankLabel = '평균 이상'
    accent = 'cyan'
  } else if (percentile >= 30) {
    rankLabel = '평균 근처'
    accent = 'slate'
  } else if (percentile >= 15) {
    rankLabel = '평균 이하'
    accent = 'amber'
  } else {
    rankLabel = `하위 ${percentile}%`
    accent = 'amber'
  }

  const vsAverage =
    diff >= 0 ? `평균 +${Math.round(diff)}점` : `평균 ${Math.round(diff)}점`

  return { percentile, rankLabel, vsAverage, accent }
}
