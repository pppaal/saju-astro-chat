import type { DomainKey } from './types'
import { clamp01 } from './componentScores'

export const DOMAIN_KEYS: DomainKey[] = ['career', 'love', 'money', 'health', 'move']

type LayerName =
  | 'layer1'
  | 'layer2'
  | 'layer3'
  | 'layer4'
  | 'layer5'
  | 'layer6'
  | 'layer7'
  | 'layer8'
  | 'layer9'
  | 'layer10'

// Each layer distribution sums to exactly 1.0.
// The table is balanced overall while preserving specialization:
// - career/money are stronger in layer2/layer7
// - love is stronger in layer5/layer9
// - health is stronger in layer6/layer10
// - move is stronger in layer8/layer9/layer10
export const LAYER_DOMAIN_MAP: Record<LayerName, Record<DomainKey, number>> = {
  layer1: { career: 0.15, love: 0.2, money: 0.2, health: 0.25, move: 0.2 },
  layer2: { career: 0.35, love: 0.2, money: 0.25, health: 0.1, move: 0.1 },
  layer3: { career: 0.25, love: 0.25, money: 0.2, health: 0.1, move: 0.2 },
  layer4: { career: 0.2, love: 0.2, money: 0.2, health: 0.2, move: 0.2 },
  layer5: { career: 0.1, love: 0.45, money: 0.1, health: 0.1, move: 0.25 },
  layer6: { career: 0.15, love: 0.1, money: 0.2, health: 0.4, move: 0.15 },
  layer7: { career: 0.3, love: 0.15, money: 0.25, health: 0.1, move: 0.2 },
  layer8: { career: 0.15, love: 0.2, money: 0.15, health: 0.25, move: 0.25 },
  layer9: { career: 0.2, love: 0.25, money: 0.15, health: 0.15, move: 0.25 },
  layer10: { career: 0.1, love: 0.2, money: 0.15, health: 0.3, move: 0.25 },
}

export function getDomainWeightForLayer(layerName: string, domain: DomainKey): number {
  const layer = LAYER_DOMAIN_MAP[layerName as LayerName]
  if (!layer) {
    return 0
  }
  return layer[domain] ?? 0
}

export function computeDomainBaseNorm(
  layerScoresNorm: Record<string, number>,
  domain: DomainKey
): number {
  let total = 0
  for (const layerName of Object.keys(LAYER_DOMAIN_MAP) as LayerName[]) {
    const layerScore = clamp01(layerScoresNorm[layerName] ?? 0)
    total += layerScore * getDomainWeightForLayer(layerName, domain)
  }
  return clamp01(total)
}
