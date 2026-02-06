// src/lib/Saju/index.ts

// 타입/상수
export * from './types';
export * from './constants';

// 원국 계산기
export { calculateSajuData } from './saju';

// 고급 분석 (신강/신약, 격국, 용신, 통근/득령, 조후용신)
export {
  analyzeStrength,
  analyzeGeokguk,
  analyzeYongsin,
  analyzeAdvancedSaju,
  analyzeRoot,
  analyzeJohuYongsin,
  analyzeExtendedSaju,
  evaluateElementInfluence,
  scoreUnseElement,
  getSeasonFromMonthBranch,
  type StrengthLevel,
  type DaymasterStrengthAnalysis,
  type StrengthAnalysis, // deprecated alias
  type GeokgukType,
  type GeokgukAnalysis,
  type YongsinAnalysis,
  type AdvancedSajuAnalysis,
  type RootAnalysis,
  type JohuYongsinAnalysis,
  type ExtendedAdvancedAnalysis,
  type Season,
} from './astrologyengine';

// 운세/캘린더
export { getDaeunCycles, getAnnualCycles, getMonthlyCycles, getIljinCalendar } from './unse';
export type { WolunDataExtended } from './unse';

// 관계(이미 구성해둔 함수만)
export { analyzeRelations, toAnalyzeInputFromSaju } from './relations';

// 신살: 이 파일(shinsal.ts)의 실존 함수만 선택적으로 공개
export {
  annotateShinsal,
  getTwelveStage,                 // 단일 12운성
  getTwelveStagesForPillars,      // 12운성 (전체 기둥)
  getShinsalHits,                 // 신살 히트 리스트
  toSajuPillarsLike,              // 어댑터
  getTwelveShinsalSingleByPillar, // 표용: 일지 기준 12신살(각 기둥 1개)
  getLuckySingleByPillar,         // 표용: 길성(각 기둥 1개)
  getJijangganText,               // 지장간 텍스트
} from './shinsal';
export type {
  ShinsalHit,
  ShinsalAnnot,
  TwelveStage,
  PillarKind,
  SajuPillarsLike,
  AnnotateOptions,
} from './shinsal';

// 타임존
export * from './timezone';

// Note: STEM_LABELS, BRANCH_LABELS are exported from './constants'

// 격국 판정 모듈
export {
  determineGeokguk,
  getGeokgukDescription,
  type GeokgukResult,
  type GeokgukType as GeokgukTypeNew,
} from './geokguk';

// 용신 선정 모듈
export {
  determineYongsin,
  getYongsinDescription,
  getStrengthDescription,
  getKibsinDescription,
  getLuckyColors,
  getLuckyDirection,
  getLuckyNumbers,
  type YongsinResult,
  type YongsinType,
  type DaymasterStrength,
  type SeasonClimate,
  type ElementStats,
} from './yongsin';

// 60갑자 조회 모듈
export {
  SIXTY_PILLARS,
  getPillarInfo,
  getPillarByIndex,
  getPillarByKoreanName,
  getIljuInfo,
  getIljuSummary,
  getNaeum,
  getNaeumElement,
  getNextPillar,
  getPreviousPillar,
  getPillarDistance,
  getPillarAfter,
  getYearPillar,
  getAllPillars,
  getGongmang,
  getStemsByElement,
  getBranchesByElement,
  makePillar,
  calculatePillarIndex,
  STEM_KOREAN,
  BRANCH_KOREAN,
  type SixtyPillarInfo,
  type IljuInfo,
} from './pillarLookup';

// 통근/투출/회국 분석 모듈
export {
  calculateTonggeun,
  calculateTuechul,
  calculateHoeguk,
  calculateDeukryeong,
  analyzeStrength as analyzeTonggeunStrength,
  type TonggeunResult,
  type TuechulResult,
  type HoegukResult,
  type DeukryeongResult,
  type TonggeunStrengthAnalysis,
  type StrengthAnalysis as TonggeunStrengthAnalysisDeprecated, // deprecated alias
} from './tonggeun';

// 조후용신 (궁통보감) 모듈
export {
  getJohuYongsin,
  evaluateJohuNeed,
  harmonizeYongsin,
  JOHU_YONGSIN_DB,
  MONTH_CLIMATE,
  type JohuYongsinInfo,
} from './johuYongsin';

// 형충회합 작용력 계산 모듈
export {
  analyzeHyeongchung,
  analyzeUnseInteraction,
  checkHapHwa,
  calculateInteractionScore,
  type InteractionType,
  type HyeongType,
  type InteractionResult,
  type HyeongchungAnalysis,
  type PillarPosition,
  type MergedElement,
} from './hyeongchung';

// 해석 데이터 모듈 (12운성, 십성, 신살, 오행)
export {
  TWELVE_STAGE_INTERPRETATIONS,
  SIBSIN_INTERPRETATIONS,
  SHINSAL_INTERPRETATIONS,
  ELEMENT_INTERPRETATIONS,
  getTwelveStageInterpretation,
  getSibsinInterpretation,
  getShinsalInterpretation,
  getElementInterpretation,
  summarizeTwelveStages,
  analyzeElementBalance,
  type TwelveStageType,
  type TwelveStageInterpretation,
  type SibsinInterpretation,
  type ShinsalInterpretation,
  type ElementInterpretation,
} from './interpretations';

// 종합 해석 리포트 모듈
export {
  generateComprehensiveReport,
  generateQuickSummary,
  type ComprehensiveReport,
  type ComprehensiveReportSection,
} from './comprehensiveReport';

// ============================================================
// 200% 급 고급 모듈들
// ============================================================

// 대운/세운 종합 분석 모듈
export {
  analyzeUnseComprehensive,
  analyzeDaeunPeriod,
  analyzeLifeCycle,
  analyzeSpecificYear,
  analyzeMultiYearTrend,
  type UnseType,
  type UnseInfo,
  type UnseInteractionDetail,
  type UnseYongsinMatch,
  type UnseTwelveStage,
  type UnseSibsinRelation,
  type UnseComprehensiveAnalysis,
  type DaeunPeriodAnalysis,
  type LifeCycleAnalysis,
  type YearDetailAnalysis,
  type MultiYearTrend,
} from './unseAnalysis';

// 십신(십성) 심층 분석 모듈
export {
  SIBSIN_TYPES,
  analyzeSibsinPositions,
  countSibsin,
  countSibsinByCategory,
  analyzeSibsinPatterns,
  analyzeSibsinInteractions,
  analyzeCareerAptitude,
  analyzeRelationshipPatterns,
  analyzePersonality,
  analyzeSibsinComprehensive,
  type SibsinType,
  type SibsinCategory,
  type SibsinPosition,
  type SibsinCount,
  type SibsinCategoryCount,
  type SibsinPattern,
  type SibsinInteraction,
  type CareerAptitude,
  type RelationshipPattern,
  type SibsinComprehensiveAnalysis,
} from './sibsinAnalysis';

// 건강 및 직업 적성 심층 분석 모듈
export {
  analyzeHealth,
  analyzeCareer,
  analyzeHealthCareer,
  getElementRecommendations,
  type OrganHealth,
  type HealthAnalysis,
  type CareerField,
  type WorkStyle,
  type CareerAnalysis,
  type HealthCareerComprehensive,
  type ElementRecommendations,
} from './healthCareer';

// 사주 강약 종합 점수화 시스템
export {
  calculateElementScores,
  calculateStrengthScore,
  calculateGeokgukScore,
  calculateYongsinFitScore,
  calculateComprehensiveScore,
  type ScoreItem,
  type ElementScore,
  type StrengthScore,
  type GeokgukScore,
  type YongsinFitScore,
  type UnseHarmonyScore,
  type ComprehensiveScore,
} from './strengthScore';

// 운세 해석 문장 생성기
export {
  generateElementText,
  generateSibsinText,
  generateTwelveStageText,
  generateFortuneText,
  generateChungText,
  generateHapText,
  generateStrengthAdvice,
  generateComprehensiveText,
  type TextStyle,
  type TextContext,
  type GeneratedText,
  type FortuneInput,
} from './textGenerator';

// ============================================================
// 500% 급 고급 모듈들
// ============================================================

// 궁합 심층 분석 엔진
export {
  analyzeElementCompatibility,
  analyzeStemCompatibility,
  analyzeBranchCompatibility,
  analyzeDayMasterRelation,
  analyzeByCategory,
  analyzeComprehensiveCompatibility,
  analyzeMultiPersonCompatibility,
  type CompatibilitySubject,
  type ElementCompatibility,
  type StemCompatibility,
  type BranchCompatibility,
  type DayMasterRelation,
  type CompatibilityCategory,
  type CategoryCompatibility,
  type TemporalCompatibility,
  type ComprehensiveCompatibility,
  type MultiPersonCompatibility,
} from './compatibility';

// 복합 운세 시뮬레이션
export {
  generateFortuneSnapshot,
  simulateFortuneFlow,
  simulateScenario,
  simulateDecision,
  simulateLifeCycle,
  simulateMonthlyFortune,
  findOptimalTiming,
  type TimeUnit,
  type FortuneArea,
  type TimePoint,
  type AreaFortune,
  type FortuneSnapshot,
  type FortuneFlow,
  type ScenarioResult,
  type DecisionSimulation,
  type LifeCycleSimulation,
} from './fortuneSimulator';

// 사주 시각화 데이터
export {
  ELEMENT_COLORS,
  generateElementDistribution,
  generatePillarVisualization,
  generateSajuBoardVisualization,
  generateFortuneTimeline,
  generateRadarChartData,
  generateRelationHeatmap,
  generateNetworkGraph,
  generateAuraVisualization,
  generatePillarRevealAnimation,
  type ColorPalette,
  type ChartDataPoint,
  type ElementDistributionData,
  type PillarVisualization,
  type SajuBoardVisualization,
  type InteractionVisualization,
  type FortuneTimelineData,
  type RadarChartData,
  type HeatmapData,
  type NetworkGraphData,
  type AuraVisualization,
  type AnimationSequence,
} from './visualizationData';

// AI 프롬프트 생성기
export {
  generateLLMPrompt,
  generateImagePrompt,
  generateNarrativePrompt,
  generateChatPrompt,
  type PromptType,
  type PromptStyle,
  type PromptLanguage,
  type PromptOptions,
  type GeneratedPrompt,
  type ImagePrompt,
} from './aiPromptGenerator';

// 패턴 매칭 엔진
export {
  matchAllPatterns,
  matchPatternsByCategory,
  analyzePatterns,
  comparePatterns,
  getPatternRecommendations,
  createCustomPattern,
  searchPatterns,
  getPatternsByRarity,
  getPatternStatistics,
  type PatternCategory,
  type PatternMatch,
  type PatternDefinition,
  type PatternAnalysis,
  type CelebrityProfile,
} from './patternMatcher';

// ============================================================
// 1000% 급 초고급 모듈들
// ============================================================

// 사주 고급 핵심 엔진 (종격, 화격, 일주론, 공망, 삼기)
export {
  analyzeJonggeok,
  analyzeHwagyeok,
  analyzeIljuDeep,
  analyzeGongmangDeep,
  analyzeSamgi,
  performUltraAdvancedAnalysis,
  type JonggeokType,
  type JonggeokAnalysis,
  type HwagyeokType,
  type HwagyeokAnalysis,
  type IljuDeepAnalysis,
  type GongmangDeepAnalysis,
  type SamgiAnalysis,
  type UltraAdvancedAnalysis,
} from './advancedSajuCore';

// 세대간/가족 분석 엔진
export {
  analyzeElementHarmony,
  analyzeStemRelation,
  analyzeBranchRelation,
  analyzeRoleHarmony,
  analyzeInheritedTraits,
  analyzeConflictPoints,
  analyzeGenerationalPatterns,
  analyzeParentChild,
  analyzeSiblings,
  analyzeSpouse,
  analyzeFamilyDynamic,
  performCompleteFamilyAnalysis,
  type FamilyRole,
  type RelationType,
  type FamilyMember,
  type FamilyRelation,
  type FamilyCompatibilityAnalysis,
  type ElementHarmonyResult,
  type StemRelationResult,
  type BranchRelationResult,
  type RoleHarmonyResult,
  type InheritedTrait,
  type ConflictPoint,
  type GenerationalPattern,
  type FamilyDynamic,
  type SiblingAnalysis,
  type ParentChildAnalysis,
  type SpouseAnalysis,
} from './familyLineage';

// 사건 상관관계 분석 엔진
export {
  calculatePeriodPillars,
  analyzeEventCorrelation,
  recognizePatterns,
  generatePredictiveInsight,
  analyzeTriggers,
  buildEventTimeline,
  performComprehensiveEventAnalysis,
  type EventCategory,
  type EventNature,
  type LifeEvent,
  type EventSajuCorrelation,
  type DaeunSeunInfo,
  type CorrelationFactor,
  type PatternRecognition,
  type PredictiveInsight,
  type EventTimeline,
  type TriggerAnalysis,
} from './eventCorrelation';

// 성능 최적화/캐싱 시스템
export {
  LRUCache,
  BatchProcessor,
  memoize,
  memoizeAsync,
  createLazyLoader,
  generateSajuCacheKey,
  generateCompatibilityCacheKey,
  computeWithCache,
  getSajuFromCache,
  setSajuToCache,
  getDaeunFromCache,
  setDaeunToCache,
  getCompatibilityFromCache,
  setCompatibilityToCache,
  getAllCacheStats,
  clearAllCaches,
  cleanupAllCaches,
  measurePerformance,
  getPerformanceStats,
  clearPerformanceHistory,
  sajuCache,
  daeunCache,
  compatibilityCache,
  type CacheConfig,
  type CacheEntry,
  type CacheStats,
  type BatchRequest,
  type MemoizedFunction,
  type LazyLoader,
  type ComputationResult,
  type PerformanceMetrics,
} from './cache';

// 사주 통계 분석 엔진
export {
  calculateStatisticalSummary,
  calculateCorrelation,
  chiSquareTest,
  calculateElementDistribution,
  calculateStemDistribution,
  calculateBranchDistribution,
  calculateDayMasterDistribution,
  calculateYinYangRatio,
  performFrequencyAnalysis,
  analyzeGabjaFrequency,
  calculateRarityScore,
  analyzeElementCorrelations,
  performClusterAnalysis,
  detectAnomalies,
  calculatePopulationStats,
  analyzeTrend,
  generateStatisticsReport,
  type ElementDistribution,
  type StemDistribution,
  type BranchDistribution,
  type StatisticalSummary,
  type CorrelationResult,
  type FrequencyAnalysis,
  type PopulationStats,
  type RarityScore,
  type TrendAnalysis,
  type ClusterAnalysis,
  type AnomalyDetection,
} from './sajuStatistics';