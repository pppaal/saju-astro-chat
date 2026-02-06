/**
 * cache.ts - 캐시 설정 상수
 *
 * 모든 캐시 관련 매직 넘버를 중앙화하여 관리
 * 변경 시 이 파일만 수정하면 전체 앱에 반영됨
 */

// Time constants (밀리초)
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * 사주 계산 캐시 설정
 * - 사주 데이터는 생년월일 기반으로 변하지 않으므로 긴 TTL 사용
 * - maxSize: 메모리 사용량과 캐시 히트율 균형
 */
export const SAJU_CACHE = {
  /** 최대 캐시 항목 수 */
  MAX_SIZE: 500,
  /** 캐시 유효 시간 (10분) - saju.ts 로컬 캐시용 */
  TTL_MS: 10 * MINUTE_MS,
  /** 캐시 유효 시간 (24시간) - 장기 캐시용 */
  LONG_TTL_MS: DAY_MS,
} as const;

/**
 * 대운 계산 캐시 설정
 * - 대운은 사주 기반으로 계산되어 안정적
 */
export const DAEUN_CACHE = {
  /** 최대 캐시 항목 수 */
  MAX_SIZE: 200,
  /** 캐시 유효 시간 (24시간) */
  TTL_MS: DAY_MS,
} as const;

/**
 * 궁합 계산 캐시 설정
 * - 두 사람의 조합이므로 키 공간이 큼, 적당한 크기 유지
 */
export const COMPATIBILITY_CACHE = {
  /** 최대 캐시 항목 수 */
  MAX_SIZE: 300,
  /** 캐시 유효 시간 (1시간) */
  TTL_MS: HOUR_MS,
  /** 퀵 궁합용 TTL (15분) */
  QUICK_TTL_MS: 15 * MINUTE_MS,
} as const;

/**
 * 운명 지도(Destiny Map) 캐시 설정
 * - 점성술 계산 결과 캐싱
 */
export const DESTINY_MAP_CACHE = {
  /** 최대 캐시 항목 수 */
  MAX_SIZE: 50,
  /** 캐시 유효 시간 (5분) */
  TTL_MS: 5 * MINUTE_MS,
} as const;

/**
 * 일반 캐시 기본값
 */
export const DEFAULT_CACHE = {
  /** 기본 최대 캐시 항목 수 */
  MAX_SIZE: 100,
  /** 기본 캐시 유효 시간 (10분) */
  TTL_MS: 10 * MINUTE_MS,
} as const;

/**
 * 캐시 키 구분자
 * - 단순 파이프 대신 충돌 방지용 구분자 사용
 */
export const CACHE_KEY = {
  /** 캐시 키 타입 접두사 */
  PREFIX: {
    SAJU: 'saju',
    DAEUN: 'daeun',
    COMPATIBILITY: 'compat',
    DESTINY_MAP: 'dmap',
  },
  /** 구분자 (URL-safe, 일반 입력값에 사용되지 않는 문자열) */
  SEPARATOR: '\x00',
} as const;

// Type exports
export type SajuCacheConfig = typeof SAJU_CACHE;
export type DaeunCacheConfig = typeof DAEUN_CACHE;
export type CompatibilityCacheConfig = typeof COMPATIBILITY_CACHE;
export type DestinyMapCacheConfig = typeof DESTINY_MAP_CACHE;
