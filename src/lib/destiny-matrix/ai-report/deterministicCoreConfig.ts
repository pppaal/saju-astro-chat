export type DeterministicProfile = 'strict' | 'balanced' | 'aggressive'

export interface DeterministicCoreWeights {
  baseScore: number
  yongsinMatchBonus: number
  yongsinMismatchPenalty: number
  daeunPresentBonus: number
  graphAnchorBonus: number
  graphAnchorTarget: number
  graphSetDensityBonus: number
  aspectCountBonus: number
  aspectCountTarget: number
  aspectCountPenalty: number
  relationCountBonus: number
  relationCountTarget: number
  shinsalCountBonus: number
  shinsalCountTarget: number
  cautionPenalty: number
  cautionPenaltyThreshold: number
  missingProfilePenalty: number
  goThreshold: number
  noThreshold: number
}

const BALANCED: DeterministicCoreWeights = {
  baseScore: 50,
  yongsinMatchBonus: 10,
  yongsinMismatchPenalty: 4,
  daeunPresentBonus: 4,
  graphAnchorBonus: 8,
  graphAnchorTarget: 6,
  graphSetDensityBonus: 5,
  aspectCountBonus: 6,
  aspectCountTarget: 8,
  aspectCountPenalty: 3,
  relationCountBonus: 5,
  relationCountTarget: 3,
  shinsalCountBonus: 3,
  shinsalCountTarget: 5,
  cautionPenalty: 8,
  cautionPenaltyThreshold: 3,
  missingProfilePenalty: 6,
  goThreshold: 70,
  noThreshold: 45,
}

const STRICT: DeterministicCoreWeights = {
  ...BALANCED,
  graphAnchorTarget: 8,
  goThreshold: 76,
  noThreshold: 48,
  yongsinMismatchPenalty: 6,
  cautionPenalty: 10,
  missingProfilePenalty: 8,
}

const AGGRESSIVE: DeterministicCoreWeights = {
  ...BALANCED,
  graphAnchorTarget: 5,
  goThreshold: 66,
  noThreshold: 40,
  yongsinMatchBonus: 12,
  cautionPenalty: 6,
}

export function getDeterministicCoreWeights(
  profile: DeterministicProfile = 'balanced'
): DeterministicCoreWeights {
  if (profile === 'strict') return STRICT
  if (profile === 'aggressive') return AGGRESSIVE
  return BALANCED
}
