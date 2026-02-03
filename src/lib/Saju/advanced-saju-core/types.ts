// src/lib/Saju/advanced-saju-core/types.ts
// 고급 사주 분석 타입 정의

import type { FiveElement, SibsinKind, PillarKind } from '../types'

// ============================================================
// 종격 (從格) 타입
// ============================================================

/** 종격 유형 */
export type JonggeokType =
  | '종왕격' // 비겁이 극강
  | '종강격' // 인성이 극강
  | '종아격' // 식상이 극강
  | '종재격' // 재성이 극강
  | '종살격' // 관살이 극강
  | '종세격' // 한 오행이 대세를 이룸
  | '비종격' // 종격 아님

/** 종격 분석 결과 */
export interface JonggeokAnalysis {
  isJonggeok: boolean
  type: JonggeokType
  dominantElement: FiveElement
  dominantSibsin: SibsinKind[]
  purity: number // 순수도 (0-100)
  stability: number // 안정도 (0-100)
  description: string
  followElement: FiveElement // 따라야 할 오행
  avoidElement: FiveElement // 피해야 할 오행
  advice: string
}

// ============================================================
// 화격 (化格) 타입
// ============================================================

/** 화격 유형 */
export type HwagyeokType =
  | '갑기합화토' // 甲己 -> 土
  | '을경합화금' // 乙庚 -> 金
  | '병신합화수' // 丙辛 -> 水
  | '정임합화목' // 丁壬 -> 木
  | '무계합화화' // 戊癸 -> 火
  | '비화격' // 화격 아님

/** 화격 분석 결과 */
export interface HwagyeokAnalysis {
  isHwagyeok: boolean
  type: HwagyeokType
  originalElements: [FiveElement, FiveElement]
  transformedElement: FiveElement
  transformSuccess: boolean // 화 성립 여부
  conditions: {
    seasonSupport: boolean
    branchSupport: boolean
    noDisturbance: boolean
  }
  description: string
  implications: string[]
}

// ============================================================
// 일주론 타입
// ============================================================

/** 일주론 심화 분석 */
export interface IljuDeepAnalysis {
  ilju: string // 일주 (예: 甲子)
  dayMaster: string
  dayBranch: string
  naeum: string // 납음
  iljuCharacter: string // 일주 특성
  hiddenStems: string[] // 지장간
  sibsinRelation: {
    jijangganSibsin: SibsinKind[]
    dominantRelation: string
  }
  twelveStage: string // 12운성
  gongmang: string[] // 공망
  characteristics: string[]
  strengths: string[]
  weaknesses: string[]
  careerAptitude: string[]
  relationshipStyle: string
  healthFocus: string[]
  luckyFactors: {
    direction: string
    color: string
    number: number[]
  }
}

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
// 삼기 타입
// ============================================================

/** 삼기 분석 */
export interface SamgiAnalysis {
  hasSamgi: boolean
  type?: '천상삼기' | '지하삼기' | '인중삼기'
  stems?: string[]
  description: string
  blessing: string[]
}

// ============================================================
// 형충회합 고급 분석 타입
// ============================================================

/** 형충회합 고급 분석 */
export interface AdvancedInteractionAnalysis {
  interactions: Array<{
    type: string
    participants: string[]
    strength: number
    result?: FiveElement
    status: '성립' | '부분성립' | '불성립' | '해소'
    reason: string
  }>
  netEffect: {
    elementChanges: Partial<Record<FiveElement, number>>
    overallImpact: string
  }
  warnings: string[]
}

// ============================================================
// 통합 분석 타입
// ============================================================

export interface UltraAdvancedAnalysis {
  jonggeok: JonggeokAnalysis
  hwagyeok: HwagyeokAnalysis
  iljuDeep: IljuDeepAnalysis
  gongmangDeep: GongmangDeepAnalysis
  samgi: SamgiAnalysis
  summary: string
}
