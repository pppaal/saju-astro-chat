import type { MatrixCell } from './types'

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  if (value < 0) {
    return 0
  }
  if (value > 1) {
    return 1
  }
  return value
}

type LayerCells = Record<string, MatrixCell>

export interface LayerScoreBundle {
  layer1: LayerCells
  layer2: LayerCells
  layer3: LayerCells
  layer4: LayerCells
  layer5: LayerCells
  layer6: LayerCells
  layer7: LayerCells
  layer8: LayerCells
  layer9: LayerCells
  layer10: LayerCells
}

export interface DerivedComponentScores {
  sajuComponentScore: number
  astroComponentScore: number
  overlapBridgeScore: number
  dataCoverage: number
}

function averageNormalizedScore(cells: LayerCells): number {
  const entries = Object.values(cells)
  if (entries.length === 0) {
    return 0
  }
  const total = entries.reduce((sum, cell) => sum + clamp01((cell.interaction?.score || 0) / 10), 0)
  return clamp01(total / entries.length)
}

function weightedMean(values: number[], weights: number[]): number {
  const safePairs = values.map((value, idx) => ({
    value: clamp01(value),
    weight: Math.max(0, weights[idx] || 0),
  }))
  const denominator = safePairs.reduce((sum, item) => sum + item.weight, 0)
  if (denominator <= 0) {
    return 0
  }
  const numerator = safePairs.reduce((sum, item) => sum + item.value * item.weight, 0)
  return clamp01(numerator / denominator)
}

export function deriveSajuAstroComponentScores(layers: LayerScoreBundle): DerivedComponentScores {
  const layerMeans = {
    layer1: averageNormalizedScore(layers.layer1),
    layer2: averageNormalizedScore(layers.layer2),
    layer3: averageNormalizedScore(layers.layer3),
    layer4: averageNormalizedScore(layers.layer4),
    layer5: averageNormalizedScore(layers.layer5),
    layer6: averageNormalizedScore(layers.layer6),
    layer7: averageNormalizedScore(layers.layer7),
    layer8: averageNormalizedScore(layers.layer8),
    layer9: averageNormalizedScore(layers.layer9),
    layer10: averageNormalizedScore(layers.layer10),
  }

  // Approximate attribution:
  // - SAJU-dominant: L6 (twelve stages), L8 (shinsal)
  // - ASTRO-dominant: L4 (timing/transits), L9 (asteroids/houses)
  // - Cross bridge: L1/L2/L3/L5/L7/L10
  const sajuBase = weightedMean([layerMeans.layer6, layerMeans.layer8], [0.55, 0.45])
  const astroBase = weightedMean([layerMeans.layer4, layerMeans.layer9], [0.6, 0.4])
  const overlapBridgeScore = weightedMean(
    [
      layerMeans.layer1,
      layerMeans.layer2,
      layerMeans.layer3,
      layerMeans.layer5,
      layerMeans.layer7,
      layerMeans.layer10,
    ],
    [0.18, 0.18, 0.14, 0.16, 0.2, 0.14]
  )

  const sajuComponentScore = clamp01(0.75 * sajuBase + 0.25 * overlapBridgeScore)
  const astroComponentScore = clamp01(0.75 * astroBase + 0.25 * overlapBridgeScore)

  const nonEmptyLayers = Object.values(layers).filter(
    (cells) => Object.keys(cells).length > 0
  ).length
  const dataCoverage = clamp01(nonEmptyLayers / 10)

  return {
    sajuComponentScore,
    astroComponentScore,
    overlapBridgeScore,
    dataCoverage,
  }
}
