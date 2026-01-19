/**
 * Destiny Calendar Module
 * 운명 캘린더 관련 모듈 barrel export
 */

// Types
export type {
  ImportanceGrade,
  EventCategory,
  ImportantDate,
  CalendarMonth,
  DaeunCycle,
  UserSajuProfile,
  UserAstroProfile,
  DailyFortuneResult,
  MonthlyThemeResult,
  WeeklyThemeResult,
  PrecomputeResult,
  DynamicRetrogradeInfo,
  YongsinInfo,
  GeokgukInfo,
  GanzhiResult,
  FortuneArea,
} from './types';

// Cache
export { DestinyCalendarCache, destinyCache } from './cache';

// Constants
export * from './constants';

// Utilities (base utilities - getSipsin, isCheoneulGwiin, etc.)
export * from './utils';

// Grading (통합 버전 with memoization)
export * from './grading';

// Scoring System (New)
export * from './scoring-config';
export {
  calculateTotalScore,
  type SajuScoreInput,
  type AstroScoreInput,
  // Note: ScoreResult is also in saju-analysis, export with different name if needed
} from './scoring';

// Saju Analysis (세운, 월운, 일진, 용신, 격국)
export {
  // Types
  type YongsinInfo as SajuYongsinInfo,
  type YongsinAnalysis,
  type GeokgukInfo as SajuGeokgukInfo,
  type PillarInfo,
  type GeokgukAnalysis,
  type ScoreResult,
  type GanzhiResult as SajuGanzhiResult,
  type IljinScoreResult,
  type SolarReturnAnalysis,
  type ProgressionAnalysis,
  // Functions
  getYearGanzhi,
  calculateSeunScore,
  getMonthGanzhi,
  calculateWolunScore,
  getGanzhiForDate as getSajuGanzhiForDate,
  calculateIljinScore,
  analyzeYongsin,
  analyzeGeokguk,
  analyzeSolarReturn,
  analyzeProgressions,
} from './saju-analysis';

// Astrology Analysis (행성, 달위상, 일월식)
export {
  // Types
  type PlanetName,
  type RetrogradePlanet,
  type PlanetaryHourPlanet,
  type MoonPhaseType,
  type PlanetPosition,
  type EclipseData,
  type EclipseImpact,
  type VoidOfCourseResult,
  type MoonPhaseResult,
  type LunarPhaseResult,
  type PlanetaryHourResult,
  type AspectResult,
  type PlanetTransitResult,
  // Constants
  ECLIPSES,
  // Functions
  getPlanetPosition,
  getPlanetSign,
  isRetrograde,
  getRetrogradePlanetsForDate,
  getLunarPhase,
  getMoonPhaseDetailed,
  checkVoidOfCourseMoon,
  checkEclipseImpact,
  getPlanetaryHourForDate,
  getAspect,
  analyzePlanetTransits,
} from './astrology-analysis';

// Profile Utilities
export {
  type UserSajuProfile as ProfileUserSajuProfile,
  type UserAstroProfile as ProfileUserAstroProfile,
  extractSajuProfile,
  extractAstroProfile,
  calculateSajuProfileFromBirthDate,
  calculateAstroProfileFromBirthDate,
} from './profile-utils';

// Daily Fortune Utilities
export {
  type DailyGanzhiResult,
  type AlertInfo,
  type DefaultFortuneResult,
  getDailyGanzhi,
  getYearGanzhiDaily,
  getMonthGanzhiDaily,
  getLuckyColorFromElement,
  getLuckyColorRandom,
  getLuckyNumber,
  generateAlerts,
  createDefaultFortuneResult,
} from './daily-fortune';

// Special Days Analysis (12운성, 세운/월운 분석, 시간대 추천 등)
export {
  // Types
  type TwelveStarSchool,
  type TwelveFortuneStarInfo,
  type TwelveStarAnalysis,
  type FortuneFlowAnalysis,
  type HourlyRecommendation,
  type LunarAnalysis,
  type ElementMappingDetail,
  type YongsinRecommendation,
  // 12운성 Functions
  setTwelveStarSchool,
  getTwelveStarSchool,
  analyzeTwelveFortuneStar,
  analyzeDayTwelveStars,
  // 세운/월운 분석
  analyzeFortuneFlow,
  // 시간대 추천
  getHourlyRecommendation,
  // 음력 분석
  analyzeLunarDate,
  // 사주-점성술 매핑
  analyzeElementCompatibility,
  ELEMENT_ASTRO_MAPPING,
  // 용신 추천
  getYongsinRecommendations,
  ELEMENT_RECOMMENDATIONS,
} from './specialDays-analysis';
