// src/lib/premium-reports/computeUltimateContext.ts
//
// Build the deterministic `computed` slice of an UltimateReport.
// Calls existing saju + astrology engines and reshapes their output
// into the small set of fields the result page needs.

import { calculateSajuData } from '@/lib/Saju/saju'
import type { CalculateSajuDataResult, PillarData } from '@/lib/Saju/types'
import { calculateNatalChart } from '@/lib/astrology/foundation/astrologyService'
import type {
  NatalChartData,
  NatalChartInput,
  PlanetData,
} from '@/lib/astrology/foundation/astrologyService'
import { localizePlanetLabel, localizeSignLabel } from '@/lib/astrology/localization'
import type {
  UltimateAstroPlacement,
  UltimateComputed,
  UltimateSajuPillar,
} from './ultimateReport'

export interface UltimateContextInput {
  birthDate: string // YYYY-MM-DD
  birthTime: string // HH:mm or HH:mm:ss
  gender: 'male' | 'female'
  calendarType?: 'solar' | 'lunar'
  lunarLeap?: boolean
  timezone: string
  latitude: number
  longitude: number
}

const PILLAR_LABELS: Record<UltimateSajuPillar['label'], string> = {
  year: '연주(年柱)',
  month: '월주(月柱)',
  day: '일주(日柱)',
  time: '시주(時柱)',
}

const HIGHLIGHT_PLANETS = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
] as const

function pillarToUltimate(
  label: UltimateSajuPillar['label'],
  pillar: PillarData
): UltimateSajuPillar {
  return {
    label,
    labelKo: PILLAR_LABELS[label],
    stem: pillar.heavenlyStem.name,
    branch: pillar.earthlyBranch.name,
    stemElement: pillar.heavenlyStem.element,
    branchElement: pillar.earthlyBranch.element,
    sibsin: pillar.earthlyBranch.sibsin || pillar.heavenlyStem.sibsin || undefined,
  }
}

function planetToPlacement(planet: PlanetData): UltimateAstroPlacement {
  return {
    body: planet.name,
    bodyKo: localizePlanetLabel(planet.name, 'ko'),
    sign: planet.sign,
    signKo: localizeSignLabel(planet.sign, 'ko'),
    house: planet.house,
    degree: typeof planet.degree === 'number' ? planet.degree : undefined,
    retrograde: planet.retrograde,
  }
}

function pickHighlightPlacements(chart: NatalChartData): UltimateAstroPlacement[] {
  const byName = new Map<string, PlanetData>()
  for (const planet of chart.planets) {
    byName.set(planet.name, planet)
  }

  const placements: UltimateAstroPlacement[] = []
  for (const name of HIGHLIGHT_PLANETS) {
    const planet = byName.get(name)
    if (planet) {
      placements.push(planetToPlacement(planet))
    }
  }
  if (chart.ascendant) {
    placements.push({
      body: 'Ascendant',
      bodyKo: '상승궁',
      sign: chart.ascendant.sign,
      signKo: localizeSignLabel(chart.ascendant.sign, 'ko'),
    })
  }
  return placements
}

export function buildComputedFromSources(
  saju: CalculateSajuDataResult,
  natalChart: NatalChartData
): UltimateComputed {
  const pillars = saju.pillars
  return {
    dayMaster: {
      stem: saju.dayMaster.name,
      element: saju.dayMaster.element,
      yinYang: saju.dayMaster.yin_yang,
    },
    sajuPillars: [
      pillarToUltimate('year', pillars.year),
      pillarToUltimate('month', pillars.month),
      pillarToUltimate('day', pillars.day),
      pillarToUltimate('time', pillars.time),
    ],
    astroPlacements: pickHighlightPlacements(natalChart),
    fiveElements: {
      wood: saju.fiveElements.wood,
      fire: saju.fiveElements.fire,
      earth: saju.fiveElements.earth,
      metal: saju.fiveElements.metal,
      water: saju.fiveElements.water,
    },
  }
}

export async function computeUltimateContext(
  input: UltimateContextInput
): Promise<UltimateComputed> {
  const calendarType = input.calendarType ?? 'solar'
  const saju = calculateSajuData(
    input.birthDate,
    input.birthTime,
    input.gender,
    calendarType,
    input.timezone,
    input.lunarLeap
  )

  const natalInput: NatalChartInput = toNatalInput(input)
  const natalChart = await calculateNatalChart(natalInput)
  return buildComputedFromSources(saju, natalChart)
}

function toNatalInput(input: UltimateContextInput): NatalChartInput {
  const [yearStr, monthStr, dayStr] = input.birthDate.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  const date = Number(dayStr)
  const time = (input.birthTime || '00:00').split(':')
  const hour = Number(time[0] ?? '0')
  const minute = Number(time[1] ?? '0')

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(date) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    throw new Error(
      `[ultimate-report] invalid birth date/time for natal chart: "${input.birthDate}" / "${input.birthTime}"`
    )
  }

  return {
    year,
    month,
    date,
    hour,
    minute,
    latitude: input.latitude,
    longitude: input.longitude,
    timeZone: input.timezone,
  }
}
