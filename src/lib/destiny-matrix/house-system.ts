// src/lib/destiny-matrix/house-system.ts
// House System Configuration for Destiny Matrix

/**
 * House System Types
 *
 * Destiny Matrix uses Placidus as the default house system,
 * with Whole Sign as a fallback for extreme latitudes (>66°)
 */

export type HouseSystemType = 'placidus' | 'whole-sign' | 'koch' | 'equal';

export interface HouseSystemConfig {
  default: HouseSystemType;
  fallbackForHighLatitude: HouseSystemType;
  highLatitudeThreshold: number; // degrees
}

/**
 * Default House System Configuration
 *
 * Rationale:
 * - Placidus: Most widely used, time-based, accurate for most locations
 * - Whole Sign fallback: Prevents distortion at extreme latitudes (Arctic/Antarctic)
 * - Threshold: 66° (Arctic Circle) where Placidus becomes unreliable
 */
export const HOUSE_SYSTEM_CONFIG: HouseSystemConfig = {
  default: 'placidus',
  fallbackForHighLatitude: 'whole-sign',
  highLatitudeThreshold: 66,
};

/**
 * Get appropriate house system based on latitude
 *
 * @param latitude - Geographic latitude in degrees (-90 to 90)
 * @returns Recommended house system
 */
export function getHouseSystem(latitude: number): HouseSystemType {
  const absLatitude = Math.abs(latitude);

  if (absLatitude >= HOUSE_SYSTEM_CONFIG.highLatitudeThreshold) {
    return HOUSE_SYSTEM_CONFIG.fallbackForHighLatitude;
  }

  return HOUSE_SYSTEM_CONFIG.default;
}

/**
 * House System Descriptions (for documentation)
 */
export const HOUSE_SYSTEM_INFO = {
  placidus: {
    name: 'Placidus',
    nameKo: '플라시더스',
    description: 'Time-based house system, most popular worldwide',
    descriptionKo: '시간 기반 하우스 시스템, 전 세계 가장 널리 사용',
    pros: ['Accurate for mid-latitudes', 'Widely accepted', 'Time-sensitive'],
    prosKo: ['중위도 지역 정확', '널리 받아들여짐', '시간 민감도 높음'],
    cons: ['Distorts at high latitudes (>66°)', 'Complex calculations'],
    consKo: ['고위도(>66°)에서 왜곡', '복잡한 계산'],
  },
  'whole-sign': {
    name: 'Whole Sign',
    nameKo: '홀 사인',
    description: 'Ancient system, each house = one zodiac sign',
    descriptionKo: '고대 시스템, 각 하우스 = 별자리 하나',
    pros: ['Simple', 'Works at all latitudes', 'Ancient tradition'],
    prosKo: ['단순함', '모든 위도에서 작동', '고대 전통'],
    cons: ['Less time-sensitive', 'House cusps fixed to sign boundaries'],
    consKo: ['시간 민감도 낮음', '하우스 경계가 별자리 경계에 고정'],
  },
  koch: {
    name: 'Koch',
    nameKo: '코흐',
    description: 'Birthplace-focused, similar to Placidus',
    descriptionKo: '출생지 중심, 플라시더스와 유사',
    pros: ['Good for psychological astrology', 'Birthplace accuracy'],
    prosKo: ['심리 점성술에 적합', '출생지 정확성'],
    cons: ['Also distorts at high latitudes', 'Less popular'],
    consKo: ['고위도에서 왜곡', '덜 대중적'],
  },
  equal: {
    name: 'Equal House',
    nameKo: '이퀄 하우스',
    description: 'All houses are equal 30° segments from Ascendant',
    descriptionKo: '어센던트에서 30°씩 균등 분할',
    pros: ['Simple', 'Works at all latitudes', 'Symmetrical'],
    prosKo: ['단순함', '모든 위도에서 작동', '대칭적'],
    cons: ['MC not always on 10th house cusp', 'Less traditional'],
    consKo: ['MC가 10하우스 커스프와 불일치', '덜 전통적'],
  },
} as const;

/**
 * Validate latitude for house calculation
 */
export function validateLatitude(latitude: number): boolean {
  return latitude >= -90 && latitude <= 90;
}

/**
 * Get warning message if using fallback system
 */
export function getHouseSystemWarning(latitude: number, lang: 'ko' | 'en' = 'ko'): string | null {
  const absLatitude = Math.abs(latitude);

  if (absLatitude >= HOUSE_SYSTEM_CONFIG.highLatitudeThreshold) {
    if (lang === 'ko') {
      return `위도 ${latitude.toFixed(1)}°는 극지방입니다. Whole Sign 하우스 시스템을 사용합니다.`;
    } else {
      return `Latitude ${latitude.toFixed(1)}° is extreme. Using Whole Sign house system.`;
    }
  }

  return null;
}

export default {
  HOUSE_SYSTEM_CONFIG,
  getHouseSystem,
  getHouseSystemWarning,
  validateLatitude,
  HOUSE_SYSTEM_INFO,
};
