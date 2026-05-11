// src/lib/Saju/hyeongchung/types.ts
// 형충회합 타입 정의

/** 간단한 기둥 인터페이스 */
export interface Pillar {
  stem: string
  branch: string
}

/** 기둥 위치 */
export type PillarPosition = 'year' | 'month' | 'day' | 'hour'

/** 작용 유형 */
export type InteractionType =
  | '육합' // 六合 - 지지 1:1 합
  | '삼합' // 三合 - 3개 지지 합
  | '반합' // 半合 - 삼합의 2개
  | '방합' // 方合 - 계절 방위 합
  | '충' // 沖 - 상충
  | '형' // 刑 - 형벌
  | '해' // 害 - 해침
  | '파' // 破 - 파쇄
  | '원진' // 怨嗔 - 원망
  | '귀문' // 鬼門 - 귀문관살

/** 형(刑) 세부 유형 */
export type HyeongType =
  | '삼형' // 三刑 - 寅巳申, 丑戌未
  | '자형' // 自刑 - 辰辰, 午午, 酉酉, 亥亥
  | '상형' // 相刑 - 子卯
  | '무은지형' // 無恩之刑 - 寅巳申
  | '시세지형' // 恃勢之刑 - 丑戌未
  | '무례지형' // 無禮之刑 - 子卯

/** 합(合) 결과 오행 */
export type MergedElement = '木' | '火' | '土' | '金' | '水' | null

/** 작용 결과 */
export interface InteractionResult {
  type: InteractionType
  subType?: HyeongType | string
  branches: string[]
  pillars: PillarPosition[]
  strength: number // 0-100 작용력
  mergedElement?: MergedElement
  description: string
  effect: '길' | '흉' | '중립'
}

/** 전체 분석 결과 */
export interface HyeongchungAnalysis {
  interactions: InteractionResult[]
  summary: {
    totalPositive: number
    totalNegative: number
    dominantInteraction: InteractionType | null
    netEffect: '길' | '흉' | '중립'
  }
  warnings: string[]
}

/** 사주 기둥 입력 */
export interface SajuPillarsInput {
  year: Pillar
  month: Pillar
  day: Pillar
  hour?: Pillar
}
