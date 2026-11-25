// src/types/destinypal/month.ts
//
// destinypal Month(1달 월운) 카드 prop.
// data.js window.DESTINY.month + window.DESTINY.calendar 와 동형.
//
// /calendar 월 티어 — 30일 캘린더 강도 그라프 + 이달 총평 narrative + 이달의 큰 날
// (keyDays) + 사주×점성 교차 통합.

import type { Ganji, TaggedNarrative, SibsinKind } from './shared'
import type { MonthVerdict } from '@/lib/calendar-engine/derivers/reconcile'
import type { EvidenceRung } from '@/lib/calendar-engine/derivers/evidenceLadder'

// ============================================================================
// 캘린더 셀 — data.js calendar[] 와 동형.
// ============================================================================

export type DestinyDayMark =
  | 'caution' // 주의 (data.js month.cautionDays)
  | 'avoid' // 피하기 (data.js month.avoidDays)
  | 'good' // 길일 (data.js month.goodDays)
  | 'best' // 최고일 1개 (data.js month.bestDay)
  | 'focus' // 사용자 다이브 일 (data.js month.focusDay)

export interface DestinyCalendarCell {
  /** 일자 1..31. */
  d: number
  /** 'MM-DD' 문자열. */
  ds: string
  /** 0..1 강도 (UI 그라프 높이). */
  intensity: number
  /** 특수 마크. */
  mark: DestinyDayMark | null
  /** 사용자 다이브 일자 여부. */
  focus: boolean
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
  /**
   * 그날의 화해된 톤 — oneLine 과 같은 소스(reconcileCellOneLine.dayTone.tone).
   * 리드아웃 태그·조언·큰 날 라벨이 이 톤을 권위로 쓴다(밴드 마크에서 따로 뽑아
   * 태그="좋은 날" vs 문장="무게중심 지키세요"로 어긋나던 모순 제거 — 감사 #2).
   * 시스템 규약: 색=점수 밴드, 문장·라벨=화해 톤.
   */
  tone?: 'positive' | 'mixed' | 'caution'
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
  /** narrative — '이달 총평'(body=ko / bodyEn=en). */
  narrative: TaggedNarrative[]
  /** 이달의 큰 날 리스트 (convergence keyDays — 윈도우+신뢰도). */
  keyDays?: DestinyMonthKeyDay[]
  /** 사용자 다이브 일자 (1..31). */
  focusDay: number
  /** 30일 캘린더 그라프. */
  calendar: DestinyCalendarCell[]
  /** 월운 천간 십신 — '편관'. */
  woolunStemSibsin?: SibsinKind | string
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
  /**
   * 월 톤 단일 권위 — 히어로 톤워드·총평·공유카드가 다 이 하나를 읽는다. 카운트
   * 중립화(assembleTiers)까지 끝난 최종 goodN/careN 으로 산출해 부착한다. 예전엔
   * 표면마다 goodDays.length 로 4분류를 다시 계산해 어긋났다(감사 D-1).
   */
  verdict?: MonthVerdict
  /**
   * 근거 사다리(10년→올해→이달) — 층별 지배신호 1개를 "쉬운 결론 + 용어 칩"으로.
   * 월 카드는 daily 층을 생략(그 달 대표 셀 기준). evidenceLadder.ts.
   */
  evidenceLadder?: EvidenceRung[]
  /** 근거 사다리 영문 — 토글용. */
  evidenceLadderEn?: EvidenceRung[]
}
