/**
 * index.ts - Precision Engine 모듈식 구조 진입점
 *
 * 리팩토링 완료:
 * - 1,515줄의 precisionEngine.ts를 모듈식 구조로 분리
 * - 절기/음력/행성시/진행법/신뢰도/인과분석/사건점수 모듈 독립
 * - 유지보수성 및 테스트 가능성 향상
 *
 * 구조:
 * - modules/types.ts: 공통 타입 정의
 * - modules/solarTerms.ts: 24절기 계산 모듈
 * - modules/lunarMansions.ts: 28수 & 달 위상 계산 모듈
 * - modules/planetaryHours.ts: 행성시 계산 모듈
 * - modules/progressions.ts: 진행법 계산 모듈
 * - modules/confidence.ts: 신뢰도 계산 모듈
 * - modules/causalAnalysis.ts: 인과 요인 분석 모듈
 * - modules/eventScoring.ts: 사건 유형별 점수 계산 모듈
 */

// ============================================================
// 타입 정의 Export
// ============================================================
export * from './types'

// ============================================================
// 24절기 모듈 Export
// ============================================================
export { getSolarTermForDate, getSolarTermMonth } from './solarTerms'

// ============================================================
// 28수 & 달 위상 모듈 Export
// ============================================================
export { getLunarMansion, getLunarPhase, getLunarPhaseName } from './lunarMansions'

// ============================================================
// 행성시 모듈 Export
// ============================================================
export { calculatePlanetaryHours } from './planetaryHours'

// ============================================================
// 진행법 모듈 Export
// ============================================================
export { calculateSecondaryProgression } from './progressions'

// ============================================================
// 신뢰도 모듈 Export
// ============================================================
export {
  calculateConfidence,
  calculateUnifiedConfidence,
  combineConfidenceScores,
} from './confidence'

// ============================================================
// 인과 분석 모듈 Export
// ============================================================
export { analyzeCausalFactors } from './causalAnalysis'

// ============================================================
// 사건 점수 모듈 Export
// ============================================================
export { calculateEventCategoryScores } from './eventScoring'
