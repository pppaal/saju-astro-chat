// src/types/destinypal/user.ts
//
// destinypal Life intro 본명 카드의 prop 타입.
// data.js window.DESTINY.user 와 동형 — 사주 본명 + 점성 본명 + 통합 인트로.
//
// 백엔드 매핑은 NatalContext (NatalSajuContext.analyses +
// NatalAstroContext.chart) → adapters/user.ts 에서 흡수.

import type { ZodiacKo } from '@/lib/astrology/foundation/types'
import type { ArabicLotName } from '@/lib/astrology/foundation/arabicParts'
import type { AstroPlanetName } from '@/lib/astrology/interpretations'
import type { DignityTiers } from '@/lib/astrology/foundation/dignities'
import type { ElementCounts, FiveElement } from './shared'

// ============================================================================
// Ilgan 본명 일간 (data.js user.ilgan)
// ============================================================================

export interface DestinyIlgan {
  /** 한자 — '辛'. */
  hanja: string
  /** 한글 음양오행 — '신금'. */
  kr: string
  /** 영문 — 'Sin · Yin Metal'. */
  en: string
  /** 5원소. */
  element: FiveElement
}

// ============================================================================
// 용신·희신 — data.js user.yongsin / huisin (한글/한자/영문 묶음)
// ============================================================================

export interface DestinyYongsin {
  /** 한자 — '火·土'. */
  hanja: string
  /** 한글 — '화·토'. */
  kr: string
  /** 영문 — 'Fire · Earth'. */
  en: string
  /** 본명 용신 1순위 element (5원소). */
  primary: FiveElement
  /** 본명 용신 2순위 (있을 시). */
  secondary?: FiveElement
  /** 기·구신 회피 element. */
  avoid: FiveElement[]
}

// ============================================================================
// 점성 본명 핵심 — data.js user.astro (Sun/ASC/MC 한·영)
// ============================================================================

export interface DestinyAstroBasic {
  /** 한글 zodiac — '물병자리'. */
  sun: string
  /** 한글 zodiac — '물병자리'. */
  asc: string
  /** 한글 zodiac — '전갈자리'. */
  mc: string
  /** 영문 zodiac — 'Aquarius'. */
  sunEn: ZodiacKo
  ascEn: ZodiacKo
  mcEn: ZodiacKo
}

// ============================================================================
// 본명 dignities — 행성별 5-tier (domicile/exaltation/triplicity/term/face).
// destinypal 본명 카드에서 "본명 행성 위계" 칩 묶음 그리는 데 사용.
// ============================================================================

export interface DestinyDignityEntry {
  /** 행성 이름 — Sun/Moon/Mercury... */
  planet: AstroPlanetName | string
  /** 행성이 자리한 sign. */
  sign: ZodiacKo
  /** within-sign degree, 0..30. */
  degree: number
  /** 5-tier boolean snapshot. */
  tiers: DignityTiers
  /** Almuten-ish 점수 (dignityScore). */
  score: number
}

// ============================================================================
// Almuten Figuris — 본명 5개 핵심 점(태양/달/상승/PoF/syzygy) 점수 합산 1위.
// ============================================================================

export interface DestinyAlmutenFiguris {
  /** 가장 강한 본명 dignity 룰러. */
  planet: AstroPlanetName | string
  /** 5점 합산 dignity 점수. */
  score: number
  /** 부속 — 동률 시 second/third place 도 넘김. */
  runnerUps?: Array<{ planet: AstroPlanetName | string; score: number }>
}

// ============================================================================
// Sect — 낮·밤 출생. Hellenistic 해석 분기점.
// ============================================================================

export type Sect = 'day' | 'night'

// ============================================================================
// Arabic Lots — 본명 7대 lot 의 sign/degree/house + sect.
// data.js 에는 명시되지 않으나 5-tier 본명 카드에 7개 칩 표기 필요.
// ============================================================================

export interface DestinyArabicLot {
  /** Lot 이름 — Fortune / Spirit / Eros / Necessity / Courage / Victory / Nemesis. */
  name: ArabicLotName
  /** Lot 이 자리한 sign. */
  sign: ZodiacKo
  /** within-sign degree, 0..30. */
  degree: number
  /** Whole-sign house, 1..12. */
  house: number
  /** 적용된 sect — 낮/밤 차트 공식 분기. */
  sect: Sect
  /** 한자/한글 표기 (예: '복점·재물'). */
  korean?: string
}

// ============================================================================
// User 본명 카드 prop — data.js window.DESTINY.user 와 동형.
// ============================================================================

export interface DestinyUserSummary {
  /** 출생 ISO 'YYYY-MM-DD HH:mm'. */
  birth: string
  /** 한국어 출생 표시 — '1995년 2월 9일 06:40'. */
  birthKo: string
  /** 출생 도시 — '서울'. */
  place: string
  /** 성별 — '남' / '여'. */
  sex: '남' | '여'
  // 옛 score/grade — 가짜 "calculateComprehensiveScore" 산출이라 2026-06-06 폐기.

  // ── 사주 본명 ──
  ilgan: DestinyIlgan
  yongsin: DestinyYongsin
  huisin: DestinyYongsin
  /** 격국명 한글 — '정인격'. */
  gyeokguk: string
  /** 격국명 영문 — 'Jeong-in (Direct Resource)'. */
  gyeokgukEn: string
  /** 신강·신약 표시 — '약(弱)' '강(强)' '중화'. */
  gangyak: string
  /** 가장 두드러진 십성 + 비율. */
  dominantSibsin: {
    name: string
    pct: number
  }
  /** 8자 오행 분포. */
  elements: ElementCounts

  // ── 점성 본명 ──
  astro: DestinyAstroBasic
  /** 본명 dignity 묶음 — 본명 카드 dignity 칩 줄. */
  dignities: DestinyDignityEntry[]
  /** Almuten Figuris (선택 — Hellenistic 정통 누락 5신호 중 하나). */
  almutenFiguris: DestinyAlmutenFiguris
  /** sect — 낮/밤. */
  sect: Sect
  /** 7대 Arabic Lots. */
  lots: DestinyArabicLot[]

  /**
   * 본명 일주(日柱) 아키타입 — ilju-60 DB 의 평이 프로즈(character/strength/
   * weakness/career/love). 선택 — 어댑터가 일주 간지를 못 구하거나 DB 미스 시
   * 생략(undefined). character 는 novice-grade 평이 문장. PRESENTATION ONLY.
   */
  iljuArchetype?: {
    ko: { character: string; strength: string; weakness: string; career: string; love: string }
    en: { character: string; strength: string; weakness: string; career: string; love: string }
  }

  // ── 통합 인트로 텍스트 ──
  intro: string
  introEn: string
}
