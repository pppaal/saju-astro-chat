// src/types/destinypal/month.ts
//
// destinypal Month(1달 월운) 카드 prop.
// data.js window.DESTINY.month + window.DESTINY.calendar 와 동형.
//
// 5-tier 의 네 번째 layer — 30일 캘린더 강도 그라프 + 5축 테마 점수 +
// narrative 8칩 + Converge(특정일 사주·점성 동시 임팩트) 통합.

import type { Ganji, TaggedNarrative, SibsinKind } from './shared'

// ============================================================================
// 응용 격국 패턴 — 한 달 동안 며칠 활성됐는가 (Phase B 보강).
// ============================================================================

export interface DestinyMonthAppliedPattern {
  /** 한국어 이름 — '재생관'. */
  name: string
  /** 영문 — 'Wealth-Generates-Officer' (옵션). */
  nameEn?: string
  /** 30일 중 이 패턴이 활성된 날짜 수. */
  activeDays: number
  /** 0..100 평균 강도 (옵션). */
  averageScore?: number
}

// ============================================================================
// 조후(調候) — 월령 기반 한난조습 균형 가이드.
// ============================================================================

export interface DestinyMonthJohu {
  /** 월령 지지 — '巳'. */
  monthBranch: string
  /** 핵심 한 줄 — '巳월 조후 — 수(水) 절실, 화(火) 과중 시 신장·심화 균형'. */
  oneLine: string
  /** 절실한 오행 — '水'. */
  needed?: string
  /** 과중·억제 대상 — '火'. */
  excess?: string
  /** 출처 표식 (어느 derivers 인지). */
  source?: string
}

// ============================================================================
// narrative card source 메타 (Phase B 보강) — 어느 derivers/extractor 산출인지.
// ============================================================================

export interface DestinyMonthNarrativeCard extends TaggedNarrative {
  /** 출처 — 'sajuMonthDerivers' / 'astroMonthExtractor' / 'crossActivation' 등. */
  source?: string
}

// ============================================================================
// ZR L2 진행률 — narrative 위 1줄.
// ============================================================================

export interface DestinyMonthZRProgress {
  /** ZR 종류 — 'fortune' | 'spirit'. */
  kind: 'fortune' | 'spirit'
  /** L2 sign 한국어 — '염소자리'. */
  sign: string
  /** L2 ruler 한국어 — '토성'. */
  ruler: string
  /** 0..1 진행률. */
  progress: number
  /** 'YYYY-MM' 시작. */
  start?: string
  /** 'YYYY-MM' 종료. */
  end?: string
}

// ============================================================================
// 캘린더 셀 — data.js calendar[] 와 동형.
// ============================================================================

export type DestinyDayMark =
  | 'caution' // 주의 (data.js month.cautionDays)
  | 'avoid' // 피하기 (data.js month.avoidDays)
  | 'good' // 길일 (data.js month.goodDays)
  | 'best' // 최고일 1개 (data.js month.bestDay)
  | 'converge' // 사주·점성 converge 일 (data.js month.converge.date)
  | 'focus' // 사용자 다이브 일 (data.js month.focusDay)
  | 'phase' // 달 위상 변환 — 신월/상현/보름/하현 (◐)
  | 'voc' // void-of-course 구간 (회색 띠)
  | 'return' // Lunar Return ○
  | 'lifecycle' // 외행성 exact (목성/토성/천왕성/해왕성/명왕성 transit exact) ◇

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
  /**
   * 그날 색·점수를 가장 크게 움직인 사주×점성 교차 — *쉬운 뜻*(meaning)으로.
   * 선택일 리드아웃의 "왜 이런 날인지" 근거. 전문용어(saju/astro)는 칩으로 따로
   * 보여주고, 본문은 plain. 그날 교차가 없으면 생략.
   */
  reason?: {
    saju: string
    sajuEn: string
    astro: string
    astroEn: string
    meaning: string
    meaningEn: string
    polarity: number
  }
  /**
   * 그날의 화해된 한 줄 — 일(日) 티어의 oneLine 과 *같은 소스*(월 셀 신호 +
   * layered.daily 점수 → reconcile → ONE_LINE_POOL). 월 리드아웃이 이걸 쓰면
   * "월은 예고편, 일은 본편"으로 두 화면 문장이 그대로 이어진다.
   */
  oneLine?: string
  oneLineEn?: string
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

/**
 * "이달의 큰 날" — convergence keyDays 1줄. 점(date)이 아니라 *구간(window)* 과
 * 사주↔점성 신뢰도(confidence)를 함께 담아 타이밍을 또렷이 보여준다.
 */
export interface DestinyMonthKeyDay {
  /** 표시용 'MM-DD' (또는 포맷된 라벨). */
  date: string
  /** 한 줄 의미. */
  meaning?: string
  /** meaning 과 같은 톤 — 라벨 prefix 가 의미와 어긋나지 않게(positive/negative/neutral). */
  tone?: 'positive' | 'negative' | 'neutral'
  /** 점성측 무거운 신호 라벨들. */
  astro: string[]
  /** 사주측 무거운 신호 라벨들. */
  saju: string[]
  /** 두 시스템 모두 무거웠나 (진짜 수렴). */
  bothSystems: boolean
  /** 활성 구간 — 빌드업→정점→소멸 (ISO). */
  window?: { start: string; peak: string; end: string }
  /** 사주↔점성 신뢰도 0~100. */
  confidence?: number
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
  /** narrative 8칩. */
  narrative: TaggedNarrative[]
  /** Converge 일. */
  converge: DestinyConverge
  /** 이달의 큰 날 리스트 (convergence keyDays — 윈도우+신뢰도). */
  keyDays?: DestinyMonthKeyDay[]
  /** 사용자 다이브 일자 (1..31). */
  focusDay: number
  /** 30일 캘린더 그라프. */
  calendar: DestinyCalendarCell[]
  /** void-of-course 구간 시작 ISO 들 (data.js narrative tag 참조). */
  voidOfCourseDates?: string[]
  /** Lunar Return ISO (옵션). */
  lunarReturnIso?: string
  /** 응용 격국 패턴 daily count 블록 (Phase B 보강). */
  appliedPatterns?: DestinyMonthAppliedPattern[]
  /** 조후 한 줄 (월령 지지 기반). */
  johu?: DestinyMonthJohu
  /** narrative card 에 source 메타 (TaggedNarrative 의 super-set). */
  narrativeWithSource?: DestinyMonthNarrativeCard[]
  /** 월운 천간 십신 영문 — '편관'. */
  woolunStemSibsin?: SibsinKind | string
  /** 월운 지지 십신 — '편관'. */
  woolunBranchSibsin?: SibsinKind | string
  /** 월운 한 줄 — '재생관 흐름' 같은 패턴 라벨. */
  woolunPatternLabel?: string
  /** ZR L2 progress — narrative 위 1줄. */
  zrL2Progress?: DestinyMonthZRProgress
  /** 이 달의 사주×점성 교차 — monthly 층 cross-activation 페어 (월운 십신 ↔ 그 달 점성). */
  crossActivations?: Array<{
    saju: string
    sajuEn: string
    astro: string
    astroEn: string
    meaning: string
    meaningEn: string
    polarity: number
  }>
  /** 개인 시드(본명 고정) — 템플릿 문구를 사람마다 다르게 고르는 데 쓴다. */
  seed?: number
}
