/**
 * astrology-analysis.ts - 점성술 분석 모듈
 *
 * ✅ REFACTORING COMPLETED:
 * - Original 842 lines modularized into astrology/ directory
 * - This file is now a facade that re-exports from modules
 *
 * Module structure:
 * - astrology/types.ts: 모든 타입 정의
 * - astrology/constants.ts: 상수 데이터
 * - astrology/helpers.ts: 헬퍼 함수
 * - astrology/planetPosition.ts: getPlanetPosition
 * - astrology/retrograde.ts: isRetrograde
 * - astrology/moonPhase.ts: getLunarPhase, getMoonPhaseDetailed
 * - astrology/voidOfCourse.ts: checkVoidOfCourseMoon
 * - astrology/eclipse.ts: checkEclipseImpact
 * - astrology/planetaryHours.ts: getPlanetaryHourForDate
 * - astrology/aspects.ts: getAspect
 * - astrology/transits.ts: analyzePlanetTransits
 */

// Re-export everything from the astrology module
export * from './astrology';
