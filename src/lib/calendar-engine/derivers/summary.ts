import type { ActiveSignal, SignalLayer } from '../types'

/**
 * 한 셀의 활성 신호 다발에서 상위 N개 사유 텍스트 추출.
 * 가중치 큰 순 + 길흉 강도 큰 순.
 */

const LAYER_WEIGHT: Record<SignalLayer, number> = {
  decadal: 1.0, yearly: 0.85, monthly: 0.7, daily: 0.55, hourly: 0.4, instant: 0.5,
}

export function deriveTopReasons(signals: ActiveSignal[], limit = 5): string[] {
  // 우호 신호(polarity > 0)만 — 가중치·강도 큰 순
  return [...signals]
    .filter((s) => s.polarity > 0)
    .map((s) => ({
      s,
      impact: s.polarity * s.weight * (LAYER_WEIGHT[s.layer] ?? 0.5),
    }))
    .sort((a, b) => b.impact - a.impact)
    .slice(0, limit)
    .map(({ s }) => formatReason(s))
}

/**
 * 한 셀의 주의 신호(polarity < 0) top N — topReasons의 mirror.
 * cautions 배열을 채우는 deriver. 사용자가 주의 사유를 직접 보게.
 */
export function deriveCautions(signals: ActiveSignal[], limit = 5): string[] {
  return [...signals]
    .filter((s) => s.polarity < 0)
    .map((s) => ({
      s,
      impact: Math.abs(s.polarity) * s.weight * (LAYER_WEIGHT[s.layer] ?? 0.5),
    }))
    .sort((a, b) => b.impact - a.impact)
    .slice(0, limit)
    .map(({ s }) => formatReason(s))
}

function formatReason(s: ActiveSignal): string {
  const tone = s.polarity > 0 ? '↑' : s.polarity < 0 ? '↓' : '·'
  const label = s.korean ?? s.name
  return `${tone} [${layerLabel(s.layer)}] ${label}`
}

function layerLabel(layer: SignalLayer): string {
  return ({ decadal: '대운', yearly: '세운', monthly: '월운', daily: '일진', hourly: '시', instant: '정점' } as Record<SignalLayer, string>)[layer]
}
