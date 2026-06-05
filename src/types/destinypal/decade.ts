// src/types/destinypal/decade.ts
//
// destinypal Decade(10년 대운) 카드 prop.
// data.js window.DESTINY.decade 와 동형.
//
// 5-tier 의 두 번째 layer. 현재 대운 + 연도별 점수 + 합·충 + 12운성 + 점성
// 마일스톤 + ZR L1/L2 챕터 + narrative 칩.

import type { ZRPeriod, ZRStartLot } from '@/lib/astrology/foundation/zodiacalReleasing'
import type {
  Ganji,
  NarrativeChip,
  TaggedNarrative,
  SibsinKind,
  FiveElement,
} from './shared'

// ============================================================================
// 대운 천간/지지 pillar — data.js decade.pillar 와 동형.
// ============================================================================

export interface DestinyDecadePillar {
  /** 한자 — '甲'. */
  hanja: string
  /** 십신 (일간 기준). */
  sibsin: SibsinKind | string
  /** 오행 표기 — '목(木)'. */
  el: string
  /** 5원소 enum. */
  element: FiveElement
  /** 본문 한 줄. */
  note: string
}

// ============================================================================
// 대운 안 연도별 점수 — data.js decade.years[] 와 동형.
// ============================================================================

export interface DestinyDecadeYearScore {
  year: number
  gz: Ganji
  /** 0..100 점수. */
  score: number
  /** 현재 연도. */
  now?: boolean
}

// ============================================================================
// 5+5 분리 — destinypal 5-tier 사양: 대운 10년을 전반 5년 / 후반 5년 으로
// 텍스트 분기. data.js 에 명시 없음 — 신규 사양.
// ============================================================================

export interface DestinyDecadeHalfSplit {
  /** 전반 5년 narrative. */
  firstHalf: {
    yearFrom: number
    yearTo: number
    headline: string
    body: string[]
  }
  /** 후반 5년 narrative. */
  secondHalf: {
    yearFrom: number
    yearTo: number
    headline: string
    body: string[]
  }
}

// ============================================================================
// ZR L1 챕터 (현재 대운에 걸친 1개 이상의 sign-walk).
// 누락 5신호 중 ZR L1/L2 챕터 (sign + ruler + duration) 사양 충족.
// ============================================================================

export interface DestinyDecadeZRChapter extends ZRPeriod {
  startLot: ZRStartLot
  calendarStartYear: number
  calendarEndYear: number
  /** 대운 안 챕터 시작·끝 — 정밀 ISO. */
  startIso?: string
  endIso?: string
  now: boolean
  /** L2 챕터 (월 단위) — 옵션, 대운 카드에서 펼침 시. */
  subPeriods?: Array<{
    sign: ZRPeriod['sign']
    ruler: ZRPeriod['ruler']
    startYear: number
    endYear: number
    durationMonths: number
    isPeak: boolean
    isLoosingOfTheBond: boolean
  }>
}

// ============================================================================
// Decade 카드 prop — data.js window.DESTINY.decade 와 동형 + 5-tier 확장.
// ============================================================================

export interface DestinyDecade {
  /** 대운 간지. */
  gz: Ganji
  /** 서기 시작·끝 (exclusive end). */
  start: number
  end: number
  /** 만 나이 from/to. */
  ageFrom: number
  ageTo: number
  /** 대운 천간 십신 — '편재' 등. */
  sibsin: SibsinKind | string
  /** 한국어 테마 — '현실 성취 · 재물의 무대'. */
  theme: string
  /** 영문 테마 — 'Wealth · Worldly Achievement'. */
  themeEn: string
  /** 헤드라인 한 줄 (대운 도입 문구). */
  headline: string
  /** 대운 천간·지지 pillar 분해. */
  pillar: {
    cheongan: DestinyDecadePillar
    jiji: DestinyDecadePillar
  }
  /** 현재 세운 정보 (대운 안의 하이라이트 1년). */
  sewoonNow: {
    gz: Ganji
    sibsin: SibsinKind | string
    year?: number
  }
  /** 연도별 점수 스파인 (10개). */
  years: DestinyDecadeYearScore[]
  /** 본문 paragraphs. */
  body: string[]
  /** 본명 × 대운 합·충 칩. */
  hapchung: NarrativeChip
  /** 12운성 칩. */
  unseong: NarrativeChip
  /** 대운 안 외행성 회귀·사각 등 점성 마일스톤. */
  astro: Array<{
    label: string
    date: string
    body: string
    kind: string
  }>
  /** narrative chip 묶음 — 이 대운의 결 / 용신 흐름 / 주의할 결 / 정점의 해. */
  narrative: TaggedNarrative[]
  /** 사용자 다이브 연도. */
  focusYear: number
  /** 전반 5년 / 후반 5년 분리 (5-tier 신규). */
  halfSplit?: DestinyDecadeHalfSplit
  /** ZR Spirit 챕터 (대운에 걸친 챕터들). */
  zrSpiritChapters: DestinyDecadeZRChapter[]
  /** ZR Fortune 챕터. */
  zrFortuneChapters: DestinyDecadeZRChapter[]
}
