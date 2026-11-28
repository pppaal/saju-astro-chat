import type { FiveElement, SibsinKind } from '@/lib/saju/types'
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
// Polarity / 톤 — destinypal data.js signals[].polarity = -3..+3 와 동일.
// ============================================================================

export type { Polarity }

// ============================================================================
// 음양·오행 (data.js elements / dayMaster)
// ============================================================================

export type { FiveElement, SibsinKind }

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

interface SignalBase {
  /** 백엔드 ActiveSignal.id (고유 키 — React key 로 사용). */
  id: string
  /** data.js signals[].cat 형식의 카테고리 키 ('saju/shinsal', 'astro/transit' 등). */
  cat: string
  /** 사용자에게 보이는 표시명 — '겁살 (劫煞)' / 'Saturn □ Sun'. */
  label: string
  /** 엔진이 EN 라벨을 별도 방출한 경우(있을 때만). 사주 다수 신호는 EN 없음. */
  english?: string
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
