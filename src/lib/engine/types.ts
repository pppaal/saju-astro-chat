/**
 * 통합 엔진 타입 — 자평력 + 천기력 + 운명력 + Destiny Matrix 한 객체로
 */
import type { MainSajuOutput } from '../saju-engine'
import type { AstroEngineOutput } from '../astro-engine'
import type { CrossEngineOutput, UserSegment } from '../cross-engine'
import type { DestinyFusionMatrixComputed } from '../destiny-matrix/types'

/** 입력 — 6 페이지에서 공통으로 받는 정보 */
export interface UnifiedInput {
  birthDate: string // YYYY-MM-DD
  birthTime: string // HH:mm
  gender: 'male' | 'female'
  /** 점성 계산용 위도·경도 (없으면 서울 기본) */
  latitude?: number
  longitude?: number
  timezone?: string
  /** 분석 기준일 (없으면 오늘) */
  targetDate?: Date
  /** 사용자 세그먼트 (advice 톤 결정) */
  segment?: UserSegment
}

/** 어떤 엔진을 호출할지 선택 (lazy load) */
export interface UnifiedOptions {
  include?: Array<'saju' | 'astro' | 'cross' | 'matrix' | 'all'>
}

/**
 * 통합 출력 — 모든 엔진 결과 + 메타.
 * include 에 따라 일부 필드는 undefined.
 */
export interface UnifiedOutput {
  engine: {
    name: '운명 통합 엔진'
    version: '1.0'
    components: string[] // 호출된 엔진 목록
  }
  input: UnifiedInput
  /** 자평력 (사주 9차원) */
  saju?: MainSajuOutput
  /** 천기력 (점성 8차원) */
  astro?: AstroEngineOutput
  /** 운명력 (사주↔점성 교차) */
  cross?: CrossEngineOutput
  /** Destiny Matrix (1206 셀) */
  matrix?: DestinyFusionMatrixComputed
}
