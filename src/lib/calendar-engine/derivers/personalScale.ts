/**
 * 개인 상대 스케일 — "그 사람 1년 분포 안에서" 점수를 해석한다.
 *
 * 왜: derivedScore(우호도)는 차트마다 중심이 달라(신약/신강·용신 부합 정도) 절대
 * 임계값으로 등급을 매기면 어떤 사람은 1년 내내 '나쁨', 어떤 사람은 내내 '좋음'으로
 * 쏠린다. 사용자가 보는 건 "*나에게* 좋은 날/나쁜 날"이므로, 그 사람 자신의 분포에서
 * 상대 위치(백분위)로 본다. salience(현저도=희소×중요)는 그 빌드 청크 기준으로 이미
 * 상대값이라 0~100 정규화만 한다.
 *
 * 순수 함수 — cells 만 입력.
 */
import type { CalendarCell } from '../types'

export interface PersonalScale {
  /** derivedScore → 그 사람 분포 백분위(0~100). 상대 good/bad 의 단일 숫자. */
  favor(score: number): number
  /** toMonth 상대 임계값(raw derivedScore 컷) — 절대 35/22/65/75 대체. */
  monthThresholds: { good: number; caution: number; avoid: number; best: number }
  /** salience → 0~100 정규화 (연간 12개월 스파인·큰 날 표시용). */
  saliencePct(s: number): number
}

/** 정렬된 배열에서 v 의 백분위(0~100) — v 이하 값 비율. */
function percentileOf(sorted: number[], v: number): number {
  const n = sorted.length
  if (n === 0) return 50
  let lo = 0
  let hi = n
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (sorted[mid] <= v) lo = mid + 1
    else hi = mid
  }
  return Math.round((lo / n) * 100)
}

/** 정렬된 배열의 q 분위값 (0~1). */
function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 50
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))
  return sorted[i]
}

export function derivePersonalScale(cells: CalendarCell[]): PersonalScale {
  const ds = cells
    .map((c) => c.derivedScore)
    .filter((n): n is number => Number.isFinite(n))
    .sort((a, b) => a - b)
  const sal = cells
    .map((c) => c.salience ?? 0)
    .filter((n): n is number => Number.isFinite(n))
    .sort((a, b) => a - b)
  const salMin = sal[0] ?? 0
  const salMax = sal[sal.length - 1] ?? 1

  return {
    favor: (s) => percentileOf(ds, s),
    monthThresholds: {
      good: quantile(ds, 0.75),
      caution: quantile(ds, 0.3),
      avoid: quantile(ds, 0.12),
      best: quantile(ds, 0.95),
    },
    saliencePct: (s) =>
      salMax > salMin ? Math.round(((s - salMin) / (salMax - salMin)) * 100) : 50,
  }
}
