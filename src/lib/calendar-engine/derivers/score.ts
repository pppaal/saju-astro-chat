import type { SignalLayer, SignalPattern } from '../types'
import { LAYER_WEIGHT } from './constants'

/**
 * ActiveSignal[] → 종합 점수 (0~100).
 *
 * 핵심: 한 셀에 신호가 1000+개 들어올 수 있어 단순 평균하면 0에 수렴.
 *   → "레이어별로 가중평균을 따로 낸 후, 레이어들의 가중평균"으로 2단 축약.
 *   → 큰 레이어(decadal) 1개의 강한 신호가 작은 레이어(daily) 다수에 묻히지 않음.
 *
 * 공명 보너스: 다수 레이어가 동방향이면 가산.
 */

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

/**
 * 가중평균 polarity(avg, -3~+3) → 0~100 점수. derivedScore·themeScore 공용 정규화.
 *   score = 50 + (avg - bias) × scale   (unclamped — caller 가 보너스/클램프 처리)
 *
 * - bias: 그 신호 풀의 구조적 polarity 편향 보정. derivedScore 는 전체 신호 2단
 *   평균이 +쏠림(~+1.75)이라 recenter 필요, themeScore 는 per-theme 라 ~0.
 * - scale: 분포 폭.
 *
 * TODO(calibration): bias/scale 은 96차트×1년 시뮬 기반 경험값. 룰을 대량
 *   추가/삭제하면 scripts/score-distribution 류로 재측정해 조정할 것.
 */
function normalizeAvgToScore(avg: number, bias: number, scale: number): number {
  return 50 + (avg - bias) * scale
}

/** derivedScore recenter 상수 (전체 신호 polarity 양 편향 보정) */
const DERIVED_SCORE_BIAS = 1.75
/** derivedScore 분포 스케일 */
const DERIVED_SCORE_SCALE = 16

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
  // 신호 polarity 가 구조적으로 양(+)에 쏠려(용신부합 십신 다수) grandAvg
  // 중앙값이 ~+2.25 → recenter 전엔 86 으로 떠 대부분 날이 soft-compression
  // (>90) 구간에 박혀 "좋은날" 변별이 3.7점밖에 안 됐음 (96차트×1년 시뮬).
  // DERIVED_SCORE_BIAS 로 recenter → 보통날 ~58, 좋은날 밴드 14.9점으로 넓어짐.
  // 상대 등급(percentile)은 균일 이동이라 불변.
  let score = normalizeAvgToScore(grandAvg, DERIVED_SCORE_BIAS, DERIVED_SCORE_SCALE)

  // 공명 보너스
  if (positiveLayers.length >= 3) score += 4
  if (positiveLayers.length >= 4) score += 4
  if (negativeLayers.length >= 3) score -= 4
  if (negativeLayers.length >= 4) score -= 4

  // 매칭 패턴 보너스 — strength에 비례.
  // (옛 'crisis' 테마 감점 분기는 18→5 테마 통합 때 'crisis' 키가 사라져
  //  이미 죽은 코드였다 — 5버킷 축 제거와 함께 정리. 점수 영향 0.)
  for (const p of patterns) {
    const delta = (p.strength / 100) * 12 // strength 95 → 11.4
    score += delta
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
