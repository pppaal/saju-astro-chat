/**
 * @file Ultra Precision Engine Helpers
 * 초정밀 타이밍 엔진 헬퍼 함수들
 */

import { DAY_PLANETS } from './ultra-precision-constants';

// ============================================================
// 오행 관련 헬퍼
// ============================================================

/**
 * Re-export the canonical Korean stem → element mapper so callers in
 * this folder keep their existing
 * `import { getStemElement } from './ultra-precision-helpers'` path.
 * The lib/saju version handles both 한자 (甲乙丙…) and 한글 (갑을병…)
 * input; the previous inline copy here only matched the 한자 form, so
 * anything that fed it 한글 silently fell back to '토'.
 */
export { getStemElement } from '@/lib/saju/stemBranchUtils';

// ============================================================
// 행성 관련 헬퍼
// ============================================================

/**
 * 요일에 해당하는 행성 반환
 */
export function getPlanetaryHourPlanet(date: Date): string {
  const dayOfWeek = date.getDay();
  return DAY_PLANETS[dayOfWeek];
}
