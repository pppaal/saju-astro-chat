/**
 * astrology/helpers.ts - 점성술 헬퍼 함수
 */

/**
 * 오행 이름 정규화 (air → fire)
 */
export function normalizeElement(element: string): string {
  if (element === "air") { return "fire"; }
  return element;
}

/**
 * J2000 epoch 기준 일수 계산
 */
export function getDaysSinceJ2000(date: Date): number {
  const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  return (dateUtc - J2000) / (1000 * 60 * 60 * 24);
}
