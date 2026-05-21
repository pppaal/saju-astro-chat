import type { AstroThemeKey } from '@/lib/astrology/themes/types'
import type { ActiveSignal, SignalLayer } from '../types'
import { normalizeAvgToScore } from './score'

/**
 * 테마별 점수 (0~100).
 * 한 테마에 대해, 그 테마를 가진 신호들만 모아 score 계산.
 * 동일 알고리즘 (deriveScore)을 테마별 필터 후 호출하는 셈이지만
 * 신호 분포 자체가 테마마다 다르므로 별도 path.
 */

const LAYER_WEIGHT: Record<SignalLayer, number> = {
  decadal: 1.0,
  yearly: 0.85,
  monthly: 0.7,
  daily: 0.55,
  hourly: 0.4,
  instant: 0.5,
}

// TODO(calibration): 임시 경험값. 영역바 변별력용 — 96차트 시뮬(테마 분포
// ~25~80, 클리핑 0) 확인해 정함. 룰 대량 추가/삭제 시 재측정해 조정할 것.
const THEME_SCORE_SCALE = 24

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
    // derivedScore 와 동일한 normalizeAvgToScore 공식 사용 — 차이는 입력
    // 신호(테마 필터)와 bias/scale 뿐. per-theme avg 는 +-가 상쇄돼 ~0 중심이라
    // bias=0; scale=THEME_SCORE_SCALE 로 영역바 변별력 확보.
    result[theme] = Math.max(
      0,
      Math.min(100, Math.round(normalizeAvgToScore(avg, 0, THEME_SCORE_SCALE)))
    )
  }
  return result
}
