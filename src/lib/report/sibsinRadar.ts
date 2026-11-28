// src/lib/report/sibsinRadar.ts
//
// "타고난 능력치" 레이더 데이터 — 사주 십성(十星) 카테고리 분포에서 정직하게
// 뽑는다. 가짜 점수가 아니라, 원국에 각 십성이 몇 개 있느냐(sibsinAnalysis 의
// categoryCount)를 상대 강도(0~100)로 환산한 것.
//
// 십성 5카테고리 → 능력치 5축 매핑(고전 의미 그대로):
//   재성(財) → 재물운      · 관성(官) → 명예·직장
//   인성(印) → 배움·인복   · 식상(食傷) → 재능·표현
//   비겁(比劫) → 추진력·자립
//
// 순수·결정론: 같은 categoryCount → 같은 결과. 클록/랜덤 없음.

import type { SibsinCategoryCount } from '@/lib/saju/sibsinAnalysis'
import { getBranchElement, getStemElement } from '@/lib/saju/stemBranchUtils'
import { KO_TO_SAJU_ELEMENT, type SajuElement } from '@/lib/saju/elementBridge'

/** 원국의 글자 하나 — 강점 표의 타일(한자 · 오행 · 어느 기둥의 천간/지지). */
export interface RadarChar {
  ch: string
  el: SajuElement
  pillar: 'year' | 'month' | 'day' | 'hour'
  part: 'stem' | 'branch'
}

export interface RadarAxis {
  /** 십성 카테고리 키(원본). */
  category: keyof SibsinCategoryCount
  labelKo: string
  labelEn: string
  /** 원국 내 개수(원본, 정직성 근거). */
  count: number
  /** 레이더 표시값 0~100 (최강 축 기준 상대 강도). */
  value: number
  /**
   * 이 축에 든 원국 글자 — 연 → 월 → 일 → 시 순, 각 기둥 천간 → 지지. 일간(나 자신)은 빼고,
   * 지지는 엔진이 붙인 지지 십신(정기 기준)으로 묶는다. 기둥을 넘기지 않으면 없음.
   */
  chars?: RadarChar[]
  /** 출생시각 미상 — 시주 글자 없이 세 기둥만 센 값(추정). */
  estimated?: boolean
}

/** 십신 → 다섯 묶음(비견 · 겁재 → 비겁 …). */
const SIBSIN_GROUP: Record<string, keyof SibsinCategoryCount> = {
  비견: '비겁',
  겁재: '비겁',
  식신: '식상',
  상관: '식상',
  편재: '재성',
  정재: '재성',
  편관: '관성',
  정관: '관성',
  편인: '인성',
  정인: '인성',
}

interface PillarLike {
  heavenlyStem: { name: string; sibsin?: string }
  earthlyBranch: { name: string; sibsin?: string }
}

/** 본명 기둥(엔진 pillars — 시주 없으면 삼주). */
export interface RadarPillars {
  year: PillarLike
  month: PillarLike
  day: PillarLike
  time?: PillarLike | null
}

/**
 * 원국 글자 → 십성 묶음별 타일. 일간은 빼고(비교 기준), 시주가 없으면(시간 미상) 세 기둥만.
 * 엔진 pillars 의 십신(천간 sibsin · 지지 sibsin)을 그대로 읽는다 — 다시 판정하지 않는다.
 */
function radarCharsByGroup(pillars: RadarPillars): Record<keyof SibsinCategoryCount, RadarChar[]> {
  const out: Record<keyof SibsinCategoryCount, RadarChar[]> = {
    재성: [],
    관성: [],
    인성: [],
    식상: [],
    비겁: [],
  }
  const order: Array<[RadarChar['pillar'], PillarLike | null | undefined]> = [
    ['year', pillars.year],
    ['month', pillars.month],
    ['day', pillars.day],
    ['hour', pillars.time],
  ]
  for (const [pillar, p] of order) {
    if (!p) continue
    const parts: Array<[RadarChar['part'], string, string | undefined, string]> = [
      ['stem', p.heavenlyStem.name, p.heavenlyStem.sibsin, getStemElement(p.heavenlyStem.name)],
      [
        'branch',
        p.earthlyBranch.name,
        p.earthlyBranch.sibsin,
        getBranchElement(p.earthlyBranch.name),
      ],
    ]
    for (const [part, ch, sibsin, elKo] of parts) {
      if (pillar === 'day' && part === 'stem') continue // 일간 = 나 자신
      const group = sibsin ? SIBSIN_GROUP[sibsin] : undefined
      const el = KO_TO_SAJU_ELEMENT[elKo]
      if (!group || !el) continue
      out[group].push({ ch, el, pillar, part })
    }
  }
  return out
}

// 축 순서 = 오각형 꼭짓점 순서(재물 위→시계방향). 고정.
const AXES: Array<{ key: keyof SibsinCategoryCount; ko: string; en: string }> = [
  { key: '재성', ko: '재물운', en: 'Wealth' },
  { key: '관성', ko: '명예·직장', en: 'Status' },
  { key: '인성', ko: '배움·인복', en: 'Support' },
  { key: '식상', ko: '재능·표현', en: 'Creativity' },
  { key: '비겁', ko: '추진력·자립', en: 'Drive' },
]

// 빈(0) 축도 중심으로 완전히 붕괴하지 않게 최소 표시값(시각용). 데이터가 0인
// 사실은 유지되되(count=0), 레이더가 점으로 사라지지 않도록 아주 작은 바닥만.
const FLOOR = 8

/**
 * 십성 카테고리 분포 → 능력치 레이더 5축. 최강 축을 100으로 두고 나머지를 상대
 * 강도로 환산한다("이 사람 안에서 무엇이 두드러지나"를 보여주는 능력치 분포).
 * 전부 0(정보 부족)이면 null — 가짜 레이더를 그리지 않는다.
 */
export function buildSibsinRadar(
  cc: SibsinCategoryCount | null | undefined,
  /** 본명 기둥 — 넘기면 축마다 그 글자(chars)를 싣는다. 시주가 없으면 estimated. */
  pillars?: RadarPillars | null
): RadarAxis[] | null {
  if (!cc) return null
  const counts = AXES.map((a) => Math.max(0, Math.round(cc[a.key] ?? 0)))
  const maxC = Math.max(...counts)
  if (maxC <= 0) return null // 전부 0 → 근거 없음, 그리지 않음
  const chars = pillars ? radarCharsByGroup(pillars) : null
  const estimated = pillars ? !pillars.time : false
  return AXES.map((a, i) => {
    const count = counts[i]
    const rel = Math.round((count / maxC) * 100)
    return {
      category: a.key,
      labelKo: a.ko,
      labelEn: a.en,
      count,
      value: count > 0 ? Math.max(FLOOR, rel) : FLOOR,
      ...(chars ? { chars: chars[a.key] } : {}),
      ...(estimated ? { estimated: true } : {}),
    }
  })
}

/** 가장 두드러진 축(설명 문장용). null 이면 근거 없음. */
export function dominantAxis(axes: RadarAxis[] | null): RadarAxis | null {
  if (!axes || axes.length === 0) return null
  return axes.reduce((a, b) => (b.count > a.count ? b : a))
}
