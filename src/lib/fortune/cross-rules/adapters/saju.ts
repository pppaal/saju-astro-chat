// Saju adapter: birth + queryDate → SajuNormalizerInput.
// Calls the existing saju engine; does NOT recompute facts here.

import { calculateSajuData } from '@/lib/Saju/saju'
import { analyzeRelations, toAnalyzeInputFromSaju } from '@/lib/Saju/relations'
import { calculateStrengthScore } from '@/lib/Saju/strengthScore'
import { determineYongsin } from '@/lib/Saju/yongsin'
import { determineGeokguk } from '@/lib/Saju/geokguk'
import {
  getShinsalHits,
  getTwelveStagesForPillars,
  toSajuPillarsLike,
} from '@/lib/Saju/shinsal'
import { getIljinCalendar } from '@/lib/Saju/unse'
import type {
  CalculateSajuDataResult,
  RelationHit,
  SajuPillars,
  TwelveStage,
  UnseData,
  PillarKind,
} from '@/lib/Saju/types'
import type { GeokgukResult } from '@/lib/Saju/geokguk'
import type { YongsinResult } from '@/lib/Saju/yongsin'
import type { StrengthScore } from '@/lib/Saju/strengthScore'
import type { SajuNormalizerInput } from '../normalizer/saju'

export interface SajuAdapterInput {
  birthDate: string
  birthTime: string
  gender: 'male' | 'female'
  calendarType?: 'solar' | 'lunar'
  timezone?: string
  queryDate: Date
}

const BRANCH_CHUNG = new Set(['子-午','午-子','丑-未','未-丑','寅-申','申-寅','卯-酉','酉-卯','辰-戌','戌-辰','巳-亥','亥-巳'])
const BRANCH_YUKHAP = new Set(['子-丑','丑-子','寅-亥','亥-寅','卯-戌','戌-卯','辰-酉','酉-辰','巳-申','申-巳','午-未','未-午'])
const STEM_CHUNG = new Set(['甲-庚','庚-甲','乙-辛','辛-乙','丙-壬','壬-丙','丁-癸','癸-丁'])
const STEM_HAP = new Set(['甲-己','己-甲','乙-庚','庚-乙','丙-辛','辛-丙','丁-壬','壬-丁','戊-癸','癸-戊'])

const PILLAR_NAMES: PillarKind[] = ['year', 'month', 'day', 'time']

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
    if (STEM_CHUNG.has(stemPair)) out.push({ kind: '천간충', pillars: [name], detail: `운 ${unseStem} - ${name} ${ns}` })
    else if (STEM_HAP.has(stemPair)) out.push({ kind: '천간합', pillars: [name], detail: `운 ${unseStem} - ${name} ${ns}` })
    if (BRANCH_CHUNG.has(branchPair)) out.push({ kind: '지지충', pillars: [name], detail: `운 ${unseBranch} - ${name} ${nb}` })
    else if (BRANCH_YUKHAP.has(branchPair)) out.push({ kind: '지지육합', pillars: [name], detail: `운 ${unseBranch} - ${name} ${nb}` })
  }
  return out
}

function pickCurrentDaeun(saju: CalculateSajuDataResult, queryDate: Date, birthDate: Date): UnseData | null {
  const cycles = saju.daeWoon?.list ?? []
  if (cycles.length === 0) return null
  const ageYears = Math.floor((queryDate.getTime() - birthDate.getTime()) / (365.25 * 24 * 3600 * 1000))
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
  return { heavenlyStem: found.heavenlyStem, earthlyBranch: found.earthlyBranch, sibsin: found.sibsin ?? { cheon: '', ji: '' } }
}

function pickCurrentIljin(saju: CalculateSajuDataResult, queryDate: Date): UnseData | null {
  try {
    const cal = getIljinCalendar(
      queryDate.getFullYear(),
      queryDate.getMonth() + 1,
      saju.dayMaster,
    )
    const day = queryDate.getDate()
    const found = cal.find((d) => d.day === day)
    if (!found) return null
    return {
      heavenlyStem: found.heavenlyStem,
      earthlyBranch: found.earthlyBranch,
      sibsin: found.sibsin ?? { cheon: '', ji: '' },
    }
  } catch {
    return null
  }
}

export interface SajuExtras {
  shinsal: import('@/lib/Saju/types').ShinsalHit[]
  twelveStages: { [K in PillarKind]: TwelveStage }
  geokguk: GeokgukResult | null
  yongsin: YongsinResult | null
  jijanggan: { [K in PillarKind]: string[] } // hidden stems per branch
}

function pullExtras(saju: CalculateSajuDataResult): SajuExtras {
  const pillarsLike = toSajuPillarsLike({
    yearPillar: saju.pillars.year,
    monthPillar: saju.pillars.month,
    dayPillar: saju.pillars.day,
    timePillar: saju.pillars.time,
  })

  const simpleInput = {
    year: { stem: saju.pillars.year.heavenlyStem.name, branch: saju.pillars.year.earthlyBranch.name },
    month: { stem: saju.pillars.month.heavenlyStem.name, branch: saju.pillars.month.earthlyBranch.name },
    day: { stem: saju.pillars.day.heavenlyStem.name, branch: saju.pillars.day.earthlyBranch.name },
    time: { stem: saju.pillars.time.heavenlyStem.name, branch: saju.pillars.time.earthlyBranch.name },
  }

  let shinsal: SajuExtras['shinsal'] = []
  try {
    shinsal = getShinsalHits(pillarsLike, { includeGeneralShinsal: true, includeLuckyDetails: true }) as SajuExtras['shinsal']
  } catch {}

  let twelveStages: SajuExtras['twelveStages']
  try {
    twelveStages = getTwelveStagesForPillars(pillarsLike, 'day')
  } catch {
    twelveStages = { year: '장생', month: '장생', day: '장생', time: '장생' }
  }

  let geokguk: GeokgukResult | null = null
  try {
    geokguk = determineGeokguk(simpleInput)
  } catch {}

  let yongsin: YongsinResult | null = null
  try {
    yongsin = determineYongsin(simpleInput)
  } catch {}

  const jijanggan: SajuExtras['jijanggan'] = {
    year: pickJijanggan(saju.pillars.year),
    month: pickJijanggan(saju.pillars.month),
    day: pickJijanggan(saju.pillars.day),
    time: pickJijanggan(saju.pillars.time),
  }

  return { shinsal, twelveStages, geokguk, yongsin, jijanggan }
}

type AnyPillar = { jijanggan?: { slots?: Array<{ name?: string }> } }
function pickJijanggan(pillar: unknown): string[] {
  const p = pillar as AnyPillar
  const slots = p?.jijanggan?.slots ?? []
  return slots.map((s) => s?.name ?? '').filter(Boolean)
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
  const currentIljin = pickCurrentIljin(saju, input.queryDate)

  const unseRelations: SajuNormalizerInput['unseRelations'] = []
  for (const [unse, source] of [
    [currentDaeun, 'daeun' as const],
    [currentSeun, 'seun' as const],
    [currentWolun, 'wolun' as const],
    [currentIljin, 'iljin' as const],
  ] satisfies Array<[UnseData | null, 'daeun' | 'seun' | 'wolun' | 'iljin']>) {
    if (!unse) continue
    detectUnseRelations(saju.pillars, unse.heavenlyStem, unse.earthlyBranch)
      .forEach((r) => unseRelations.push({ source, relation: r }))
  }

  let strength: StrengthScore | undefined
  try {
    strength = calculateStrengthScore(saju.pillars)
  } catch {}

  const extras = pullExtras(saju)

  return {
    saju,
    natalRelations,
    currentDaeun,
    currentSeun,
    currentWolun,
    currentIljin,
    unseRelations,
    strength,
    extras,
  }
}
