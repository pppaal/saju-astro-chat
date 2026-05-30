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
// scale=24 에서 클리핑 0%(0/100 에 안 부딪힘). 룰 대량 추가/삭제 시 재측정·갱신.
//
// signal.themeWeights(태거 부여) 적용 후 측정(100차트×12달=1200달): 5테마
// 표준편차 평균 8.99, 비-health 4테마 5.29(가중 전 4.80 → 변별 ↑), 점수
// 범위 17~80(클리핑 0%) → scale=24 유지. 가중은 한 신호(예: 목성 회귀)가
// 모든 테마에 동일 기여하던 동률 수렴을 깬다(featureMap.PLANET_THEME_WEIGHT).
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

// 테마별 baseline(전체 인구 median) — "오늘 어느 테마가 평소보다 유난히 튀나"
// 판정(deriveThemeDeviation)에만 사용. 표시 점수(themeScores 절대값)는 recenter
// 안 함(Why-card 정합). 측정: calendar-theme-calibration. growth 도배(절대점수로
// 1등 뽑으면 baseline 높은 growth가 매일 이김)를 deviation 비교로 해소.
const THEME_BASELINE: Record<AstroThemeKey, number> = {
  love: 55,
  money: 53,
  career: 54,
  health: 49,
  growth: 59,
}

export function deriveThemeScores(signals: ActiveSignal[]): Partial<Record<AstroThemeKey, number>> {
  const buckets = new Map<AstroThemeKey, { sum: number; weight: number }>()

  for (const s of signals) {
    if (s.themes.length === 0) continue
    const lw = LAYER_WEIGHT[s.layer] ?? 0.5
    for (const theme of s.themes) {
      // 테마별 기여 가중 — 본령 테마 1.0, 보조 테마 <1. 한 신호가 모든
      // 테마에 동일 기여하던 변별력 저하 해소. 없으면 1.0 (하위호환).
      const tw = s.themeWeights?.[theme] ?? 1
      const w = s.weight * lw * tw
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

/**
 * "오늘 어느 테마가 평소(baseline)보다 유난히 튀나" — 표시 점수가 아니라 **분야
 * 판정용**. growth 처럼 baseline 이 구조적으로 높은 테마가 절대점수 비교에서 매일
 * 1등 도배되는 걸 막는다. themeScores(절대) − baseline = deviation.
 * UI 의 "오늘의 주제 테마" 선정·강조는 이 deviation 으로 해야 도배가 안 생김.
 */
export function deriveThemeDeviation(
  themeScores: Partial<Record<AstroThemeKey, number>>
): Partial<Record<AstroThemeKey, number>> {
  const out: Partial<Record<AstroThemeKey, number>> = {}
  for (const theme of Object.keys(themeScores) as AstroThemeKey[]) {
    const v = themeScores[theme]
    if (typeof v === 'number') out[theme] = v - THEME_BASELINE[theme]
  }
  return out
}
