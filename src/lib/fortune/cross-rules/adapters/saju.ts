// Saju adapter: birth + queryDate → SajuNormalizerInput.
// Calls the existing saju engine; does NOT recompute facts here.

import { calculateSajuData } from '@/lib/Saju/saju'
import { analyzeRelations, toAnalyzeInputFromSaju } from '@/lib/Saju/relations'
import { calculateStrengthScore } from '@/lib/Saju/strengthScore'
import type {
  CalculateSajuDataResult,
  RelationHit,
  SajuPillars,
  UnseData,
} from '@/lib/Saju/types'
import type { SajuNormalizerInput } from '../normalizer/saju'
import type { StrengthScore } from '@/lib/Saju/strengthScore'

export interface SajuAdapterInput {
  birthDate: string // YYYY-MM-DD
  birthTime: string // HH:mm
  gender: 'male' | 'female'
  calendarType?: 'solar' | 'lunar'
  timezone?: string
  queryDate: Date // when the fortune is for
}

// Compact 운-원국 합충 detector. We only check the strongest pair-types
// (지지충, 지지육합, 천간충, 천간합) — sufficient for our cross-rules.
const BRANCH_CHUNG = new Set(['子-午', '午-子', '丑-未', '未-丑', '寅-申', '申-寅', '卯-酉', '酉-卯', '辰-戌', '戌-辰', '巳-亥', '亥-巳'])
const BRANCH_YUKHAP = new Set(['子-丑', '丑-子', '寅-亥', '亥-寅', '卯-戌', '戌-卯', '辰-酉', '酉-辰', '巳-申', '申-巳', '午-未', '未-午'])
const STEM_CHUNG = new Set(['甲-庚', '庚-甲', '乙-辛', '辛-乙', '丙-壬', '壬-丙', '丁-癸', '癸-丁'])
const STEM_HAP = new Set(['甲-己', '己-甲', '乙-庚', '庚-乙', '丙-辛', '辛-丙', '丁-壬', '壬-丁', '戊-癸', '癸-戊'])

const PILLAR_NAMES = ['year', 'month', 'day', 'time'] as const

function detectUnseRelations(
  pillars: SajuPillars,
  unseStem: string,
  unseBranch: string,
): RelationHit[] {
  const out: RelationHit[] = []
  for (const name of PILLAR_NAMES) {
    const p = pillars[name]
    const ns = p.heavenlyStem.name
    const nb = p.earthlyBranch.name
    const stemPair = `${unseStem}-${ns}`
    const branchPair = `${unseBranch}-${nb}`
    if (STEM_CHUNG.has(stemPair)) {
      out.push({ kind: '천간충', pillars: [name], detail: `운 ${unseStem} - ${name} ${ns}` })
    } else if (STEM_HAP.has(stemPair)) {
      out.push({ kind: '천간합', pillars: [name], detail: `운 ${unseStem} - ${name} ${ns}` })
    }
    if (BRANCH_CHUNG.has(branchPair)) {
      out.push({ kind: '지지충', pillars: [name], detail: `운 ${unseBranch} - ${name} ${nb}` })
    } else if (BRANCH_YUKHAP.has(branchPair)) {
      out.push({ kind: '지지육합', pillars: [name], detail: `운 ${unseBranch} - ${name} ${nb}` })
    }
  }
  return out
}

function pickCurrentDaeun(saju: CalculateSajuDataResult, queryDate: Date, birthDate: Date): UnseData | null {
  const cycles = saju.daeWoon?.list ?? []
  if (cycles.length === 0) return null
  const ageYears = Math.floor((queryDate.getTime() - birthDate.getTime()) / (365.25 * 24 * 3600 * 1000))
  // cycles are sorted by startAge ascending; find the one whose age range covers queryAge.
  for (let i = cycles.length - 1; i >= 0; i--) {
    if (ageYears >= cycles[i].age) return cycles[i]
  }
  return cycles[0] ?? null
}

function pickCurrentSeun(saju: CalculateSajuDataResult, queryDate: Date): UnseData | null {
  const yr = queryDate.getFullYear()
  const annual = saju.unse?.annual ?? []
  const found = annual.find((a) => a.year === yr)
  if (!found) return null
  return {
    heavenlyStem: found.heavenlyStem,
    earthlyBranch: found.earthlyBranch,
    sibsin: found.sibsin,
  } as UnseData
}

function pickCurrentWolun(saju: CalculateSajuDataResult, queryDate: Date): UnseData | null {
  const monthly = saju.unse?.monthly ?? []
  const yr = queryDate.getFullYear()
  const mo = queryDate.getMonth() + 1
  const found = monthly.find(
    (m: { year?: number; month?: number; heavenlyStem?: string; earthlyBranch?: string; sibsin?: { cheon: string; ji: string } }) =>
      m.year === yr && m.month === mo,
  )
  if (!found || !found.heavenlyStem || !found.earthlyBranch) return null
  return {
    heavenlyStem: found.heavenlyStem,
    earthlyBranch: found.earthlyBranch,
    sibsin: found.sibsin ?? { cheon: '', ji: '' },
  }
}

export function buildSajuNormalizerInput(input: SajuAdapterInput): SajuNormalizerInput {
  const calendarType = input.calendarType ?? 'solar'
  const timezone = input.timezone ?? 'Asia/Seoul'

  const saju = calculateSajuData(
    input.birthDate,
    input.birthTime,
    input.gender,
    calendarType,
    timezone,
  )

  const natalRelations = analyzeRelations(
    toAnalyzeInputFromSaju(saju.pillars, saju.dayMaster.name),
  )

  const birthDateObj = new Date(`${input.birthDate}T${input.birthTime}:00`)
  const currentDaeun = pickCurrentDaeun(saju, input.queryDate, birthDateObj)
  const currentSeun = pickCurrentSeun(saju, input.queryDate)
  const currentWolun = pickCurrentWolun(saju, input.queryDate)

  const unseRelations: SajuNormalizerInput['unseRelations'] = []
  if (currentDaeun) {
    detectUnseRelations(saju.pillars, currentDaeun.heavenlyStem, currentDaeun.earthlyBranch)
      .forEach((r) => unseRelations.push({ source: 'daeun', relation: r }))
  }
  if (currentSeun) {
    detectUnseRelations(saju.pillars, currentSeun.heavenlyStem, currentSeun.earthlyBranch)
      .forEach((r) => unseRelations.push({ source: 'seun', relation: r }))
  }
  if (currentWolun) {
    detectUnseRelations(saju.pillars, currentWolun.heavenlyStem, currentWolun.earthlyBranch)
      .forEach((r) => unseRelations.push({ source: 'wolun', relation: r }))
  }

  let strength: StrengthScore | undefined
  try {
    strength = calculateStrengthScore(saju.pillars)
  } catch {
    strength = undefined
  }

  return {
    saju,
    natalRelations,
    currentDaeun,
    currentSeun,
    currentWolun,
    currentIljin: null,
    unseRelations,
    strength,
  }
}
