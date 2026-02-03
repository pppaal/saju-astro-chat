// src/lib/Saju/hyeongchung/index.ts
// 형충회합 모듈 통합 export

/**
 * Hyeongchung (刑沖會合) Analysis Modules
 *
 * 리팩토링 완료:
 * - 924줄의 hyeongchung.ts를 모듈식 구조로 분리
 * - 타입/상수/유틸 분리
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
  Pillar,
  PillarPosition,
  InteractionType,
  HyeongType,
  MergedElement,
  InteractionResult,
  HyeongchungAnalysis,
  SajuPillarsInput,
} from './types'
