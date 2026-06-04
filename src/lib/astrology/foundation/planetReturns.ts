// src/lib/astrology/foundation/planetReturns.ts
// 외행성 라이프사이클 마일스톤 — 실제 swisseph transit 계산 기반.
//
// 옛 buildLifecycleTiming (astroLifecycle.ts) 는 "토성 회귀 = 28~31세"
// 같은 평균 나이대 테이블만 썼다. 같은 출생연도의 사람이라도 토성이
// natal 위치로 정확히 돌아오는 날은 6개월~2년씩 달라지는데, 그 차이가
// 무시되던 문제 — 이 파일이 그걸 실제 ephemeris 로 풀어준다.
//
// 출력은 LifecycleEntry 호환 형태(label/meaning/advice/ageRange)이지만
// startYear 가 평균이 아닌 "실제 첫 정확 교차의 연도" 다.

import { getSwisseph } from './ephe'
import { getSwissEphFlags, natalToJD, jdToISO, extractSwissLongitude } from './shared'
import { normalize360 } from './utils'
import type { NatalInput } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Event definitions — 옛 TABLE 과 1:1 매칭. age 윈도우는 swisseph 가
// 첫 정확 교차를 찾을 검색 범위로만 쓰이고, 실제 startYear 는 계산된 날짜
// 의 UTC 연도로 결정된다. offsetDeg 가 0 이면 회귀(planet → natal),
// 90 이면 square(planet → natal+90°), 180 이면 opposition.
// ─────────────────────────────────────────────────────────────────────────────

export type PlanetMilestoneKind =
  | 'jupiter_return_1'
  | 'jupiter_return_2'
  | 'jupiter_return_3'
  | 'jupiter_return_5'
  | 'saturn_return_1'
  | 'saturn_return_2'
  | 'pluto_square_pluto'
  | 'uranus_opposition'
  | 'neptune_square'
  | 'chiron_return'
  | 'uranus_return'

interface EventDef {
  kind: PlanetMilestoneKind
  /** swisseph planet id resolver (config 변동 영향 고려해 getter). */
  getPlanetId: () => number
  /** 0 = return, 90 = square, 180 = opposition. natal 행성 위치에 더할 각도. */
  offsetDeg: 0 | 90 | 180
  /** 검색 윈도우 시작 — birthYear + approxAgeStart 부터 */
  approxAgeStart: number
  /** 검색 윈도우 끝 — birthYear + approxAgeEnd 까지 */
  approxAgeEnd: number
}

function eventDefs(): EventDef[] {
  const sw = getSwisseph()
  // swisseph 모듈에 SE_CHIRON 이 누락된 빌드가 있어 안전하게 fallback.
  const seChiron = (sw as unknown as { SE_CHIRON?: number }).SE_CHIRON ?? 15
  return [
    { kind: 'jupiter_return_1', getPlanetId: () => sw.SE_JUPITER, offsetDeg: 0, approxAgeStart: 10, approxAgeEnd: 14 },
    { kind: 'jupiter_return_2', getPlanetId: () => sw.SE_JUPITER, offsetDeg: 0, approxAgeStart: 22, approxAgeEnd: 26 },
    { kind: 'jupiter_return_3', getPlanetId: () => sw.SE_JUPITER, offsetDeg: 0, approxAgeStart: 34, approxAgeEnd: 38 },
    { kind: 'jupiter_return_5', getPlanetId: () => sw.SE_JUPITER, offsetDeg: 0, approxAgeStart: 58, approxAgeEnd: 62 },
    { kind: 'saturn_return_1', getPlanetId: () => sw.SE_SATURN, offsetDeg: 0, approxAgeStart: 27, approxAgeEnd: 32 },
    { kind: 'saturn_return_2', getPlanetId: () => sw.SE_SATURN, offsetDeg: 0, approxAgeStart: 56, approxAgeEnd: 61 },
    // 명왕성은 출생연도에 따라 자기 자리에서 90도 도달까지 36~46세까지 흐름이
    // 굉장히 변하므로(원지점/근지점 차이) 윈도우 크게.
    { kind: 'pluto_square_pluto', getPlanetId: () => sw.SE_PLUTO, offsetDeg: 90, approxAgeStart: 35, approxAgeEnd: 50 },
    { kind: 'uranus_opposition', getPlanetId: () => sw.SE_URANUS, offsetDeg: 180, approxAgeStart: 39, approxAgeEnd: 45 },
    { kind: 'neptune_square', getPlanetId: () => sw.SE_NEPTUNE, offsetDeg: 90, approxAgeStart: 39, approxAgeEnd: 45 },
    { kind: 'chiron_return', getPlanetId: () => seChiron, offsetDeg: 0, approxAgeStart: 48, approxAgeEnd: 53 },
    { kind: 'uranus_return', getPlanetId: () => sw.SE_URANUS, offsetDeg: 0, approxAgeStart: 82, approxAgeEnd: 86 },
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// 행성 위치 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

function planetLongitudeAtJD(planetId: number, jd: number): number | null {
  const sw = getSwisseph()
  const flags = getSwissEphFlags()
  const res = sw.swe_calc_ut(jd, planetId, flags)
  if ('error' in res) return null
  return extractSwissLongitude(res as unknown as Record<string, unknown>)
}

/**
 * 행성 lon 과 target 사이의 부호 있는 짧은 호 차이 (-180, 180].
 * 외행성은 retrograde 가 있어 단순 lon - target 으로는 wrap 처리가 어렵다.
 */
function shortDiff(lon: number, target: number): number {
  let d = normalize360(lon - target)
  if (d > 180) d -= 360
  return d
}

/**
 * [startJD, endJD] 안에서 planet 의 경도가 target 을 처음 통과(부호 변화)
 * 하는 JD 를 찾는다. 못 찾으면 null.
 *
 * 외행성은 직진→역행→직진 사이클로 같은 자리를 보통 3번 정확 통과한다.
 * 여기선 가장 이른(첫) 통과만 반환 — 컨벤션상 "토성 회귀 = 첫 정확 교차".
 *
 * step: 거친 스캔 간격(일). 토성 ~12°/yr, 천왕성 ~4.3°/yr, 명왕성 ~1.4°/yr
 * 라 7일이면 토성도 한 step 에 0.23° 이동 — sign change 누락 없음.
 */
function findFirstCrossing(
  planetId: number,
  target: number,
  startJD: number,
  endJD: number,
  step = 7
): number | null {
  let prevDiff: number | null = null
  let prevJD = startJD
  for (let jd = startJD; jd <= endJD; jd += step) {
    const lon = planetLongitudeAtJD(planetId, jd)
    if (lon === null) continue
    const diff = shortDiff(lon, target)
    if (prevDiff !== null && diff !== 0) {
      // sign change 또는 0 도달 — 첫 교차 발견. 이 구간 안에서 이분법.
      if (Math.sign(prevDiff) !== Math.sign(diff)) {
        return bisectCrossing(planetId, target, prevJD, jd, prevDiff, diff)
      }
    }
    if (prevDiff !== null && diff === 0) return jd
    prevDiff = diff
    prevJD = jd
  }
  return null
}

function bisectCrossing(
  planetId: number,
  target: number,
  lowJD: number,
  highJD: number,
  lowDiff: number,
  highDiff: number,
  tolerance = 0.001 // 약 3.6 arc-sec — JD 정밀도로 ~분 단위
): number {
  for (let i = 0; i < 60; i++) {
    const mid = (lowJD + highJD) / 2
    const lon = planetLongitudeAtJD(planetId, mid)
    if (lon === null) return mid
    const diff = shortDiff(lon, target)
    if (Math.abs(diff) < tolerance) return mid
    if (Math.sign(diff) === Math.sign(lowDiff)) {
      lowJD = mid
      lowDiff = diff
    } else {
      highJD = mid
      highDiff = diff
    }
  }
  return (lowJD + highJD) / 2
}

// ─────────────────────────────────────────────────────────────────────────────
// 공개 API
// ─────────────────────────────────────────────────────────────────────────────

export interface PlanetMilestone {
  kind: PlanetMilestoneKind
  /** 첫 정확 교차의 ISO datetime (UT). null = 검색 윈도우 안에서 못 찾음. */
  exactDateISO: string | null
  /** 첫 정확 교차 연도 (UTC). null = 못 찾음. */
  startYear: number | null
  /** 그 시점의 본인 만 나이(년 단위 정수). null = 못 찾음. */
  age: number | null
}

/**
 * natal 입력으로 외행성 마일스톤 11개의 실제 정확 일시 계산. 동기 함수지만
 * 한 명당 ~11회의 swisseph 짧은 윈도우 검색이라 ms 단위로 끝난다(캐시 권장).
 *
 * 못 찾은 이벤트는 exactDateISO=null 로 반환 — 호출자가 평균 나이대로 폴백
 * 하든 그냥 생략하든 결정할 수 있게 한다.
 */
export function calculateOuterPlanetMilestones(natal: NatalInput): PlanetMilestone[] {
  const natalJD = natalToJD(natal)

  return eventDefs().map((def) => {
    const planetId = def.getPlanetId()

    // natal 위치 + offset 가 target
    const natalLon = planetLongitudeAtJD(planetId, natalJD)
    if (natalLon === null) {
      return { kind: def.kind, exactDateISO: null, startYear: null, age: null }
    }
    const target = normalize360(natalLon + def.offsetDeg)

    // 검색 윈도우: birthYear + approxAge 범위. JD 환산은 365.25 일 곱으로 충분
    // (대략 ±몇 일 오차는 step 스캔이 흡수).
    const startJD = natalJD + def.approxAgeStart * 365.25
    const endJD = natalJD + (def.approxAgeEnd + 1) * 365.25

    const crossJD = findFirstCrossing(planetId, target, startJD, endJD)
    if (crossJD === null) {
      return { kind: def.kind, exactDateISO: null, startYear: null, age: null }
    }

    const iso = jdToISO(crossJD)
    const startYear = parseInt(iso.slice(0, 4), 10)
    const age = startYear - natal.year
    return { kind: def.kind, exactDateISO: iso, startYear, age }
  })
}
