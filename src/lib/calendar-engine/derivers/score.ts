import type { SignalLayer, SignalPattern } from '../types'

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
  decadal: 1.0,
  yearly: 0.85,
  monthly: 0.7,
  daily: 0.55,
  hourly: 0.4,
  instant: 0.5,
}

/**
 * 점수 계산에 실제로 쓰이는 최소 필드만 요구 — full ActiveSignal 뿐 아니라
 * 응답에 직렬화된 engineSignals(폴라리티가 plain number) 같은 lite shape도
 * 그대로 넘길 수 있다.
 */
export interface SignalForScore {
  layer: SignalLayer
  polarity: number
  weight: number
}

export function deriveScore(signals: SignalForScore[], patterns: SignalPattern[] = []): number {
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
    const layerAvg = acc.sum / acc.weight // -3 ~ +3
    const lw = LAYER_WEIGHT[layer] ?? 0.5
    weightedSum += layerAvg * lw
    totalWeight += lw
    if (layerAvg > 0.3) positiveLayers.push(layer)
    if (layerAvg < -0.3) negativeLayers.push(layer)
  }

  if (totalWeight === 0) return 50

  const grandAvg = weightedSum / totalWeight // -3 ~ +3
  let score = 50 + grandAvg * 16 // 분포 넓힘 (이전 ×12 → ×16)
  // 이론적 max 98, min 2 — 실제로 20~85 정도

  // 공명 보너스
  if (positiveLayers.length >= 3) score += 4
  if (positiveLayers.length >= 4) score += 4
  if (negativeLayers.length >= 3) score -= 4
  if (negativeLayers.length >= 4) score -= 4

  // 매칭 패턴 보너스 — strength에 비례, crisis 테마면 감점
  const malefic = new Set(['crisis'])
  for (const p of patterns) {
    const isMalefic = p.themes.some((t) => malefic.has(t))
    const delta = (p.strength / 100) * 12 // strength 95 → 11.4
    score += isMalefic ? -delta : delta
  }

  // 상한·하한 soft compression — raw score 가 layer + pattern bonus 로
  // 110+ 까지 가던 게 hard cap 으로 100 으로 짜부라져 한 달에 5+ 일이
  // 100점 동률로 묶이던 문제 해소.
  //
  //   raw ≤ 90 → 그대로
  //   raw 90~130 → 90~98 로 압축 (5점씩 차이가 1점 차이로 변별 유지)
  //   raw ≥ 130 → 98 cap
  //
  // 역방향도 동일 (raw ≤ 10 인 흉일도 변별 유지).
  let final = Math.round(score)
  if (final > 90) {
    final = Math.min(98, 90 + Math.floor((final - 90) / 5))
  } else if (final < 10) {
    final = Math.max(2, 10 - Math.floor((10 - final) / 5))
  }

  return Math.max(0, Math.min(100, final))
}
