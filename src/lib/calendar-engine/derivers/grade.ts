/**
 * 점수 → 등급 deriver (v2 소유).
 *
 * 기존엔 api/calendar/lib/yearlyDates.ts 안에 scoreToGrade 가 있어 등급 도출이
 * 구 destiny-map 경로에 묶여 있었다. v2 일원화에서 어댑터(cellsToYearlyDates)가
 * derivedScore 만으로 등급을 만들 수 있도록 엔진으로 이관 — 이게 정본.
 *
 * 목표 분포 5/15/50/25/5 를 노린 분위수 캘리브레이션:
 *   ≥74 최고(0)  ≥64 좋음(1)  ≥46 평범(2)  ≥33 조심(3)  <33 지키기(4)
 *
 * v2 일원화 직후 임계값(63/57/44/34)은 구 v3 표본 기준이라 v2 derivedScore
 * 분포에 맞지 않아 등급이 위로 심하게 쏠렸다(최고 23.5% · 좋음 13.6% — 목표
 * 5/15 대비 과다). migration-baseline 의 1095-date(3차트×365) displayScore
 * 분포를 실측하고 분위수(p95≈74 / p80≈64 / p30≈46 / p5≈33) 격자 탐색으로
 * 목표 오차 최소화 → 실측 분포 5.8 / 15.3 / 50.1 / 23.7 / 5.2 로 수렴.
 *
 * ※ UI 3단계는 이 엔진 등급에서 파생(destinypal tiers 렌더):
 *   좋은날=grade≤1=≥64, 조심할날=grade≥3=<46. (옛 사본
 *   src/components/calendar/scoreGrade.ts 는 #1282 에서 제거됨.)
 * ※ 임계값 변경 시 migration-baseline golden 재생성 필요
 *   (UPDATE_CALENDAR_GOLDEN=1 npx vitest run …/migration-golden.test.ts).
 */

/** 0(최고) ~ 4(지키기). UI ImportanceGrade 와 동일 도메인. */
export type CalendarGrade = 0 | 1 | 2 | 3 | 4

export function scoreToGrade(score: number): CalendarGrade {
  if (score >= 74) return 0
  if (score >= 64) return 1
  if (score >= 46) return 2
  if (score >= 33) return 3
  return 4
}
