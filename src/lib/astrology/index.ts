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
  findTransitAspects,
  findMajorTransits,
  getTransitKeywords,
} from "./foundation/transit";

export type {
  TransitAspect,
  TransitEvent,
} from "./foundation/transit";

export { findAspects, findNatalAspects } from "./foundation/aspects";
export { calcHouses } from "./foundation/houses";

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
  findProgressedToNatalAspects,
  findProgressedInternalAspects,
  findProgressedMoonAspects,
  findProgressedAspectKeywords,
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
export {
  calculateSynastry,
  findSynastryAspects,
} from "./foundation/synastry";

export type {
  SynastryInput,
  SynastryResult,
  HouseOverlay,
} from "./foundation/synastry";

// ======================================================
// 🔗 Composite (합성 차트)
// ======================================================
export {
  calculateComposite,
  getCompositeSummary,
} from "./foundation/composite";

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
  getMidpoint,
  findCrossMidpointActivations,
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
  getFixedStar,
  getAllFixedStars,
  correctForPrecession,
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
  getEclipsesBetween,
  getEclipsesInSign,
  getEclipseAxis,
  checkEclipseSensitivity,
  getAllEclipses,
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
  findDraconicAspects,
  calculateDraconicSynastry,
  findDraconicTransits,
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
} from "./foundation/electional";

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
  findHarmonicConjunctions,
  findHarmonicPatterns,
  analyzeHarmonic,
  analyzeAgeHarmonic,
  generateHarmonicProfile,
  analyzeAspectSeriesHarmonic,
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
  calculateAsteroid,
  calculateAllAsteroids,
  extendChartWithAsteroids,
  interpretAsteroid,
  findAsteroidAspects,
  findAllAsteroidAspects,
  getAsteroidInfo,
  analyzeAsteroidSynastry,
  analyzeAsteroidTransit,
} from "./foundation/asteroids";

export type {
  AsteroidName,
  Asteroid,
  AsteroidCollection,
  AsteroidInterpretation,
  ExtendedChartWithAsteroids,
} from "./foundation/asteroids";

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
} from "./foundation/rectification";

export type {
  LifeEvent,
  LifeEventType,
  RectificationCandidate,
  RectificationResult,
  PhysicalAppearanceProfile,
} from "./foundation/rectification";

// ======================================================
// 🌌 Main Astrology Entry — mirrors src/lib/Saju/saju.ts
// ======================================================
export { calculateAstrologyData } from "./astrology";
export type { CalculateAstrologyInput, AstrologyData } from "./astrology";

export {
  buildAstrologyComprehensiveReport,
  ASTROLOGY_DOMAIN_LABEL_KO,
} from "./comprehensiveReport";
export type {
  AstrologyDomain,
  AstrologyDomainScore,
  AstrologyPlacementHighlight,
  AstrologyAspectHighlight,
  AstrologyTimingScore,
  AstrologyTiming,
  AstrologyHouseRulerSignal,
  AstrologyComprehensiveReport,
} from "./comprehensiveReport";

export {
  getPlanetSignInterpretation,
  getPlanetHouseInterpretation,
  getAspectInterpretation,
  getPlanetLabelKo,
  getSignLabelKo,
  getHouseDomainKo,
} from "./interpretations";
export type {
  AstroPlanetName,
  ZodiacName,
  AspectKind,
} from "./interpretations";

// ======================================================
// 🎯 Traditional rules — dignities · aspect scoring · balance
// ======================================================
export {
  getEssentialDignity,
  getRulerOfSign,
  getPlanetTone,
  getPairTone,
} from "./dignities";
export type { DignityKind, DignityResult, PlanetTone } from "./dignities";

export { scoreAspect, aggregateAspectScore } from "./aspectScoring";
export type { ScoredAspect } from "./aspectScoring";

export { calculateChartBalance } from "./balance";
export type {
  ChartBalance,
  Element as ChartElement,
  Modality as ChartModality,
  Polarity as ChartPolarity,
} from "./balance";
