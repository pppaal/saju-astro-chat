import { clamp01 } from './componentScores'

export interface DriverCautionInput {
  alignmentScore: number
  timeOverlapWeight: number
  overlapStrength: number
  confidenceScore: number
}

export function extractDriversAndCautions({
  alignmentScore,
  timeOverlapWeight,
  overlapStrength,
  confidenceScore,
}: DriverCautionInput) {
  const drivers: string[] = []
  const cautions: string[] = []

  if (clamp01(alignmentScore) > 0.75) {
    drivers.push('High cross-system agreement')
  }
  if (timeOverlapWeight > 1.15) {
    drivers.push('Strong timing convergence')
  }
  if (clamp01(overlapStrength) > 0.6) {
    drivers.push('Elemental resonance detected')
  }

  if (clamp01(alignmentScore) < 0.4) {
    cautions.push('System disagreement')
  }
  if (clamp01(confidenceScore) < 0.5) {
    cautions.push('Low data confidence')
  }

  return {
    drivers: drivers.slice(0, 3),
    cautions: cautions.slice(0, 3),
  }
}
