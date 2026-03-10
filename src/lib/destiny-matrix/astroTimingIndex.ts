import type { MatrixCalculationInput, TransitCycle } from './types'

export interface AstroTimingIndex {
  decade: number
  annual: number
  monthly: number
  daily: number
  confidence: number
  evidenceCount: number
}

type HorizonKey = 'decade' | 'annual' | 'monthly' | 'daily'

const TRANSIT_WEIGHTS: Record<TransitCycle, Record<HorizonKey, number>> = {
  saturnReturn: { decade: 0.32, annual: 0.25, monthly: 0.08, daily: 0.03 },
  jupiterReturn: { decade: 0.12, annual: 0.32, monthly: 0.15, daily: 0.04 },
  uranusSquare: { decade: 0.35, annual: 0.18, monthly: 0.08, daily: 0.02 },
  neptuneSquare: { decade: 0.35, annual: 0.18, monthly: 0.06, daily: 0.02 },
  plutoTransit: { decade: 0.45, annual: 0.2, monthly: 0.07, daily: 0.01 },
  nodeReturn: { decade: 0.14, annual: 0.28, monthly: 0.14, daily: 0.04 },
  eclipse: { decade: 0.08, annual: 0.2, monthly: 0.28, daily: 0.18 },
  mercuryRetrograde: { decade: 0.02, annual: 0.06, monthly: 0.2, daily: 0.36 },
  venusRetrograde: { decade: 0.03, annual: 0.08, monthly: 0.22, daily: 0.28 },
  marsRetrograde: { decade: 0.05, annual: 0.1, monthly: 0.24, daily: 0.2 },
  jupiterRetrograde: { decade: 0.06, annual: 0.12, monthly: 0.2, daily: 0.12 },
  saturnRetrograde: { decade: 0.08, annual: 0.16, monthly: 0.22, daily: 0.1 },
}

const ADVANCED_SIGNAL_WEIGHTS: Record<string, Partial<Record<HorizonKey, number>>> = {
  solarReturn: { annual: 0.22, monthly: 0.08 },
  lunarReturn: { monthly: 0.22, daily: 0.12 },
  progressions: { decade: 0.2, annual: 0.16 },
  draconic: { decade: 0.08, annual: 0.06 },
  harmonics: { annual: 0.06, monthly: 0.05 },
  fixedStars: { decade: 0.05, annual: 0.05 },
  eclipses: { annual: 0.14, monthly: 0.16, daily: 0.08 },
  midpoints: { monthly: 0.1, daily: 0.1 },
  asteroids: { monthly: 0.05 },
  extraPoints: { monthly: 0.04, daily: 0.04 },
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000
}

function hasSignalValue(value: unknown): boolean {
  if (value === true) return true
  if (typeof value === 'number') return Number.isFinite(value) && value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return (
      Boolean(normalized) &&
      !['false', '0', 'none', 'null', 'undefined', 'off'].includes(normalized)
    )
  }
  if (Array.isArray(value)) return value.length > 0
  if (value && typeof value === 'object') return Object.keys(value).length > 0
  return false
}

function normalizeTransits(
  transits: MatrixCalculationInput['activeTransits']
): NonNullable<MatrixCalculationInput['activeTransits']> {
  return Array.isArray(transits) ? [...new Set(transits)] : []
}

export function buildAstroTimingIndex(input: {
  activeTransits?: MatrixCalculationInput['activeTransits']
  advancedAstroSignals?: MatrixCalculationInput['advancedAstroSignals']
}): AstroTimingIndex {
  const transits = normalizeTransits(input.activeTransits)
  const advancedSignals = input.advancedAstroSignals || {}
  const score: Record<HorizonKey, number> = {
    decade: 0,
    annual: 0,
    monthly: 0,
    daily: 0,
  }

  for (const transit of transits) {
    const weight = TRANSIT_WEIGHTS[transit]
    if (!weight) continue
    score.decade += weight.decade
    score.annual += weight.annual
    score.monthly += weight.monthly
    score.daily += weight.daily
  }

  let advancedEvidenceCount = 0
  for (const [signalKey, value] of Object.entries(advancedSignals)) {
    if (!hasSignalValue(value)) continue
    advancedEvidenceCount += 1
    const bonus = ADVANCED_SIGNAL_WEIGHTS[signalKey]
    if (!bonus) continue
    score.decade += bonus.decade || 0
    score.annual += bonus.annual || 0
    score.monthly += bonus.monthly || 0
    score.daily += bonus.daily || 0
  }

  const transitsCount = transits.length
  const evidenceCount = transitsCount + advancedEvidenceCount
  const confidence = clamp01(0.55 + transitsCount * 0.05 + advancedEvidenceCount * 0.03)

  return {
    decade: round3(clamp01(score.decade)),
    annual: round3(clamp01(score.annual)),
    monthly: round3(clamp01(score.monthly)),
    daily: round3(clamp01(score.daily)),
    confidence: round3(confidence),
    evidenceCount,
  }
}
