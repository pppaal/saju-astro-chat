// src/types/destinypal/lifetime.ts
//
// destinypal Lifetime 카드 prop.
// data.js window.DESTINY.{daewoon, lifeStages, milestones} 와 동형.
//
// 5-tier 의 최상위 layer — 유년기/청년기/중년기/장년기 4구간 + 대운 스파인 +
// 마일스톤(Saturn Return / Jupiter Return / 외행성 사각 등) 통합 뷰.

import type { ZRPeriod, ZRStartLot } from '@/lib/astrology/foundation/zodiacalReleasing'
import type { Ganji, NarrativeChip, SibsinKind } from './shared'

// ============================================================================
// 대운 (Daewoon) — 10년 단위.
// data.js daewoon[] 와 동형 + 백엔드 NatalSajuContext.daeun 로 보강.
// ============================================================================

export interface DestinyDaewoon {
  /** 간지 (干支). */
  gz: Ganji
  /** 시작 연도 (서기). */
  start: number
  /** 끝 연도 (서기, exclusive). */
  end: number
  /** 시작 만 나이. */
  startAge: number
  /** 끝 만 나이. */
  endAge: number
  /** 대운 천간 십신 (일간 기준) — 'M편재'. */
  sibsin: SibsinKind | '—' | string
  /** 데이터 채워졌나 여부 — destinypal mock 의 known: true 와 동형. */
  known: boolean
  /** 현재 대운인가. */
  now?: boolean
}

// ============================================================================
// Life stage 4구간 — 유년기 / 청년기 / 중년기 / 장년기.
// data.js lifeStages[] 와 동형.
// ============================================================================

export type LifeStageId = 'early' | 'youth' | 'middle' | 'late'

/**
 * 현재 진행 stage 의 상세 — daewoonText + body + outer(점성 마일스톤)
 * + hapchung/shinsal/unseong 칩 묶음.
 */
export interface DestinyLifeStageDetail {
  /** 대운 진행 한 줄 — '丙子(병자) 2006–16 → 乙亥(을해) 2016–26 → ...'. */
  daewoonText: string
  /** 본문 paragraphs (각 한 문단). */
  body: string[]
  /** 외행성 회귀 / outer transit 마일스톤. */
  outer: Array<{
    label: string
    /** 'YYYY.MM' 표기. */
    date: string
    body: string
    /** 색상·아이콘 키 — 'jupiter' / 'saturn' / 'neptune' 등. */
    kind: string
  }>
  /** 본명 × 대운 합·충 한 줄. */
  hapchung?: NarrativeChip
  /** 활성 신살 한 줄. */
  shinsal?: NarrativeChip
  /** 12운성 한 줄. */
  unseong?: NarrativeChip
}

export interface DestinyLifeStage {
  id: LifeStageId
  /** 한국어 라벨 — '초년기'/'청년기'/'중년기'/'장년기'. */
  name: string
  /** 만 나이 from. */
  ageFrom: number
  /** 만 나이 to (inclusive). */
  ageTo: number
  /** 서기 연도 from. */
  yearFrom: number
  /** 서기 연도 to (inclusive). */
  yearTo: number
  /** 현재 진행 중인 구간? */
  now: boolean
  /** 한 줄 무드 — '편재 — 현실 성취의 무대'. */
  tone: string
  /** 현재 진행 stage 만 detail 채움. 나머지는 null. */
  detail: DestinyLifeStageDetail | null
}

// ============================================================================
// 마일스톤 (Milestones) — life timeline 위 dot.
// data.js milestones[] 와 동형.
// ============================================================================

export type DestinyMilestoneKind =
  | 'saju' // 사주 합·충 마디
  | 'daewoon' // 대운 전환
  | 'saturn' // 토성 회귀 (1st / 2nd / 3rd)
  | 'jupiter' // 목성 회귀
  | 'neptune' // 해왕성 사각·트라인 등
  | 'uranus' // 천왕성 어포지션 (mid-life)
  | 'pluto' // 명왕성 사각/오포지션
  | 'eclipse' // 일식·월식
  | 'zr' // ZR L1 챕터 전환

export interface DestinyMilestone {
  /** 서기 연도. */
  year: number
  /** 만 나이. */
  age: number
  /** 한 줄 라벨 — '첫 토성 회귀 — 진짜 어른됨의 통과의례'. */
  label: string
  /** 시각화 카테고리 — 색상·아이콘 분기 키. */
  kind: DestinyMilestoneKind
  /** 현재 시점에 가장 가까운 마일스톤 표시. */
  now?: boolean
  /** ISO 일자 (있으면) — 점성 마일스톤 정밀일. */
  iso?: string
}

// ============================================================================
// ZR L1 챕터 — Hellenistic Zodiacal Releasing 의 최상위 챕터 시퀀스.
// data.js 에 명시 없음 — 백엔드 ZodiacalReleasingResult 가 그대로 매핑.
//
// 누락 5신호 중 ZR L1/L2 챕터 (sign + ruler + duration) 를 lifetime / decade
// 뷰에서 그릴 수 있도록 typed projection 제공.
// ============================================================================

export interface DestinyZRChapter extends ZRPeriod {
  /** Spirit (영혼·진로) 또는 Fortune (몸·물질). */
  startLot: ZRStartLot
  /** 본명 출생 연도 기준 서기 시작 연도. */
  calendarStartYear: number
  /** 본명 출생 연도 기준 서기 끝 연도 (exclusive). */
  calendarEndYear: number
  /** 현재 챕터 여부. */
  now: boolean
  /** UI 한 줄 — 'Sagittarius / Jupiter / 12 년'. */
  label?: string
}

// ============================================================================
// Lifetime 카드 prop.
// ============================================================================

export interface DestinyLifetime {
  /** 본명 출생 연도. */
  birthYear: number
  /** 현재 연도 (UI 기준). */
  currentYear: number
  /** 대운 스파인 (전체 — 10년 단위). */
  daewoon: DestinyDaewoon[]
  /** 4구간 stage. 현재 진행 stage 만 detail 채움. */
  lifeStages: DestinyLifeStage[]
  /** 마일스톤 — 사주 + 점성 통합 dot 시퀀스. */
  milestones: DestinyMilestone[]
  /** ZR L1 Spirit 챕터 시퀀스 — 진로·외적 사건. */
  zrSpiritChapters: DestinyZRChapter[]
  /** ZR L1 Fortune 챕터 시퀀스 — 몸·물질·체질. */
  zrFortuneChapters: DestinyZRChapter[]
  /** 인생 유형(신강약 기준 대운 흐름) — 대기만성/초년발복/… 한 줄 + 대운 방향. */
  lifePattern?: DestinyLifePattern
}

export interface DestinyLifePattern {
  key: string
  /** 한국어 유형명 — 대기만성형/초년발복형/… */
  ko: string
  /** 한 줄 서사. */
  line: string
  /** 대운별 우호 방향 (−2~+2). */
  daeun: Array<{ startAge: number; gz: string; favor: number }>
}
