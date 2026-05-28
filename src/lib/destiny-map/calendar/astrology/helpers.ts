/**
 * astrology/helpers.ts - 점성술 헬퍼 함수
 */

// normalizeElement was defined here as `air → fire` while the calendar
// utils module canonically uses `air → metal` for the same string-to-
// 5-element coercion. The 'air → fire' variant had no importers — every
// in-tree consumer reaches normalizeElement via calendar/utils — so
// drop it instead of leaving a near-namesake helper around to silently
// branch the mapping behavior the next time someone reaches in here.

/**
 * J2000 epoch 기준 일수 계산
 */
export function getDaysSinceJ2000(date: Date): number {
  const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0)
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)
  return (dateUtc - J2000) / (1000 * 60 * 60 * 24)
}
