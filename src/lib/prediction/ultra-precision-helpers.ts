/**
 * @file Ultra Precision Engine Helpers
 * 초정밀 타이밍 엔진 헬퍼 함수들
 */

import type { FiveElement } from './ultra-precision-types';
import { DAY_PLANETS } from './ultra-precision-constants';

// ============================================================
// 오행 관련 헬퍼
// ============================================================

/**
 * 천간에서 오행 추출
 */
export function getStemElement(stem: string): FiveElement {
  const mapping: Record<string, FiveElement> = {
    '甲': '목', '乙': '목', '丙': '화', '丁': '화', '戊': '토',
    '己': '토', '庚': '금', '辛': '금', '壬': '수', '癸': '수',
  };
  return mapping[stem] || '토';
}

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
