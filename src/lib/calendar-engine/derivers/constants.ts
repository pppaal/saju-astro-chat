import type { SignalLayer } from '../types'

/**
 * 레이어별 가중치 — score(점수)·summary(사유 랭킹) 공용 단일 정의.
 * 큰 레이어(대운) 1개의 강한 신호가 작은 레이어(일/시) 다수에 묻히지 않도록
 * 레이어 스케일에 비례한 가중. 이 값을 바꾸면 두 소비처가 함께 반영된다.
 */
export const LAYER_WEIGHT: Record<SignalLayer, number> = {
  decadal: 1.0,
  yearly: 0.85,
  monthly: 0.7,
  daily: 0.55,
  hourly: 0.4,
  instant: 0.5,
}

/**
 * 길흉 밴드 임계값 — 일점수(layered.daily, 그 창에서 평균 50 정규화)를 색·톤으로
 * 가르는 *단일 정의*. 월 그리드(toMonth)·일 톤(reconcile)·연 톤(YearTier)이 모두
 * 이 한 곳을 읽어야 티어 간 색이 어긋나지 않는다.
 *
 * 경계가 50(평균) 기준 비대칭이던 게(좋음 +10 / 나쁨 −15·−28) "좋은 날만 보임"의
 * 한 원인이었다 — 초록 문턱이 평균에 더 가까워 초록이 빨강보다 잦았다. 96차트×1년
 * 실측(5생×12월=1825일)으로 재조정: 나쁨 라인 35→40, 피함 22→30 으로 올리니
 * 초록 29.8% ↔ 빨강(조심+피함) 27.5% 로 균형, 피함도 3.9%→11% 로 실재하게 됐다.
 * (연 티어는 이미 40 을 써서, 이 변경이 월·일을 연과도 일치시킨다.)
 *
 *   score ≥ good                 → 좋음(good/positive)
 *   caution ≤ score < good       → 무색/steady/mid
 *   avoid   ≤ score < caution    → 조심(caution)        ← 월 그리드 하위 구분
 *   score < avoid                → 피함(avoid)          ← 월 그리드 하위 구분
 *   (일·연 톤은 good/caution 두 경계만 사용: < caution = 나쁨)
 */
export const CALENDAR_BANDS = {
  good: 60,
  caution: 40,
  avoid: 30,
  best: 75,
} as const
