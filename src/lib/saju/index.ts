// src/lib/Saju/index.ts

// 타입/상수
export * from './types'
export * from './constants'

// 원국 계산기
export { calculateSajuData } from './saju'

// 신강/신약 + 통근/득령 — tonggeun.ts SSOT.
// 옛 advancedAnalysis (994줄) 가 이걸 re-export + 격국/용신/조후 함수들도
// 묶어 노출했는데 격국/용신/조후는 각자 자기 모듈(geokguk/yongsin)에서
// 이미 export 함. advancedAnalysis 통째 삭제 후 barrel 정리 (2026-06).
export { analyzeStrength } from './tonggeun'

// 운세/캘린더
export { getDaeunCycles, getAnnualCycles, getMonthlyCycles, getIljinCalendar } from './unse'
export type { WolunDataExtended } from './unse'

// 관계(이미 구성해둔 함수만)
export { analyzeRelations, toAnalyzeInputFromSaju } from './relations'

// 신살: 이 파일(shinsal.ts)의 실존 함수만 선택적으로 공개
export {
  annotateShinsal,
  getTwelveStage, // 단일 12운성
  getTwelveStagesForPillars, // 12운성 (전체 기둥)
  getShinsalHits, // 신살 히트 리스트
  toSajuPillarsLike, // 어댑터
  getTwelveShinsalSingleByPillar, // 표용: 일지 기준 12신살(각 기둥 1개)
  getLuckySingleByPillar, // 표용: 길성(각 기둥 1개)
  getJijangganText, // 지장간 텍스트
} from './shinsal'
export type {
  ShinsalHit,
  ShinsalAnnot,
  TwelveStage,
  PillarKind,
  SajuPillarsLike,
  AnnotateOptions,
} from './shinsal'

// 타임존
export * from './timezone'

// Note: STEM_LABELS, BRANCH_LABELS are exported from './constants'

// 격국 판정 모듈
export {
  determineGeokguk,
  getGeokgukDescription,
  type GeokgukResult,
  type GeokgukType as GeokgukTypeNew,
} from './geokguk'

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
} from './yongsin'

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
} from './pillarLookup'

// 통근/투출/회국 분석 모듈
export {
  calculateTonggeun,
  calculateTuechul,
  calculateHoeguk,
  calculateDeukryeong,
  type TonggeunResult,
  type TuechulResult,
  type HoegukResult,
  type DeukryeongResult,
  type TonggeunStrengthAnalysis,
} from './tonggeun'

// 조후용신 (궁통보감) 모듈
export {
  getJohuYongsin,
  evaluateJohuNeed,
  harmonizeYongsin,
  JOHU_YONGSIN_DB,
  MONTH_CLIMATE,
  type JohuYongsinInfo,
} from './johuYongsin'

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
} from './hyeongchung'

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
} from './interpretations'

// ============================================================
// 200% 급 고급 모듈들
// ============================================================

// 십신(십성) 심층 분석 모듈
export {
  SIBSIN_TYPES,
  analyzeSibsinPositions,
  countSibsin,
  countSibsinByCategory,
  analyzeSibsinPatterns,
  analyzeSibsinInteractions,
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
  type RelationshipPattern,
  type SibsinComprehensiveAnalysis,
} from './sibsinAnalysis'

// 옛 건강·직업 모듈(./healthCareer) — 모호한 텍스트 예측이라 2026-06-06 삭제.

// 사주 강약 점수화 — 옛 calculateComprehensiveScore/ComprehensiveScore/
// UnseHarmonyScore 는 "종합 점수 S~F 등급" 가짜 분석이라 2026-06-06 삭제.
// 진짜 사주 강약은 calculateStrengthScore 가 책임.
export {
  calculateElementScores,
  calculateStrengthScore,
  calculateGeokgukScore,
  calculateYongsinFitScore,
  type ScoreItem,
  type ElementScore,
  type StrengthScore,
  type GeokgukScore,
  type YongsinFitScore,
} from './strengthScore'

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
} from './compatibility'

// 미사용으로 삭제됨 (2025 정리): fortuneSimulator, visualizationData, aiPromptGenerator

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
} from './patternMatcher'

// 옛 advancedSajuCore (공망 심화 + 종합 orchestrator) — 미사용으로 삭제됨
// (2026-06: production import 0, 좀비 테스트만 검증하던 상태).
// 세대간/가족 분석 엔진 — 미사용으로 삭제됨 (2025 정리)

// saju/cache 디렉터리 외부 사용 0 — 통째 제거됨 (2025 정리).
// 사주 통계 분석 엔진 — 미사용으로 삭제됨 (2025 정리)
