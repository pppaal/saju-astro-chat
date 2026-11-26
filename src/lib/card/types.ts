/**
 * 사주 카드 데이터 — 엔진 출력(buildSajuCardData)과 렌더러(components/v9/SajuCard)가 함께
 * 쓰는 모양. 이름 · 별자리 · 인생 모양은 ko/en 한 쌍(Bi)이라 한 번 만든 데이터가 두 언어를
 * 다 그린다. 개인정보: 생년월일 · 시각은 담지 않는다(기둥 · 별자리 · 판정만). 카드 뒷면의
 * 세운(backYear)은 렌더하는 쪽이 보는 사람의 날짜로 정한다 — 엔진 데이터가 아니다.
 */

import type { Bi } from '@/lib/i18n/bi'
import type { AstroElement, SajuElement } from '@/lib/saju/elementBridge'
import type { CrossToneKey } from '@/lib/report/toneLabel'

/** 오행 키 — v9 문구(ELEMENT)와 리포트 교차 평가기가 쓰는 다섯 칸. */
export type ElementKey = SajuElement

/** 서양 4원소 키 — 카드 별 쪽(태양 별자리의 원소). 리포트 '정체성' 행의 별 칸과 같은 이름. */
export type AstroElementKey = AstroElement

export interface CardPillar {
  /** 천간 한자. */
  stem: string
  /** 지지 한자. */
  branch: string
  element: { stem: ElementKey; branch: ElementKey }
  /** 로마자 읽기(Imsul). */
  roman: string
  /** 한글 읽기(임술). */
  hangul: string
}

export interface SajuCardData {
  pillars: {
    hour: CardPillar | null
    day: CardPillar
    month: CardPillar
    year: CardPillar
  }
  /** 시주 숨김(개인정보 기본값 또는 시간 미상) — 점선 빈 칸. */
  hourHidden: boolean
  dayMaster: { stem: string; element: ElementKey }
  /** 태양·달·상승 별자리 이름. asc 가 null 이면(시간·장소 미상) '—'. */
  bigThree: { sun: Bi; moon: Bi; asc: Bi | null }
  /** 사주 타입 이름(세리프 이탤릭) — 'steady-building Free Spirit'. */
  typeName: Bi
  /** 인생 모양 — 'Ups and downs' / '굴곡형'. */
  lifeShape: Bi | null
  /**
   * 정체성 축 — 사주 오행(일간) × 별 원소(태양 별자리의 서양 4원소) → 판정. 별 쪽은 리포트
   * '정체성' 행이 보여 주는 원소 그대로다(공기 별자리는 'air' — 판정 계산의 air→木 근사가
   * 이름으로 새지 않는다). 판정(verdictKey)은 리포트 행의 판정.
   */
  identity: { saju: ElementKey; astro: AstroElementKey; verdictKey: CrossToneKey } | null
  /** 합의 줄 — lineUp = 같음 + 서로 도움, total = tallyCrossRows().total. */
  agree: { lineUp: number; total: number } | null
  /** 뒷면에 비치는 세운 — { ganji: '丙午', year: 2026 }. 렌더하는 쪽이 넣는다. */
  backYear?: { ganji: string; year: number } | null
}

/** 축 행의 한 칸 — 값('Water')과 둘째 줄('fluid and permeating'). */
export interface CardTraitCell {
  text: string
  w?: string
}

/**
 * 원국 축 하나의 교차 판정(CrossCheckRow kind 'trait' 의 재료) — 리포트 교차 행에서 그대로
 * 옮긴 값. 문구는 한 언어(빌드한 locale)다.
 */
export interface CardTraitRow {
  /** 축 키(identity · temperament …) — 리포트 교차 행의 key. */
  key: string
  /** 축 이름('Identity' / '정체성'). */
  axis: string
  verdict: CrossToneKey
  saju?: CardTraitCell
  stars?: CardTraitCell
}
