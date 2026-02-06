/**
 * cacheKey.ts - 안전한 캐시 키 생성 유틸리티
 *
 * 파이프(|) 구분자 방식의 취약점 해결:
 * - 입력값에 구분자가 포함되면 키 충돌 발생 가능
 * - JSON 직렬화 + 해시로 안전하게 키 생성
 */

import { CACHE_KEY } from '../constants/cache';

/**
 * 안전한 캐시 키 생성
 * - JSON.stringify로 구조 보존
 * - null byte 구분자로 충돌 방지
 *
 * @param prefix - 캐시 타입 접두사 (예: 'saju', 'compat')
 * @param params - 키 생성에 사용할 파라미터들
 * @returns 안전한 캐시 키 문자열
 */
export function generateSafeCacheKey(
  prefix: string,
  ...params: unknown[]
): string {
  // 각 파라미터를 JSON으로 직렬화하여 null byte로 연결
  const serializedParams = params
    .map((p) => (p === undefined ? '' : JSON.stringify(p)))
    .join(CACHE_KEY.SEPARATOR);

  return `${prefix}${CACHE_KEY.SEPARATOR}${serializedParams}`;
}

/**
 * 사주 캐시 키 생성
 */
export function generateSajuCacheKey(
  birthDate: string,
  birthTime: string,
  gender: string,
  calendarType: string,
  timezone: string,
  lunarLeap?: boolean
): string {
  return generateSafeCacheKey(
    CACHE_KEY.PREFIX.SAJU,
    birthDate,
    birthTime,
    gender,
    calendarType,
    timezone,
    lunarLeap ?? null
  );
}

/**
 * 궁합 캐시 키 생성
 * - 두 사람의 순서에 관계없이 동일한 키 생성
 */
export function generateCompatibilityCacheKey(
  person1BirthDate: string,
  person1BirthTime: string | undefined,
  person1Gender: string | undefined,
  person2BirthDate: string,
  person2BirthTime: string | undefined,
  person2Gender: string | undefined
): string {
  // 각 사람의 정보를 정규화
  const p1 = JSON.stringify([person1BirthDate, person1BirthTime ?? '', person1Gender ?? '']);
  const p2 = JSON.stringify([person2BirthDate, person2BirthTime ?? '', person2Gender ?? '']);

  // 정렬하여 순서 무관하게 동일한 키 생성
  const sorted = [p1, p2].sort();

  return `${CACHE_KEY.PREFIX.COMPATIBILITY}${CACHE_KEY.SEPARATOR}${sorted.join(CACHE_KEY.SEPARATOR)}`;
}

/**
 * 대운 캐시 키 생성
 */
export function generateDaeunCacheKey(
  birthDate: string | Date,
  birthHour: number,
  gender: 'male' | 'female',
  isLunar: boolean = false
): string {
  const dateStr = birthDate instanceof Date
    ? birthDate.toISOString().split('T')[0]
    : birthDate;

  return generateSafeCacheKey(
    CACHE_KEY.PREFIX.DAEUN,
    dateStr,
    birthHour,
    gender,
    isLunar
  );
}

/**
 * 운명 지도 캐시 키 생성
 */
export function generateDestinyMapCacheKey(
  ...params: unknown[]
): string {
  return generateSafeCacheKey(CACHE_KEY.PREFIX.DESTINY_MAP, ...params);
}
