// src/lib/Saju/advanced-saju-core/types.ts
// 고급 사주 분석 타입 정의 — 공망 심화만 (옛 jonggeok/hwagyeok/iljuDeep/samgi/
// AdvancedInteractionAnalysis 는 UI 노출 없이 dead-compute 였어서 제거(2026-06)).

import type { PillarKind } from '../types'

// ============================================================
// 공망 타입
// ============================================================

/** 공망 심화 분석 */
export interface GongmangDeepAnalysis {
  gongmangBranches: string[]
  affectedPillars: PillarKind[]
  type: '진공' | '가공' | '반공' | '해공'
  interpretation: string
  effects: {
    positive: string[]
    negative: string[]
  }
  remedy: string[]
}

// ============================================================
// 통합 분석 타입 — 옛 5개 필드 제거 후 gongmang 만 남음
// ============================================================

export interface UltraAdvancedAnalysis {
  gongmang: GongmangDeepAnalysis
}
