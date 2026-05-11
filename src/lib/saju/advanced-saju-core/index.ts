// src/lib/Saju/advanced-saju-core/index.ts
// 고급 사주 분석 모듈 통합 export

/**
 * Advanced Saju Core Analysis Modules
 *
 * 리팩토링 완료:
 * - 856줄의 advancedSajuCore.ts를 모듈식 구조로 분리
 * - 타입 정의 독립화
 * - 유지보수성 향상
 *
 * 구조:
 * - types.ts: 타입 정의
 * - (추가 모듈은 필요시 구현)
 */

// ============================================================
// 타입 Export
// ============================================================
export type {
  JonggeokType,
  JonggeokAnalysis,
  HwagyeokType,
  HwagyeokAnalysis,
  IljuDeepAnalysis,
  GongmangDeepAnalysis,
  SamgiAnalysis,
  AdvancedInteractionAnalysis,
  UltraAdvancedAnalysis,
} from './types'
