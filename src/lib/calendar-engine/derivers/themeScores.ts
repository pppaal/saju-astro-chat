import type { AstroThemeKey } from '@/lib/astrology/themes/types'
import type { ActiveSignal, SignalLayer } from '../types'

/**
 * 테마별 점수 (0~100).
 * 한 테마에 대해, 그 테마를 가진 신호들만 모아 score 계산.
 * 동일 알고리즘 (deriveScore)을 테마별 필터 후 호출하는 셈이지만
 * 신호 분포 자체가 테마마다 다르므로 별도 path.
 */

const LAYER_WEIGHT: Record<SignalLayer, number> = {
  decadal: 1.0, yearly: 0.85, monthly: 0.7, daily: 0.55, hourly: 0.4, instant: 0.5,
}

export function deriveThemeScores(signals: ActiveSignal[]): Partial<Record<AstroThemeKey, number>> {
  const buckets = new Map<AstroThemeKey, { sum: number; weight: number }>()

  for (const s of signals) {
    if (s.themes.length === 0) continue
    const lw = LAYER_WEIGHT[s.layer] ?? 0.5
    const w = s.weight * lw
    for (const theme of s.themes) {
      const b = buckets.get(theme) ?? { sum: 0, weight: 0 }
      b.sum += s.polarity * w
      b.weight += w
      buckets.set(theme, b)
    }
  }

  const result: Partial<Record<AstroThemeKey, number>> = {}
  for (const [theme, b] of buckets) {
    if (b.weight === 0) continue
    const avg = b.sum / b.weight
    // 압축 완화 — score deriver와 동일한 선형 매핑
    result[theme] = Math.max(0, Math.min(100, Math.round(50 + avg * 12)))
  }
  return result
}
