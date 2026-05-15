import type { ActiveSignal, SignalLayer, SignalPattern } from '../types'

/**
 * ActiveSignal[] → 종합 점수 (0~100).
 *
 * 핵심: 한 셀에 신호가 1000+개 들어올 수 있어 단순 평균하면 0에 수렴.
 *   → "레이어별로 가중평균을 따로 낸 후, 레이어들의 가중평균"으로 2단 축약.
 *   → 큰 레이어(decadal) 1개의 강한 신호가 작은 레이어(daily) 다수에 묻히지 않음.
 *
 * 공명 보너스: 다수 레이어가 동방향이면 가산.
 */

const LAYER_WEIGHT: Record<SignalLayer, number> = {
  decadal:  1.0,
  yearly:   0.85,
  monthly:  0.7,
  daily:    0.55,
  hourly:   0.4,
  instant:  0.5,
}

export function deriveScore(signals: ActiveSignal[], patterns: SignalPattern[] = []): number {
  if (signals.length === 0) return 50

  // 1단: 레이어별로 평균 polarity 산출 (weight 가중)
  const byLayer = new Map<SignalLayer, { sum: number; weight: number }>()
  for (const s of signals) {
    const acc = byLayer.get(s.layer) ?? { sum: 0, weight: 0 }
    acc.sum += s.polarity * s.weight
    acc.weight += s.weight
    byLayer.set(s.layer, acc)
  }

  // 2단: 레이어별 평균을 layer weight로 가중평균
  let weightedSum = 0
  let totalWeight = 0
  const positiveLayers: SignalLayer[] = []
  const negativeLayers: SignalLayer[] = []

  for (const [layer, acc] of byLayer) {
    if (acc.weight === 0) continue
    const layerAvg = acc.sum / acc.weight     // -3 ~ +3
    const lw = LAYER_WEIGHT[layer] ?? 0.5
    weightedSum += layerAvg * lw
    totalWeight += lw
    if (layerAvg > 0.3) positiveLayers.push(layer)
    if (layerAvg < -0.3) negativeLayers.push(layer)
  }

  if (totalWeight === 0) return 50

  const grandAvg = weightedSum / totalWeight   // -3 ~ +3
  let score = 50 + grandAvg * 12   // 압축 완화 (이전 tanh×40 → 선형 ×12)

  // 공명 보너스
  if (positiveLayers.length >= 3) score += 4
  if (positiveLayers.length >= 4) score += 4
  if (negativeLayers.length >= 3) score -= 4
  if (negativeLayers.length >= 4) score -= 4

  // 매칭 패턴 보너스 — strength에 비례, crisis 테마면 감점
  const malefic = new Set(['crisis'])
  for (const p of patterns) {
    const isMalefic = p.themes.some((t) => malefic.has(t))
    const delta = (p.strength / 100) * 12   // strength 95 → 11.4
    score += isMalefic ? -delta : delta
  }

  return Math.max(0, Math.min(100, Math.round(score)))
}
