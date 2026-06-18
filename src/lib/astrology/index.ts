//src/lib/astrology/index.ts

// 서버 전용 입구. 클라이언트에서 직접 import 금지.

// ======================================================
// 🌞 Natal (기본 차트 / 하위 호환 API)
// ======================================================
export { calculateNatalChart, toChart } from "./foundation/astrologyService";
export type {
  NatalChartInput,    // 차트 생성 입력
  NatalChartData,     // 기본 차트 데이터 형태
  PlanetData,         // 행성 좌표 정보
} from "./foundation/astrologyService";

// ======================================================
// 🪐 Transit / Aspects / Houses (기초 확장 API)
// ======================================================
export {
  calculateTransitChart,
  
  findMajorTransits,
  
} from "./foundation/transit";

export type {
  TransitAspect,
  TransitEvent,
} from "./foundation/transit";

export { findAspects, findNatalAspects } from "./foundation/aspects";
;

// ======================================================
// 📘 공통 타입 (기초 구조)
// ======================================================
export type {
  Chart,             // 차트 전체 모델
  PlanetBase,        // 행성 기본 타입
  House,             // 하우스(궁)
  AspectHit,         // 위상 히트 단위
  AspectRules,       // 위상 규칙
  TransitInput,      // 트랜짓 입력 타입
  HouseSystem,       // 하우스 시스템
  AspectType,        // 위상 타입
  ChartMeta,         // 메타 정보 구조
  ZodiacKo,          // 별자리 한글 타입
} from "./foundation/types";

// ======================================================
// 🧠 Advanced (테마 / 옵션 / 강화 위상 / 엔진 메타)
// ======================================================
export { resolveOptions,   } from "./advanced/options";
export type { AstroOptions, AstroTheme } from "./advanced/options";

export { findAspectsPlus, findNatalAspectsPlus } from "./advanced/aspectsPlus";

export { buildEngineMeta } from "./advanced/meta";
export type { ExtendedMeta } from "./advanced/meta";

// ======================================================
// ⭐ Extra Points (Chiron, Lilith, Part of Fortune, Vertex)
// ======================================================
export {
  
  
  
  
  
  calculateExtraPoints,
  
} from "./foundation/extraPoints";

export type {
  ExtraPoint,
  ExtendedChart,
} from "./foundation/types";

// ======================================================
// 🔄 Progressions (Secondary Progressions, Solar Arc)
// ======================================================
export {
  calculateSecondaryProgressions,
  calculateSolarArcDirections,
  getProgressedMoonPhase,
  getProgressionSummary,
  
  
  
  
} from "./foundation/progressions";

// Note: ProgressedAspect type removed - not exported from progressions module

export type {
  ProgressionInput,
  ProgressedChart,
} from "./foundation/types";

// ======================================================
// 🎂 Returns (Solar Return, Lunar Return)
// ======================================================
export {
  calculateSolarReturn,
  calculateLunarReturn,
  getSolarReturnSummary,
  getLunarReturnSummary,
} from "./foundation/returns";

export type {
  SolarReturnInput,
  LunarReturnInput,
  ReturnChart,
} from "./foundation/types";

// ======================================================
// 💕 Synastry (두 차트 비교)
// ======================================================
;

export type {
  SynastryInput,
  SynastryResult,
  HouseOverlay,
} from "./foundation/synastry";

// ======================================================
// 🔗 Composite (합성 차트)
// ======================================================
;

export type {
  CompositeInput,
  CompositeChart,
} from "./foundation/composite";

// ======================================================
// ⚡ Midpoints (미드포인트)
// ======================================================
export {
  calculateMidpoints,
  findMidpointActivations,
  
  
} from "./foundation/midpoints";

export type {
  Midpoint,
  MidpointActivation,
} from "./foundation/midpoints";

// ======================================================
// ⭐ Fixed Stars (항성)
// ======================================================
export {
  findFixedStarConjunctions,
  
  getAllFixedStars,
  
} from "./foundation/fixedStars";

export type {
  FixedStar,
  FixedStarConjunction,
} from "./foundation/fixedStars";

// ======================================================
// 🌑 Eclipses (이클립스)
// ======================================================
export {
  findEclipseImpact,
  getUpcomingEclipses,
  
  
  
  checkEclipseSensitivity,
  
} from "./foundation/eclipses";

export type {
  Eclipse,
  EclipseImpact,
} from "./foundation/eclipses";

// ======================================================
// 🪄 Narrative Engine 및 분석기용 타입 Export
// ======================================================

// ✨ 핵심: 엔진에서 사용하는 구조체 타입
export type { AstrologyChartFacts } from "./foundation/types";

// ======================================================
// 🐉 Draconic Chart (드라코닉 - 영혼 차트)
// ======================================================
export {
  calculateDraconicChart,
  compareDraconicToNatal,
  
  
  
  getDraconicPlanetMeaning,
} from "./foundation/draconic";

export type {
  DraconicChart,
  DraconicComparison,
  DraconicAlignment,
  DraconicTension,
  DraconicSummary,
} from "./foundation/draconic";

// ======================================================
// 📅 Electional Astrology (택일 점성학)
// ======================================================
;

export type {
  MoonPhase,
  ElectionalEventType,
  VoidOfCourseInfo,
  PlanetaryHour,
  ElectionalScore,
  ElectionalAnalysis,
} from "./foundation/electional";

// ======================================================
// 🎵 Harmonic Analysis (하모닉 분석)
// ======================================================
export {
  calculateHarmonicChart,
  
  
  analyzeHarmonic,
  
  generateHarmonicProfile,
  
  getHarmonicMeaning,
} from "./foundation/harmonics";

export type {
  HarmonicChart,
  HarmonicAnalysis,
  HarmonicConjunction,
  HarmonicPattern,
  HarmonicProfile,
} from "./foundation/harmonics";

// ======================================================
// ☄️ Major Asteroids (4대 소행성)
// ======================================================
export {
  
  calculateAllAsteroids,
  
  interpretAsteroid,
  
  findAllAsteroidAspects,
  getAsteroidInfo,
  
  
} from "./foundation/asteroids";

export type {
  AsteroidName,
  Asteroid,
  AsteroidCollection,
  AsteroidInterpretation,
  ExtendedChartWithAsteroids,
} from "./foundation/asteroids";
