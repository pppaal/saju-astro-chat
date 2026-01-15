/**
 * Astrology Aspects Module
 * 점성학 어스펙트(각도 관계) 계산 모듈
 *
 * 주요 기능:
 * - 행성 간 각도 관계 감지
 * - 어스펙트 강도(Orb) 계산
 * - 구분: Conjunction, Sextile, Square, Trine, Opposition
 *
 * @module astrology-aspects
 * @example
 * const result = getAspect(120, 240);
 * // { aspect: "trine", orb: 0 }
 *
 * const noAspect = getAspect(45, 100);
 * // { aspect: null, orb: 55 }
 */

/**
 * 어스펙트 결과 타입
 */
export interface AspectResult {
  aspect: "conjunction" | "sextile" | "square" | "trine" | "opposition" | null;
  orb: number; // 각도 오차 범위 (도 단위)
}

/**
 * 두 행성 사이의 어스펙트(각도 관계) 계산
 *
 * 어스펙트는 점성학에서 행성 간의 각도 관계를 나타냅니다.
 * 각 어스펙트는 고유한 에너지와 의미를 가집니다:
 *
 * - **Conjunction (합, 0°)**: 에너지 융합/증폭 - 강력하고 직접적
 * - **Sextile (육분, 60°)**: 조화/기회 - 긍정적이고 자연스러운
 * - **Square (사각, 90°)**: 긴장/도전 - 행동 유발하지만 마찰 있음
 * - **Trine (삼분, 120°)**: 조화/행운 - 가장 긍정적인 어스펙트
 * - **Opposition (충, 180°)**: 대립/균형 - 양극단이 만남, 균형 필요
 *
 * @param longitude1 - 첫 번째 행성의 황경 (0-360도)
 * @param longitude2 - 두 번째 행성의 황경 (0-360도)
 * @returns 어스펙트 타입과 오브(오차 범위)
 *
 * @example
 * // 합(Conjunction) - 에너지 융합
 * getAspect(120, 125);
 * // { aspect: "conjunction", orb: 5 }
 *
 * @example
 * // 삼분(Trine) - 조화
 * getAspect(120, 240);
 * // { aspect: "trine", orb: 0 }
 *
 * @example
 * // 사각(Square) - 긴장
 * getAspect(90, 180);
 * // { aspect: "square", orb: 0 }
 *
 * @example
 * // 충(Opposition) - 대립
 * getAspect(45, 225);
 * // { aspect: "opposition", orb: 0 }
 *
 * @example
 * // 어스펙트 없음
 * getAspect(45, 100);
 * // { aspect: null, orb: 55 }
 */
export function getAspect(longitude1: number, longitude2: number): AspectResult {
  // 황경 차이를 0-180도 범위로 정규화
  let diff = Math.abs(longitude1 - longitude2);
  if (diff > 180) {
    diff = 360 - diff;
  }

  // Conjunction (합) - 0° ±8°
  // 가장 강력한 어스펙트로, 두 행성의 에너지가 완전히 합쳐진 상태
  if (diff <= 8) {
    return { aspect: "conjunction", orb: diff };
  }

  // Sextile (육분) - 60° ±6°
  // 조화로운 어스펙트로, 기회와 자연스러운 흐름을 나타냄
  if (Math.abs(diff - 60) <= 6) {
    return { aspect: "sextile", orb: Math.abs(diff - 60) };
  }

  // Square (사각) - 90° ±8°
  // 도전적인 어스펙트로, 긴장과 행동 유발이지만 성장의 기회
  if (Math.abs(diff - 90) <= 8) {
    return { aspect: "square", orb: Math.abs(diff - 90) };
  }

  // Trine (삼분) - 120° ±8°
  // 가장 긍정적인 어스펙트로, 조화와 행운을 나타냄
  if (Math.abs(diff - 120) <= 8) {
    return { aspect: "trine", orb: Math.abs(diff - 120) };
  }

  // Opposition (충) - 180° ±8°
  // 대립적 어스펙트로, 양극단이 만나 균형과 통합이 필요
  if (Math.abs(diff - 180) <= 8) {
    return { aspect: "opposition", orb: Math.abs(diff - 180) };
  }

  // 어스펙트 없음
  return { aspect: null, orb: diff };
}
