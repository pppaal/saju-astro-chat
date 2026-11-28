// src/lib/astrology/foundation/extraPoints.ts
// Chiron, Part of Fortune, Vertex, Lilith 계산

import { ExtraPoint, ExtendedChart, Chart, NatalInput } from './types'
import { formatLongitude, normalize360 } from './utils'
import { inferHouseOf } from './houses'
import { getSwisseph } from './ephe'
import { extractSwissLongitude } from './shared'

// Swiss Ephemeris 추가 천체 ID
const getExtraBodies = (() => {
  let cache: Record<string, number> | null = null
  return () => {
    if (cache) {
      return cache
    }
    const swisseph = getSwisseph()
    cache = {
      Chiron: swisseph.SE_CHIRON,
      Lilith: swisseph.SE_MEAN_APOG, // Mean Black Moon Lilith
      TrueLilith: swisseph.SE_OSCU_APOG, // Osculating/True Lilith
    }
    return cache
  }
})()

/**
 * Chiron 계산
 * 상처와 치유의 소행성
 */
export function calculateChiron(ut_jd: number, houseCusps: number[]): ExtraPoint {
  const swisseph = getSwisseph()
  const EXTRA_BODIES = getExtraBodies()
  const SW_FLAGS = swisseph.SEFLG_SPEED

  const res = swisseph.swe_calc_ut(ut_jd, EXTRA_BODIES.Chiron, SW_FLAGS)
  if ('error' in res) {
    throw new Error(`Chiron calculation error: ${res.error}`)
  }

  const longitude = extractSwissLongitude(res)
  const info = formatLongitude(longitude)
  const house = inferHouseOf(longitude, houseCusps)

  return {
    name: 'Chiron',
    longitude,
    sign: info.sign,
    degree: info.degree,
    minute: info.minute,
    formatted: info.formatted,
    house,
    description: '상처와 치유의 포인트. 내면의 상처를 통해 다른 이들을 치유하는 능력.',
  }
}

/**
 * Black Moon Lilith (평균) 계산
 * 억압된 여성성, 그림자 자아
 */
export function calculateLilith(ut_jd: number, houseCusps: number[]): ExtraPoint {
  const swisseph = getSwisseph()
  const EXTRA_BODIES = getExtraBodies()
  const SW_FLAGS = swisseph.SEFLG_SPEED

  const res = swisseph.swe_calc_ut(ut_jd, EXTRA_BODIES.Lilith, SW_FLAGS)
  if ('error' in res) {
    throw new Error(`Lilith calculation error: ${res.error}`)
  }

  const longitude = extractSwissLongitude(res)
  const info = formatLongitude(longitude)
  const house = inferHouseOf(longitude, houseCusps)

  return {
    name: 'Lilith',
    longitude,
    sign: info.sign,
    degree: info.degree,
    minute: info.minute,
    formatted: info.formatted,
    house,
    description: '검은 달 릴리스. 억압된 욕망, 그림자 자아, 본능적 힘.',
  }
}

/**
 * Part of Fortune (행운점) 계산
 * 공식: ASC + Moon - Sun (주간 출생)
 *       ASC + Sun - Moon (야간 출생)
 */
export function calculatePartOfFortune(
  ascLon: number,
  sunLon: number,
  moonLon: number,
  isNightChart: boolean,
  houseCusps: number[]
): ExtraPoint {
  let longitude: number

  if (isNightChart) {
    // 야간 공식: ASC + Sun - Moon
    longitude = normalize360(ascLon + sunLon - moonLon)
  } else {
    // 주간 공식: ASC + Moon - Sun
    longitude = normalize360(ascLon + moonLon - sunLon)
  }

  const info = formatLongitude(longitude)
  const house = inferHouseOf(longitude, houseCusps)

  return {
    name: 'Part of Fortune',
    longitude,
    sign: info.sign,
    degree: info.degree,
    minute: info.minute,
    formatted: info.formatted,
    house,
    description: '행운점. 물질적 풍요와 행운이 흐르는 영역.',
  }
}

/**
 * Vertex(프라임 버티컬과 황도의 서쪽 교점) 의 황경을 ARMC 로부터 정식 계산.
 *
 * 공식: λ_vertex = atan2( cos(ARMC+180), -(sin(ARMC+180)·cosε + tan(90-φ)·sinε) )
 * (co-latitude 90-φ 사용). Swiss Ephemeris 의 swe_houses().vertex 와 모든 위도
 * (북/남/극권)에서 소수점 3자리까지 일치함을 검증함. 옛 폴백 `ASC+180` 은
 * Descendant 라서 천문학적으로 틀린 점이었다 — 이 함수로 대체한다.
 */
function vertexFromArmc(armcDeg: number, latitude: number, eps: number): number {
  const D = Math.PI / 180
  const R = 180 / Math.PI
  const a = (armcDeg + 180) * D
  const e = eps * D
  const p = (90 - latitude) * D
  return normalize360(
    Math.atan2(Math.cos(a), -(Math.sin(a) * Math.cos(e) + Math.tan(p) * Math.sin(e))) * R
  )
}

/**
 * Vertex 계산
 * Vertex는 서쪽 지평선과 황도의 교점 (Prime Vertical)
 */
export function calculateVertex(
  ut_jd: number,
  latitude: number,
  longitude: number,
  houseCusps: number[]
): ExtraPoint {
  const swisseph = getSwisseph()

  // Vertex/ASC 는 하우스 시스템과 무관. Placidus 는 극권(위도 >~66.5°)에서
  // 실패하므로 거기선 항상 계산되는 Whole Sign('W')으로 폴백해 차트가 throw
  // 되지 않게 한다. 일반 위도에서는 'P' 가 성공해 기존 동작과 동일.
  let housesRes = swisseph.swe_houses(ut_jd, latitude, longitude, 'P')
  if ('error' in housesRes) {
    housesRes = swisseph.swe_houses(ut_jd, latitude, longitude, 'W')
  }
  if ('error' in housesRes) {
    throw new Error(`Vertex calculation error: ${housesRes.error}`)
  }

  // swe_houses 가 제공하는 vertex 를 우선 사용(정확). 혹시 누락/비정상이면
  // ARMC 기반 정식 공식으로 계산 — 옛 `ASC+180`(=Descendant) 날조는 폐기.
  const sweVertex = (housesRes as { vertex?: number }).vertex
  const armc = (housesRes as { armc?: number }).armc
  let vertex: number
  if (typeof sweVertex === 'number' && Number.isFinite(sweVertex)) {
    vertex = normalize360(sweVertex)
  } else if (typeof armc === 'number' && Number.isFinite(armc)) {
    // SE_ECL_NUT(-1): 특수 body id 로 황도경사 반환. 타입 정의에 상수가 없어
    // 명시적 캐스트 + 표준 fallback(-1).
    const SE_ECL_NUT = (swisseph as unknown as { SE_ECL_NUT?: number }).SE_ECL_NUT ?? -1
    const ecl = swisseph.swe_calc_ut(ut_jd, SE_ECL_NUT, 0) as { longitude?: number }
    const eps = typeof ecl.longitude === 'number' ? ecl.longitude : 23.4392911
    vertex = vertexFromArmc(armc, latitude, eps)
  } else {
    throw new Error('Vertex unavailable: swe_houses returned neither vertex nor armc')
  }

  const info = formatLongitude(vertex)
  const house = inferHouseOf(vertex, houseCusps)

  return {
    name: 'Vertex',
    longitude: vertex,
    sign: info.sign,
    degree: info.degree,
    minute: info.minute,
    formatted: info.formatted,
    house,
    description: '버텍스. 운명적 만남, 카르마적 연결 포인트.',
  }
}

/** swe_azalt 의 대기 입력 — trueAltitude 는 대기차가 없는 기하학적 고도라 값과 무관하다. */
const AZALT_PRESSURE_HPA = 1013.25
const AZALT_TEMP_C = 15

/**
 * 태양의 참고도(true altitude, °, 대기차 없음) — swe_calc_ut 의 태양 황경·황위·거리를
 * swe_azalt(SE_ECL2HOR) 로 지평 좌표로 옮긴 값. 천체력을 못 쓰면(모의·네이티브 실패) null.
 */
export function sunTrueAltitude(jdUT: number, latitude: number, longitude: number): number | null {
  if (![jdUT, latitude, longitude].every(Number.isFinite)) return null
  try {
    const sw = getSwisseph()
    if (typeof sw.swe_azalt !== 'function') return null
    const sun = sw.swe_calc_ut(jdUT, sw.SE_SUN, sw.SEFLG_SWIEPH)
    if ('error' in sun) return null
    const hor = sw.swe_azalt(
      jdUT,
      sw.SE_ECL2HOR,
      longitude,
      latitude,
      0,
      AZALT_PRESSURE_HPA,
      AZALT_TEMP_C,
      sun.longitude,
      sun.latitude,
      sun.distance
    )
    return Number.isFinite(hor?.trueAltitude) ? hor.trueAltitude : null
  } catch {
    return null
  }
}

/**
 * 섹트(sect) SSOT — 주간(day) 차트 = 태양이 지평선 위(참고도 > 0°), 헬레니즘 정의.
 *
 * astroFacts·/api/astrology·extraPoints(행운점)·arabicParts(lot 의 isDayChart 입력)가 모두
 * 이 함수 하나로 섹트를 정한다. 정상 위도의 Placidus 에서는 하우스 규칙(7~12궁 = 지평선
 * 위)과 같지만, 극권에서 Whole Sign 으로 폴백하면 하우스가 지평선을 따르지 않아 섹트가
 * ~25% 뒤집혔고(엔진 감사 ASTRO-10) 그와 함께 행운점·정신점·ZR 시작·삼분성이 뒤집혔다.
 *
 * jdUT·위도·경도가 없거나 천체력을 못 쓰면 하우스 규칙(isNightChart — 하우스 미상이면
 * ASC 기준 경도)으로 폴백한다.
 */
export function isDiurnalChart(args: {
  jdUT?: number
  latitude?: number
  longitude?: number
  sunHouse?: number
  sunLongitude?: number
  ascLongitude?: number
}): boolean {
  const { jdUT, latitude, longitude } = args
  if (typeof jdUT === 'number' && typeof latitude === 'number' && typeof longitude === 'number') {
    const alt = sunTrueAltitude(jdUT, latitude, longitude)
    if (alt !== null) return alt > 0
  }
  return !isNightChart(args.sunHouse ?? 0, args.sunLongitude, args.ascLongitude)
}

/**
 * 하우스 규칙 섹트 — 태양이 1~6하우스면 야간, 7~12하우스(지평선 위)면 주간.
 * 섹트의 SSOT 는 isDiurnalChart(태양 고도)이고, 이 함수는 천체력을 못 쓸 때의 폴백이다
 * (극권 Whole Sign 폴백에서는 지평선과 어긋난다 — ASTRO-10).
 */
export function isNightChart(
  sunHouse: number,
  sunLongitude?: number,
  ascLongitude?: number
): boolean {
  // 태양이 1-6하우스(지평선 아래)면 야간, 7-12(지평선 위)면 주간.
  if (sunHouse >= 1 && sunHouse <= 6) return true
  if (sunHouse >= 7 && sunHouse <= 12) return false
  // sunHouse === UNKNOWN_HOUSE(0) 또는 범위 밖 — 하우스로 sect 판별 불가.
  // 예전엔 0 을 그대로 false(주간)로 떨어뜨려 sect 가 뒤집히고 Part of Fortune
  // 주/야 공식이 틀렸다. 지평선(ASC–DESC 축) 기준 경도로 폴백한다: ASC 에서
  // 순행 180°(1~6하우스가 차지하는 지평선 아래 반원)면 태양이 지평선 아래 = 야간.
  if (typeof sunLongitude === 'number' && typeof ascLongitude === 'number') {
    return normalize360(sunLongitude - ascLongitude) < 180
  }
  return false // 정보 부족 시에만 기존 동작(주간) 유지
}

/**
 * 차트에 모든 추가 포인트 계산하여 확장
 */
export function extendChartWithExtraPoints(
  chart: Chart,
  ut_jd: number,
  latitude: number,
  longitude: number
): ExtendedChart {
  const houseCusps = chart.houses.map((h) => h.cusp)

  // Sun과 Moon 찾기
  const sun = chart.planets.find((p) => p.name === 'Sun')
  const moon = chart.planets.find((p) => p.name === 'Moon')

  if (!sun || !moon) {
    throw new Error('Sun or Moon not found in chart')
  }

  // 섹트 = 태양 고도(isDiurnalChart). 천체력이 없으면 하우스·ASC 경도 규칙으로 폴백.
  const nightChart = !isDiurnalChart({
    jdUT: ut_jd,
    latitude,
    longitude,
    sunHouse: sun.house,
    sunLongitude: sun.longitude,
    ascLongitude: chart.ascendant.longitude,
  })

  return {
    ...chart,
    chiron: calculateChiron(ut_jd, houseCusps),
    lilith: calculateLilith(ut_jd, houseCusps),
    partOfFortune: calculatePartOfFortune(
      chart.ascendant.longitude,
      sun.longitude,
      moon.longitude,
      nightChart,
      houseCusps
    ),
    vertex: calculateVertex(ut_jd, latitude, longitude, houseCusps),
  }
}

/**
 * 개별 추가 포인트만 계산 (기존 차트 없이)
 */
export async function calculateExtraPoints(
  ut_jd: number,
  latitude: number,
  longitude: number,
  ascLon: number,
  sunLon: number,
  moonLon: number,
  sunHouse: number,
  houseCusps: number[]
): Promise<{
  chiron: ExtraPoint
  lilith: ExtraPoint
  partOfFortune: ExtraPoint
  vertex: ExtraPoint
}> {
  const nightChart = !isDiurnalChart({
    jdUT: ut_jd,
    latitude,
    longitude,
    sunHouse,
    sunLongitude: sunLon,
    ascLongitude: ascLon,
  })

  return {
    chiron: calculateChiron(ut_jd, houseCusps),
    lilith: calculateLilith(ut_jd, houseCusps),
    partOfFortune: calculatePartOfFortune(ascLon, sunLon, moonLon, nightChart, houseCusps),
    vertex: calculateVertex(ut_jd, latitude, longitude, houseCusps),
  }
}
