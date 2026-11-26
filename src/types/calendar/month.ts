// src/types/destinypal/month.ts
//
// destinypal Month(1달 월운) 카드 prop.
// data.js window.DESTINY.month + window.DESTINY.calendar 와 동형.
//
// /calendar 월 티어 — 30일 캘린더 강도 그라프 + 이달의 큰 날 (keyDays) + 사주×점성 교차 통합.

import type { Ganji, SibsinKind } from './shared'
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

/**
 * '왜 이런 날' 근거의 점성 부모 — 교차를 만든 *하늘의* 신호를 구조로(v9 STARS 칸).
 * 월 셀은 evidence 가 비어 있어 aspect·natalPoint 는 살아남은 부모 신호 이름
 * ('Sun □ Moon')에서 읽고, orb 는 evidence 가 있는 날(오늘 — focusDayCell)에만 싣는다.
 * 트랜짓 위치(transitSign·transitDeg)는 그날 현지 정오 트랜짓 차트(getCachedTransitChart)
 * 에서 — 큰 날 최대 6개 + 오늘만(assembleTiers). 행성·별자리·어스펙트는 영문 키.
 */
export interface ReasonAstroDetail {
  /** 하늘에서 움직이는 행성 — 'Sun'. */
  transitPlanet: string
  /** 부모 점성 신호 kind — 'transit' · 'dignity' · 'lifecycle' · 'fixed-star' · 'house-transit' 등. */
  sourceKind: string
  /** 트랜짓 어스펙트 키 — 'square'. 부모가 트랜짓일 때만. */
  aspect?: string
  /** 본명 접점 — 'Moon'. 부모가 트랜짓일 때만. */
  natalPoint?: string
  /** 정확각에서 벗어난 도(°) — evidence 가 있는 날만. */
  orb?: number
  /** 그날 현지 정오의 트랜짓 행성 별자리 — 'Scorpio'. */
  transitSign?: string
  /** 그 별자리 안의 도(0-29). */
  transitDeg?: number
  /**
   * 어스펙트가 없는 부모의 성격 — 품위 키('exaltation', 부모 id 'astro.dignity.Moon|exaltation|…')
   * 또는 달 위상 키('waxing_gibbous', 'astro.moon-phase.….waxing_gibbous'). 같은 행성의 두 교차
   * (☾ 달 ▲ · ☾ 달 ▼)가 보조 줄에서 구별되게(QA VC-5).
   */
  qualifier?: string
}

/**
 * 그날 '왜 이런 날' 근거 — 월 셀과 일 티어(DestinyDay.reason)가 같은 모양. (type 별칭 — 미성년
 * 정화 sanitizeCrossEntry 가 Record<string, unknown> 으로 받는다.)
 */
export type DestinyDayReason = {
  saju: string
  sajuEn: string
  /** 십신 한자(正官) — 십신이 아닌 사주 키(신살)는 없음. */
  sajuHanja?: string
  astro: string
  astroEn: string
  meaning: string
  meaningEn: string
  polarity: number
  /** 점성 부모의 구조 — 부모를 못 찾으면 없음. */
  astroDetail?: ReasonAstroDetail
}

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
   * 오늘 — 서버가 주입된 now 의 출생지 시간대 날짜(targetDayIso)로 정한다(assembleTiers).
   * focus(다이브 일)와 별개 필드다: 다른 날로 다이브해도 오늘은 오늘이다.
   */
  isToday?: boolean
  /** 오늘보다 앞선 날 — 그리드·막대가 흐리게 그린다. */
  past?: boolean
  /**
   * 그날 색·점수를 가장 크게 움직인 사주×점성 교차 — *쉬운 뜻*(meaning)으로.
   * 선택일 리드아웃의 "왜 이런 날인지" 근거. 전문용어(saju/astro)는 칩으로 따로
   * 보여주고, 본문은 plain. 그날 교차가 없으면 생략.
   */
  reason?: DestinyDayReason
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
  /** 월운 간지 — '甲午'. 이 양력 달에 *시작하는* 절기월(15일이 든 쪽, 그 달 대부분). */
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
  /** 이달의 큰 날 리스트 (convergence keyDays — 윈도우+신뢰도). */
  keyDays?: DestinyMonthKeyDay[]
  /** 사용자 다이브 일자 (1..31). */
  focusDay: number
  /**
   * 오늘의 일(1..31) — 이 달이 오늘이 든 달일 때만(assembleTiers, 주입된 now 기준).
   * 지난 달·다음 달 페이로드엔 없다.
   */
  todayDay?: number
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
