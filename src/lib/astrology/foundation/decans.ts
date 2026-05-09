// astrology/foundation/decans.ts
// Decans — 사인 30°를 10°씩 3분할. 각 decan은 다른 행성 ruler.
// Chaldean order (전통).

import type { ZodiacKo } from './types'
import type { AstroPlanetName } from '../interpretations'

const ZODIAC_ORDER: ZodiacKo[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]

// Chaldean order rulers — 각 사인 0-10°, 10-20°, 20-30°
const DECAN_RULERS: Record<ZodiacKo, [AstroPlanetName, AstroPlanetName, AstroPlanetName]> = {
  Aries:       ['Mars',    'Sun',     'Venus'],
  Taurus:      ['Mercury', 'Moon',    'Saturn'],
  Gemini:      ['Jupiter', 'Mars',    'Sun'],
  Cancer:      ['Venus',   'Mercury', 'Moon'],
  Leo:         ['Saturn',  'Jupiter', 'Mars'],
  Virgo:       ['Sun',     'Venus',   'Mercury'],
  Libra:       ['Moon',    'Saturn',  'Jupiter'],
  Scorpio:     ['Mars',    'Sun',     'Venus'],
  Sagittarius: ['Mercury', 'Moon',    'Saturn'],
  Capricorn:   ['Jupiter', 'Mars',    'Sun'],
  Aquarius:    ['Venus',   'Mercury', 'Moon'],
  Pisces:      ['Saturn',  'Jupiter', 'Mars'],
}

export interface DecanResult {
  longitude: number          // 0-360
  sign: ZodiacKo
  degreeInSign: number       // 0-30
  decan: 1 | 2 | 3
  ruler: AstroPlanetName
}

export function getDecan(longitude: number): DecanResult {
  const lon = ((longitude % 360) + 360) % 360
  const signIdx = Math.floor(lon / 30)
  const sign = ZODIAC_ORDER[signIdx]
  const degreeInSign = lon % 30
  const decanIdx = Math.min(2, Math.floor(degreeInSign / 10))
  return {
    longitude: lon,
    sign,
    degreeInSign,
    decan: (decanIdx + 1) as 1 | 2 | 3,
    ruler: DECAN_RULERS[sign][decanIdx],
  }
}

// ============================================================
// 해석 — Decan ruler가 행성 위치에 부여하는 추가 결
// ============================================================

const DECAN_RULER_TONE: Record<AstroPlanetName, string> = {
  Sun:     '자기 표현·중심·권위 결',
  Moon:    '정서·돌봄·내면 결',
  Mercury: '소통·사고·연결 결',
  Venus:   '관계·미감·조화 결',
  Mars:    '추진·갈등·돌파 결',
  Jupiter: '확장·진리·축복 결',
  Saturn:  '구조·책임·시간 결',
  Uranus:  '',
  Neptune: '',
  Pluto:   '',
  Ascendant: '',
}

export function getDecanInterpretation(decan: DecanResult, planetName?: string): string {
  const tone = DECAN_RULER_TONE[decan.ruler] || ''
  const planetPart = planetName ? `${planetName} in ` : ''
  return `${planetPart}${decan.sign} 의 ${decan.decan}번째 decan (${decan.degreeInSign.toFixed(1)}°, ruler ${decan.ruler}) — ${tone}이 ${decan.sign} 결에 가미됨.`
}
