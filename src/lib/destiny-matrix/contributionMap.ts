import { clamp01 } from './componentScores'

export const LAYER_CONTRIBUTION_MAP = {
  layer1: { saju: 0.7, astro: 0.3 },
  layer2: { saju: 0.6, astro: 0.4 },
  layer3: { saju: 0.5, astro: 0.5 },
  layer4: { saju: 0.8, astro: 0.2 },
  layer5: { saju: 0.4, astro: 0.6 },
  layer6: { saju: 0.3, astro: 0.7 },
  layer7: { saju: 0.5, astro: 0.5 },
  layer8: { saju: 0.6, astro: 0.4 },
  layer9: { saju: 0.4, astro: 0.6 },
  layer10: { saju: 0.5, astro: 0.5 },
} as const

type ContributionLayer = keyof typeof LAYER_CONTRIBUTION_MAP

export function deriveComponentScoresFromLayers(layerScores: Record<string, number>) {
  let sajuWeightedSum = 0
  let astroWeightedSum = 0
  let sajuWeightTotal = 0
  let astroWeightTotal = 0

  for (const [layer, rawScore] of Object.entries(layerScores)) {
    if (!(layer in LAYER_CONTRIBUTION_MAP)) {
      continue
    }
    const contribution = LAYER_CONTRIBUTION_MAP[layer as ContributionLayer]
    const score = clamp01(rawScore)
    sajuWeightedSum += score * contribution.saju
    astroWeightedSum += score * contribution.astro
    sajuWeightTotal += contribution.saju
    astroWeightTotal += contribution.astro
  }

  const sajuComponentScore = sajuWeightTotal > 0 ? clamp01(sajuWeightedSum / sajuWeightTotal) : 0
  const astroComponentScore =
    astroWeightTotal > 0 ? clamp01(astroWeightedSum / astroWeightTotal) : 0

  return {
    sajuComponentScore,
    astroComponentScore,
  }
}
