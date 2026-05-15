import type { ActiveSignal, SignalLayer } from '../types'

/**
 * ActiveSignal[] → 종합 점수 (0~100).
 *
 * polarity(-3~+3) × signal.weight × layer 가중치 → tanh 압축 → 50 base에 매핑.
 * "5층 다 정렬됨"의 공명 효과는 layer-coverage 보너스로 표현.
 */

const LAYER_WEIGHT: Record<SignalLayer, number> = {
  decadal:  1.0,   // 큰 흐름
  yearly:   0.85,
  monthly:  0.7,
  daily:    0.55,
  hourly:   0.4,
  instant:  0.5,
}

export function deriveScore(signals: ActiveSignal[]): number {
  if (signals.length === 0) return 50

  let weightedSum = 0
  let totalWeight = 0
  const layersTouched = new Set<SignalLayer>()

  for (const s of signals) {
    const lw = LAYER_WEIGHT[s.layer] ?? 0.5
    const w = s.weight * lw
    weightedSum += s.polarity * w
    totalWeight += w
    layersTouched.add(s.layer)
  }

  if (totalWeight === 0) return 50

  // -3~+3 범위의 가중평균을 0~100 매핑 (시그모이드 압축으로 극단값 완화)
  const avg = weightedSum / totalWeight   // -3 ~ +3
  let score = 50 + (Math.tanh(avg / 2) * 40)  // -40 ~ +40

  // 공명 보너스: 여러 레이어가 동시에 (+) 신호를 띄울 때 가산
  const positiveLayers = countLayersWithSign(signals, 1)
  const negativeLayers = countLayersWithSign(signals, -1)
  if (positiveLayers >= 3) score += 5
  if (positiveLayers >= 5) score += 5
  if (negativeLayers >= 3) score -= 5

  return Math.max(0, Math.min(100, Math.round(score)))
}

function countLayersWithSign(signals: ActiveSignal[], sign: 1 | -1): number {
  const touched = new Set<SignalLayer>()
  for (const s of signals) {
    if (sign === 1 && s.polarity > 0) touched.add(s.layer)
    if (sign === -1 && s.polarity < 0) touched.add(s.layer)
  }
  return touched.size
}
