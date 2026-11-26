// src/types/destinypal/lifetime.ts
//
// destinypal Lifetime 카드 prop.
// data.js window.DESTINY.{daewoon, lifeStages, milestones} 와 동형.
//
// 5-tier 의 최상위 layer — 유년기/청년기/중년기/장년기 4구간 + 대운 스파인 +
// 마일스톤(Saturn Return / Jupiter Return / 외행성 사각 등) 통합 뷰.

import type { ZRPeriod, ZRStartLot } from '@/lib/astrology/foundation/zodiacalReleasing'
import type { Ganji, NarrativeChip, SibsinKind } from './shared'
import type { RadarAxis } from '@/lib/report/sibsinRadar'
import type { LifeStrategy } from '@/lib/report/lifeStrategy'
import type { LifeCrossCheck } from '@/lib/report/lifeCrossCheck'
import type { CardPillar } from '@/lib/card/types'
import type { Bi } from '@/lib/i18n/bi'

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
  /** 본문 paragraphs (각 한 문단, KO). */
  body: string[]
  /** 본문 paragraphs 영문 — 클라이언트 언어 토글용. 비면 body 폴백. */
  bodyEn: string[]
  /** 외행성 회귀 / outer transit 마일스톤. */
  outer: Array<{
    label: string
    /** label 영문 — 클라이언트 토글용. 미지정 시 label 폴백. */
    labelEn?: string
    /** 'YYYY.MM' 표기. */
    date: string
    body: string
    /** body 영문 — 클라이언트 토글용. 미지정 시 body 폴백. */
    bodyEn?: string
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
  /** 영문 라벨 — 'Early years' 등. 클라이언트 토글용. 미지정 시 name 폴백. */
  nameEn?: string
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
  /** 한 줄 무드 영문 — 클라이언트 토글용. 미지정 시 tone 폴백. */
  toneEn?: string
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
  | 'chiron' // 카이런 회귀 (~50세, 치유)
  | 'progressed' // 진행 달 회귀 등 진행 마디
  | 'eclipse' // 일식·월식
  | 'zr' // ZR L1 챕터 전환

export interface DestinyMilestone {
  /** 서기 연도. */
  year: number
  /** 만 나이. */
  age: number
  /** 한 줄 라벨(KO) — '첫 토성 회귀 — 진짜 어른됨의 통과의례'. */
  label: string
  /** 한 줄 라벨 영문 — 클라이언트 언어 토글용. 미지정 시 label 폴백. */
  labelEn?: string
  /** 한 줄 의미(KO) — 마일스톤 해석. 라벨과 별개의 풍부한 한 줄. */
  meaning?: string
  /** 한 줄 의미 영문 — 클라이언트 토글용. 미지정 시 meaning 폴백. */
  meaningEn?: string
  /**
   * 의미의 첫 문장 — 마디 정의 그대로(하우스 개인화 꼬리 없음). 히어로 'NEXT LIFE TURN'
   * 처럼 한 줄만 인용하는 자리용('The last expansion window before midlife.').
   */
  meaningCore?: string
  meaningCoreEn?: string
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
  /** 현재 만 나이(SSOT) — 곡선 부재 시에도 컴포넌트가 달력 나이로 안 떨어지게. */
  nowAge?: number
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
  /** 인생 굴곡 곡선 — 사주·점성 다층 중첩(연 단위). 차트가 스파크라인으로 렌더. */
  lifeCurve?: DestinyLifeCurve
  /**
   * 올해 한 줄(세운) — /destiny 가 캘린더(연/월/일)로 내려보내는 연결 고리.
   * 연 셀 없이 getYearPillarForDate(now)+십신으로 산출(입춘 SSOT). 시안 ⑥ 블록.
   */
  thisYear?: DestinyThisYear
  /**
   * 이 10년의 사주×점성 교차 — 대운(decadal) 층 cross-activation. 1일 evidence
   * 셀에서 decadal 층만 필터(연 셀 불필요). 층마다 자기 티어에서 발화하는 구조의
   * 인생 스케일(일 화면 감사 #12로 일 화면에선 뺀 배경 교차의 원래 집). 시안 ⑧.
   * 정직성 게이트(계획 B3 #8): 사주 부모가 대운이고, 점성 부모가 10년 층 천체이며,
   * 두 부모가 모두 교차와 같은 비영 부호인 행만 — 없으면 빈 배열(섹션 미노출).
   */
  decadeCross?: DestinyDecadeCross[]
  /** 타고난 능력치 레이더 — 십성 분포에서 뽑은 5축(정직 데이터). 근거 없으면 undefined. */
  sibsinRadar?: RadarAxis[]
  /**
   * "운을 내 편으로" — 행운 요소(용신)·귀인 띠(천을귀인)·주의 구간(곡선 저점)·
   * 재물 방식(재성). 엔진이 이미 계산했으나 프론트에 안 오던 값을 하나로 묶음.
   * 각 타일은 근거 있을 때만, 전부 없으면 undefined.
   */
  lifeStrategy?: LifeStrategy
  /**
   * 다음 인생 마디 — 생애 마디(milestones) 중 올해(currentYear) 다음 첫 항목. 대운 경계가
   * 아니라 인생 마디 목록에서 고른다(FIX9b E7). 없으면 생략.
   */
  nextLifeTurn?: DestinyNextLifeTurn
  /**
   * 사주 × 별자리, 축별로 — 통합 리포트와 같은 교차 판정(LLM 없음, 읽는 시점 보강).
   * 다섯 축 · 집계 · 리포트 링크. 판정할 수 없으면 생략.
   */
  crossCheck?: LifeCrossCheck
  /**
   * Life 공유 블록 재료 — 사주 타입(홈 카드와 같은 규칙) · 인생 모양 · 화면 카드용 기둥.
   * screenPillars(연 · 월 · 일)는 화면의 미니 카드에만 쓴다 — 공유 이미지 · 링크엔 싣지 않는다.
   */
  share?: DestinyLifeShare
}

export interface DestinyNextLifeTurn {
  year: number
  /** 만 나이. */
  age: number
  label: string
  labelEn: string
  /** 그 마디 의미의 첫 문장(ko/en). */
  meaningCore: string
  meaningCoreEn: string
}

export interface DestinyLifeShare {
  /** 사주 타입 이름('steady-building Free Spirit') — 홈 사주 카드의 typeName 과 같은 값. */
  crossType: Bi
  /** 인생 모양(lifePattern 이름) — 없으면 null. */
  lifeShape: Bi | null
  /** 화면 미니 카드의 연 · 월 · 일주(시주 없음). 공유 페이로드 · 이미지엔 넣지 않는다. */
  screenPillars: CardPillar[]
}

export interface DestinyThisYear {
  /** 세운 간지(한자) — '丙午'. hover/title 용. */
  gz: string
  /** 세운 간지 한글 읽기 — '병오'. (novice 표면: bare 한자 금지 원칙) */
  gzKr: string
  /** 세운 간지 로마자 — 'byeongo'. EN 표면용. */
  gzEn: string
  /** 세운 천간 십신(일간 기준) — '정관'. */
  sibsin: string
  /** 십신 생활어 영역(ko) — '재물·실속'. 없으면 빈 문자열. */
  area: string
  areaEn: string
}

export interface DestinyDecadeCross {
  /** 사주측 십신(ko) — '정재'. */
  saju: string
  sajuEn: string
  /** 십신 한자 — '正財'. 십신이 아닌 키면 없음. */
  sajuHanja?: string
  /** 사주 부모 — 대운 기둥의 천간/지지 어느 쪽인지와 그 대운 간지. */
  sajuSource?: { pillar: 'daeun'; part: 'stem' | 'branch'; gz: string }
  /** 점성측 행성(ko) — '토성'. */
  astro: string
  astroEn: string
  /** 점성 부모가 생애 마디면 그 이름(짧은 꼴) — '첫 토성 회귀' / 'First Saturn return'. */
  astroEvent?: Bi
  /** 그 행성의 본명 자리 — 별자리(영문 키) · 도 · 분. */
  natal?: DestinyChartPoint
  /** 그 행성의 본명 품위 — 본명 dignities 에서(본궁 · 고양 · 손상 · 추락 중 하나). */
  dignity?: 'domicile' | 'exaltation' | 'detriment' | 'fall'
  /** 오늘(주입된 now 의 출생지 날짜, 현지 정오) 트랜짓 자리. */
  transit?: DestinyChartPoint
  /** 쉬운 뜻(ko) — stripCrossPair 로 페어 머리 제거된 본문. */
  meaning: string
  meaningEn: string
  /** 합성 polarity(부호=길흉). 게이트를 통과한 행만 오므로 언제나 ≠ 0. */
  polarity: number
}

/** 차트 위 한 점 — 별자리 영문 키('Aries') · 별자리 안의 도 · 분. */
export interface DestinyChartPoint {
  sign: string
  deg: number
  min: number
}

/** 인생 곡선의 한 점 — value 는 렌더용 0..1 정규화(거시 굴곡). */
export interface DestinyLifeCurvePoint {
  age: number
  year: number
  value: number
}
/** 곡선 위 마디(전환점) — 피크/골. */
export interface DestinyLifeCurveMark {
  age: number
  year: number
  kind: 'peak' | 'trough'
}
export interface DestinyLifeCurve {
  /** 거시 굴곡 곡선(연 단위, value 0..1). */
  points: DestinyLifeCurvePoint[]
  peaks: DestinyLifeCurveMark[]
  troughs: DestinyLifeCurveMark[]
  /** 현재 만 나이(곡선 위 "지금" 위치). */
  nowAge: number
  /** "지금" 읽기 — 곡선 위 현재 위치의 추세 + 다음 마디(서사·앵커용). */
  now?: DestinyLifeCurveNow
}
export interface DestinyLifeCurveNow {
  /** 현재 추세 — 차오름/가라앉음/고름. */
  slope: 'rising' | 'falling' | 'plateau'
  /** 현재 이후 첫 마루(없으면 생략). */
  nextPeak?: DestinyLifeCurveMark
  /** 현재 이후 첫 저점(없으면 생략). */
  nextTrough?: DestinyLifeCurveMark
}

export interface DestinyLifePattern {
  key: string
  /** 한국어 유형명 — 대기만성형/초년발복형/… */
  ko: string
  /** 영문 유형명. */
  en?: string
  /** 한 줄 서사(ko) — 상담사 · 캘린더용(lead + body + 정점 절). */
  line: string
  /** 한 줄 서사(en). */
  lineEn?: string
  /** 서사 첫 문장(인용 머리) · 나머지 — v9 Life Reading. */
  lead?: string
  leadEn?: string
  body?: string
  bodyEn?: string
  /** 한 줄 태그 — 'Blooms late, lasts long'. */
  tagline?: string
  taglineEn?: string
  /** 서사가 가리키는 정점(나이 · 연도 · 그 절 문장) — 정점 절을 붙였을 때만. */
  peak?: { age: number; year: number; past: boolean; note: string; noteEn: string }
  /** 대운별 우호 방향 (−2~+2). */
  daeun: Array<{ startAge: number; gz: string; favor: number }>
}
