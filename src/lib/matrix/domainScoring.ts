import type { DomainKey, DomainScore, MatrixCalculationInput, MonthlyOverlapPoint } from './types'
import { clamp01 } from './componentScores'
import { extractDriversAndCautions } from './drivers'
import { computeDomainBaseNorm, DOMAIN_KEYS } from './domainMap'

interface ComputeDomainScoresParams {
  input: MatrixCalculationInput
  layerScores: Record<string, number>
  baseFinalScore: number
  sajuComponentScore: number
  astroComponentScore: number
  alignmentScore: number
  overlapStrength: number
  timeOverlapWeight: number
  confidenceScore: number
}

function normalizeLayerScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  return clamp01(value > 1 ? value / 10 : value)
}

function normalizeLayerScores(layerScores: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [key, value] of Object.entries(layerScores)) {
    out[key] = normalizeLayerScore(value)
  }
  return out
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

export function computeDomainScores({
  input: _input,
  layerScores,
  baseFinalScore: _baseFinalScore,
  sajuComponentScore,
  astroComponentScore,
  alignmentScore: _alignmentScore,
  overlapStrength,
  timeOverlapWeight: _timeOverlapWeight,
  confidenceScore,
}: ComputeDomainScoresParams): Record<DomainKey, DomainScore> {
  const layerScoresNorm = normalizeLayerScores(layerScores)
  const out = {} as Record<DomainKey, DomainScore>

  for (const domain of DOMAIN_KEYS) {
    const domainBaseNorm = computeDomainBaseNorm(layerScoresNorm, domain)
    const domainBaseFinalScore = round1(domainBaseNorm * 10)

    const domainSaju = clamp01(sajuComponentScore * (0.6 + 0.4 * domainBaseNorm))
    const domainAstro = clamp01(astroComponentScore * (0.6 + 0.4 * domainBaseNorm))
    const domainAlignment = clamp01(1 - Math.abs(domainSaju - domainAstro))

    const domainOverlapStrength = clamp01(overlapStrength)
    const domainTimeOverlapWeight = Math.min(1.3, Math.max(1.0, 1 + 0.3 * domainOverlapStrength))

    const domainFinalAdjustedNorm = clamp01(
      domainBaseNorm * (0.85 + 0.15 * domainAlignment) * domainTimeOverlapWeight
    )

    const driversAndCautions = extractDriversAndCautions({
      alignmentScore: domainAlignment,
      timeOverlapWeight: domainTimeOverlapWeight,
      overlapStrength: domainOverlapStrength,
      confidenceScore,
    })

    out[domain] = {
      domain,
      baseFinalScore: domainBaseFinalScore,
      finalScoreAdjusted: round1(domainFinalAdjustedNorm * 10),
      sajuComponentScore: round3(domainSaju),
      astroComponentScore: round3(domainAstro),
      alignmentScore: round3(domainAlignment),
      overlapStrength: round3(domainOverlapStrength),
      timeOverlapWeight: round3(domainTimeOverlapWeight),
      confidenceScore: round3(clamp01(confidenceScore)),
      drivers: driversAndCautions.drivers,
      cautions: driversAndCautions.cautions,
    }
  }

  return out
}

export function applyTimelineToDomainScores(
  domainScores: Record<DomainKey, DomainScore>,
  overlapTimelineByDomain: Record<DomainKey, MonthlyOverlapPoint[]>
): Record<DomainKey, DomainScore> {
  const out = {} as Record<DomainKey, DomainScore>

  for (const domain of DOMAIN_KEYS) {
    const current = domainScores[domain]
    const timeline = overlapTimelineByDomain[domain] || []
    const meanOverlap =
      timeline.length > 0
        ? clamp01(
            timeline.reduce((sum, point) => sum + clamp01(point.overlapStrength), 0) /
              timeline.length
          )
        : clamp01(current?.overlapStrength ?? 0)

    const timeOverlapWeight = Math.min(1.3, Math.max(1.0, 1 + 0.3 * meanOverlap))
    const baseNorm = clamp01((current?.baseFinalScore ?? 0) / 10)
    const alignment = clamp01(current?.alignmentScore ?? 0)
    const finalNorm = clamp01(baseNorm * (0.85 + 0.15 * alignment) * timeOverlapWeight)

    out[domain] = {
      ...current,
      overlapStrength: round3(meanOverlap),
      timeOverlapWeight: round3(timeOverlapWeight),
      finalScoreAdjusted: round1(finalNorm * 10),
    }
  }

  return out
}
