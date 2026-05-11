/**
 * Orthodox 정통 명리학 interpretation layer.
 *
 * Wraps the scattered existing analyzers (analyzeStrength,
 * analyzeJohuYongsin, analyzeIljuDeep, analyzeJonggeok, analyzeHwagyeok,
 * analyzeSamgi) and adds three pieces that were missing:
 *
 *   1. 궁위론 (per-pillar life-area + period mapping)
 *   2. 천간 합화 (5 standard stem combinations)
 *   3. 간여지동 (same-element stem-branch within a pillar)
 *
 * Output is a single structured object so downstream prompts and matrix
 * inputs can read everything at once instead of stitching it back
 * together.
 */

import type { CalculateSajuDataResult, PillarData, FiveElement } from './types'
import { analyzeAdvancedSaju, analyzeRoot } from './advancedAnalysis'
import {
  analyzeJonggeok,
  analyzeHwagyeok,
  analyzeIljuDeep,
  analyzeSamgi,
  analyzeGongmangDeep,
} from './advancedSajuCore'
import { getIljuArchetype, type IljuArchetype } from './iljuDictionary'

// ──────────────────────────────────────────────────────────────────────
// 궁위론: per-pillar life area + age period
// ──────────────────────────────────────────────────────────────────────

export type PillarPosition = 'year' | 'month' | 'day' | 'time'

export interface PillarPositionMeaning {
  position: PillarPosition
  area: string // 영역 (조상/사회 등)
  ageRange: [number, number] // 시기 (Korean age)
  family: string // 가족 영역
  socialDomain: string // 사회 영역
}

export const PILLAR_POSITION_MEANINGS: Record<PillarPosition, PillarPositionMeaning> = {
  year: {
    position: 'year',
    area: '조상·사회',
    ageRange: [1, 15],
    family: '조부모·부모',
    socialDomain: '사회·국가운',
  },
  month: {
    position: 'month',
    area: '부모·직업',
    ageRange: [16, 30],
    family: '부모·형제',
    socialDomain: '직업·청년기',
  },
  day: {
    position: 'day',
    area: '본인·배우자',
    ageRange: [31, 45],
    family: '본인·배우자',
    socialDomain: '결혼·중년기',
  },
  time: {
    position: 'time',
    area: '자녀·말년',
    ageRange: [46, 99],
    family: '자녀·후손',
    socialDomain: '말년·결과',
  },
}

export interface PillarPositionAnalysis {
  position: PillarPosition
  meaning: PillarPositionMeaning
  stem: { name: string; element: FiveElement; sibsin: string | null }
  branch: { name: string; element: FiveElement; sibsin: string | null }
  /**
   * Plain-language interpretation: "년주 정인이 사회·국가운 영역에서
   * 안정·학문 기운을 부여한다" 같은 한 문장.
   */
  narrative: string
}

function formatPositionNarrative(meaning: PillarPositionMeaning, pillar: PillarData): string {
  const stemSibsin = pillar.heavenlyStem?.sibsin || '-'
  const branchSibsin = pillar.earthlyBranch?.sibsin || '-'
  return (
    `${labelOf(meaning.position)}(${pillar.heavenlyStem.name}${pillar.earthlyBranch.name}) — ` +
    `${meaning.area} 영역(${meaning.ageRange[0]}~${meaning.ageRange[1]}세) ${meaning.family}. ` +
    `천간 ${stemSibsin} / 지지 ${branchSibsin} 작용.`
  )
}

function labelOf(p: PillarPosition): string {
  return p === 'year' ? '년주' : p === 'month' ? '월주' : p === 'day' ? '일주' : '시주'
}

export function analyzePillarPositions(pillars: CalculateSajuDataResult): PillarPositionAnalysis[] {
  const map: Record<PillarPosition, PillarData> = {
    year: pillars.yearPillar,
    month: pillars.monthPillar,
    day: pillars.dayPillar,
    time: pillars.timePillar,
  }
  const result: PillarPositionAnalysis[] = []
  for (const pos of ['year', 'month', 'day', 'time'] as PillarPosition[]) {
    const pillar = map[pos]
    const meaning = PILLAR_POSITION_MEANINGS[pos]
    result.push({
      position: pos,
      meaning,
      stem: {
        name: pillar.heavenlyStem.name,
        element: pillar.heavenlyStem.element as FiveElement,
        sibsin: pillar.heavenlyStem.sibsin || null,
      },
      branch: {
        name: pillar.earthlyBranch.name,
        element: pillar.earthlyBranch.element as FiveElement,
        sibsin: pillar.earthlyBranch.sibsin || null,
      },
      narrative: formatPositionNarrative(meaning, pillar),
    })
  }
  return result
}

/**
 * Resolve which pillar's age range covers the given Korean age. Used by
 * the LLM/matrix to decide which pillar's energy is currently active.
 */
export function pillarForAge(koreanAge: number): PillarPosition {
  for (const pos of ['year', 'month', 'day', 'time'] as PillarPosition[]) {
    const [lo, hi] = PILLAR_POSITION_MEANINGS[pos].ageRange
    if (koreanAge >= lo && koreanAge <= hi) return pos
  }
  return 'time'
}

// ──────────────────────────────────────────────────────────────────────
// 천간 합화: 5 standard combinations
// 갑기합화토, 을경합화금, 병신합화수, 정임합화목, 무계합화화
// ──────────────────────────────────────────────────────────────────────

const STEM_COMBINATIONS: Array<{
  pair: [string, string]
  element: FiveElement
  label: string
}> = [
  { pair: ['甲', '己'], element: '토', label: '갑기합화토' },
  { pair: ['乙', '庚'], element: '금', label: '을경합화금' },
  { pair: ['丙', '辛'], element: '수', label: '병신합화수' },
  { pair: ['丁', '壬'], element: '목', label: '정임합화목' },
  { pair: ['戊', '癸'], element: '화', label: '무계합화화' },
]

export interface StemCombinationHit {
  positions: PillarPosition[] // which pillars' stems combined
  pair: [string, string]
  combinedElement: FiveElement
  label: string
}

export function analyzeStemCombinations(saju: CalculateSajuDataResult): StemCombinationHit[] {
  const stems: { pos: PillarPosition; name: string }[] = [
    { pos: 'year', name: saju.yearPillar.heavenlyStem.name },
    { pos: 'month', name: saju.monthPillar.heavenlyStem.name },
    { pos: 'day', name: saju.dayPillar.heavenlyStem.name },
    { pos: 'time', name: saju.timePillar.heavenlyStem.name },
  ]
  const hits: StemCombinationHit[] = []
  for (let i = 0; i < stems.length; i++) {
    for (let j = i + 1; j < stems.length; j++) {
      const a = stems[i].name
      const b = stems[j].name
      for (const combo of STEM_COMBINATIONS) {
        const [x, y] = combo.pair
        if ((a === x && b === y) || (a === y && b === x)) {
          hits.push({
            positions: [stems[i].pos, stems[j].pos],
            pair: combo.pair,
            combinedElement: combo.element,
            label: combo.label,
          })
        }
      }
    }
  }
  return hits
}

// ──────────────────────────────────────────────────────────────────────
// 간여지동: stem and branch in the same pillar share an element
// ──────────────────────────────────────────────────────────────────────

export interface SameElementPillarHit {
  position: PillarPosition
  element: FiveElement
  stem: string
  branch: string
}

export function analyzeSameElementPillars(saju: CalculateSajuDataResult): SameElementPillarHit[] {
  const pillars: Array<{ pos: PillarPosition; pillar: PillarData }> = [
    { pos: 'year', pillar: saju.yearPillar },
    { pos: 'month', pillar: saju.monthPillar },
    { pos: 'day', pillar: saju.dayPillar },
    { pos: 'time', pillar: saju.timePillar },
  ]
  const hits: SameElementPillarHit[] = []
  for (const { pos, pillar } of pillars) {
    const stemEl = pillar.heavenlyStem.element as FiveElement
    const branchEl = pillar.earthlyBranch.element as FiveElement
    if (stemEl && stemEl === branchEl) {
      hits.push({
        position: pos,
        element: stemEl,
        stem: pillar.heavenlyStem.name,
        branch: pillar.earthlyBranch.name,
      })
    }
  }
  return hits
}

// ──────────────────────────────────────────────────────────────────────
// Top-level orthodox interpretation aggregator
// ──────────────────────────────────────────────────────────────────────

export interface OrthodoxSajuInterpretation {
  pillarPositions: PillarPositionAnalysis[]
  currentLifePillar: PillarPosition // which pillar's age range covers today
  stemCombinations: StemCombinationHit[]
  sameElementPillars: SameElementPillarHit[]
  /** From advancedAnalysis.analyzeAdvancedSaju */
  advanced: ReturnType<typeof analyzeAdvancedSaju> | null
  /** Dedicated 통근/근 (root) analysis — 득령/득지/득세 */
  root: ReturnType<typeof analyzeRoot> | null
  /** Special-format checks (specific to extreme charts) */
  jonggeok: ReturnType<typeof analyzeJonggeok> | null
  hwagyeok: ReturnType<typeof analyzeHwagyeok> | null
  /** Day pillar deep dive (engine output + 60갑자 archetype dictionary) */
  iljuDeep: ReturnType<typeof analyzeIljuDeep> | null
  iljuArchetype: IljuArchetype | null
  /** 삼기 (rare auspicious 3-stem combinations) */
  samgi: ReturnType<typeof analyzeSamgi> | null
  /** Deep gongmang analysis (which pillar carries the void) */
  gongmangDeep: ReturnType<typeof analyzeGongmangDeep> | null
}

export interface BuildOrthodoxOptions {
  koreanAge?: number
}

export function buildOrthodoxInterpretation(
  saju: CalculateSajuDataResult,
  options: BuildOrthodoxOptions = {}
): OrthodoxSajuInterpretation {
  const dayStem = saju.dayPillar.heavenlyStem
  const dayMaster = {
    name: dayStem.name,
    element: dayStem.element as FiveElement,
    yin_yang: (dayStem.yin_yang as 'yang' | 'yin' | '양' | '음') || '양',
  }
  // analyzeAdvancedSaju needs the legacy shape (yearPillar/...).
  // analyzeIljuDeep / analyzeJonggeok / analyzeHwagyeok / analyzeSamgi /
  // analyzeGongmangDeep all use the canonical year/month/day/time shape.
  // Provide both so downstream callers don't crash on either spelling.
  const sajuPillarsForAdvanced = {
    yearPillar: saju.yearPillar,
    monthPillar: saju.monthPillar,
    dayPillar: saju.dayPillar,
    timePillar: saju.timePillar,
  }
  const sajuPillarsCanonical = {
    year: saju.yearPillar,
    month: saju.monthPillar,
    day: saju.dayPillar,
    time: saju.timePillar,
  }

  // Each existing analyzer is wrapped in try/catch so a single failure
  // does not blank the entire orthodox object.
  const safe = <T>(fn: () => T): T | null => {
    try {
      return fn()
    } catch {
      return null
    }
  }

  // The five analyze* helpers accept slightly different input shapes than
  // CalculateSajuDataResult exposes directly, so we coerce through their own
  // Parameters type instead of `any` — keeps the lint rule happy and at least
  // anchors the assertion to the function signature.
  const advanced = safe(() =>
    analyzeAdvancedSaju(
      dayMaster as Parameters<typeof analyzeAdvancedSaju>[0],
      sajuPillarsForAdvanced as Parameters<typeof analyzeAdvancedSaju>[1]
    )
  )
  const root = safe(() =>
    analyzeRoot(
      dayMaster as Parameters<typeof analyzeRoot>[0],
      sajuPillarsForAdvanced as Parameters<typeof analyzeRoot>[1]
    )
  )
  const jonggeok = safe(() =>
    analyzeJonggeok(sajuPillarsCanonical as Parameters<typeof analyzeJonggeok>[0])
  )
  const hwagyeok = safe(() =>
    analyzeHwagyeok(sajuPillarsCanonical as Parameters<typeof analyzeHwagyeok>[0])
  )
  const iljuDeep = safe(() =>
    analyzeIljuDeep(sajuPillarsCanonical as Parameters<typeof analyzeIljuDeep>[0])
  )
  const iljuArchetype = safe(() =>
    getIljuArchetype(saju.dayPillar.heavenlyStem.name, saju.dayPillar.earthlyBranch.name)
  )
  const samgi = safe(() => analyzeSamgi(sajuPillarsCanonical as Parameters<typeof analyzeSamgi>[0]))
  const gongmangDeep = safe(() =>
    analyzeGongmangDeep(sajuPillarsCanonical as Parameters<typeof analyzeGongmangDeep>[0])
  )

  const koreanAge =
    options.koreanAge && Number.isFinite(options.koreanAge)
      ? options.koreanAge
      : new Date().getFullYear() - parseBirthYear(saju) + 1

  return {
    pillarPositions: analyzePillarPositions(saju),
    currentLifePillar: pillarForAge(koreanAge),
    stemCombinations: analyzeStemCombinations(saju),
    sameElementPillars: analyzeSameElementPillars(saju),
    advanced,
    root,
    jonggeok,
    hwagyeok,
    iljuDeep,
    iljuArchetype,
    samgi,
    gongmangDeep,
  }
}

function parseBirthYear(saju: CalculateSajuDataResult): number {
  // SajuResult does not expose birthDate directly in a stable field; the
  // year pillar's solar-year context lives outside this object. The
  // caller is expected to pass koreanAge explicitly when known. Fallback
  // to current year so we never throw — the field is non-critical.
  return new Date().getFullYear()
}
