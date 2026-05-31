/**
 * 점수 → 등급 deriver (v2 소유).
 *
 * 기존엔 api/calendar/lib/yearlyDates.ts 안에 scoreToGrade 가 있어 등급 도출이
 * 구 destiny-map 경로에 묶여 있었다. v2 일원화에서 어댑터(cellsToYearlyDates)가
 * derivedScore 만으로 등급을 만들 수 있도록 엔진으로 이관 — 이게 정본.
 *
 * 임계값은 yearlyDates 의 scoreToGrade 와 byte-for-byte 동일하게 유지한다.
 * (단계 0 골든 검증: grade === scoreToGrade(displayScore) 가 365/365 일치하므로,
 *  같은 임계값을 derivedScore 에 적용하면 현재 등급을 정확히 재현한다.)
 *
 * 1460-date 표본(4 차트) 분위수 기준 5/15/50/25/5 분포를 노린 캘리브레이션:
 *   ≥63 최고(0)  ≥57 좋음(1)  ≥44 평범(2)  ≥34 조심(3)  <34 지키기(4)
 *
 * ※ v2 derivedScore 의 실제 분포는 위 v3 표본보다 높게 쏠려(예: 일부 차트는
 *   grade 0 가 40%+) 분위수 타깃과 어긋난다. 이는 마이그레이션 범위 밖의
 *   "기존 동작"이라 여기서 임계값을 바꾸지 않는다 — 별도 튜닝 과제.
 */

/** 0(최고) ~ 4(지키기). UI ImportanceGrade 와 동일 도메인. */
export type CalendarGrade = 0 | 1 | 2 | 3 | 4

export function scoreToGrade(score: number): CalendarGrade {
  if (score >= 63) return 0
  if (score >= 57) return 1
  if (score >= 44) return 2
  if (score >= 34) return 3
  return 4
}
