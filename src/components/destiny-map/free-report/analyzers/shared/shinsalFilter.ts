/**
 * Shinsal Filter Utility
 * 신살 필터링을 위한 공통 유틸리티
 */

import type { ShinsalKind } from '@/lib/destiny-matrix/types';

/**
 * ExtendedSajuData의 일부분 - Shinsal 관련
 */
interface ShinsalData {
  shinsal?:
    | Array<{ name?: string; shinsal?: string } | string>
    | Record<string, unknown>;
  sinsal?: {
    luckyList?: Array<{ name?: string } | string>;
    unluckyList?: Array<{ name?: string } | string>;
  };
}

/**
 * 신살 이름 추출
 */
function extractShinsalName(
  item: { name?: string; shinsal?: string } | string
): string | undefined {
  if (typeof item === 'string') {
    return item;
  }
  return item.name || item.shinsal;
}

/**
 * 사주 데이터에서 특정 신살 목록 필터링
 *
 * @param data 사주 데이터 (shinsal, sinsal 필드 포함)
 * @param allowedShinsals 필터링할 신살 목록
 * @returns 필터링된 신살 배열
 *
 * @example
 * ```ts
 * const healthShinsals = extractShinsals(sajuData, HEALTH_SHINSALS);
 * const karmaShinsals = extractShinsals(sajuData, KARMA_SHINSALS);
 * ```
 */
export function extractShinsals(
  data: ShinsalData | undefined,
  allowedShinsals: readonly ShinsalKind[] | readonly string[]
): Array<ShinsalKind | string> {
  if (!data) {return [];}

  const result: Array<ShinsalKind | string> = [];
  const allowedSet = new Set(allowedShinsals);

  // Pattern A: shinsal 배열 체크
  if (data.shinsal && Array.isArray(data.shinsal)) {
    for (const item of data.shinsal) {
      const name = extractShinsalName(item);
      if (name && allowedSet.has(name)) {
        result.push(name);
      }
    }
  }

  // Pattern B: sinsal.unluckyList 체크
  if (data.sinsal?.unluckyList) {
    for (const item of data.sinsal.unluckyList) {
      const name = typeof item === 'string' ? item : item.name;
      if (name && allowedSet.has(name)) {
        result.push(name);
      }
    }
  }

  // Pattern C: sinsal.luckyList 체크 (필요시)
  if (data.sinsal?.luckyList) {
    for (const item of data.sinsal.luckyList) {
      const name = typeof item === 'string' ? item : item.name;
      if (name && allowedSet.has(name)) {
        result.push(name);
      }
    }
  }

  // 중복 제거
  return Array.from(new Set(result));
}

