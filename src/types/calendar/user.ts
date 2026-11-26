// src/types/destinypal/user.ts
//
// destinypal Life intro 본명 카드의 prop 타입.
// data.js window.DESTINY.user 와 동형 — 사주 본명 + 점성 본명 + 통합 인트로.
//
// 백엔드 매핑은 NatalContext (NatalSajuContext.analyses +
// NatalAstroContext.chart) → adapters/user.ts 에서 흡수.

import type { ZodiacKo } from '@/lib/astrology/foundation/types'
import type { AstroPlanetName } from '@/lib/astrology/interpretations'
import type { ElementCounts, FiveElement } from './shared'

// ============================================================================
// Ilgan 본명 일간 (data.js user.ilgan)
// ============================================================================

interface DestinyIlgan {
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

interface DestinyYongsin {
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

interface DestinyAstroBasic {
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

type Sect = 'day' | 'night'

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
  /** 격국명 영문 — 'Jeongin (Direct-resource)'. 한글 접두 없음(EN 화면 그대로). */
  gyeokgukEn: string
  /** 신강·신약 표시 — '약(弱)' '강(强)' '중화'. */
  gangyak: string
  /** 신강·신약 EN — 5단계('Very strong (强)' … 'Very weak (弱)'). EN 화면은 이 값을 쓴다. */
  gangyakEn?: string
  /** 가장 두드러진 십성 + 비율. */
  dominantSibsin: {
    name: string
    pct: number
  }
  /** 8자 오행 분포. */
  elements: ElementCounts

  // ── 점성 본명 ──
  astro: DestinyAstroBasic
  /** Almuten Figuris (선택 — Hellenistic 정통 누락 5신호 중 하나). */
  almutenFiguris: DestinyAlmutenFiguris
  /** sect — 낮/밤. null = 정할 수 없음(출생시각 미상 등, OD-5). */
  sect: Sect | null

  /**
   * 본명 일주(日柱) 아키타입 한 줄 — ilju-60 DB 의 character(인생 흐름 히어로의 일주 줄).
   * 일주 간지 결손/DB 미스 시 생략(undefined). 나머지 문단(강점 · 약점 · 직업 · 연애)은
   * 이 페이로드에 싣지 않는다 — 읽는 화면이 없다.
   */
  iljuArchetype?: {
    ko: { character: string }
    en: { character: string }
  }

  // ── 통합 인트로 텍스트 ──
  intro: string
  introEn: string
}
