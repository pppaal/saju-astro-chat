// astrology/foundation/arabicParts.ts
// Arabic Parts (Lots) — Hellenistic 산술점.
// 낮·밤 차트에 따라 sect 공식 다름.
//
// 표준 7대 lot:
//   Fortune    낮: ASC + Moon - Sun     / 밤: ASC + Sun - Moon       (이미 extraPoints 에 PoF 있음 — 본 모듈은 alias 포함)
//   Spirit     낮: ASC + Sun - Moon     / 밤: ASC + Moon - Sun       (Fortune 의 inverse)
//   Eros       낮: ASC + Venus - Spirit / 밤: ASC + Spirit - Venus
//   Necessity  낮: ASC + Fortune - Mercury / 밤: ASC + Mercury - Fortune
//   Courage    낮: ASC + Mars - Fortune / 밤: ASC + Fortune - Mars
//   Victory    낮: ASC + Spirit - Jupiter / 밤: ASC + Jupiter - Spirit
//   Nemesis    낮: ASC + Fortune - Saturn / 밤: ASC + Saturn - Fortune

import type { Chart, ZodiacKo } from './types'

const ZODIAC_ORDER: ZodiacKo[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
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
  formula: string  // "ASC + Moon - Sun" 등 — 적용된 공식 (낮/밤 sect 반영)
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
 * @param isDayChart Sun이 지평선 위 (1·12·11·10·9·8궁) 일 때 true. 보통 sunHouse <=6 의 반대로 판단.
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
  const spiritLon  = isDayChart ? norm(asc + sun - moon) : norm(asc + moon - sun)

  const lots: ArabicLot[] = []

  const push = (name: ArabicLotName, longitude: number, formula: string) => {
    const p = position(longitude)
    lots.push({ name, ...p, formula })
  }

  push('Fortune', fortuneLon,
    isDayChart ? 'ASC + Moon - Sun' : 'ASC + Sun - Moon')
  push('Spirit', spiritLon,
    isDayChart ? 'ASC + Sun - Moon' : 'ASC + Moon - Sun')
  push('Eros',
    isDayChart ? norm(asc + venus - spiritLon) : norm(asc + spiritLon - venus),
    isDayChart ? 'ASC + Venus - Spirit' : 'ASC + Spirit - Venus')
  push('Necessity',
    isDayChart ? norm(asc + fortuneLon - mercury) : norm(asc + mercury - fortuneLon),
    isDayChart ? 'ASC + Fortune - Mercury' : 'ASC + Mercury - Fortune')
  push('Courage',
    isDayChart ? norm(asc + mars - fortuneLon) : norm(asc + fortuneLon - mars),
    isDayChart ? 'ASC + Mars - Fortune' : 'ASC + Fortune - Mars')
  push('Victory',
    isDayChart ? norm(asc + spiritLon - jupiter) : norm(asc + jupiter - spiritLon),
    isDayChart ? 'ASC + Spirit - Jupiter' : 'ASC + Jupiter - Spirit')
  push('Nemesis',
    isDayChart ? norm(asc + fortuneLon - saturn) : norm(asc + saturn - fortuneLon),
    isDayChart ? 'ASC + Fortune - Saturn' : 'ASC + Saturn - Fortune')

  return lots
}

const LOT_CORE: Record<ArabicLotName, string> = {
  Fortune:   '신체·외형·물질 흐름의 운명점.',
  Spirit:    '진로·행적·정신적 도약의 점.',
  Eros:      '사랑·욕망·끌림의 점.',
  Necessity: '제약·의무·필연의 점.',
  Courage:   '용기·도전·전쟁의 점.',
  Victory:   '성공·승리·신앙의 점.',
  Nemesis:   '시련·복수·숨겨진 적의 점.',
}

const SIGN_TONE: Record<ZodiacKo, string> = {
  Aries:       '직진·시작·개척하는 느낌',
  Taurus:      '지속·축적·뿌리 내리는 느낌',
  Gemini:      '연결·분기·말하는 느낌',
  Cancer:      '돌봄·정서·내면화하는 느낌',
  Leo:         '자기 표현·창조·드러내는 느낌',
  Virgo:       '정밀·실무·다듬는 느낌',
  Libra:       '균형·조화·관계 맺는 느낌',
  Scorpio:     '심층·변환·집착하는 느낌',
  Sagittarius: '확장·진리·먼 곳 향하는 느낌',
  Capricorn:   '구조·책임·올라가는 느낌',
  Aquarius:    '혁신·집단·새로 짜는 느낌',
  Pisces:      '용해·연민·경계 흐려지는 느낌',
}

export function getLotInterpretation(lot: ArabicLot): string {
  return `Lot of ${lot.name}: ${LOT_CORE[lot.name]} ${lot.sign} 위치 (${SIGN_TONE[lot.sign]}) — 이 영역의 면은 ${SIGN_TONE[lot.sign]}로 작동.`
}
