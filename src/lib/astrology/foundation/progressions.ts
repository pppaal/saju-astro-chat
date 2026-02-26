// src/lib/astrology/foundation/progressions.ts
// Secondary Progressions & Solar Arc Directions 계산

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
dayjs.extend(utc)
dayjs.extend(timezone)

import { Chart, ProgressedChart, ProgressionInput, NatalInput, PlanetBase, House } from './types'
import { formatLongitude, normalize360 } from './utils'
import { calcHouses, inferHouseOf, mapHouseCupsFormatted } from './houses'
import { getSwisseph } from './ephe'
import {
  getPlanetList,
  natalToJD,
  throwIfSwissEphError,
  getSwissEphFlags,
  extractLongitudeSpeed,
} from './shared'
import { CALCULATION_STANDARDS } from '@/lib/config/calculationStandards'

/**
 * Secondary Progressions (2차 진행법)
 * 1일 = 1년 원리
 * 출생 후 N년 = 출생일로부터 N일 후의 차트
 */
export async function calculateSecondaryProgressions(
  input:
    | ProgressionInput
    | { natal?: Partial<NatalInput>; targetDate?: string }
    | Chart
    | undefined
    | null
): Promise<ProgressedChart> {
  const swisseph = getSwisseph()
  const PLANET_LIST = getPlanetList()
  const SW_FLAGS = getSwissEphFlags()
  const inputObj = input as { targetDate?: string; natal?: unknown } | null | undefined
  const fallbackDate =
    typeof inputObj?.targetDate === 'string'
      ? inputObj.targetDate
      : new Date().toISOString().slice(0, 10)

  if (
    !input ||
    typeof input !== 'object' ||
    !('natal' in input) ||
    !inputObj?.natal ||
    !inputObj?.targetDate
  ) {
    return createFallbackProgressedChart(fallbackDate)
  }

  const { natal, targetDate } = input as ProgressionInput
  if (!hasValidNatalInput(natal)) {
    return createFallbackProgressedChart(targetDate || fallbackDate)
  }

  // 출생일과 목표일 사이의 년수 계산
  const natalDate = dayjs.tz(
    `${natal.year}-${String(natal.month).padStart(2, '0')}-${String(natal.date).padStart(2, '0')}`,
    natal.timeZone
  )
  const target = dayjs(targetDate)
  const yearsProgressed = target.diff(natalDate, 'year', true)

  // 1년 = 1일이므로, 진행된 년수 = 진행된 일수
  const daysProgressed = yearsProgressed

  // 출생 JD + 진행된 일수
  const natalJD = natalToJD(natal)
  const progressedJD = natalJD + daysProgressed

  // 진행된 날짜의 하우스 계산 (출생지 기준)
  const housesRes = calcHouses(
    progressedJD,
    natal.latitude,
    natal.longitude,
    CALCULATION_STANDARDS.astrology.houseSystem
  )
  const ascendantInfo = formatLongitude(housesRes.ascendant)
  const mcInfo = formatLongitude(housesRes.mc)

  // 진행된 행성 위치 계산
  const planets: PlanetBase[] = Object.entries(PLANET_LIST).map(([name, planetId]) => {
    const res = swisseph.swe_calc_ut(progressedJD, planetId, SW_FLAGS)
    if ('error' in res) {
      throw new Error(`Progression calc error for ${name}: ${res.error}`)
    }

    const longitude = res.longitude
    const info = formatLongitude(longitude)
    const house = inferHouseOf(longitude, housesRes.house)
    const speed = extractLongitudeSpeed(res as unknown as Record<string, unknown>)
    const retrograde = typeof speed === 'number' ? speed < 0 : undefined

    return { name, longitude, ...info, house, speed, retrograde }
  })

  // 진행된 날짜 계산
  const progressedDate = natalDate.add(daysProgressed, 'day').format('YYYY-MM-DD')

  return {
    planets,
    ascendant: {
      name: 'Ascendant',
      longitude: housesRes.ascendant,
      ...ascendantInfo,
      house: 1,
    },
    mc: {
      name: 'MC',
      longitude: housesRes.mc,
      ...mcInfo,
      house: 10,
    },
    houses: mapHouseCupsFormatted(housesRes.house),
    progressionType: 'secondary',
    yearsProgressed: Number(yearsProgressed.toFixed(2)),
    progressedDate,
  }
}

function hasValidNatalInput(natal: Partial<NatalInput> | undefined): natal is NatalInput {
  if (!natal) {
    return false
  }
  return [
    natal.year,
    natal.month,
    natal.date,
    natal.hour,
    natal.minute,
    natal.latitude,
    natal.longitude,
    natal.timeZone,
  ].every((value) => value !== undefined && value !== null)
}

function createFallbackProgressedChart(progressedDate: string): ProgressedChart {
  const baseInfo = formatLongitude(0)
  const houses: House[] = Array.from({ length: 12 }, (_, idx) => {
    const cusp = idx * 30
    const info = formatLongitude(cusp)
    return {
      index: idx + 1,
      cusp,
      sign: info.sign,
      formatted: info.formatted,
    }
  })

  return {
    planets: [],
    ascendant: {
      name: 'Ascendant',
      longitude: 0,
      ...baseInfo,
      house: 1,
    },
    mc: {
      name: 'MC',
      longitude: 0,
      ...baseInfo,
      house: 10,
    },
    houses,
    progressionType: 'secondary',
    yearsProgressed: 0,
    progressedDate,
  }
}

/**
 * Solar Arc Directions 계산
 * 진행된 태양 - 출생 태양 = Solar Arc
 * 모든 행성 및 각도에 Solar Arc를 더해 위치 계산
 */
export async function calculateSolarArcDirections(
  input: ProgressionInput
): Promise<ProgressedChart> {
  const swisseph = getSwisseph()
  const PLANET_LIST = getPlanetList()
  const SW_FLAGS = getSwissEphFlags()
  const { natal, targetDate } = input

  // 출생일과 목표일 사이의 년수
  const natalDate = dayjs.tz(
    `${natal.year}-${String(natal.month).padStart(2, '0')}-${String(natal.date).padStart(2, '0')}`,
    natal.timeZone
  )
  const target = dayjs(targetDate)
  const yearsProgressed = target.diff(natalDate, 'year', true)

  // 출생 차트의 태양 위치 구하기
  const natalJD = natalToJD(natal)

  // Secondary Progression으로 태양의 진행 위치 계산
  const progressedJD = natalJD + yearsProgressed // 1일 = 1년
  const progressedSunRes = swisseph.swe_calc_ut(progressedJD, swisseph.SE_SUN, SW_FLAGS)
  if ('error' in progressedSunRes) {
    throw new Error(`Solar Arc Sun error: ${progressedSunRes.error}`)
  }

  const natalSunRes = swisseph.swe_calc_ut(natalJD, swisseph.SE_SUN, SW_FLAGS)
  if ('error' in natalSunRes) {
    throw new Error(`Natal Sun error: ${natalSunRes.error}`)
  }

  // Solar Arc = 진행된 태양 - 출생 태양
  const solarArc = normalize360(progressedSunRes.longitude - natalSunRes.longitude)

  // 출생 하우스 (출생지 기준)
  const housesRes = calcHouses(
    natalJD,
    natal.latitude,
    natal.longitude,
    CALCULATION_STANDARDS.astrology.houseSystem
  )

  // 모든 행성에 Solar Arc 적용
  const planets: PlanetBase[] = Object.entries(PLANET_LIST).map(([name, planetId]) => {
    const natalRes = swisseph.swe_calc_ut(natalJD, planetId, SW_FLAGS)
    if ('error' in natalRes) {
      throw new Error(`Solar Arc calc error for ${name}: ${natalRes.error}`)
    }

    // Solar Arc Direction: 출생 위치 + Solar Arc
    const directedLon = normalize360(natalRes.longitude + solarArc)
    const info = formatLongitude(directedLon)
    const house = inferHouseOf(directedLon, housesRes.house)
    const speed = extractLongitudeSpeed(natalRes as unknown as Record<string, unknown>)
    const retrograde = typeof speed === 'number' ? speed < 0 : undefined

    return { name, longitude: directedLon, ...info, house, speed, retrograde }
  })

  // ASC와 MC도 Solar Arc 적용
  const directedAsc = normalize360(housesRes.ascendant + solarArc)
  const directedMC = normalize360(housesRes.mc + solarArc)
  const ascInfo = formatLongitude(directedAsc)
  const mcInfo = formatLongitude(directedMC)

  return {
    planets,
    ascendant: {
      name: 'Ascendant',
      longitude: directedAsc,
      ...ascInfo,
      house: 1,
    },
    mc: {
      name: 'MC',
      longitude: directedMC,
      ...mcInfo,
      house: 10,
    },
    houses: mapHouseCupsFormatted(housesRes.house),
    progressionType: 'solarArc',
    yearsProgressed: Number(yearsProgressed.toFixed(2)),
    progressedDate: targetDate,
  }
}

/**
 * 진행 달 위상 계산 (Secondary Progressed Moon)
 */
export function getProgressedMoonPhase(progressedMoonLon: number, sunLon: number) {
  const angle = normalize360(progressedMoonLon - sunLon)
  if (angle <= 45) {
    return 'New/Waxing Crescent'
  }
  if (angle <= 90) {
    return 'First Quarter'
  }
  if (angle <= 135) {
    return 'Waxing Gibbous'
  }
  if (angle <= 180) {
    return 'Full Moon'
  }
  if (angle <= 225) {
    return 'Waning Gibbous'
  }
  if (angle <= 270) {
    return 'Last Quarter'
  }
  if (angle <= 315) {
    return 'Waning Crescent'
  }
  return 'Dark Moon'
}

/**
 * 진행 요약 정보 (문구)
 */
export function getProgressionSummary(progressed: ProgressedChart) {
  return {
    asc: progressed.ascendant.formatted,
    mc: progressed.mc.formatted,
    progressedDate: progressed.progressedDate,
    type: progressed.progressionType,
  }
}

/**
 * 진행 행성 - 출생 행성 Aspect 계산
 */
export function findProgressedToNatalAspects(
  progressed: ProgressedChart,
  natal: Chart
): { planet: string; aspects: { target: string; angle: number }[] }[] {
  return progressed.planets.map((p) => {
    const aspects = natal.planets
      .map((np) => {
        const diff = normalize360(p.longitude - np.longitude)
        const angle = Math.min(diff, 360 - diff)
        return { target: np.name, angle }
      })
      .filter((a) => a.angle <= 3) // 3도 이내 근접

    return { planet: p.name, aspects }
  })
}

/**
 * 진행 행성 간 내부 Aspect 계산
 */
export function findProgressedInternalAspects(
  progressed: ProgressedChart
): { pair: string; angle: number }[] {
  const aspects: { pair: string; angle: number }[] = []

  for (let i = 0; i < progressed.planets.length; i++) {
    for (let j = i + 1; j < progressed.planets.length; j++) {
      const p1 = progressed.planets[i]
      const p2 = progressed.planets[j]
      const diff = normalize360(p1.longitude - p2.longitude)
      const angle = Math.min(diff, 360 - diff)
      aspects.push({ pair: `${p1.name}-${p2.name}`, angle })
    }
  }

  return aspects
}

/**
 * 진행 달 - 출생 차트 Aspects (대표)
 */
export function findProgressedMoonAspects(
  progressed: ProgressedChart,
  natal: Chart
): { target: string; angle: number }[] {
  const moon = progressed.planets.find((p) => p.name === 'Moon')
  if (!moon) {
    return []
  }

  return natal.planets
    .map((p) => {
      const diff = normalize360(moon.longitude - p.longitude)
      const angle = Math.min(diff, 360 - diff)
      return { target: p.name, angle }
    })
    .filter((a) => a.angle <= 3)
}

/**
 * 진행 행성 위치와 기본 정보 가져오기
 */
export function findProgressedAspectKeywords() {
  return {
    conjunction: '강력한 합',
    opposition: '대립',
    square: '긴장',
    trine: '조화',
    sextile: '협력',
  }
}
