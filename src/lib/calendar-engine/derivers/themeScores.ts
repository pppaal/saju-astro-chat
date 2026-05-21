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

// themeScore 정규화 스케일 — derivedScore 와 동일한 normalizeAvgToScore 를 쓰되
// 입력이 per-theme avg(테마 필터)라 스케일만 다름.
//
// 측정(scripts/calendar-theme-calibration.mts, 18차트 × 2026 전년 = 32,850 셀,
// 실제 천체력): per-theme avg 의 GLOBAL median ≈ 0.06 → 글로벌 bias=0 이 맞음.
// scale=24 에서 클리핑 0%(0/100 에 안 부딪힘), 테마별 밴드 14~31점. 룰 대량
// 추가/삭제 시 위 스크립트로 재측정·갱신.
//
// ── 테마별 bias(median) recenter 는 일부러 안 함 ──
// health(median −0.53)·growth(+0.32)·career(+0.25)처럼 테마마다 baseline 이
// 다르지만, 이걸 50 으로 recenter 하면 themeScore 가 "절대 길흉"이 아니라
// "자기 baseline 대비"가 되어 Why-card(themeBreakdown, 절대 기여도)와 부호가
// 어긋남 → #431 에서 고친 score↔근거 모순(예: health score 62 vs Why-card −30)
// 이 그대로 재발(interpretation.regression 회귀 테스트로 확인). 테마별 baseline
// 비대칭은 버그가 아니라 의미(health=주의 우세, growth=확장 우세)라 절대값 유지.
// 바를 baseline 대비로 보여주려면 themeBreakdown 도 같이 recenter 해야 함(별건).
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
    // derivedScore 와 동일한 normalizeAvgToScore 공식 — 차이는 입력(테마 필터
    // per-theme avg)과 scale 뿐. bias=0 은 측정으로 검증(위 주석 참고).
    result[theme] = Math.max(
      0,
      Math.min(100, Math.round(normalizeAvgToScore(avg, 0, THEME_SCORE_SCALE)))
    )
  }
  return result
}
