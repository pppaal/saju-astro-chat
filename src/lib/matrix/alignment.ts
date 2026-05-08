import { clamp01 } from './componentScores'

export function calculateAlignmentTerm(
  sajuComponentScore: number,
  astroComponentScore: number
): number {
  return clamp01(1 - Math.abs(clamp01(sajuComponentScore) - clamp01(astroComponentScore)))
}
