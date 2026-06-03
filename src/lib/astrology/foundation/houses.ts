// src/lib/astrology/foundation/houses.ts
import { HouseSystem } from './types'
import { formatLongitude, normalize360 } from './utils'
import { getSwisseph } from './ephe'
import { toAstroHouseId } from '../graphIds'
import { resolveHouseOrWarn } from './shared'

export function calcHouses(
  ut_jd: number,
  lat: number,
  lon: number,
  system: HouseSystem = 'Placidus'
) {
  const swisseph = getSwisseph()

  // Whole Sign: ASC 가 속한 별자리의 0°를 1하우스로, 30도씩 등분. ASC/MC 는
  // 하우스 시스템과 무관하므로 'W' 로 받는다. 'W' 는 Placidus 와 달리 극권
  // (위도 >~66.5°)에서도 항상 계산되므로, 고위도 출생의 폴백으로도 쓴다.
  const wholeSign = () => {
    const base = swisseph.swe_houses(ut_jd, lat, lon, 'W')
    if ('error' in base) {
      throw new Error(String(base.error))
    }
    const asc = normalize360(base.ascendant)
    const signStart = Math.floor(asc / 30) * 30 // 그 별자리의 0°
    const house: number[] = new Array(12).fill(0).map((_, i) => normalize360(signStart + i * 30))
    // houseSystem reflects what actually produced these cusps so a polar
    // fallback is not mislabeled as the requested system in meta.
    return { house, ascendant: asc, mc: normalize360(base.mc), houseSystem: 'WholeSign' as HouseSystem }
  }

  if (system === 'WholeSign') {
    return wholeSign()
  }

  if (system === 'Placidus') {
    // 극권에서 swe_houses('P') 는 "Can't calculate houses" 에러를 낸다 — 이 경우
    // 차트가 통째로 throw 되던 것을 Whole Sign 으로 폴백해 막는다. 일반 위도에서는
    // 'P' 가 성공하므로 기존 동작과 100% 동일(폴백 미작동).
    const res = swisseph.swe_houses(ut_jd, lat, lon, 'P')
    if ('error' in res) {
      // Polar fallback: WholeSign produced the cusps, so report WholeSign as
      // the actual house system used (the wholeSign() result already carries
      // houseSystem='WholeSign'). Callers should read result.houseSystem when
      // populating meta instead of assuming the requested system.
      return wholeSign()
    }
    return { ...res, houseSystem: 'Placidus' as HouseSystem }
  }

  throw new Error(`Unsupported house system: ${system}`)
}

export function inferHouseOf(longitude: number, houseCusps: number[]): number {
  // Placidus/WholeSign 공통: 오른쪽 진행, 12→1 래핑 고려. 단일 진실 소스인
  // resolveHouseOrWarn 으로 위임 — cusp 미매칭(malformed) 시 12 를 날조하지
  // 않고 UNKNOWN_HOUSE(0) 를 돌려주며 logger.warn 으로 관측 가능하게 한다.
  return resolveHouseOrWarn(longitude, houseCusps, 'inferHouseOf')
}

export function mapHouseCupsFormatted(houseCusps: number[]) {
  return houseCusps.map((cusp: number, idx: number) => {
    const f = formatLongitude(cusp)
    return {
      index: idx + 1,
      cusp,
      sign: f.sign,
      formatted: f.formatted,
      graphId: toAstroHouseId(idx + 1) ?? undefined,
    }
  })
}
