// src/lib/astrology/foundation/houses.ts
import { HouseSystem } from './types'
import { formatLongitude, normalize360 } from './utils'
import { getSwisseph } from './ephe'
import { toAstroHouseId } from '../graphIds'

export function calcHouses(
  ut_jd: number,
  lat: number,
  lon: number,
  system: HouseSystem = 'Placidus'
) {
  const swisseph = getSwisseph()
  if (system === 'Placidus') {
    const res = swisseph.swe_houses(ut_jd, lat, lon, 'P')
    if ('error' in res) {
      throw new Error(String(res.error))
    }
    return res
  }

  if (system === 'WholeSign') {
    // Whole Sign: ASC의 별자리 시작을 1하우스 0°로, 각 30도씩 등분
    const base = swisseph.swe_houses(ut_jd, lat, lon, 'P')
    if ('error' in base) {
      throw new Error(String(base.error))
    }
    const asc = normalize360(base.ascendant)
    const signStart = Math.floor(asc / 30) * 30 // 그 별자리의 0°
    const house: number[] = new Array(12).fill(0).map((_, i) => normalize360(signStart + i * 30))
    const mc = normalize360(base.mc) // MC는 Placidus 계산치 사용
    return { house, ascendant: asc, mc }
  }

  throw new Error(`Unsupported house system: ${system}`)
}

export function inferHouseOf(longitude: number, houseCusps: number[]): number {
  // Placidus/WholeSign 공통: 오른쪽 진행, 12→1 래핑 고려
  const L = normalize360(longitude)
  for (let i = 0; i < 12; i++) {
    const start = houseCusps[i]
    const end = houseCusps[(i + 1) % 12]
    const inHouse = start > end ? L >= start || L < end : L >= start && L < end
    if (inHouse) {
      return i + 1
    }
  }
  return 12
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
