//src/lib/astrology/index.ts

// 서버 전용 입구. 클라이언트에서 직접 import 금지.

// ======================================================
// 🌞 Natal (기본 차트 / 하위 호환 API)
// ======================================================
export { calculateNatalChart, toChart } from "./astrologyService";
export type {
  NatalChartInput,    // 차트 생성 입력
  NatalChartData,     // 기본 차트 데이터 형태
  PlanetData,         // 행성 좌표 정보
} from "./astrologyService";

// ======================================================
// 🪐 Transit / Aspects / Houses (기초 확장 API)
// ======================================================
export {
  calculateTransitChart,
  findTransitAspects,
  findMajorTransits,
  getTransitKeywords,
} from "./transit";

export type {
  TransitAspect,
  TransitEvent,
} from "./transit";

export { findAspects, findNatalAspects } from "./aspects";
export { calcHouses } from "./houses";

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
} from "./types";

// ======================================================
// 🧠 Advanced (테마 / 옵션 / 강화 위상 / 엔진 메타)
// ======================================================
export { resolveOptions, defaultOptions, presets } from "./advanced/options";
export type { AstroOptions, AstroTheme } from "./advanced/options";

export { findAspectsPlus, findNatalAspectsPlus } from "./advanced/aspectsPlus";

export { buildEngineMeta } from "./advanced/meta";
export type { ExtendedMeta } from "./advanced/meta";

// ======================================================
// ⭐ Extra Points (Chiron, Lilith, Part of Fortune, Vertex)
// ======================================================
export {
  calculateChiron,
  calculateLilith,
  calculatePartOfFortune,
  calculateVertex,
  extendChartWithExtraPoints,
  calculateExtraPoints,
  isNightChart,
} from "./extraPoints";

export type {
  ExtraPoint,
  ExtendedChart,
} from "./types";

// ======================================================
// 🔄 Progressions (Secondary Progressions, Solar Arc)
// ======================================================
export {
  calculateSecondaryProgressions,
  calculateSolarArcDirections,
  getProgressedMoonPhase,
  getProgressionSummary,
  findProgressedToNatalAspects,
  findProgressedInternalAspects,
  findProgressedMoonAspects,
  findProgressedAspectKeywords,
} from "./progressions";

// Note: ProgressedAspect type removed - not exported from progressions module

export type {
  ProgressionInput,
  ProgressedChart,
} from "./types";

// ======================================================
// 🎂 Returns (Solar Return, Lunar Return)
// ======================================================
export {
  calculateSolarReturn,
  calculateLunarReturn,
  getSolarReturnSummary,
  getLunarReturnSummary,
} from "./returns";

export type {
  SolarReturnInput,
  LunarReturnInput,
  ReturnChart,
} from "./types";

// ======================================================
// 💕 Synastry (두 차트 비교)
// ======================================================
export {
  calculateSynastry,
  findSynastryAspects,
} from "./synastry";

export type {
  SynastryInput,
  SynastryResult,
  HouseOverlay,
} from "./synastry";

// ======================================================
// 🔗 Composite (합성 차트)
// ======================================================
export {
  calculateComposite,
  getCompositeSummary,
} from "./composite";

export type {
  CompositeInput,
  CompositeChart,
} from "./composite";

// ======================================================
// ⚡ Midpoints (미드포인트)
// ======================================================
export {
  calculateMidpoints,
  findMidpointActivations,
  getMidpoint,
  findCrossMidpointActivations,
} from "./midpoints";

export type {
  Midpoint,
  MidpointActivation,
} from "./midpoints";

// ======================================================
// ⭐ Fixed Stars (항성)
// ======================================================
export {
  findFixedStarConjunctions,
  getFixedStar,
  getAllFixedStars,
  correctForPrecession,
} from "./fixedStars";

export type {
  FixedStar,
  FixedStarConjunction,
} from "./fixedStars";

// ======================================================
// 🌑 Eclipses (이클립스)
// ======================================================
export {
  findEclipseImpact,
  getUpcomingEclipses,
  getEclipsesBetween,
  getEclipsesInSign,
  getEclipseAxis,
  checkEclipseSensitivity,
  getAllEclipses,
} from "./eclipses";

export type {
  Eclipse,
  EclipseImpact,
} from "./eclipses";

// ======================================================
// 🪄 Narrative Engine 및 분석기용 타입 Export
// ======================================================

// ✨ 핵심: 엔진에서 사용하는 구조체 타입
export type { AstrologyChartFacts } from "./types";

// ======================================================
// 🐉 Draconic Chart (드라코닉 - 영혼 차트)
// ======================================================
export {
  calculateDraconicChart,
  compareDraconicToNatal,
  findDraconicAspects,
  calculateDraconicSynastry,
  findDraconicTransits,
  getDraconicPlanetMeaning,
} from "./draconic";

export type {
  DraconicChart,
  DraconicComparison,
  DraconicAlignment,
  DraconicTension,
  DraconicSummary,
} from "./draconic";

// ======================================================
// 📅 Electional Astrology (택일 점성학)
// ======================================================
export {
  getMoonPhase,
  getMoonPhaseName,
  checkVoidOfCourse,
  calculatePlanetaryHour,
  getRetrogradePlanets,
  classifyAspects,
  analyzeElection,
  findBestDates,
  getElectionalGuidelines,
} from "./electional";

export type {
  MoonPhase,
  ElectionalEventType,
  VoidOfCourseInfo,
  PlanetaryHour,
  ElectionalScore,
  ElectionalAnalysis,
} from "./electional";

// ======================================================
// 🎵 Harmonic Analysis (하모닉 분석)
// ======================================================
export {
  calculateHarmonicChart,
  findHarmonicConjunctions,
  findHarmonicPatterns,
  analyzeHarmonic,
  analyzeAgeHarmonic,
  generateHarmonicProfile,
  analyzeAspectSeriesHarmonic,
  getHarmonicMeaning,
} from "./harmonics";

export type {
  HarmonicChart,
  HarmonicAnalysis,
  HarmonicConjunction,
  HarmonicPattern,
  HarmonicProfile,
} from "./harmonics";

// ======================================================
// ☄️ Major Asteroids (4대 소행성)
// ======================================================
export {
  calculateAsteroid,
  calculateAllAsteroids,
  extendChartWithAsteroids,
  interpretAsteroid,
  findAsteroidAspects,
  findAllAsteroidAspects,
  getAsteroidInfo,
  analyzeAsteroidSynastry,
  analyzeAsteroidTransit,
} from "./asteroids";

export type {
  AsteroidName,
  Asteroid,
  AsteroidCollection,
  AsteroidInterpretation,
  ExtendedChartWithAsteroids,
} from "./asteroids";

// ======================================================
// 🔧 Rectification (출생 시간 교정)
// ======================================================
export {
  estimateAscendantByAppearance,
  generateTimeRangeCandidates,
  evaluateRectificationCandidates,
  performRectification,
  getAscendantAppearance,
  getSajuHourRange,
  getEventSignature,
  generateRectificationGuide,
} from "./rectification";

export type {
  LifeEvent,
  LifeEventType,
  RectificationCandidate,
  RectificationResult,
  PhysicalAppearanceProfile,
} from "./rectification";
