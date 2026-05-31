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
 *   ≥68 최고(0)  ≥60 좋음(1)  ≥44 평범(2)  ≥35 조심(3)  <35 지키기(4)
 *
 * v2 일원화 직후 임계값(63/57/44/34)은 v3 표본 기준이라 v2 derivedScore 분포에
 * 맞지 않아 등급이 위로 쏠렸다(최고 11% · 좋음 13% — 목표 5/15 대비 과다).
 * migration-baseline 의 1460-date displayScore 분포를 실측해 분위수(p95/p80/p30/p5)
 * 로 재캘리브레이션 → 실측 분포 4.5/15.5/50.5/25.3/4.8 로 목표에 수렴.
 */

/** 0(최고) ~ 4(지키기). UI ImportanceGrade 와 동일 도메인. */
export type CalendarGrade = 0 | 1 | 2 | 3 | 4

export function scoreToGrade(score: number): CalendarGrade {
  if (score >= 68) return 0
  if (score >= 60) return 1
  if (score >= 44) return 2
  if (score >= 35) return 3
  return 4
}
