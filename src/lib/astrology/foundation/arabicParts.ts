// astrology/foundation/arabicParts.ts
// Arabic Parts (Lots) — Hellenistic 산술점.
// 낮·밤 차트에 따라 sect 공식 다름.
//
// 표준 7대 lot:
//   Fortune    낮: ASC + Moon - Sun     / 밤: ASC + Sun - Moon       (이미 extraPoints 에 PoF 있음 — 본 모듈은 alias 포함)
//   Spirit     낮: ASC + Sun - Moon     / 밤: ASC + Moon - Sun       (Fortune 의 inverse)
//   Eros       낮: ASC + Venus - Spirit / 밤: ASC + Spirit - Venus
//   Necessity  낮: ASC + Fortune - Mercury / 밤: ASC + Mercury - Fortune
//   Courage    낮: ASC + Fortune - Mars / 밤: ASC + Mars - Fortune
//   Victory    낮: ASC + Jupiter - Spirit / 밤: ASC + Spirit - Jupiter
//   Nemesis    낮: ASC + Fortune - Saturn / 밤: ASC + Saturn - Fortune
//
// (Courage·Victory 는 예전엔 낮/밤 공식이 서로 뒤바뀌어 있었다 — Paulus/Valens
//  표준 대비 sect 반전. Fortune-계열 lot(Necessity/Courage/Nemesis)은 낮에
//  ASC + Fortune − 행성, 길성-계열(Eros/Victory)은 낮에 ASC + 길성 − Spirit 라는
//  일관된 구조를 이제 따른다. Nemesis/Eros/Necessity 는 원래부터 정상이었다.)

import type { Chart, ZodiacKo } from './types'

const ZODIAC_ORDER: ZodiacKo[] = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
]

export type ArabicLotName =
  | 'Fortune'
  | 'Spirit'
  | 'Eros'
  | 'Necessity'
  | 'Courage'
  | 'Victory'
  | 'Nemesis'

export interface ArabicLot {
  name: ArabicLotName
  longitude: number
  sign: ZodiacKo
  degreeInSign: number
  formula: string // "ASC + Moon - Sun" 등 — 적용된 공식 (낮/밤 sect 반영)
}

function norm(deg: number): number {
  return ((deg % 360) + 360) % 360
}

function position(longitude: number): { longitude: number; sign: ZodiacKo; degreeInSign: number } {
  const lon = norm(longitude)
  const signIdx = Math.floor(lon / 30)
  return { longitude: lon, sign: ZODIAC_ORDER[signIdx], degreeInSign: lon % 30 }
}

function getPlanetLongitude(chart: Chart, name: string): number {
  const planet = chart.planets.find((p) => p.name === name)
  if (!planet) throw new Error(`Planet not found in chart: ${name}`)
  return planet.longitude
}

/**
 * 모든 7대 Arabic Parts 산출.
 * @param chart 출생 차트
 * @param isDayChart Sun이 지평선 위 (7·8·9·10·11·12궁) 일 때 true. 즉 sunHouse >= 7.
 */
export function calculateArabicLots(chart: Chart, isDayChart: boolean): ArabicLot[] {
  const asc = chart.ascendant.longitude
  const sun = getPlanetLongitude(chart, 'Sun')
  const moon = getPlanetLongitude(chart, 'Moon')
  const mercury = getPlanetLongitude(chart, 'Mercury')
  const venus = getPlanetLongitude(chart, 'Venus')
  const mars = getPlanetLongitude(chart, 'Mars')
  const jupiter = getPlanetLongitude(chart, 'Jupiter')
  const saturn = getPlanetLongitude(chart, 'Saturn')

  // Fortune / Spirit
  const fortuneLon = isDayChart ? norm(asc + moon - sun) : norm(asc + sun - moon)
  const spiritLon = isDayChart ? norm(asc + sun - moon) : norm(asc + moon - sun)

  const lots: ArabicLot[] = []

  const push = (name: ArabicLotName, longitude: number, formula: string) => {
    const p = position(longitude)
    lots.push({ name, ...p, formula })
  }

  push('Fortune', fortuneLon, isDayChart ? 'ASC + Moon - Sun' : 'ASC + Sun - Moon')
  push('Spirit', spiritLon, isDayChart ? 'ASC + Sun - Moon' : 'ASC + Moon - Sun')
  push(
    'Eros',
    isDayChart ? norm(asc + venus - spiritLon) : norm(asc + spiritLon - venus),
    isDayChart ? 'ASC + Venus - Spirit' : 'ASC + Spirit - Venus'
  )
  push(
    'Necessity',
    isDayChart ? norm(asc + fortuneLon - mercury) : norm(asc + mercury - fortuneLon),
    isDayChart ? 'ASC + Fortune - Mercury' : 'ASC + Mercury - Fortune'
  )
  // Courage/Victory: 표준(Paulus/Valens) sect 공식. 예전엔 낮/밤이 뒤바뀌어
  // 낮 차트에서 실제와 다른 경도를 냈다.
  push(
    'Courage',
    isDayChart ? norm(asc + fortuneLon - mars) : norm(asc + mars - fortuneLon),
    isDayChart ? 'ASC + Fortune - Mars' : 'ASC + Mars - Fortune'
  )
  push(
    'Victory',
    isDayChart ? norm(asc + jupiter - spiritLon) : norm(asc + spiritLon - jupiter),
    isDayChart ? 'ASC + Jupiter - Spirit' : 'ASC + Spirit - Jupiter'
  )
  push(
    'Nemesis',
    isDayChart ? norm(asc + fortuneLon - saturn) : norm(asc + saturn - fortuneLon),
    isDayChart ? 'ASC + Fortune - Saturn' : 'ASC + Saturn - Fortune'
  )

  return lots
}
