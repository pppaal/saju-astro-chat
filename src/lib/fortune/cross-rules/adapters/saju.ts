// Saju adapter: birth + queryDate → SajuNormalizerInput.
// Calls the existing saju engine; does NOT recompute facts here.

import { calculateSajuData } from '@/lib/saju/saju'
import { analyzeRelations, toAnalyzeInputFromSaju } from '@/lib/saju/relations'
import { calculateStrengthScore } from '@/lib/saju/strength'
import { determineYongsin } from '@/lib/saju/yongsin'
import { determineGeokguk } from '@/lib/saju/geokguk'
import {
  getShinsalHits,
  getTwelveStagesForPillars,
  toSajuPillarsLike,
} from '@/lib/saju/shinsal'
import { getIljinCalendar } from '@/lib/saju/unse'
import type {
  CalculateSajuDataResult,
  RelationHit,
  SajuPillars,
  TwelveStage,
  UnseData,
  PillarKind,
} from '@/lib/saju/types'
import type { GeokgukResult } from '@/lib/saju/geokguk'
import type { YongsinResult } from '@/lib/saju/yongsin'
import type { StrengthScore } from '@/lib/saju/strength'
import type { SajuNormalizerInput } from '../normalizer/saju'
import { correctSolarTime, type SolarTimeMode } from './solar-time'

export interface SajuAdapterInput {
  birthDate: string
  birthTime: string
  gender: 'male' | 'female'
  calendarType?: 'solar' | 'lunar'
  timezone?: string
  queryDate: Date
  /**
   * 시간 보정 모드. 기본 'standard' (KST 그대로).
   * 'meanSolar' = 출생지 경도 기반 평균태양시 (서울은 ~-32분).
   * 'trueSolar' = 평균태양시 + 균시차 (계절별 ±16분).
   */
  solarTimeMode?: SolarTimeMode
  /** Required when solarTimeMode != 'standard'. 출생지 경도 (°E). */
  longitude?: number
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

function pickDaeunSequence(saju: CalculateSajuDataResult, queryDate: Date, birthDate: Date): {
  current: UnseData | null
  previous: UnseData | null
  next: UnseData | null
  index: number
  ageYears: number
  yearsIntoCurrent: number
  yearsToNext: number
} {
  const cycles = saju.daeWoon?.list ?? []
  const ageYears = Math.floor((queryDate.getTime() - birthDate.getTime()) / (365.25 * 24 * 3600 * 1000))
  if (cycles.length === 0) {
    return { current: null, previous: null, next: null, index: -1, ageYears, yearsIntoCurrent: 0, yearsToNext: 0 }
  }
  let index = -1
  for (let i = cycles.length - 1; i >= 0; i--) {
    if (ageYears >= cycles[i].age) { index = i; break }
  }
  if (index < 0) index = 0
  const current = cycles[index] ?? null
  const previous = index > 0 ? cycles[index - 1] : null
  const next = index + 1 < cycles.length ? cycles[index + 1] : null
  const yearsIntoCurrent = current ? ageYears - current.age : 0
  const yearsToNext = next ? next.age - ageYears : 99
  return { current, previous, next, index, ageYears, yearsIntoCurrent, yearsToNext }
}

function pickCurrentSeun(saju: CalculateSajuDataResult, queryDate: Date): UnseData | null {
  const yr = queryDate.getFullYear()
  const annual = saju.unse?.annual ?? []
  const found = annual.find((a) => a.year === yr) as
    | { year: number; ganji?: string; heavenlyStem?: string; earthlyBranch?: string; sibsin?: { cheon: string; ji: string } }
    | undefined
  if (!found) return null
  // saju 엔진은 annual에 ganji 단일 필드만 채움 (예: '丙午'). 양 시스템 어댑터는
  // stem/branch 분리값을 요구하므로 ganji를 한자 단위로 분해해서 채운다.
  const stem = found.heavenlyStem ?? (found.ganji ? found.ganji.slice(0, 1) : '')
  const branch = found.earthlyBranch ?? (found.ganji ? found.ganji.slice(1) : '')
  if (!stem || !branch) return null
  return {
    heavenlyStem: stem,
    earthlyBranch: branch,
    sibsin: found.sibsin ?? { cheon: '', ji: '' },
  }
}

function pickCurrentWolun(saju: CalculateSajuDataResult, queryDate: Date): UnseData | null {
  const monthly = saju.unse?.monthly ?? []
  const yr = queryDate.getFullYear()
  const mo = queryDate.getMonth() + 1
  const found = monthly.find(
    (m: { year?: number; month?: number; ganji?: string; heavenlyStem?: string; earthlyBranch?: string; sibsin?: { cheon: string; ji: string } }) =>
      m.year === yr && m.month === mo,
  ) as
    | { year?: number; month?: number; ganji?: string; heavenlyStem?: string; earthlyBranch?: string; sibsin?: { cheon: string; ji: string } }
    | undefined
  if (!found) return null
  const stem = found.heavenlyStem ?? (found.ganji ? found.ganji.slice(0, 1) : '')
  const branch = found.earthlyBranch ?? (found.ganji ? found.ganji.slice(1) : '')
  if (!stem || !branch) return null
  return { heavenlyStem: stem, earthlyBranch: branch, sibsin: found.sibsin ?? { cheon: '', ji: '' } }
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
  shinsal: import('@/lib/saju/types').ShinsalHit[]
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
  const mode = input.solarTimeMode ?? 'standard'

  // 진태양시·평균태양시 보정이 요청되면 birth 시각을 변환 후 saju 엔진에 넘김.
  // 표준시(기본)면 그대로.
  let effectiveDate = input.birthDate
  let effectiveTime = input.birthTime
  if (mode !== 'standard' && typeof input.longitude === 'number') {
    const corrected = correctSolarTime(
      input.birthDate,
      input.birthTime,
      input.longitude,
      mode,
    )
    effectiveDate = corrected.date
    effectiveTime = corrected.time
  }

  const saju = calculateSajuData(
    effectiveDate,
    effectiveTime,
    input.gender,
    calendarType,
    timezone,
  )

  const natalRelations = analyzeRelations(
    toAnalyzeInputFromSaju(saju.pillars, saju.dayMaster.name, {
      includeGongmang: true,
      gongmangPolicy: 'dayPillar-60jiazi',
    }),
  )

  const birthDateObj = new Date(`${input.birthDate}T${input.birthTime}:00`)
  const daeunSeq = pickDaeunSequence(saju, input.queryDate, birthDateObj)
  const currentDaeun = daeunSeq.current
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
    daeunSequence: {
      previous: daeunSeq.previous,
      next: daeunSeq.next,
      index: daeunSeq.index,
      yearsIntoCurrent: daeunSeq.yearsIntoCurrent,
      yearsToNext: daeunSeq.yearsToNext,
    },
    ageYears: daeunSeq.ageYears,
  }
}
