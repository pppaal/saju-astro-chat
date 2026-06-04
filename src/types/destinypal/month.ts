// src/types/destinypal/month.ts
//
// destinypal Month(1달 월운) 카드 prop.
// data.js window.DESTINY.month + window.DESTINY.calendar 와 동형.
//
// 5-tier 의 네 번째 layer — 30일 캘린더 강도 그라프 + 5축 테마 점수 +
// narrative 8칩 + Converge(특정일 사주·점성 동시 임팩트) 통합.

import type { AstroThemeKey } from '@/lib/astrology/themes/types'
import type {
  Ganji,
  TaggedNarrative,
  SibsinKind,
} from './shared'

// ============================================================================
// Month theme bar — data.js monthThemes[] 와 동형.
// ============================================================================

export interface DestinyMonthTheme {
  /** 5축 키. */
  key: AstroThemeKey
  /** 한국어 라벨 — '재성·연애'. */
  ko: string
  /** 0..100. */
  v: number
}

// ============================================================================
// 캘린더 셀 — data.js calendar[] 와 동형.
// ============================================================================

export type DestinyDayMark =
  | 'caution'   // 주의 (data.js month.cautionDays)
  | 'avoid'     // 피하기 (data.js month.avoidDays)
  | 'good'      // 길일 (data.js month.goodDays)
  | 'best'      // 최고일 1개 (data.js month.bestDay)
  | 'converge'  // 사주·점성 converge 일 (data.js month.converge.date)
  | 'focus'     // 사용자 다이브 일 (data.js month.focusDay)

export interface DestinyCalendarCell {
  /** 일자 1..31. */
  d: number
  /** 'MM-DD' 문자열. */
  ds: string
  /** ISO 'YYYY-MM-DD'. */
  iso?: string
  /** 0..1 강도 (UI 그라프 높이). */
  intensity: number
  /** 0..100 derivedScore (백엔드 CalendarCell.derivedScore). */
  score?: number
  /** 특수 마크. */
  mark: DestinyDayMark | null
  /** 사용자 다이브 일자 여부. */
  focus: boolean
  /** 이날 활성 신호 개수 (UI 상세 미리보기). */
  signalCount?: number
}

// ============================================================================
// Converge — 사주·점성 동시 임팩트 일.
// data.js month.converge 와 동형 + 백엔드 cross-activation 페어 노출.
// ============================================================================

export interface DestinyConverge {
  /** ISO 'YYYY-MM-DD'. */
  date: string
  /** 0..100 score. */
  score: number
  /** 점성측 활성 신호 라벨들. */
  astro: string[]
  /** 사주측 활성 신호 라벨들. */
  saju: string[]
  /** 두 시스템 모두 발화? */
  bothSystems: boolean
  /** 한 줄 의미. */
  meaning: string
}

// ============================================================================
// Month 카드 prop.
// ============================================================================

export interface DestinyMonth {
  /** 한국어 라벨 — '2026년 6월'. */
  label: string
  /** 'YYYY-MM'. */
  ym: string
  /** 월운 간지 — '甲午'. */
  woolun: Ganji
  /** 월운 천간 십신. */
  woolunSibsin?: SibsinKind | string
  /** 주의일 'MM-DD' 리스트. */
  cautionDays: string[]
  /** 길일 'MM-DD' 리스트. */
  goodDays: string[]
  /** 최고일 + 점수. */
  bestDay: {
    /** 'MM-DD'. */
    date: string
    /** 0..100. */
    score: number
  }
  /** 피하기 'MM-DD' 리스트. */
  avoidDays: string[]
  /** 5축 테마 점수. */
  themes: DestinyMonthTheme[]
  /** narrative 8칩. */
  narrative: TaggedNarrative[]
  /** Converge 일. */
  converge: DestinyConverge
  /** 사용자 다이브 일자 (1..31). */
  focusDay: number
  /** 30일 캘린더 그라프. */
  calendar: DestinyCalendarCell[]
  /** void-of-course 구간 시작 ISO 들 (data.js narrative tag 참조). */
  voidOfCourseDates?: string[]
  /** Lunar Return ISO (옵션). */
  lunarReturnIso?: string
}
