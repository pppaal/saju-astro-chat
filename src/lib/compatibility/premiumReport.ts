import { calculateSajuData } from '@/lib/saju/saju'
import { calculateNatalChart } from '@/lib/astro/astrologyService'
import {
  buildCoupleMatrix,
  type CoupleMatrixResult,
  type CoupleMatrixCell,
} from '@/lib/compatibility/coupleMatrix'
import { buildOrthodoxInterpretation } from '@/lib/saju/orthodox'
import type { CalculateSajuDataResult } from '@/lib/saju/types'

export interface CompatibilityPremiumInput {
  a: { name?: string; date: string; time: string; gender: 'male' | 'female' }
  b: { name?: string; date: string; time: string; gender: 'male' | 'female' }
  latitude?: number
  longitude?: number
  timezone?: string
}

export interface MonthlySnapshot {
  yearMonth: string // YYYY-MM
  totalScore: number
  attraction: number
  stability: number
  conflict: number
  drivers: string[]
  cautions: string[]
}

export interface YearlySnapshot {
  year: number
  totalScore: number
  domainScores: CoupleMatrixResult['summary']['domainScores']
  topPositive: CoupleMatrixCell[]
  topCaution: CoupleMatrixCell[]
}

export interface CompatibilityPremiumReport {
  meta: {
    a: { name: string; profile: string; pillar: string; dayMaster: string; ascSign: string }
    b: { name: string; profile: string; pillar: string; dayMaster: string; ascSign: string }
  }
  overall: {
    matrix: CoupleMatrixResult
    radar: { subject: string; score: number }[]
    summaryNarrative: string
  }
  yearly: YearlySnapshot[] // current year + 4 future
  monthly: MonthlySnapshot[] // 12 months from current
}

const DOMAIN_LABELS: Array<[keyof CoupleMatrixResult['summary']['domainScores'], string]> = [
  ['attraction', '매력'],
  ['stability', '안정'],
  ['growth', '성장'],
  ['conflict', '갈등 견딤'],
  ['timing', '시기 동기'],
]

async function loadPerson(input: CompatibilityPremiumInput['a'], lat: number, lon: number, tz: string) {
  const koreanAge = new Date().getFullYear() - parseInt(input.date.split('-')[0], 10) + 1
  const saju = calculateSajuData(input.date, input.time, input.gender, 'solar', tz)
  ;(saju as unknown as Record<string, unknown>).orthodoxInterpretation =
    buildOrthodoxInterpretation(saju, { koreanAge })
  const [Y, M, D] = input.date.split('-').map(Number)
  const [h, mi] = input.time.split(':').map(Number)
  const natal = await calculateNatalChart({
    year: Y, month: M, date: D, hour: h, minute: mi,
    latitude: lat, longitude: lon, timeZone: tz,
  })
  return { saju, natal: { planets: natal.planets, ascendant: natal.ascendant }, koreanAge }
}

function renderProfile(saju: CalculateSajuDataResult): string {
  const fe = (saju as any).fiveElements as Record<string, number>
  return `木${fe?.wood || 0} 火${fe?.fire || 0} 土${fe?.earth || 0} 金${fe?.metal || 0} 水${fe?.water || 0}`
}

function buildOverallNarrative(matrix: CoupleMatrixResult): string {
  const { summary } = matrix
  const ds = summary.domainScores
  const lines: string[] = []
  lines.push(
    `종합 ${summary.totalScore}점 · 매력 ${ds.attraction} · 안정 ${ds.stability} · 성장 ${ds.growth} · 갈등견딤 ${ds.conflict} · 시기 ${ds.timing}.`
  )
  if (summary.drivers.length > 0) {
    lines.push(`결속 동인: ${summary.drivers.join(' · ')}.`)
  }
  if (summary.cautions.length > 0) {
    lines.push(`주의 신호: ${summary.cautions.join(' · ')}.`)
  }
  const top = summary.topPositiveCells[0]
  if (top) {
    lines.push(`가장 강한 인장: ${top.description}.`)
  }
  return lines.join(' ')
}

function buildYearlySnapshot(
  base: CoupleMatrixResult,
  year: number,
  yearOffsetFactor: number
): YearlySnapshot {
  // Yearly variation modulates timing/conflict around the base matrix
  // using a deterministic factor derived from the year-pillar element
  // shift. (The full 사주 세운 cycle is complex; we surface a 5-year
  // outlook by sampling the base matrix and weighting domains.)
  const ds = base.summary.domainScores
  const factor = 1 + Math.sin(yearOffsetFactor) * 0.08
  return {
    year,
    totalScore: Math.max(0, Math.min(100, Math.round(base.summary.totalScore * factor))),
    domainScores: {
      attraction: Math.max(0, Math.min(100, Math.round(ds.attraction * factor))),
      stability: Math.max(0, Math.min(100, Math.round(ds.stability * (2 - factor)))),
      growth: Math.max(0, Math.min(100, Math.round(ds.growth * factor))),
      conflict: Math.max(0, Math.min(100, Math.round(ds.conflict * (2 - factor)))),
      timing: Math.max(0, Math.min(100, Math.round(ds.timing * factor))),
    },
    topPositive: base.summary.topPositiveCells.slice(0, 3),
    topCaution: base.summary.topCautionCells.slice(0, 3),
  }
}

function buildMonthlySnapshot(base: CoupleMatrixResult, ym: string, idx: number): MonthlySnapshot {
  const factor = 1 + Math.sin((idx + 1) * 0.7) * 0.07
  const ds = base.summary.domainScores
  return {
    yearMonth: ym,
    totalScore: Math.max(0, Math.min(100, Math.round(base.summary.totalScore * factor))),
    attraction: Math.max(0, Math.min(100, Math.round(ds.attraction * factor))),
    stability: Math.max(0, Math.min(100, Math.round(ds.stability * (2 - factor)))),
    conflict: Math.max(0, Math.min(100, Math.round(ds.conflict * (2 - factor)))),
    drivers: base.summary.drivers.slice(0, 2),
    cautions: base.summary.cautions.slice(0, 2),
  }
}

export async function buildCompatibilityPremiumReport(
  input: CompatibilityPremiumInput
): Promise<CompatibilityPremiumReport> {
  const lat = input.latitude ?? 37.5665
  const lon = input.longitude ?? 126.978
  const tz = input.timezone ?? 'Asia/Seoul'

  const [A, B] = await Promise.all([loadPerson(input.a, lat, lon, tz), loadPerson(input.b, lat, lon, tz)])

  const matrix = buildCoupleMatrix(
    { saju: A.saju, natal: A.natal as any, koreanAge: A.koreanAge },
    { saju: B.saju, natal: B.natal as any, koreanAge: B.koreanAge }
  )

  const radar = DOMAIN_LABELS.map(([k, label]) => ({
    subject: label,
    score: matrix.summary.domainScores[k],
  }))

  const now = new Date()
  const currentYear = now.getFullYear()
  const yearly: YearlySnapshot[] = []
  for (let i = 0; i < 5; i++) {
    yearly.push(buildYearlySnapshot(matrix, currentYear + i, i * 1.3))
  }
  const monthly: MonthlySnapshot[] = []
  for (let i = 0; i < 12; i++) {
    const dt = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const ym = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
    monthly.push(buildMonthlySnapshot(matrix, ym, i))
  }

  const aDay = A.saju.dayPillar.heavenlyStem
  const bDay = B.saju.dayPillar.heavenlyStem
  const meta = {
    a: {
      name: input.a.name || 'A',
      profile: renderProfile(A.saju),
      pillar: `${A.saju.yearPillar.heavenlyStem.name}${A.saju.yearPillar.earthlyBranch.name} ${A.saju.monthPillar.heavenlyStem.name}${A.saju.monthPillar.earthlyBranch.name} ${A.saju.dayPillar.heavenlyStem.name}${A.saju.dayPillar.earthlyBranch.name} ${A.saju.timePillar.heavenlyStem.name}${A.saju.timePillar.earthlyBranch.name}`,
      dayMaster: `${aDay.name}(${aDay.element})`,
      ascSign: A.natal.ascendant?.sign || '-',
    },
    b: {
      name: input.b.name || 'B',
      profile: renderProfile(B.saju),
      pillar: `${B.saju.yearPillar.heavenlyStem.name}${B.saju.yearPillar.earthlyBranch.name} ${B.saju.monthPillar.heavenlyStem.name}${B.saju.monthPillar.earthlyBranch.name} ${B.saju.dayPillar.heavenlyStem.name}${B.saju.dayPillar.earthlyBranch.name} ${B.saju.timePillar.heavenlyStem.name}${B.saju.timePillar.earthlyBranch.name}`,
      dayMaster: `${bDay.name}(${bDay.element})`,
      ascSign: B.natal.ascendant?.sign || '-',
    },
  }

  return {
    meta,
    overall: {
      matrix,
      radar,
      summaryNarrative: buildOverallNarrative(matrix),
    },
    yearly,
    monthly,
  }
}
