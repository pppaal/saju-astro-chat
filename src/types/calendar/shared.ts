// src/types/destinypal/shared.ts
//
// destinypal 5-tier UI — 공통 prop 타입.
// destinypal/js/data.js 의 gz() helper 와 신호 톤(polarity) 구조를 기준으로
// 만든 layer-agnostic shape.
//
// 백엔드 → adapter → 이 shape 으로 정규화되며, UI 컴포넌트는 이 모듈만 import.

import type { ZodiacKo } from '@/lib/astrology/foundation/types'
import type { FiveElement, SibsinKind, YinYang } from '@/lib/saju/types'
import type { SignalKind, SignalLayer, Polarity } from '@/lib/calendar-engine/types'

// ============================================================================
// 간지(Ganji) — destinypal data.js gz() helper 와 동형. hanja + 한글 + 영문.
// ============================================================================

export interface Ganji {
  /** 한자 표기 — '丁丑' 등. data.js TEN_STEMS+BRANCHES 와 동일. */
  hanja: string
  /** 한글 표기 — '정축' 등. */
  kr: string
  /** 로마자 표기 — 'jeongchuk' 등. */
  en: string
}

// ============================================================================
// 시간대 / 레이어 태그 — destinypal 5-tier (life → decade → year → month → day).
// ============================================================================

/**
 * destinypal 5-tier 페이지의 레이어 키.
 *  - life     : 본명 한 줄 (사주 + 별자리)
 *  - decade   : 10년 대운 (+ ZR L1)
 *  - year     : 세운 + Profection
 *  - month    : 월운 + Lunar Return
 *  - day      : 일진 + 일별 트랜짓
 */
export type LayerTag = 'life' | 'decade' | 'year' | 'month' | 'day'

/**
 * 한 신호가 활성 상태일 때 UI 가 붙이는 시간 스코프 태그.
 * SignalLayer (lib/calendar-engine) 와 별개로, 5-tier UI 안에서
 * "이 신호가 어느 카드에 속하는가" 결정용.
 */
export type SignalScopeTag = LayerTag

// ============================================================================
// Polarity / 톤 — destinypal data.js signals[].polarity = -3..+3 와 동일.
// ============================================================================

export type { Polarity }

/**
 * Polarity 를 UI 색상 토큰으로 매핑하기 위한 거친 분류.
 *  - boon   : +2 / +3  (우호 강)
 *  - lift   : +1       (우호 약)
 *  - neutral: 0
 *  - dip    : -1       (주의 약)
 *  - bane   : -2 / -3  (주의 강)
 */
export type PolarityTone = 'boon' | 'lift' | 'neutral' | 'dip' | 'bane'

// ============================================================================
// 음양·오행 (data.js elements / dayMaster)
// ============================================================================

export type { FiveElement, YinYang, SibsinKind }

/**
 * data.js user.elements 와 동형 — 사주 8자 오행 분포.
 * key 는 한글 1글자 (목·화·토·금·수).
 */
export interface ElementCounts {
  목: number
  화: number
  토: number
  금: number
  수: number
}

// ============================================================================
// 신호 (Signal) — destinypal data.js day.signals[] 의 일반화.
// 백엔드 ActiveSignal 의 5-tier UI 용 narrow projection.
// kind 으로 discriminated union — 사주 / 점성 / cross.
// ============================================================================

/** signal 의 출처 큰 분류. */
export type SignalSourceTag = 'saju' | 'astro' | 'cross'

export interface SignalBase {
  /** 백엔드 ActiveSignal.id (고유 키 — React key 로 사용). */
  id: string
  /** data.js signals[].cat 형식의 카테고리 키 ('saju/shinsal', 'astro/transit' 등). */
  cat: string
  /** 사용자에게 보이는 표시명 — '겁살 (劫煞)' / 'Saturn □ Sun'. */
  label: string
  /** 한국어 로마자 (사주) 또는 한국어 번역 (점성). data.js signals[].romaji. */
  romaji?: string
  /** -3..+3 톤. */
  polarity: Polarity
  /** 0..1 raw weight (백엔드 ActiveSignal.weight). UI 정렬·필터 기준. */
  weight: number
  /** 백엔드 SignalKind — 35개 카테고리. discriminator. */
  kind: SignalKind
  /** 백엔드 SignalLayer — decadal/yearly/monthly/daily/hourly/instant. */
  layer: SignalLayer
  /** 부속 설명 / why-this-fires 문구. */
  note?: string
}

export interface SajuSignal extends SignalBase {
  source: 'saju'
}

export interface AstroSignal extends SignalBase {
  source: 'astro'
  /** 점성 신호 본체 행성 (예: 'Saturn'). */
  body?: string
  /** 어스펙트 종류 한국어 ('합', '사각', '삼각' 등). */
  aspect?: string
  /** 본명 타깃 표시 ('본명 Sun'). */
  target?: string
  /** 유니코드 글리프 (☿ ♀ ♂ ♃ ♄ 등). data.js transits[].glyph. */
  glyph?: string
}

export interface CrossSignal extends SignalBase {
  source: 'cross'
  /** 사주측 원천 신호 라벨. */
  sajuSide: string
  /** 점성측 원천 신호 라벨. */
  astroSide: string
  /** A등급 매핑 의미 — '정관 ↔ Saturn (책임·구조)' 등. */
  meaning: string
}

/** 5-tier UI 가 그리는 모든 신호의 discriminated union. */
export type DestinySignal = SajuSignal | AstroSignal | CrossSignal

// ============================================================================
// 자리 (Position) — 점성 객체의 sign/degree/house 묶음.
// ============================================================================

export interface AstroPosition {
  sign: ZodiacKo
  /** within-sign degree, 0..30. */
  degree: number
  house: number
  /** 영문 sign — UI 가 한·영 토글 가능 (data.js sunEn 등). */
  signEn?: ZodiacKo
}

// ============================================================================
// 헬퍼 — UI 가 자주 쓰는 narrative chip.
// ============================================================================

/**
 * data.js 의 hapchung / shinsal / unseong / astro 블록과 동형.
 * 한 줄 카드(타이틀 + 로마자 + 본문)용 universal chip.
 */
export interface NarrativeChip {
  /** 한국어 타이틀 — '寅亥 육합'. */
  title: string
  /** 로마자 — 'in-hae yukhap'. */
  romaji?: string
  /** 본문 한 단락. */
  body: string
  /** 부가 메타 — 색상 / 아이콘 키. (jupiter / saturn / daewoon / neptune 등). */
  kind?: string
}

/**
 * data.js narrative[] 와 동형 — 태그 + 본문 1줄.
 */
export interface TaggedNarrative {
  tag: string
  body: string
}
