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
  targetDateToJD,
  throwIfSwissEphError,
  getSwissEphFlags,
  extractLongitudeSpeed,
  extractSwissLongitude,
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

  // A4 fix: 옛 코드는 natalDate = dayjs.tz("YYYY-MM-DD", tz) 로 birth 의
  // hour/minute 정보를 버리고 midnight 으로 처리 → progressed Moon 이 birth
  // time 만큼 (최대 ~13°/일 × 시간비율) 어긋남. natalJD 는 정확한 birth instant
  // 인데 yearsProgressed 계산에서 midnight 으로 어긋난 natalDate 를 써서
  // diff 가 일관 안 됨. 정확한 fix: birth 와 target 의 절대 시각 차이를 일
  // 단위로 직접 계산 후 365.25 일/년 으로 년수 환산.
  const natalJD = natalToJD(natal)

  // targetDate → JD. 결정적 UTC 정오 앵커(targetDateToJD) — 옛 dayjs(targetDate)
  // 는 서버 로컬 자정으로 파싱돼 배포 지역마다 day-count 가 ~1일 흔들렸다.
  const targetJD = targetDateToJD(targetDate)

  const totalDaysDiff = targetJD - natalJD
  const yearsProgressed = totalDaysDiff / 365.25
  // 1년 = 1일 (secondary progression)
  const daysProgressed = yearsProgressed
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

    const longitude = extractSwissLongitude(res as unknown as Record<string, unknown>)
    const info = formatLongitude(longitude)
    const house = inferHouseOf(longitude, housesRes.house)
    const speed = extractLongitudeSpeed(res as unknown as Record<string, unknown>)
    const retrograde = typeof speed === 'number' ? speed < 0 : undefined

    return { name, longitude, ...info, house, speed, retrograde }
  })

  // 진행된 날짜 계산. natalJD + daysProgressed 를 다시 calendar 로 환산.
  const progressedMs = (progressedJD - 2440587.5) * 86400000
  const progressedDate = dayjs(progressedMs).tz(natal.timeZone).format('YYYY-MM-DD')

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

  // 출생일과 목표일 사이의 년수 — secondary progression 과 동일 기준으로 통일.
  // 옛 코드는 natalDate 를 date-only(dayjs.tz)로 만들어 생시(hour/min)를 버리고,
  // target 을 dayjs(targetDate)로 서버 로컬 파싱해 부정확+비결정적이었다. 정확한
  // birth instant(natalToJD)와 결정적 UTC target(targetDateToJD)의 일수차로 환산.
  const natalJD = natalToJD(natal)
  const targetJD = targetDateToJD(targetDate)
  const yearsProgressed = (targetJD - natalJD) / 365.25

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
  const solarArc = normalize360(
    extractSwissLongitude(progressedSunRes as unknown as Record<string, unknown>) -
      extractSwissLongitude(natalSunRes as unknown as Record<string, unknown>)
  )

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
    const directedLon = normalize360(
      extractSwissLongitude(natalRes as unknown as Record<string, unknown>) + solarArc
    )
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

/**
 * Solar Arc 차트 (간이) — 본명 차트의 모든 행성을 ageInYears × 1°만큼
 * 동일하게 전진시킨 차트. 진짜 진행된 태양 위치를 다시 계산하지 않고
 * 근사(1년 = 1°)를 적용해 ephe 호출 없이 빠르게 만든다.
 *
 * extractor 가 매월 호출하는 캐시 친화적 진입점. 정밀이 필요한 모듈은
 * 기존 `calculateSolarArcDirections` (ephemeris 기반)을 그대로 사용.
 */
export function calculateSolarArcChart(natalChart: Chart, ageInYears: number): Chart {
  const arcDegrees = ageInYears * 1 // 1년 ≈ 1°
  const shift = (lon: number) => normalize360(lon + arcDegrees)

  const planets: PlanetBase[] = natalChart.planets.map((p) => {
    const directedLon = shift(p.longitude)
    const info = formatLongitude(directedLon)
    return {
      ...p,
      longitude: directedLon,
      sign: info.sign,
      degree: info.degree,
      minute: info.minute,
      formatted: info.formatted,
    }
  })

  const ascLon = shift(natalChart.ascendant.longitude)
  const mcLon = shift(natalChart.mc.longitude)
  const ascInfo = formatLongitude(ascLon)
  const mcInfo = formatLongitude(mcLon)

  return {
    ...natalChart,
    planets,
    ascendant: {
      ...natalChart.ascendant,
      longitude: ascLon,
      sign: ascInfo.sign,
      degree: ascInfo.degree,
      minute: ascInfo.minute,
      formatted: ascInfo.formatted,
    },
    mc: {
      ...natalChart.mc,
      longitude: mcLon,
      sign: mcInfo.sign,
      degree: mcInfo.degree,
      minute: mcInfo.minute,
      formatted: mcInfo.formatted,
    },
    // houses는 자연 회전이라 본명 그대로 유지 (Solar Arc는 행성·앵글 이동만 표준)
  }
}

/**
 * Solar Arc 행성 vs 본명 행성 어스펙트 검사.
 * Solar Arc는 매우 정밀(1년 ~ 1°)하여 orb 0.5° 권장.
 */
export interface SolarArcAspect {
  arcPlanet: string // Solar Arc 행성 (이동된 본명 행성)
  natalPlanet: string // 어스펙트가 닿은 본명 행성
  aspect: 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition'
  orb: number // 정확한 각도와의 차이 (deg)
  exactAngle: number // 두 행성 간 실제 각도 (0~180)
}

const SOLAR_ARC_MAJOR_ASPECTS: Array<{
  aspect: SolarArcAspect['aspect']
  exact: number
}> = [
  { aspect: 'conjunction', exact: 0 },
  { aspect: 'sextile', exact: 60 },
  { aspect: 'square', exact: 90 },
  { aspect: 'trine', exact: 120 },
  { aspect: 'opposition', exact: 180 },
]

export function findSolarArcAspects(
  natalChart: Chart,
  solarArcChart: Chart,
  orb: number = 0.5
): SolarArcAspect[] {
  const hits: SolarArcAspect[] = []
  for (const arc of solarArcChart.planets) {
    for (const nat of natalChart.planets) {
      const diff = normalize360(arc.longitude - nat.longitude)
      const angle = Math.min(diff, 360 - diff)
      for (const cand of SOLAR_ARC_MAJOR_ASPECTS) {
        const off = Math.abs(angle - cand.exact)
        if (off <= orb) {
          hits.push({
            arcPlanet: arc.name,
            natalPlanet: nat.name,
            aspect: cand.aspect,
            orb: off,
            exactAngle: angle,
          })
          break
        }
      }
    }
  }
  return hits
}
