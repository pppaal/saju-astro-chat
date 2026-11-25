// src/lib/report/lifeStrategy.ts
//
// "운을 내 편으로" — 인생총흐름 전략 블록 데이터. 전부 엔진이 *이미* 계산한 값을
// 꺼내 쓴다(가짜 없음). 엔진↔프론트 동기화의 핵심: analyses.yongsin 의 행운
// 색·방향·숫자, 천을귀인(일간→귀인 지지 SSOT), 곡선 저점, 십성(재성)이 프론트에
// 안 오던 걸 여기서 하나로 묶어 넘긴다.
//
// 각 타일은 근거가 있을 때만 채운다 — 없으면 undefined(그 타일을 렌더 안 함).
// 전부 없으면 null. 순수·결정론: 같은 입력 → 같은 결과.

import { CHEONEUL_GWIIN_MAP, ELEMENT_KO_TO_EN } from '@/lib/saju/constants'
import { ELEMENT_HANJA } from '@/lib/saju/relationTables'
import { LUCKY_COLOR_EN, LUCKY_DIRECTION_EN } from '@/lib/saju/yongsin'
import { ZODIAC_ANIMALS } from '@/lib/fortune/zodiacDaily'
import type { SibsinCategoryCount } from '@/lib/saju/sibsinAnalysis'
import type { FiveElement } from '@/lib/saju/types'

export interface LifeStrategyLucky {
  /** 행운 요소의 근거 오행(주용신) — { ko:'금', hanja:'金', en:'Metal' }. 모르면 생략. */
  element?: { ko: string; hanja: string; en: string }
  /** 행운 색(ko) — 엔진 getLuckyColors 값 그대로. */
  colors: string[]
  /** 행운 색(en) — colors 의 영문(번역 없는 항목은 빠진다, 한글 금지). */
  colorsEn: string[]
  direction: string
  /** 방향(en) — 'East'. 번역 없으면 빈 문자열. */
  directionEn: string
  numbers: number[]
}
export interface LifeStrategyGuin {
  /** 천을귀인 지지(한자) — 예: ['寅','午']. */
  branches: string[]
  /** 천을귀인 띠(한글) — 예: ['호랑이띠','말띠']. */
  animals: string[]
  /** 천을귀인 띠(en) — 예: ['Tiger','Horse']. */
  animalsEn: string[]
}
export interface LifeStrategyCaution {
  /** 곡선 저점(주의) 구간 — 미래 우선, 최대 2개. */
  years: Array<{ year: number; age: number }>
}
export interface LifeStrategyWealth {
  /** 재물 획득 성향 한 줄(재성 기반). */
  styleKo: string
  styleEn: string
}
export interface LifeStrategy {
  lucky?: LifeStrategyLucky
  guin?: LifeStrategyGuin
  caution?: LifeStrategyCaution
  wealth?: LifeStrategyWealth
}

const ANIMAL_BY_BRANCH = new Map(ZODIAC_ANIMALS.map((a) => [a.branch, a]))

// 일간 한글 → 한자. 엔진 dayMaster.name 은 소스에 따라 한글("신") 또는 한자("辛")
// 로 온다 — 천을귀인 맵 키는 한자라 한글이면 변환한다(이미 한자면 그대로 통과).
const STEM_KO_TO_HAN: Record<string, string> = {
  갑: '甲',
  을: '乙',
  병: '丙',
  정: '丁',
  무: '戊',
  기: '己',
  경: '庚',
  신: '辛',
  임: '壬',
  계: '癸',
}

export interface BuildLifeStrategyInput {
  yongsin?: {
    /** 주용신 오행(ko) — lucky.element 의 근거. */
    primaryYongsin?: string
    luckyColors?: string[]
    luckyDirection?: string
    luckyNumbers?: number[]
  } | null
  /** 일간 — 한자('辛') 또는 한글('신'). 천을귀인 조회용(내부에서 한자 정규화). */
  dayStemHanja?: string
  sibsinCount?: SibsinCategoryCount | null
  /**
   * 인생 곡선 저점(마디) — 엔진 lifeCurve.troughs 그대로. value 는 macro 곡선값
   * (깊이 비교용). 재파생 없이 엔진이 이미 prominence 로 거른 저점만 받는다.
   */
  curveTroughs?: Array<{ age: number; year: number; value: number }> | null
  nowAge?: number
}

/** 주용신 오행(ko) → { ko, hanja, en }. 오행이 아니면 undefined. */
function luckyElement(el: string | undefined): LifeStrategyLucky['element'] {
  if (!el) return undefined
  const hanja = ELEMENT_HANJA[el as FiveElement]
  const en = ELEMENT_KO_TO_EN[el]
  return hanja && en ? { ko: el, hanja, en } : undefined
}

/** 엔진 저점(마디)에서 "주의 구간"을 뽑는다. 미래(now 이후) 우선, 깊은 순 2개. */
function cautionYears(
  troughs: Array<{ age: number; year: number; value: number }>,
  nowAge: number
): Array<{ year: number; age: number }> {
  if (troughs.length === 0) return []
  const future = troughs.filter((t) => t.age >= nowAge)
  const pool = future.length > 0 ? future : troughs
  return pool
    .slice()
    .sort((a, b) => a.value - b.value) // 깊은(낮은) 저점 우선
    .slice(0, 2)
    .sort((a, b) => a.age - b.age) // 표시는 시간순
    .map((t) => ({ year: t.year, age: t.age }))
}

/** 재성(재물) 비중으로 재물 획득 성향 한 줄. */
function wealthStyle(cc: SibsinCategoryCount): { styleKo: string; styleEn: string } | null {
  const jae = cc.재성 ?? 0
  const sik = cc.식상 ?? 0
  const gwan = cc.관성 ?? 0
  if (jae >= 3)
    return {
      styleKo: '재물 감각이 타고났어요 — 굴리고 불리는 쪽에서 그릇이 커져요.',
      styleEn: 'A born feel for money — you grow it by putting it to work.',
    }
  if (sik >= 3 && sik >= jae)
    return {
      styleKo: '재능·기술로 버는 형 — 월급보다 성과·창작 보상일 때 재물이 커져요.',
      styleEn: 'You earn through talent — performance/creative pay beats a flat salary.',
    }
  if (gwan >= 3 && gwan >= jae)
    return {
      styleKo: '자리·직함이 곧 재물 — 조직·직책 안에서 안정적으로 쌓는 형이에요.',
      styleEn: 'Position is your wealth — you build steadily inside a role or org.',
    }
  if (jae >= 1)
    return {
      styleKo: '큰 한 방보다 꾸준함이 무기 — 성실히 모을 때 새지 않아요.',
      styleEn: 'Steady beats big swings — you keep what you gather diligently.',
    }
  return null
}

export function buildLifeStrategy(input: BuildLifeStrategyInput): LifeStrategy | null {
  const out: LifeStrategy = {}

  // 행운 요소 — 엔진 값 그대로(수동 매핑 없음). EN 은 엔진 어휘 옆의 ko→en 표로만.
  const y = input.yongsin
  if (y && (y.luckyColors?.length || y.luckyDirection || y.luckyNumbers?.length)) {
    const colors = (y.luckyColors ?? []).slice(0, 3)
    const direction = y.luckyDirection ?? ''
    const element = luckyElement(y.primaryYongsin)
    out.lucky = {
      ...(element ? { element } : {}),
      colors,
      colorsEn: colors.map((c) => LUCKY_COLOR_EN[c]).filter((c): c is string => !!c),
      direction,
      directionEn: LUCKY_DIRECTION_EN[direction] ?? '',
      numbers: (y.luckyNumbers ?? []).slice(0, 4),
    }
  }

  // 귀인 띠 — 천을귀인(일간→귀인 지지 SSOT) → 띠(ko/en). 한글 일간이면 한자로 정규화.
  const rawStem = (input.dayStemHanja ?? '').trim()
  const stem = STEM_KO_TO_HAN[rawStem] ?? rawStem
  const gwiinBranches = stem ? (CHEONEUL_GWIIN_MAP[stem] ?? []) : []
  const gwiin = gwiinBranches
    .map((b) => ANIMAL_BY_BRANCH.get(b))
    .filter((a): a is NonNullable<typeof a> => !!a)
  if (gwiin.length > 0) {
    out.guin = {
      branches: gwiin.map((a) => a.branch),
      animals: gwiin.map((a) => a.ko),
      animalsEn: gwiin.map((a) => a.en),
    }
  }

  // 주의 구간 — 엔진 곡선 저점(마디) 그대로.
  if (input.curveTroughs && input.curveTroughs.length > 0) {
    const years = cautionYears(input.curveTroughs, input.nowAge ?? 0)
    if (years.length > 0) out.caution = { years }
  }

  // 재물 방식 — 재성(십성).
  if (input.sibsinCount) {
    const w = wealthStyle(input.sibsinCount)
    if (w) out.wealth = w
  }

  const has = out.lucky || out.guin || out.caution || out.wealth
  return has ? out : null
}
