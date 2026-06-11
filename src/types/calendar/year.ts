// src/types/destinypal/year.ts
//
// destinypal Year(1년 세운) 카드 prop.
// data.js window.DESTINY.year 와 동형 + Profection wheel 세부 + ZR L1/L2 진입.
//
// 5-tier 의 세 번째 layer.

import type { ZodiacKo } from '@/lib/astrology/foundation/types'
import type { AstroPlanetName } from '@/lib/astrology/interpretations'
import type { Ganji, SibsinKind } from './shared'
import type { DestinyDecadeZRChapter } from './decade'

// ============================================================================
// Profection — 본명 연주술. 활성 하우스 / 룰러 / 본명 룰러 위치.
// data.js year.profection 와 동형.
// ============================================================================

export interface DestinyProfection {
  /** 활성 하우스 1..12. 만 나이 % 12 + 1. */
  house: number
  /** 한국어 테마 — '변환 · 깊이 · 재구성'. */
  theme: string
  /** 영문 테마 — 'Transformation · Depth · Rebuild'. */
  themeEn: string
  /** 활성 하우스 cusp 의 sign — '처녀자리'. */
  cusp: string
  cuspEn: ZodiacKo
  /** 활성 하우스 ruler — '수성'. */
  ruler: string
  rulerEn: AstroPlanetName
  /** 본명 룰러 위치 표시 — '1궁 (물병자리)'. */
  rulerNatal: string
  /** 영문 — '1st house · Aquarius'. */
  rulerNatalEn: string
  /** 본명 룰러 1..12 하우스. */
  rulerNatalHouse: number
  /** 본명 룰러 sign. */
  rulerNatalSign: ZodiacKo
}

// ============================================================================
// Profection wheel — 12 하우스 휠 시각화용 데이터.
// 신규 (5-tier 사양) — UI 가 하우스 휠 + 현재 강조 그릴 때 사용.
// ============================================================================

export interface DestinyProfectionWheelSlice {
  /** 1..12 하우스. */
  house: number
  /** 본명 cusp sign. */
  cuspSign: ZodiacKo
  /** 본명 cusp 룰러. */
  cuspRuler: AstroPlanetName
  /** 본명 그 cusp 안에 있는 행성 이름들. */
  natalPlanets: string[]
  /** 이번 해의 활성 하우스인가. */
  active: boolean
}

// ============================================================================
// Sewoon (세운) — 1년 간지.
// ============================================================================

export interface DestinySewoon {
  /** 간지 — '丙午'. */
  gz: Ganji
  /** 일간 기준 천간 십신 — '정관'. */
  sibsin: SibsinKind | string
  /** 0..100 점수. */
  score?: number
}

// ============================================================================
// Year 카드 prop.
// ============================================================================

export interface DestinyYear {
  /** 서기 연도. */
  year: number
  /** 헤드라인 한 줄 — '올해의 무게중심은 8번째 영역으로 기울어요.'. */
  headline: string
  /** 세운. */
  sewoon: DestinySewoon
  /** 호환용 — 세운 간지 직접 노출. data.js year.sewoon. */
  sewoonGz: Ganji
  /** 호환용 — 세운 천간 십신. data.js year.sewoonSibsin. */
  sewoonSibsin: SibsinKind | string
  /** Profection. */
  profection: DestinyProfection
  /** Profection 12 하우스 휠 시각화. */
  profectionWheel: DestinyProfectionWheelSlice[]
  /** 사주 본문 한 줄 — 세운 십신 + 용신 흐름. */
  sajuNote: string
  /** 점성 본문 한 줄 — Profection 룰러 본명 위치. */
  astroNote: string
  /** 이번 해 진입한/지나는 ZR Spirit 챕터들. */
  zrSpiritChapters: DestinyDecadeZRChapter[]
  /** 이번 해 진입한/지나는 ZR Fortune 챕터들. */
  zrFortuneChapters: DestinyDecadeZRChapter[]
  /** 이번 해 12개월 점수 스파인 (옵션 — month-overview). */
  monthlyScores?: Array<{
    month: number // 1..12
    score: number
    bestDay?: string // 'MM-DD'
  }>
  /** 올해 활성 사주 × 점성 교차 — 월 구간 + 근거 해석. */
  crossings?: Array<{
    when: string // '3–7월' / '연중'
    whenEn: string // 'Mar–Jul' / 'year-round'
    title: string // '정재 × 금성'
    titleEn: string // 'Right Wealth × Venus'
    detail?: string // 근거 해석 한 줄
    detailEn?: string
    tone: 'good' | 'caution' | 'neutral'
  }>
}
