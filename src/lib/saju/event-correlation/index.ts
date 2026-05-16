// src/lib/Saju/event-correlation/index.ts
// 사주 사건 상관관계 분석 모듈 통합 export

/**
 * Event Correlation Analysis Modules
 *
 * 리팩토링 완료:
 * - 912줄의 eventCorrelation.ts를 모듈식 구조로 분리
 * - 타입/헬퍼/분석 로직 독립
 * - 유지보수성 향상
 *
 * 구조:
 * - types.ts: 타입 정의
 * - helpers.ts: 헬퍼 함수 및 상수
 * - (추가 모듈은 필요시 구현)
 */

// ============================================================
// 타입 Export
// ============================================================
export type {
  SimplePillar,
  SimpleFourPillars,
  SajuResult,
  EventCategory,
  EventNature,
  LifeEvent,
  DaeunSeunInfo,
  CorrelationFactor,
  EventSajuCorrelation,
  PatternRecognition,
  PredictiveInsight,
  EventTimeline,
  TriggerAnalysis,
} from './types'

// ============================================================
// 헬퍼 함수 Export
// ============================================================
export {
  getStemInfo,
  getBranchInfo,
  getStemElement,
  getBranchElement,
  CHEONGAN_HAP,
  CHEONGAN_CHUNG,
  YUKAP,
  SAMHAP,
  CHUNG,
  HYEONG,
  GWIIN,
  YEOKMA,
} from './helpers'
