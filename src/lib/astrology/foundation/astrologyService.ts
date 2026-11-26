// src/lib/astrology/foundation/astrologyService.ts
import type { Chart, ChartMeta, HouseSystem, NatalInput, ZodiacKo } from './types'
import { formatLongitude } from './utils'
import { calcHouses, inferHouseOf } from './houses'
import { getSwisseph } from './ephe'
import { getPlanetList, natalToJD, extractLongitudeSpeed } from './shared'
import { toAstroHouseId, toAstroPlanetId, toAstroPointId } from '../graphIds'
import { CALCULATION_STANDARDS } from '@/lib/config/calculationStandards'

// --- 출생 차트 public API ---
export interface NatalChartInput {
  year: number
  month: number
  date: number
  hour: number
  minute: number
  latitude: number
  longitude: number
  timeZone: string
}

export interface PlanetData {
  name: string
  longitude: number
  formatted: string
  sign: string
  degree: number
  minute: number
  house: number
  speed?: number
  retrograde?: boolean
  graphId?: string
  [key: string]: unknown // Allow flexible properties for prompt builder compatibility
}

export interface NatalChartData {
  planets: PlanetData[]
  ascendant: PlanetData
  mc: PlanetData
  houses: { cusp: number; formatted: string; graphId?: string }[]
  meta?: {
    jdUT: number
    isoUTC?: string
    timeZone?: string
    latitude?: number
    longitude?: number
    houseSystem?: string
  }
}

/**
 * 한 천체의 황경(도) — 본명 차트(calculateNatalChart)와 같은 경로: natalToJD(출생 instant
 * resolver) → swe_calc_ut(SEFLG_SPEED). 시각 미상 출생일의 하루 범위(현지 00:00 · 23:59)처럼
 * 차트 전체가 필요 없는 점검용. 결정론(시계를 읽지 않는다).
 */
export function bodyLongitudeAt(input: NatalInput, body: string): number {
  const swisseph = getSwisseph()
  const planetId = getPlanetList()[body]
  if (planetId === undefined) throw new Error(`Unknown body: ${body}`)
  const res = swisseph.swe_calc_ut(natalToJD(input), planetId, swisseph.SEFLG_SPEED)
  if ('error' in res) {
    throw new Error(`Swiss Ephemeris Error (swe_calc_ut for ${body}): ${res.error}`)
  }
  if (!('longitude' in res)) throw new Error(`Unexpected coordinate system for ${body}.`)
  return res.longitude
}

// --- 메인 차트 계산 ---
export async function calculateNatalChart(input: NatalChartInput): Promise<NatalChartData> {
  const swisseph = getSwisseph()
  const PLANET_LIST = getPlanetList()
  const SW_FLAGS = swisseph.SEFLG_SPEED

  const ut_jd = natalToJD(input)

  // Houses / ASC / MC
  const housesRes = calcHouses(
    ut_jd,
    input.latitude,
    input.longitude,
    CALCULATION_STANDARDS.astrology.houseSystem
  )
  const ascendantInfo = formatLongitude(housesRes.ascendant)
  const mcInfo = formatLongitude(housesRes.mc)

  const ascendant: PlanetData = {
    name: 'Ascendant',
    longitude: housesRes.ascendant,
    ...ascendantInfo,
    house: 1,
    graphId: toAstroPointId('Ascendant') ?? undefined,
  }
  const mc: PlanetData = {
    name: 'MC',
    longitude: housesRes.mc,
    ...mcInfo,
    house: 10,
    graphId: toAstroPointId('MC') ?? undefined,
  }

  // Planets
  const planets: PlanetData[] = Object.entries(PLANET_LIST).map(([name, planetId]) => {
    const res = swisseph.swe_calc_ut(ut_jd, planetId, SW_FLAGS)
    if ('error' in res) {
      throw new Error(`Swiss Ephemeris Error (swe_calc_ut for ${name}): ${res.error}`)
    }
    if (!('longitude' in res)) {
      throw new Error(`Unexpected coordinate system for ${name}.`)
    }

    const longitude = res.longitude
    const info = formatLongitude(longitude)
    const houseNum = inferHouseOf(longitude, housesRes.house)
    const speed = extractLongitudeSpeed(res)
    const retrograde = typeof speed === 'number' ? speed < 0 : undefined

    const graphId =
      name === 'True Node' || name === 'Mean Node' || name === 'North Node'
        ? (toAstroPointId('NorthNode') ?? undefined)
        : (toAstroPlanetId(name) ?? undefined)

    return {
      name,
      longitude,
      ...info,
      house: houseNum,
      speed,
      retrograde,
      graphId,
    }
  })

  return {
    planets,
    ascendant,
    mc,
    houses: housesRes.house.map((cusp: number, index: number) => ({
      cusp,
      formatted: formatLongitude(cusp).formatted,
      graphId: toAstroHouseId(index + 1) ?? undefined,
    })),
    meta: {
      jdUT: ut_jd,
      timeZone: input.timeZone,
      latitude: input.latitude,
      longitude: input.longitude,
      // 극권 폴백 시 calcHouses 가 실제 사용 system(WholeSign)을 돌려주므로 그걸
      // 우선 기록해 라벨 거짓을 막는다. (calcHouses 가 system 미보고/모킹된 경우엔
      // 요청값으로 폴백 — 기존 동작 보존.)
      houseSystem: housesRes.houseSystem ?? CALCULATION_STANDARDS.astrology.houseSystem,
    },
  }
}

/**
 * NatalChartData.meta → Chart.meta. 출생 순간(jdUT)과 좌표가 모두 숫자일 때만 — 하나라도 없으면
 * undefined(추가점 계산이 엉뚱한 순간·좌표를 쓰지 않게).
 */
function toChartMeta(m: NatalChartData['meta']): ChartMeta | undefined {
  if (!m) return undefined
  const { jdUT, latitude, longitude } = m
  if (![jdUT, latitude, longitude].every((v) => typeof v === 'number' && Number.isFinite(v))) {
    return undefined
  }
  return {
    jdUT,
    // JD 2440587.5 = 1970-01-01T00:00Z — 천체력 호출 없이 산술로(실패 경로 없음).
    isoUTC: m.isoUTC ?? new Date((jdUT - 2440587.5) * 86_400_000).toISOString(),
    timeZone: m.timeZone ?? '',
    latitude: latitude as number,
    longitude: longitude as number,
    houseSystem:
      (m.houseSystem as HouseSystem | undefined) ?? CALCULATION_STANDARDS.astrology.houseSystem,
  }
}

/**
 * 차트 포맷 변환.
 *
 * opts.withMeta — 출생 순간·좌표(meta)를 함께 싣는다. 시너스트리 추가점(카이런·릴리스·
 * 행운점·버텍스 — extendChartWithExtraPoints 가 jdUT 를 요구)을 돌리는 궁합 경로가 쓴다
 * (재감사 CS-5 — 예전엔 toChart 가 meta 를 늘 버려 추가점이 한 번도 계산되지 않았다).
 * 기본은 예전처럼 meta 없음: 리포트·캘린더·운명상담사의 _chart 는 meta 유무로 경로가
 * 갈리는 소비자(택일·솔라 아크·추가점)가 있어, 이 스테이지에서 출력이 바뀌지 않게 둔다.
 */
export function toChart(n: NatalChartData, opts: { withMeta?: boolean } = {}): Chart {
  const meta = opts.withMeta ? toChartMeta(n.meta) : undefined
  return {
    planets: n.planets.map((p) => ({
      name: p.name,
      longitude: p.longitude,
      sign: p.sign as ZodiacKo,
      degree: p.degree,
      minute: p.minute,
      formatted: p.formatted,
      house: p.house,
      speed: p.speed,
      retrograde: p.retrograde,
      graphId: p.graphId,
    })),
    ascendant: {
      ...n.ascendant,
      sign: n.ascendant.sign as ZodiacKo,
    },
    mc: {
      ...n.mc,
      sign: n.mc.sign as ZodiacKo,
    },
    houses: n.houses.map((h, i) => {
      const f = formatLongitude(h.cusp)
      return {
        index: i + 1,
        cusp: h.cusp,
        sign: f.sign,
        formatted: f.formatted,
        graphId: h.graphId ?? toAstroHouseId(i + 1) ?? undefined,
      }
    }),
    ...(meta ? { meta } : {}),
  }
}
