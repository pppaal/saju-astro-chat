// src/lib/prediction/precisionEngine.ts
// 초정밀 예측 엔진 - 100% 정밀도를 위한 통합 시스템
// TIER 5: 과거/미래 완벽 정밀 분석
//
// ✅ REFACTORING COMPLETED:
// This file has been successfully modularized from 1,515 lines to a clean interface.
// All implementation details have been split into focused modules:
// - modules/types.ts - 타입 정의
// - modules/solarTerms.ts - 24절기 계산
// - modules/lunarMansions.ts - 28수 & 달 위상 계산
// - modules/planetaryHours.ts - 행성시 계산
// - modules/progressions.ts - 진행법 계산
// - modules/confidence.ts - 신뢰도 계산
// - modules/causalAnalysis.ts - 인과 요인 분석
// - modules/eventScoring.ts - 사건 유형별 점수 계산
//
// For new imports, use: import { ... } from './modules'

// ============================================================
// Re-export all from modules for backward compatibility
// ============================================================
export * from './modules'

// ============================================================
// Unified Export Object (Legacy Support)
// ============================================================
import {
  getSolarTermForDate,
  getSolarTermMonth,
  getLunarMansion,
  getLunarPhase,
  getLunarPhaseName,
  calculatePlanetaryHours,
  calculateSecondaryProgression,
  calculateConfidence,
  calculateUnifiedConfidence,
  combineConfidenceScores,
  analyzeCausalFactors,
  calculateEventCategoryScores,
} from './modules'

/**
 * Unified Precision Engine Object
 * Provides all functions in a single namespace for convenience
 */
export const PrecisionEngine = {
  // 절기
  getSolarTermForDate,
  getSolarTermMonth,

  // 28수
  getLunarMansion,

  // 달 위상
  getLunarPhase,
  getLunarPhaseName,

  // 행성시
  calculatePlanetaryHours,

  // 진행법
  calculateSecondaryProgression,

  // 신뢰도
  calculateConfidence,
  calculateUnifiedConfidence,
  combineConfidenceScores,

  // 인과 분석
  analyzeCausalFactors,

  // 사건 점수
  calculateEventCategoryScores,
}

export default PrecisionEngine
